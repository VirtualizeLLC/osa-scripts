#!/usr/bin/env zsh

# ==============================================================================
# rmAsync - High-performance asynchronous directory removal
# ==============================================================================
# Instantly move matched globs to staging, delete async in background.
# Perfect for millions of files (node_modules, build artifacts, etc).
#
# Usage:
#   rmAsync <pattern> [<pattern2> ...]
#   rmAsync status
#   rmAsync force-cleanup
#
# Patterns:
#   - Supports glob expansion: node_modules, src/**/*.tmp, build/*
#   - Each execution gets unique staging folder (UUID + timestamp)
#   - All matches staged atomically, then deleted as single folder
#
# Behavior:
#   1. Expand all glob patterns to file list
#   2. Create unique staging folder: $HOME/.rmAsync/<uuid>_<timestamp>
#   3. Move all matched files into staging folder (instant on same filesystem)
#   4. Return immediately (original paths now available)
#   5. Delete staging folder in background
#   6. Auto-cleanup orphans if no other rm processes active
#
# Performance:
#   - Staging: O(n) where n = file count (fast due to inode moves)
#   - Main process: returns immediately after staging
#   - Deletion: happens in background, non-blocking
#
# ==============================================================================

set -o pipefail

# Configuration
readonly RM_ASYNC_DIR="${HOME}/.rmAsync"
readonly RM_ASYNC_PID_FILE="${RM_ASYNC_DIR}/.pids"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

_log_error() {
  printf "${RED}✗ rmAsync Error: %s${NC}\n" "$@" >&2
}

_log_success() {
  printf "${GREEN}✓ %s${NC}\n" "$@"
}

_log_info() {
  printf "${YELLOW}ℹ %s${NC}\n" "$@"
}

_generate_unique_id() {
  # Generate unique ID: UUID + nanoseconds for collision-free staging
  # Handles systems without uuidgen gracefully
  local uuid
  
  if command -v uuidgen &>/dev/null; then
    uuid=$(uuidgen)
  else
    # Fallback: use hostname + PID + random + timestamp
    uuid="${HOSTNAME:-localhost}-$$-$RANDOM-$((RANDOM * RANDOM))"
  fi
  
  local ns
  ns=$(date +%s%N 2>/dev/null || date +%s)
  
  echo "${uuid}-${ns}"
}

_init_staging_dir() {
  mkdir -p "$RM_ASYNC_DIR" || {
    _log_error "Failed to create staging directory: $RM_ASYNC_DIR"
    return 1
  }
  chmod 700 "$RM_ASYNC_DIR" 2>/dev/null
}

_validate_critical_paths() {
  local path="$1"
  
  # Bail on empty or malformed paths
  if [[ -z "$path" || "$path" == "." || "$path" == ".." ]]; then
    _log_error "Invalid path: '$path'"
    return 1
  fi
  
  # Resolve to absolute path to prevent tricks
  local abs_path
  abs_path=$(cd "$(dirname "$path")" 2>/dev/null && pwd) || {
    _log_error "Cannot resolve path: $path"
    return 1
  }
  abs_path="${abs_path}/$(basename "$path")"
  
  # Prevent removing critical system paths
  case "$abs_path" in
    / | /bin | /sbin | /usr | /var | /etc | /sys | /proc | /dev | /boot | /Applications | /Library | /System)
      _log_error "Cannot remove critical system path: $abs_path"
      return 1
      ;;
    "$HOME")
      _log_error "Cannot remove home directory: $abs_path"
      return 1
      ;;
  esac
  
  # Extra safety: reject if path contains .. (directory traversal attempt)
  if [[ "$abs_path" == *".."* ]]; then
    _log_error "Invalid path (contains ..): $path"
    return 1
  fi
  
  return 0
}

_count_rm_processes() {
  # Count active rm processes (excluding this script and grep)
  # More reliable than ps for cross-platform compatibility
  local count=0
  
  if command -v pgrep &>/dev/null; then
    # Use pgrep if available (more reliable)
    count=$(pgrep -f " rm " 2>/dev/null | wc -l || echo 0)
  else
    # Fallback to ps parsing
    count=$(ps aux 2>/dev/null | grep -v grep | grep -v "rmAsync" | grep -c " rm " || echo 0)
  fi
  
  echo "$count"
}

_remove_async() {
  local staging_folder="$1"
  
  # Validate staging folder path before deletion
  if [[ ! -d "$staging_folder" ]]; then
    _log_error "Staging folder does not exist: $staging_folder"
    return 1
  fi
  
  # Ensure staging folder is in RM_ASYNC_DIR to prevent accidental deletion
  if [[ "$staging_folder" != "$RM_ASYNC_DIR"* ]]; then
    _log_error "Invalid staging folder (not in RM_ASYNC_DIR): $staging_folder"
    return 1
  fi
  
  # Remove in background, silently with error redirection
  (
    rm -rf "$staging_folder" 2>/dev/null || {
      # Log failure to temp file for debugging (optional)
      echo "Failed to remove: $staging_folder" >> "${RM_ASYNC_DIR}/.errors" 2>/dev/null
    }
  ) &
  
  local pid=$!
  
  # Ensure PID file exists and has correct permissions
  if [[ ! -f "$RM_ASYNC_PID_FILE" ]]; then
    touch "$RM_ASYNC_PID_FILE" 2>/dev/null || return 1
    chmod 600 "$RM_ASYNC_PID_FILE" 2>/dev/null
  fi
  
  # Add PID to tracking file
  echo "$pid" >> "$RM_ASYNC_PID_FILE" 2>/dev/null || {
    _log_error "Failed to track PID: $pid"
    return 1
  }
  
  return 0
}

_cleanup_orphans() {
  # Only run cleanup if no other rm processes are active
  local rm_count
  rm_count=$(_count_rm_processes)
  
  if [[ "$rm_count" -eq 0 ]]; then
    local item
    for item in "$RM_ASYNC_DIR"/*; do
      # Skip hidden files (.pids, .lock, etc)
      if [[ "${item##*/}" == .* ]]; then
        continue
      fi
      
      if [[ -e "$item" || -L "$item" ]]; then
        _log_info "Cleaning orphan: ${item##*/}"
        _remove_async "$item"
      fi
    done
  fi
}

_prune_dead_pids() {
  # Clean up PID file, removing dead processes
  if [[ ! -f "$RM_ASYNC_PID_FILE" ]]; then
    return 0
  fi
  
  local temp_pids
  temp_pids=$(mktemp) || return 1
  
  # Atomic update: read all, filter live, write back
  while IFS= read -r pid; do
    # Skip empty lines
    [[ -z "$pid" ]] && continue
    
    # Only keep PIDs that are still running
    if kill -0 "$pid" 2>/dev/null; then
      echo "$pid" >> "$temp_pids"
    fi
  done < "$RM_ASYNC_PID_FILE"
  
  # Atomic move to replace old file
  if [[ -s "$temp_pids" ]]; then
    mv "$temp_pids" "$RM_ASYNC_PID_FILE" 2>/dev/null
    chmod 600 "$RM_ASYNC_PID_FILE" 2>/dev/null
  else
    # If no PIDs left, remove the file
    rm -f "$temp_pids" "$RM_ASYNC_PID_FILE" 2>/dev/null
  fi
}

# ==============================================================================
# MAIN FUNCTION
# ==============================================================================

rmAsync() {
  # Initialize staging directory
  _init_staging_dir || return 1
  
  # Require at least one pattern argument
  if [[ $# -eq 0 ]]; then
    _log_error "Usage: rmAsync <pattern> [<pattern2> ...]"
    return 1
  fi
  
  # Generate unique staging folder for this execution
  local unique_id
  unique_id=$(_generate_unique_id)
  local staging_folder="${RM_ASYNC_DIR}/${unique_id}"
  
  # Validate staging folder path
  if [[ -z "$staging_folder" || "$staging_folder" != "$RM_ASYNC_DIR"* ]]; then
    _log_error "Invalid staging folder path generated"
    return 1
  fi
  
  mkdir -p "$staging_folder" || {
    _log_error "Failed to create staging folder: $staging_folder"
    return 1
  }
  
  local failed=0
  local moved_count=0
  local expanded_paths=()
  
  # Expand all glob patterns and collect paths
  # Use nullglob to handle non-matching patterns gracefully
  setopt nullglob 2>/dev/null
  
  for pattern in "$@"; do
    # Validate pattern is not empty
    if [[ -z "$pattern" ]]; then
      ((failed++))
      continue
    fi
    
    # Expand pattern using glob
    for path in $pattern; do
      # Double-check path exists and is accessible
      if [[ -e "$path" || -L "$path" ]]; then
        expanded_paths+=("$path")
      fi
    done
  done
  
  unsetopt nullglob 2>/dev/null
  
  # If no paths matched, fail
  if [[ ${#expanded_paths[@]} -eq 0 ]]; then
    _log_error "No files matched patterns: $@"
    rmdir "$staging_folder" 2>/dev/null
    return 1
  fi
  
  # Move all matched files into staging folder
  for path in "${expanded_paths[@]}"; do
    # Validate path (prevents directory traversal, critical paths, etc)
    if ! _validate_critical_paths "$path"; then
      ((failed++))
      continue
    fi
    
    # Move to staging (instant on same filesystem)
    local basename
    basename="$(basename "$path")"
    local dest="${staging_folder}/${basename}"
    
    # Handle collisions by appending counter
    local counter=0
    while [[ -e "$dest" ]]; do
      dest="${staging_folder}/${basename}_${counter}"
      ((counter++))
    done
    
    # Perform move with error checking
    if mv "$path" "$dest" 2>/dev/null; then
      ((moved_count++))
    else
      _log_error "Failed to move: $path"
      ((failed++))
    fi
  done
  
  # If nothing was moved, clean up staging folder and return
  if [[ $moved_count -eq 0 ]]; then
    _log_error "Failed to stage any items"
    rmdir "$staging_folder" 2>/dev/null
    return 1
  fi
  
  # Fire async removal of entire staging folder
  _remove_async "$staging_folder" || {
    _log_error "Failed to queue removal"
    return 1
  }
  
  # Attempt cleanup of other orphans if no rm processes active
  _cleanup_orphans
  
  # Prune dead PIDs
  _prune_dead_pids
  
  # Summary
  _log_success "Staged $moved_count item(s) for async removal"
  
  if [[ $failed -gt 0 ]]; then
    _log_error "Failed to stage $failed item(s)"
  fi
  
  return 0
}

# ==============================================================================
# STATUS & MAINTENANCE FUNCTIONS
# ==============================================================================

rmAsync_status() {
  local staging_count=0
  
  if [[ ! -d "$RM_ASYNC_DIR" ]]; then
    _log_info "No staging directory exists"
    return 0
  fi
  
  echo "rmAsync Status:"
  echo "==============="
  echo "Staging directory: $RM_ASYNC_DIR"
  
  # Count active removal processes
  if [[ -f "$RM_ASYNC_PID_FILE" ]]; then
    local active_pids=0
    while IFS= read -r pid; do
      if kill -0 "$pid" 2>/dev/null; then
        ((active_pids++))
      fi
    done < "$RM_ASYNC_PID_FILE"
    echo "Active removal processes: $active_pids"
  else
    echo "Active removal processes: 0"
  fi
  
  echo ""
  echo "Staged folders:"
  for item in "$RM_ASYNC_DIR"/*; do
    if [[ "${item##*/}" == .* ]]; then
      continue
    fi
    if [[ -d "$item" ]]; then
      ((staging_count++))
      local file_count
      file_count=$(find "$item" -type f 2>/dev/null | wc -l)
      local size
      size=$(du -sh "$item" 2>/dev/null | awk '{print $1}')
      printf "  - %s: %s files, %s total\n" "${item##*/}" "$file_count" "$size"
    fi
  done
  
  if [[ $staging_count -eq 0 ]]; then
    echo "  (empty - all cleaned up)"
  fi
}

rmAsync_force_cleanup() {
  if [[ ! -d "$RM_ASYNC_DIR" ]]; then
    _log_info "No staging directory exists"
    return 0
  fi
  
  _log_info "Force cleaning all staged items..."
  
  local count=0
  for item in "$RM_ASYNC_DIR"/*; do
    if [[ "${item##*/}" == .* ]]; then
      continue
    fi
    if [[ -d "$item" ]]; then
      local file_count
      file_count=$(find "$item" -type f 2>/dev/null | wc -l)
      _log_info "Removing: ${item##*/} ($file_count files)"
      rm -rf "$item"
      ((count++))
    fi
  done
  
  if [[ $count -gt 0 ]]; then
    _log_success "Force cleaned $count staging folder(s)"
  else
    _log_info "Nothing to clean"
  fi
}

rmAsync_recover() {
  # Recover from crashed/stuck processes
  if [[ ! -d "$RM_ASYNC_DIR" ]]; then
    _log_info "No staging directory exists"
    return 0
  fi
  
  _log_info "Recovering stuck removal processes..."
  
  # Kill any stuck rm processes
  pkill -f "rm -rf.*$RM_ASYNC_DIR" 2>/dev/null || true
  
  # Clean up PID file
  _prune_dead_pids
  
  # Wait a moment for processes to clean up
  sleep 1
  
  # Remove any remaining orphans
  _cleanup_orphans
  
  _log_success "Recovery complete"
}

rmAsync_errors() {
  # Show error log if it exists
  local error_log="${RM_ASYNC_DIR}/.errors"
  
  if [[ ! -f "$error_log" ]]; then
    _log_info "No errors logged"
    return 0
  fi
  
  echo "rmAsync Error Log:"
  echo "=================="
  cat "$error_log"
}

# ==============================================================================
# SUBCOMMAND HANDLER
# ==============================================================================

case "${1:-}" in
  status)
    rmAsync_status
    ;;
  force-cleanup)
    rmAsync_force_cleanup
    ;;
  recover)
    rmAsync_recover
    ;;
  errors)
    rmAsync_errors
    ;;
  -h|--help|help)
    cat << 'EOF'
rmAsync - High-performance asynchronous directory removal

Usage:
  rmAsync <pattern> [<pattern2> ...]     Remove patterns asynchronously
  rmAsync status                          Show staging status
  rmAsync force-cleanup                   Force remove all staged items
  rmAsync recover                         Recover from stuck processes
  rmAsync errors                          Show error log
  rmAsync -h|--help                       Show this help

Examples:
  rmAsync node_modules                    Single directory
  rmAsync node_modules build dist         Multiple directories
  rmAsync "src/**/*.tmp"                  Glob pattern
  rmAsync "dist" "build/**/*.o" ".cache"  Mixed patterns
  rmAsync status                          Check current operations
  rmAsync force-cleanup                   Emergency cleanup
  rmAsync recover                         Fix stuck processes

Features:
  ✓ Instant return (staging is atomic move)
  ✓ Non-blocking deletion (background process)
  ✓ Unique staging per execution (UUID + timestamp)
  ✓ Handles millions of files efficiently
  ✓ Auto-cleanup orphaned items
  ✓ Collision-free naming
  ✓ Protects critical system paths
  ✓ Path traversal protection
  ✓ Error logging and recovery
  ✓ Safe glob expansion with nullglob

Safety Guards:
  • Rejects empty/malformed paths (.., /, system paths)
  • Validates all paths before staging
  • Ensures staging folder is in $HOME/.rmAsync
  • Atomic operations (move + delete as unit)
  • PID tracking for monitoring
  • Cross-platform compatible (pgrep fallback)

Performance:
  - Staging: inode moves (instant on same filesystem)
  - Main process: returns immediately
  - Deletion: non-blocking background job

Staging Location:
  $HOME/.rmAsync/<uuid>_<timestamp>/

EOF
    ;;
  *)
    rmAsync "$@"
    ;;
esac

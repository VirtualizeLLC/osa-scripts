#!/usr/bin/env zsh
# Platform detection utilities for OSA
# Detects OS type, version, and specific platform characteristics

# Detect the current platform and export standardized variables
detect_platform() {
  export OSA_OS=""
  export OSA_OS_VERSION=""
  export OSA_ARCH=""
  export OSA_IS_WSL=false
  export OSA_IS_MACOS=false
  export OSA_IS_LINUX=false

  # Detect architecture
  OSA_ARCH=$(uname -m)

  # Detect OS
  local os_name=$(uname -s)
  
  case "$os_name" in
    Darwin)
      OSA_OS="macos"
      OSA_IS_MACOS=true
      # Get macOS version
      OSA_OS_VERSION=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
      
      # Detect if running on Apple Silicon or Intel
      if [[ "$OSA_ARCH" == "arm64" ]]; then
        export OSA_MACOS_CHIP="apple-silicon"
      else
        export OSA_MACOS_CHIP="intel"
      fi
      ;;
    Linux)
      # Check if running under WSL
      if grep -qE "(Microsoft|WSL)" /proc/version 2>/dev/null; then
        OSA_OS="wsl"
        OSA_IS_WSL=true
        OSA_IS_LINUX=true
        
        # Detect WSL version
        if [[ -f /proc/sys/fs/binfmt_misc/WSLInterop ]]; then
          export OSA_WSL_VERSION="2"
        else
          export OSA_WSL_VERSION="1"
        fi
        
        # Get Linux distribution info
        if [[ -f /etc/os-release ]]; then
          source /etc/os-release
          OSA_OS_VERSION="${NAME} ${VERSION_ID}"
          export OSA_LINUX_DISTRO="${ID}"
        fi
      else
        OSA_OS="linux"
        OSA_IS_LINUX=true
        
        # Get Linux distribution info
        if [[ -f /etc/os-release ]]; then
          source /etc/os-release
          OSA_OS_VERSION="${NAME} ${VERSION_ID}"
          export OSA_LINUX_DISTRO="${ID}"
        fi
      fi
      ;;
    *)
      OSA_OS="unknown"
      OSA_OS_VERSION="unknown"
      ;;
  esac
}

# Print platform information
print_platform_info() {
  echo "🖥️  Platform Detection:"
  echo "   OS: $OSA_OS"
  echo "   Version: $OSA_OS_VERSION"
  echo "   Architecture: $OSA_ARCH"
  
  if [[ "$OSA_IS_MACOS" == "true" ]]; then
    echo "   Chip: $OSA_MACOS_CHIP"
  fi
  
  if [[ "$OSA_IS_WSL" == "true" ]]; then
    echo "   WSL Version: $OSA_WSL_VERSION"
    echo "   Linux Distro: $OSA_LINUX_DISTRO"
  fi
  
  if [[ "$OSA_IS_LINUX" == "true" && "$OSA_IS_WSL" == "false" ]]; then
    echo "   Linux Distro: $OSA_LINUX_DISTRO"
  fi
  echo ""
}

# Check if platform is supported
is_platform_supported() {
  case "$OSA_OS" in
    macos|linux|wsl)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Auto-detect on source
detect_platform

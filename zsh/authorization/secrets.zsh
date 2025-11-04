#!/usr/bin/env zsh
# OSA Secure Credential Manager
# Abstracts platform-specific secret stores

# Detect platform secret store
osa_secret_store() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "keychain"
  elif command -v secret-tool &>/dev/null; then
    echo "gnome-keyring"
  elif command -v pass &>/dev/null; then
    echo "pass"
  else
    echo "file" # Fallback to encrypted file
  fi
}

# Store a secret securely
# Usage: osa_secret_set "service-name" "username" "password"
osa_secret_set() {
  local service="$1"
  local account="$2"
  local secret="$3"
  local store=$(osa_secret_store)
  
  case "$store" in
    keychain)
      security add-generic-password -a "$account" -s "$service" -w "$secret" -U
      ;;
    gnome-keyring)
      echo -n "$secret" | secret-tool store --label="$service" service "$service" username "$account"
      ;;
    pass)
      echo "$secret" | pass insert -e "osa/$service/$account"
      ;;
    file)
      # Fallback: encrypted file using GPG
      local secrets_dir="$HOME/.osa-secrets"
      mkdir -p "$secrets_dir" && chmod 700 "$secrets_dir"
      echo "$secret" | gpg --encrypt --recipient "$(whoami)" > "$secrets_dir/${service}_${account}.gpg"
      ;;
  esac
  
  echo "✓ Secret stored securely in $store"
}

# Retrieve a secret
# Usage: osa_secret_get "service-name" "username"
osa_secret_get() {
  local service="$1"
  local account="$2"
  local store=$(osa_secret_store)
  
  case "$store" in
    keychain)
      security find-generic-password -a "$account" -s "$service" -w 2>/dev/null
      ;;
    gnome-keyring)
      secret-tool lookup service "$service" username "$account" 2>/dev/null
      ;;
    pass)
      pass show "osa/$service/$account" 2>/dev/null
      ;;
    file)
      local secrets_dir="$HOME/.osa-secrets"
      gpg --decrypt "$secrets_dir/${service}_${account}.gpg" 2>/dev/null
      ;;
  esac
}

# Interactive secret setup wizard
osa_secrets_wizard() {
  echo "OSA Secret Store Setup"
  echo "======================"
  echo ""
  echo "Available stores:"
  echo "  1. Keychain (macOS)"
  echo "  2. GNOME Keyring (Linux)"
  echo "  3. pass (CLI password manager)"
  echo "  4. Encrypted file (GPG - fallback)"
  echo ""
  echo "Detected: $(osa_secret_store)"
  echo ""
  
  read -p "Service name (e.g., github, npm): " service
  read -p "Username/account: " account
  read -s -p "Secret/token: " secret
  echo ""
  
  osa_secret_set "$service" "$account" "$secret"
}

# Export for use in constructors
alias osa-secret-set='osa_secret_set'
alias osa-secret-get='osa_secret_get'
alias osa-secrets='osa_secrets_wizard'
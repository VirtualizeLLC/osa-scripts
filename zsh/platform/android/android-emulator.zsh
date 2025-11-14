#!/usr/bin/env zsh
# Possible bonuses are forcing GPU to use hardware -gpu host 
EMULATOR_DEFAULT_ARGS='-no-audio'

# List all available emulators
list_emulators() {
  if ! command -v emulator &>/dev/null; then
    echo "Error: emulator command not found. Is Android SDK installed?"
    return 1
  fi
  
  emulator -list-avds
}

# Get the first available emulator
get_first_emulator() {
  local first_emulator=$(list_emulators | head -n1)
  
  if [[ -z "$first_emulator" ]]; then
    echo "Error: No emulators found"
    return 1
  fi
  
  echo "$first_emulator"
}

# Launch first available emulator
launch_first() {
  local emulator_name=$(get_first_emulator)
  if [[ $? -eq 0 ]]; then
    emulator -avd "$emulator_name" $EMULATOR_DEFAULT_ARGS
  fi
}

# Launch emulator by name (or first if not found)
launch_emulator() {
  local name="${1:-}"
  
  if [[ -z "$name" ]]; then
    launch_first
    return
  fi
  
  emulator -avd "$name" $EMULATOR_DEFAULT_ARGS
}
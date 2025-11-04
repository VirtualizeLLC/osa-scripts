#!/usr/bin/env zsh
# React Native

# Detect which package manager to use based on lock file, then available binary
# Usage: run_with_package_manager install
run_with_package_manager() {
  local cmd="$1"
  
  # Check for lock files first (respects project setup)
  if [[ -f "bun.lockb" ]]; then
    bun "$cmd"
  elif [[ -f "pnpm-lock.yaml" ]]; then
    pnpm "$cmd"
  elif [[ -f "yarn.lock" ]]; then
    yarn "$cmd"
  elif [[ -f "package-lock.json" ]]; then
    npm "$cmd"
  else
    # Fall back to available binary if no lock file
    if command -v bun &>/dev/null; then
      bun "$cmd"
    elif command -v pnpm &>/dev/null; then
      pnpm "$cmd"
    elif command -v yarn &>/dev/null; then
      yarn "$cmd"
    else
      npm "$cmd"
    fi
  fi
}

alias react-native="npx react-native"
alias rn='react-native'
alias rnios='rn run-ios'
alias rn-fix="killall node; rm -rf ./node_modules; watchman watch-del-all; rm -rf tmp/haste-map-react-native-packer; rm -fr \$TMPDIR/react-*; run_with_package_manager install"
alias rnra="react-native run-android"
alias rn-debug="adb shell input keyevent 82"
alias rnd="rn-debug"
alias crna="npx create-react-native-app"

# iOS bugfix
alias third-party-fix="rm -rf ~/.rncache;
                       cd node_modules/react-native;
                       rm -fr third-party;
                       scripts/ios-install-third-party.sh;
                       cd third-party/glog-0.3.5/
                       ./configure;
                       "
## RN: Android
adbReverse(){ echo "adb reverse tcp:$1 tcp$2"}
alias rn-ar="adbReverse"
#!/usr/bin/env zsh

# Blindly picks the name of the first available virtual device
function EchoEmulatorFirstAvdName {
  $ANDROID_HOME/emulator/emulator -list-avds | head -1
}

function FirstAvd {
  # selects the device only the second line
  adb devices | sed -n "2,2p"
}

function ConnectAvd {
  adb tcpip 5555;

  if [[ -z $DEFAULT_AVD ]]
  then
  else
    adb devices | sed -n "2,2p"
  fi
}

# Prints the name of your chosen default AVD, or (if you didn't choose one)
# it will print the name of the first available AVD
function EchoDefaultAvdName {
  echo ${DEFAULT_AVD:-$(EchoFirstAvdName)}
}

# launches the optionally specified AVD
# With no argument, it will use $DEFAULT_AVD or the first available AVD
# e.g.: LaunchAvdForeground Nexus_5X_API_23
function LaunchAvdForeground {
  local avdName=${1:-$(EchoDefaultAvdName)}
  echo "Launching AVD: $avdName"
  $ANDROID_HOME/emulator/emulator -avd $avdName
}

# launches the optionally specified AVD as a background process
# With no argument, it will use $DEFAULT_AVD or the first available AVD
# e.g.: LaunchAvdBackground Nexus_5X_API_23
function LaunchAvdBackground {
  local avdName=${1:-$(EchoDefaultAvdName)}
  echo "Launching AVD: $avdName"
  nohup $ANDROID_HOME/emulator/emulator -avd $avdName &>/dev/null &
}

# Launches the optionally specified AVD only if no android emulator
# is presently running.  Note that this will skip launching if any
# android emulator is already running - not just the emulator of the
# AVD you specify (if you specified).
function LaunchAvdIfNeeded {
  if [[ -z $(pgrep emulator) ]]; then LaunchAvdBackground $1; fi
}

  # android

# Setup aapt tool so it accessible using a single command
aapt(){
  $ANDROID_HOME/build-tools/30.0.3/aapt
}

# Install APK to device
# Use as: apkinstall app-debug.apk
apkinstall(){
  adb devices | tail -n +2 | cut -sf 1 | xargs -I X adb -s X install -r $1
}
# As an alternative to apkinstall, you can also do just ./gradlew installDebug

# Alias for building and installing the apk to connected device
# Run at the root of your project
# $ buildAndInstallApk

buildAndInstallApk(){
  ./gradlew assembleDebug && apkinstall ./app/build/outputs/apk/debug/app-debug.apk
}

# Launch your debug apk on your connected device
# Execute at the root of your android project
# Usage: launchDebugApk
launchDebugApk() {
  adb shell monkey -p `aapt dump badging ./app/build/outputs/apk/debug/app-debug.apk | grep -e 'package: name' | cut -d \' -f 2` 1
}
# ------------- Single command to build+install+launch apk------------#
# Execute at the root of your android project
# Use as: buildInstallLaunchDebugApk
buildInstallLaunchDebugApk(){
  "buildAndInstallApk && launchDebugApk"
}

# Open an activity on the connected Android device
# Supports both direct activity specification and interactive discovery
android-open-activity(){
  local package_name="$1"
  local activity_name="$2"
  
  # Validate adb is available
  if ! command -v adb &>/dev/null; then
    echo "Error: adb command not found. Is Android SDK installed?"
    return 1
  fi
  
  # Check if device is connected
  if ! adb devices | grep -q "device$"; then
    echo "Error: No Android device connected"
    return 1
  fi
  
  # If no package name provided, show help
  if [[ -z "$package_name" ]]; then
    echo "Usage: android-open-activity [package-name] [activity-name]"
    echo ""
    echo "Examples:"
    echo "  android-open-activity com.myapp                    # List activities to choose from"
    echo "  android-open-activity com.myapp MainActivity       # Open specific activity"
    return 0
  fi
  
  # If activity name not provided, list available activities for discovery
  if [[ -z "$activity_name" ]]; then
    _discover_and_open_activity "$package_name"
    return $?
  fi
  
  # Direct activity launch
  _launch_activity "$package_name" "$activity_name"
}

# Helper function: List available activities for a package and let user choose
_discover_and_open_activity(){
  local package_name="$1"
  
  echo "Discovering activities for $package_name..."
  
  # Get list of activities using dumpsys
  local activities=$(adb shell dumpsys package "$package_name" | grep -A 100 "android.intent.action.MAIN" | grep "cmp=" | sed 's/.*cmp=//g' | sed 's/}.*//g' | sort -u)
  
  if [[ -z "$activities" ]]; then
    echo "No activities found via MAIN intent. Trying alternative method..."
    # Fallback: extract from package manager
    activities=$(adb shell cmd package query-activities -a android.intent.action.MAIN | grep "package:" | sed "s/.*package=//" | grep "$package_name" | sort -u)
  fi
  
  if [[ -z "$activities" ]]; then
    echo "Error: No activities found for package '$package_name'"
    return 1
  fi
  
  # Display activities and let user choose
  echo ""
  echo "Available activities:"
  echo ""
  
  local -a activity_list
  local count=0
  
  while IFS= read -r activity; do
    if [[ -n "$activity" ]]; then
      ((count++))
      activity_list+=("$activity")
      printf "%3d) %s\n" "$count" "$activity"
    fi
  done <<< "$activities"
  
  echo ""
  
  # If only one activity, launch it automatically
  if [[ $count -eq 1 ]]; then
    echo "Only one activity found. Launching automatically..."
    _launch_activity "$package_name" "${activity_list[1]}"
    return $?
  fi
  
  # Prompt user to select
  read "choice?Select activity (1-$count): "
  
  if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > count )); then
    echo "Invalid selection"
    return 1
  fi
  
  local selected_activity="${activity_list[$choice]}"
  _launch_activity "$package_name" "$selected_activity"
}

# Helper function: Launch a specific activity
_launch_activity(){
  local package_name="$1"
  local activity_name="$2"
  
  echo "Opening $package_name/$activity_name..."
  adb shell am start -n "$package_name/$activity_name"
  
  if [[ $? -eq 0 ]]; then
    echo "✓ Activity launched successfully"
  else
    echo "✗ Failed to launch activity"
    return 1
  fi
}

# Single reverse binding with optional protocol
adbReverse(){ 
  local device_port="$1"
  local host_port="$2"
  local protocol="${3:-tcp}"
  
  if [[ -z "$device_port" || -z "$host_port" ]]; then
    echo "Usage: adbReverse <device_port> <host_port> [protocol]"
    echo "Example: adbReverse 3000 8080"
    echo "Example: adbReverse 3000 8080 tcp"
    echo ""
    echo "Supported protocols:"
    echo "  tcp          - TCP sockets (default)"
    echo "  udp          - UDP sockets"
    echo "  localabstract - Unix domain sockets (abstract)"
    echo "  localfilesystem - Unix domain sockets (filesystem)"
    return 1
  fi
  
  echo "Binding device:$protocol:$device_port -> host:$protocol:$host_port"
  adb reverse $protocol:$device_port $protocol:$host_port
}

# Reverse all ports from a list with optional protocol
adb-reverse-all(){
  local protocol="${1:-tcp}"
  local -a ports=("${@:2}")
  
  # Check if first arg looks like a protocol or port number
  if [[ "$protocol" =~ ^[0-9]+$ ]]; then
    # First arg is a port, so default to tcp
    protocol="tcp"
    ports=("$@")
  fi
  
  if [[ ${#ports[@]} -eq 0 ]]; then
    echo "Usage: adb-reverse-all [protocol] <port1> [port2] [port3] ..."
    echo "Example: adb-reverse-all 3000 5000 8080"
    echo "Example: adb-reverse-all udp 5000 5001"
    echo "Example: adb-reverse-all localabstract service1 service2"
    echo ""
    echo "Supported protocols:"
    echo "  tcp               - TCP sockets (default)"
    echo "  udp               - UDP sockets"
    echo "  localabstract     - Unix domain sockets (abstract)"
    echo "  localfilesystem   - Unix domain sockets (filesystem)"
    return 1
  fi
  
  # Check if device is connected
  if ! adb devices | grep -q "device$"; then
    echo "Error: No Android device connected"
    return 1
  fi
  
  echo "Setting up reverse port bindings with protocol: $protocol"
  echo ""
  
  local success=0
  local failed=0
  
  for port in "${ports[@]}"; do
    if [[ -z "$port" ]]; then
      continue
    fi
    
    # For tcp/udp, validate numeric ports; for unix sockets, just validate non-empty
    if [[ "$protocol" =~ ^(tcp|udp)$ ]] && ! [[ "$port" =~ ^[0-9]+$ ]]; then
      echo "✗ Invalid port: $port (must be a number for $protocol)"
      ((failed++))
      continue
    fi
    
    if adb reverse $protocol:$port $protocol:$port &>/dev/null; then
      echo "✓ Bound $protocol:$port -> $protocol:$port"
      ((success++))
    else
      echo "✗ Failed to bind $protocol:$port"
      ((failed++))
    fi
  done
  
  echo ""
  echo "Summary: $success successful, $failed failed"
  [[ $failed -eq 0 ]]
}

# List all active reverse bindings
adb-reverse-list(){
  echo "Active reverse bindings:"
  adb reverse --list || echo "Error: No device connected or no bindings"
}

# Remove a specific reverse binding with optional protocol
adb-reverse-unset(){
  local device_port="$1"
  local protocol="${2:-tcp}"
  
  if [[ -z "$device_port" ]]; then
    echo "Usage: adb-reverse-unset <device_port> [protocol]"
    echo "Example: adb-reverse-unset 3000"
    echo "Example: adb-reverse-unset service1 localabstract"
    echo ""
    echo "Supported protocols:"
    echo "  tcp               - TCP sockets (default)"
    echo "  udp               - UDP sockets"
    echo "  localabstract     - Unix domain sockets (abstract)"
    echo "  localfilesystem   - Unix domain sockets (filesystem)"
    return 1
  fi
  
  if ! adb devices | grep -q "device$"; then
    echo "Error: No Android device connected"
    return 1
  fi
  
  echo "Removing binding for device:$protocol:$device_port..."
  
  if adb reverse --remove $protocol:$device_port &>/dev/null; then
    echo "✓ Binding removed"
  else
    echo "✗ Failed to remove binding (may not exist)"
    return 1
  fi
}

# Remove all reverse bindings
adb-reverse-unset-all(){
  if ! adb devices | grep -q "device$"; then
    echo "Error: No Android device connected"
    return 1
  fi
  
  echo "Removing all reverse bindings..."
  
  if adb reverse --remove-all &>/dev/null; then
    echo "✓ All bindings removed"
  else
    echo "✗ Failed to remove bindings"
    return 1
  fi
}

# Alias for convenience
adb-reverse-restore(){
  adb-reverse-unset-all
}


adba(){
# Run an adb command on all connected devices
# Usage: adba install-r ./path/to/app.apk
#        adba shell am start -n com.package/com.package.Activity
#        adba logcat

  devices=$(adb devices | grep -v "List of attached devices" | grep -v "^$" | awk '{print $1}')

  if [ -z "$devices" ]; then
    echo "No devices connected"
    exit 1
  fi

  device_count=$(echo "$devices" | wc -l)
  echo "Running: adb $@ (on $device_count device(s))"
  echo ""

  for device in $devices; do
    echo "→ $device"
    adb -s "$device" "$@"
    echo ""
  done
}
#!/usr/bin/env zsh
# Xcode Commands

# opens xcode workspace
# useful for react-native-development
xcwo(){
  echo "opening nearest .xcodeworkspace dir within 2 levels";

  if test -d ./*.xcworkspace; then
    open ./*.xcworkspace
  elif test -d ./ios/*.xcworkspace; then
    open ./ios/*.xcworkspace
  else
    echo "error: cannot find .xcworkspace in current directory or ./ios/"
    return 1
  fi
}

# helps fix issues with builds
alias purgeallbuilds='rm -rf ~/Library/Developer/Xcode/DerivedData/*'
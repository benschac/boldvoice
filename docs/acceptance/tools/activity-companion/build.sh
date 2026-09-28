#!/bin/bash
set -euo pipefail

fixture_dir="$(cd "$(dirname "$0")" && pwd)"
fixture_build="$fixture_dir/build"
fixture_app="$fixture_build/ActivityCompanion.app"
fixture_widget="$fixture_app/PlugIns/ActivityCompanionWidget.appex"
fixture_sdk="$(xcrun --sdk iphonesimulator --show-sdk-path)"

mkdir -p "$fixture_widget" "$fixture_build/module-cache"
cp "$fixture_dir/App-Info.plist" "$fixture_app/Info.plist"
cp "$fixture_dir/Widget-Info.plist" "$fixture_widget/Info.plist"

swift_flags=(
  -sdk "$fixture_sdk"
  -target arm64-apple-ios16.4-simulator
  -swift-version 5
  -parse-as-library
  -emit-executable
  -module-cache-path "$fixture_build/module-cache"
  -Xlinker -rpath -Xlinker /usr/lib/swift
)

xcrun --sdk iphonesimulator swiftc "${swift_flags[@]}" \
  -module-name ActivityCompanionWidget -application-extension \
  "$fixture_dir/CompanionAttributes.swift" "$fixture_dir/CompanionWidget.swift" \
  -o "$fixture_widget/ActivityCompanionWidget"

xcrun --sdk iphonesimulator swiftc "${swift_flags[@]}" \
  -module-name ActivityCompanion \
  "$fixture_dir/CompanionAttributes.swift" "$fixture_dir/CompanionApp.swift" \
  -o "$fixture_app/ActivityCompanion"

plutil -lint "$fixture_app/Info.plist" "$fixture_widget/Info.plist"
codesign --force --sign - --timestamp=none "$fixture_widget"
codesign --force --sign - --timestamp=none "$fixture_app"
codesign --verify --deep --strict "$fixture_app"
printf '%s\n' "$fixture_app"

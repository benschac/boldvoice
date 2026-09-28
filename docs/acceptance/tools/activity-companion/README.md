# Second-app ActivityKit fixture

This dependency-free simulator app requests its own `CompanionAttributes` activity. It never reads or changes study timer sessions or study timer activities. Its bundle IDs are `com.benjaminschachter.activitycompanion` and `com.benjaminschachter.activitycompanion.widget`.

From the repository root, build only after the lead's native build queue is free:

```sh
bash docs/acceptance/tools/activity-companion/build.sh
```

Output: `docs/acceptance/tools/activity-companion/build/ActivityCompanion.app`.

The build uses the selected Xcode simulator SDK, targets arm64 iOS Simulator with minimum iOS16.4, compiles the app and extension with `xcrun swiftc`, then ad-hoc signs the nested extension before the app. It does not install or launch anything. Build outputs stay in the ignored local build directory. No Expo, React Native, package manager, or Xcode project changes are involved.

After a successful build, substitute the already selected simulator UUID for `SIMULATOR_UUID`:

```sh
xcrun simctl install SIMULATOR_UUID docs/acceptance/tools/activity-companion/build/ActivityCompanion.app
xcrun simctl launch SIMULATOR_UUID com.benjaminschachter.activitycompanion
```

Start a study session in the real app first. Open Activity Companion and tap **Start companion activity**. Its status should report an activity ID. Return to the Home Screen. Look for the study timer's numeric minimal presentation alongside the companion's orange C or stack symbol. The companion requests a relevance score of 100 to favor its own prominent placement. iOS chooses the actual arrangement; inspect it rather than assuming the study timer became minimal. If necessary, stop and restart the companion, or reverse the order of the two activity requests. Capture an actual screenshot or recording showing the study timer's elapsed value in the minimal region.

After capture, open the companion and tap **Stop companion activity**. Confirm the status reports zero nonterminal companion activities and its system presentation disappears. Optional cleanup after stopping:

```sh
xcrun simctl uninstall SIMULATOR_UUID com.benjaminschachter.activitycompanion
```

This copy preserves the temporary fixture sources without their build outputs. See the [acceptance log](../../study-timer.md) for observed build and presentation results. Source or syntax checks alone do not establish rendering. Retain exact build/runtime errors if direct compilation needs adjustment.

Apple references: [WidgetBundle entry point](<https://developer.apple.com/documentation/swiftui/widgetbundle/main()>), [Live Activity configuration and requests](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities), [extension point identifier](https://developer.apple.com/documentation/bundleresources/information-property-list/nsextension/nsextensionpointidentifier).

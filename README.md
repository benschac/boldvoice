# Study Timer

An iOS count-up study timer built with Expo SDK 58 preview, React Native 0.88 RC, TypeScript, and Swift. Start a named session, pause or resume it, and stop it from the app. A WidgetKit Live Activity shows the session on the Lock Screen and Dynamic Island.

D1–D3 passed the recorded implementation gates and independent reviews, including actual simulator presentation, pause/resume timing, and a clean native setup. Read the [acceptance log](docs/acceptance/study-timer.md) for observed results, fixtures, evidence, and outstanding checks. A passing build or unit test does not establish visible system behavior.

## Run locally

Use macOS with Xcode and an installed iPhone simulator that has Dynamic Island. The verified environment is Xcode 26.6, iPhone 17 Pro on iOS 26.5, Node 24.15.0, and Bun 1.4.0. The app uses an inline native module and a widget extension, so it requires a custom iOS build. Expo Go cannot run it. Android and web show an unsupported-feature message.

From the repository root:

```sh
bun install --frozen-lockfile
bunx expo-doctor
bunx expo install --check
xcrun simctl list devices available
```

Start Metro from the repository root and leave it running:

```sh
bunx expo start --localhost --port 8081
```

In another terminal, also from the repository root, build and launch. The UUID below identifies the simulator used for acceptance on this host. Replace it with an available Dynamic Island simulator UUID from the preceding list on another machine.

```sh
STUDY_TIMER_SIMULATOR=17B7C9FD-C6DF-4248-9485-0F89AC405A97
CI=1 bunx expo prebuild --platform ios
CI=1 bunx expo run:ios --device "$STUDY_TIMER_SIMULATOR" --no-bundler
node plugins/verify-study-timer.js
```

Run native generation and simulator operations one at a time. The initial build installs CocoaPods dependencies and compiles native code. The application has bundle identifier `com.benjaminschachter.studytimer`; its home-screen name is `mobile`.

`ios/` is generated. Edit the Swift sources, widget sources, configuration, or plugin, then regenerate and rebuild. SDK 58 prebuild cleans generated native projects by default. Do not hand-edit the generated Xcode project.

### Commands

| Command, from repository root | Purpose                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `bun run dev`                 | Start Expo / Metro through Bun                                                                   |
| `bun run ios`                 | Build and launch the native iOS app                                                              |
| `bun run ios:build`           | Prebuild and compile iOS; use the explicit simulator commands above for a reproducible selection |
| `bun run typecheck`           | Check TypeScript                                                                                 |
| `bun run lint`                | Run Expo ESLint                                                                                  |
| `bun run build`               | Export the web app to `dist`; does not build iOS                                                 |
| `bun run web`                 | Open the unsupported-platform web screen                                                         |

## Verification

From the repository root:

```sh
bun run typecheck
bun run lint
swift test --package-path native
node --experimental-strip-types --test tests/timer-*.test.mjs
```

D1 recorded 30 passing Foundation tests, and D2 recorded 11 passing TypeScript formatting and command tests. The Swift tests exercise the actual file store and a coordinator with controlled activity adapters. They do not prove ActivityKit rendering. The TypeScript tests cover elapsed formatting, pause/resume arithmetic, and uncertain-error recovery. Node may print a harmless module-type detection warning for the TypeScript imports.

After native generation, from the repository root:

```sh
node plugins/verify-study-timer.js
```

This read-only check verifies one widget target, one embed entry, the app dependency, shared attributes in both targets, the app-only inline module folder, exclusion of host tests, and repeated plugin application. It does not compile or launch the app.

### Check regeneration in a disposable copy

From the repository root, copy the source without installed or generated build files:

```sh
STUDY_TIMER_CHECK=$(mktemp -d /tmp/study-timer-prebuild.XXXXXX)
rsync -a --exclude=.git --exclude=node_modules --exclude=ios --exclude=android --exclude=.expo --exclude=.build ./ "$STUDY_TIMER_CHECK/"
cd "$STUDY_TIMER_CHECK"
bun install --frozen-lockfile
CI=1 bunx expo prebuild --platform ios --no-install
node plugins/verify-study-timer.js
CI=1 bunx expo prebuild --platform ios --no-install --no-clean
node plugins/verify-study-timer.js
```

The clean and incremental prebuild commands were exercised in a disposable copy during D1. `--no-install` is sufficient for this project-structure check; an actual native build also needs CocoaPods installation.

### Reviewer demo

Begin with the app idle; stop any session left from a previous run. Relaunching preserves sessions.

1. Enter `Chapter 5 Review` and tap Start. Check the app's elapsed time, the Lock Screen name and running time, and the compact Island.
2. Pause and wait ten seconds. Check that both surfaces remain frozen. Resume and confirm the paused interval is excluded.
3. Press and hold the Island to inspect the expanded name, elapsed time, and labeled 25-minute goal ring. Exercise a long name as well. The ring is a goal indicator; elapsed time continues beyond 25 minutes.
4. Leave the app and lock the simulator for at least 60 seconds. Return and compare the reconciled app value with the system timer.
5. Terminate and relaunch while running, then repeat while paused. Confirm the stored session returns and no duplicate activity appears.
6. Stop running and paused sessions and check that the activity disappears. Repeat Start/Stop quickly and inspect for leftover activities.
7. Disable the app's Live Activities in iOS Settings. Start a session and verify the local timer continues with an unavailable status. Restore the setting, return to the app, and use Retry when the activity is missing. Separately swipe the activity away on the Lock Screen, return to observe missing, and explicitly Retry.
8. Try blank and overlong names, large text, dark mode, keyboard dismissal, and VoiceOver navigation. The recorded accessibility-tree inspection is separate from VoiceOver testing.

Use full real-time screen recordings to measure the 1–2 second pause/resume propagation requirement. Do not use a recording with idle time removed. Minimal Island presentation requires a concurrent activity from another app. The included [Activity Companion fixture](docs/acceptance/tools/activity-companion/README.md) established that trigger during D3; stop its activity after the check. The [acceptance log](docs/acceptance/study-timer.md) contains measured results and explicit limits. Physical-device, VoiceOver navigation, and a separate dark-mode walkthrough remain unrun.

## Architecture

| Component                                           | Responsibility                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/features/study-timer`                          | Typed platform facade, React hook, controls, warnings, and display-only ticks         |
| `native/StudyTimer/StudyTimerModule.swift`          | Expo `AsyncFunction` bridge                                                           |
| `native/StudyTimer/StudyTimerActivityAdapter.swift` | ActivityKit requests, updates, enumeration, and ending                                |
| `native/StudyTimer/Core`                            | FIFO session commands, validation, elapsed math, reconciliation, and file persistence |
| `native/Shared/StudyTimerAttributes.swift`          | Attributes compiled into both the app and widget targets                              |
| `widgets/study-timer`                               | SwiftUI Lock Screen and Dynamic Island layouts                                        |
| `plugins/with-study-timer.js`                       | Recreates the widget target, embedding, settings, and shared source membership        |
| `native/Tests`                                      | Foundation host tests, outside the app's watched native folder                        |

Swift owns one canonical session. It writes a versioned JSON snapshot under Application Support after each transition; it never writes every second. React renders the snapshot returned by native code and calculates elapsed display time from its timestamps. The widget uses system date-based timer text so it can keep counting without JavaScript execution.

Persistence and ActivityKit cannot commit atomically. Start persists before requesting an activity; Stop deletes the snapshot before ending activities. Launch, foreground, and Start reconcile activities against the stored session, ending orphans. A missing activity is never recreated automatically because the user may have dismissed it. Retry is explicit. A failed activity request leaves the local session usable and visible as unavailable.

For the system's constrained height, Lock Screen and expanded layouts cap Dynamic Type at `.large`. Names use 13pt text, shrinking to 70% within four lines; minimal elapsed uses 9pt. The full name remains an accessibility label. The largest-text fixture verifies fitting, not full large-text support or VoiceOver navigation.

The app persists running and paused sessions across termination. Names are trimmed and limited natively to 80 Unicode characters. System timer formatting may differ from the app's zero-padded `HH:MM:SS`, and dimmed simulator displays may suppress seconds. Manual clock changes and iOS's Live Activity lifetime limit are documented limitations. See the [technical requirements](TECHNICAL_REQUIREMENTS.md) for the full contract and assumptions.

## Integration lessons

The hardest integration was proving that the inline module could request an activity that the separately compiled extension actually rendered. The Expo Modules macro spike failed because the app target could not load the `ExpoModulesMacros` compiler plugin. The implementation uses the planned `Module` / `AsyncFunction` DSL fallback behind the same TypeScript contract. Actual bridge calls and Lock Screen rendering established that the fallback worked.

Mistakes caught and fixed during implementation:

- Reinstalling the original lockfile did not remove duplicate native dependencies. A hoisted Bun install and a React Native override aligned the installed tree with the app's existing RC version; `expo-doctor` then passed 20/20.
- A plain Swift coded error lost its public code when wrapped by Expo's asynchronous DSL. A real bridge check exposed `ERR_UNEXPECTED`; the native exception fix preserved the contract codes.
- Rendering the bridge's raw error message exposed Expo exceptions and Swift source paths. The screen now maps stable codes to concise messages and uses a generic message for unknown failures.
- During the initial nested-directory setup, one native command ran from the wrong directory. The acceptance log preserves that incident; current commands run from the repository root.

The next improvements are physical-device and VoiceOver checks and reassessment of the preview SDK once a stable compatible release is available. A repeatable asserted app flow and companion fixture are included under `docs/acceptance`; timing and system layouts still require inspecting actual recordings. Session history and remote updates are outside this challenge's scope.

## Local review stack

The stack is published for review in [benschac/boldvoice](https://github.com/benschac/boldvoice). Review bottom to top; merging requires a separate instruction.

| Branch                           | Parent                    | Review focus                                                                   |
| -------------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `docs/study-timer-plan`          | `chore/project-skills`    | Contract, assumptions, delivery gates                                          |
| `feat/study-timer-native`        | `docs/study-timer-plan`   | Completed D1: baseline, module, persistence, lifecycle, minimal widget, plugin |
| `feat/study-timer-screen`        | `feat/study-timer-native` | Completed D2: controls, native state, errors, foreground reconciliation        |
| `feat/study-timer-live-surfaces` | `feat/study-timer-screen` | Completed D3 tip: system layouts, acceptance evidence, reviewer handoff        |

Check out the complete app with `gt checkout feat/study-timer-live-surfaces`. Review a slice with `git diff <parent>..<branch>` using the table above. Review each implementation branch against its listed parent. The working app is on `feat/study-timer-live-surfaces`. Each implementation branch was created after its required gate passed. Project pstack roles inherit the parent's model and reasoning settings, with one bounded independent reviewer per diff. The [implementation plan](IMPLEMENTATION_PLAN.md) owns that policy.

## Troubleshooting

- **Native module missing or old widget layout:** use the custom native build above after regenerating. Restarting Metro cannot compile native changes; Expo Go cannot load this module.
- **Live Activity unavailable:** check this app's Live Activities setting. The local timer remains usable. Restore permission, foreground the app, and tap Retry explicitly.
- **Duplicate dependencies:** use the committed `bunfig.toml`, root override, and lockfile together. Verify with `expo-doctor` and `expo install --check`; do not downgrade individual preview packages to silence a warning.
- **Preview peer warning:** the installed Expo core advertises a worklets peer range below the SDK-selected 0.13.0. This mismatch is recorded; the successful native build provides integration evidence for this checkout.
- **Simulator installation hangs:** the baseline Expo command stalled in `simctl terminate`/`install`; restarting the selected simulator allowed installation and launch. Stop the stalled task before retrying, and preserve app data when testing termination/relaunch.
- **Simulator access fails in a sandbox:** the recorded inspection needed host access. Treat that as an environment boundary, not an app failure.

The original [challenge requirements](REQUIREMENTS.md) remain the source of truth. Acceptance artifacts describe this local implementation; they do not replace the final human demo.

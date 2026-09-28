# Study timer acceptance

D1–D3 passed their implementation gates and independent reviews. Simulator presentation, replay, timing, clean setup, and repairs are recorded below. Implementation acceptance was completed locally. A subsequent user request authorizes stack publication; merging remains excluded.

## Current gates

| Gate | Status | Evidence                                                                                                                                                                  |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 A | Passed | Starter launch, DSL bridge, real running and paused Live Activity, long-duration fixture, repeated generation, host math tests, minimal-trigger attempt                   |
| D1 B | Passed | Durable lifecycle, 30 Foundation tests, real bridge error codes, native lifecycle smoke, paused-session relaunch                                                          |
| D2   | Passed | Real screen and Settings interaction, 11 Node tests, typecheck, lint, independent review                                                                                  |
| D3   | Passed | Four system presentations, measured Pause ≤1.519 s and Resume ≤1.590 s, background/termination/rapid cleanup, dismissal/retry, 47 passed replay steps, fresh native setup |

Host tests, native builds, simulator observations, and review findings are separate evidence. Only the observations recorded here are accepted. VoiceOver navigation, physical-device acceptance, and a separate dark-mode walkthrough are unrun; these are not claimed as passed.

## Environment

- 2026-09-28, macOS host, Xcode 26.6 build 17F113.
- Bun 1.4.0, Node 24.15.0; Expo 58 preview and React Native 0.88 RC from the existing lockfile.
- Selected simulator: iPhone 17 Pro, iOS 26.5, `17B7C9FD-C6DF-4248-9485-0F89AC405A97`.
- Completed local stack: `main → chore/project-skills → docs/study-timer-plan → feat/study-timer-native → feat/study-timer-screen → feat/study-timer-live-surfaces`. The implementation run had no remote. The subsequent publishing request uses `git@github.com:benschac/boldvoice.git`.

## Baseline evidence

- Initial `bunx expo-doctor`: 19/20 checks; duplicate native packages.
- Clean `bun install --frozen-lockfile`: succeeded, 744 packages; doctor still 19/20 with the same duplicates. This rules out a stale installed tree.
- Hoisted install exposed stale React Native rc.1 peer copies. Root override pins the existing app version rc.2. A clean install from the revised lockfile succeeded; `expo-doctor` passed **20/20** and `expo install --check` reported dependencies up to date. Original installed folders remain under `/private/tmp/boldvoice-d1-baseline` for this run.
- `bun run typecheck` and `bun run lint` both passed after adding the typed platform facade.
- Known preview peer mismatch remains: expo-modules-core 58.0.8 declares worklets through ^0.10, while the SDK-selected app uses 0.13.0. No downgrade; native build is the integration check.
- Starter native build command: `CI=1 bunx expo run:ios --device 17B7C9FD-C6DF-4248-9485-0F89AC405A97 --no-bundler`. Log: `/private/tmp/boldvoice-d1-baseline/starter-build.log`. Native compilation succeeded, zero errors and four warnings. The reported missing Metal toolchain search path did not fail compilation. Expo then stalled in `simctl terminate` and `simctl install`; those task-owned subprocesses were stopped, and the selected simulator was restarted. After the selected simulator restart, `simctl install` and `simctl launch` succeeded. The starter rendered "Welcome to Expo" in the iPhone 17 Pro simulator, observed through screenshot and accessibility tree. Baseline build/launch passed.
- Initial sandboxed simulator inspection failed to connect; host-access retry listed installed simulators successfully. This is a sandbox boundary, not an app failure.

## Checkpoint A initial checks

- Host `swift test --package-path apps/mobile/native`: 3 behavior tests passed: pause/resume excludes paused time, backward clock delta clamps, repeated transitions are idempotent. These tests do not exercise ActivityKit.
- Macro design correction from installed source: the empty definition is `func definition() -> ModuleDefinition {}`. The originally planned `ModuleDefinition {}` initializer is not public. The subsequent compiler failure and successful DSL bridge invocation are recorded below.
- Plugin syntax and ESLint passed. An in-memory project check verified extension target, embed entry, dependency, and shared source membership against the generated starter. The subsequent repeated-generation check is recorded below.

## Macro integration outcome

The first native spike build failed with `external macro implementation type 'ExpoModulesMacros.ExpoModuleMacro' could not be found ... plugin for module 'ExpoModulesMacros' not found`. The generated provider then could not treat StudyTimerModule as AnyModule. Swift also rejected an implicit ExpoModulesCore import because the generated provider imports it as internal. The implementation switched to the documented DSL fallback and retained the TypeScript API. Full log: `/private/tmp/boldvoice-d1-baseline/spike-build.log`.

## Native generation

Disposable copy: `/private/tmp/boldvoice-d1-prebuild-check`. Both `CI=1 bunx expo prebuild --platform ios --no-install` and a second run with `--no-clean` passed. After each run, `node plugins/verify-study-timer.js` verified one extension target, one embedding entry, app dependency, shared attributes in both targets once, and exactly one synchronized module folder attached only to the app. Host tests and `Package.swift` are outside the watched tree. Applying the plugin twice in memory left the project unchanged. Logs: `/private/tmp/boldvoice-d1-baseline/prebuild-first.log` and `prebuild-second.log`.

## Checkpoint A observed result

Passed on iPhone 17 Pro / iOS 26.5 using DSL AsyncFunction fallback. Build: zero errors, three warnings, then install and launch succeeded. `getCapabilities` crossed the JS/native bridge and returned supported/activitiesEnabled true. Start returned an active session. Actual compact Island showed truncated Chapter… and 1:01:10. Awake Lock Screen showed Chapter 5 Review and advanced from 1:01:54 to 1:02:01. Pause committed 3,750,862.812 ms; the Lock Screen showed 1:02:30 and remained there after a ten-second wait. Compact Island also showed 1:02:30. Resume preserved accumulated time and set a new anchor; Stop returned idle. These are real simulator observations with a temporary initial timestamp fixture of 3,661,000 ms, not one hour of measured runtime. The fixture was removed before D1 completion; Checkpoint B used a zero-based session.

Evidence: [running Lock Screen](evidence/d1-running-lock.png), [paused Lock Screen](evidence/d1-paused-lock.png); `/private/tmp/boldvoice-d1-baseline/dsl-build.log`. While dimmed, the simulator hides seconds in system timer text. The awake display shows ticking seconds.

Minimal trigger attempt: searched the simulator for Clock while the activity was active. Search returned an App Store Clock listing instead of an installed app. This attempt did not start a concurrent activity. D1 recorded that limitation; D3 later established the actual minimal presentation using a local Activity Companion.

Implementation mistake caught: one rebuild command was launched from the repository root instead of `apps/mobile`. It generated a root `app.json`; the process was stopped and that newly generated file was moved to `/private/tmp/boldvoice-d1-baseline/accidental-root-app.json`. The successful build ran from `apps/mobile`. No generated root project is part of the diff.

## D1 independent review and repairs

One inherited-model reviewer audited D1 read-only using the project interrogate rubric. Three findings accepted: Expo async DSL erased a plain CodedError's public code; storage allowed finite timestamps beyond the widget date range; corrupt-snapshot cleanup hid an unconfirmed end.

Real bridge reproduction before repair: tapping the smoke screen's invalid-name action returned `ERR_UNEXPECTED: Error: UnexpectedException: The operation couldn't be completed ... TimerBridgeError ... ConcurrentFunctionDefinition.swift:77`, not INVALID_NAME. This exposed a bridge failure outside the Foundation host tests. The repairs replaced the plain error with an Expo exception carrying an explicit code, rejected unsupported dates, and reported unconfirmed cleanup. Checkpoint B records the fresh simulator checks.

## Checkpoint B observed result

The reviewed build passed with zero errors and three warnings. Real JS calls returned INVALID_NAME, SESSION_CONFLICT and STALE_SESSION after the exception fix. A zero-based session created a real active activity and a matching `schemaVersion: 1` snapshot. Session E8F2DD12-DBF3-4F6A-8F5C-AB9722407C08 paused at 17,037.755 ms. After `simctl terminate` and relaunch, getSession returned the same paused ID, elapsed value and active activity. Resume kept the committed elapsed value and added a new running anchor. Stop returned idle with no warning; a filesystem check confirmed session.json was absent.

Foundation tests: 30 passed including real file read/write failures, corruption and version rejection, huge timestamp rejection, crash windows, suspended concurrent commands, cleanup failure reporting, and explicit retry. The reviewer rechecked the three fixes and reported no unresolved findings. These tests are controlled-adapter evidence; the simulator observations above exercise the real module and ActivityKit. Logs: `/private/tmp/boldvoice-d1-baseline/d1-reviewed-build.log` and `d1-swift-tests.log`.

D1 gates passed. The minimal-trigger attempt satisfied its D1 requirement; D3 later supplied actual minimal-view evidence.

## D2 observed result

Passed on the same simulator using the final screen. Blank Start showed "Enter a session name." An 81-character ASCII name was rejected by native validation and displayed "Enter a session name of 1–80 characters." The first UI run exposed Expo exception internals; error-code mapping fixed it and the repeated real input showed the friendly text. The keyboard dismissed on submission. A double-click on Start produced one session. Pause remained at 00:00:09 across more than ten seconds, Resume continued it, and Stop returned to the new-session form. Foreground reconciliation briefly disabled controls, then replaced the stale display with current native elapsed time. Labels and identifiers were inspected through the accessibility tree; this is not a VoiceOver navigation test.

Real Settings test: disabled this app's Live Activities, started Chapter 5 Review, observed unavailable while the local timer advanced, and retried while disabled without losing the session. Restored the setting, returned to the app, observed missing without automatic recreation, and tapped Retry. Status became active at 00:00:32. These gestures did not establish Lock Screen swipe dismissal; the later D3 Argent interaction did.

Root validation: 11 Node formatting/command tests, typecheck and lint passed. One independent D2 reviewer reported no additional findings. [D2 screen](evidence/d2-screen.png). No native code changed in D2.

## D3 observed presentation and replay

The final D3 build passed with zero errors and zero warnings (`d3-final-build.log`). An earlier successful compilation/install could not open Expo's URL while the simulator was locked (`LSApplicationWorkspaceErrorDomain` code 115); unlocking and launching by bundle identifier worked. Compilation had succeeded; URL launch failed while locked.

Argent 0.26.0 was run through `bunx @swmansion/argent@0.26.0` from temporary storage. No app dependency, global installation, initializer, or editor configuration was added. Its describe, tap, swipe, hardware button, screenshot and long-press functions worked on the real simulator. A first immediate description after foregrounding still showed the prior screen; waiting for the actual target before the action resolved that transition. CUA had completed D1/D2 controls and Settings tests, but did not establish the long-press or dismissal gestures. Argent established both. Recording uses simctl H.264 with no idle-time removal. Committed copies are compressed for size without cutting the timeline; exact timing uses original frame presentation timestamps.

The local Activity Companion source was compiled, installed and started after a study activity. This exposed the real minimal view. The initial 46 pt timer clipped its leading digit; the final 34 pt frame with 9 pt text displayed 1:01:01 completely. [Minimal hour fixture](evidence/d3-minimal-hour.png). The companion later reported zero nonterminal activities after Stop.

An injected `schemaVersion: 1` snapshot with 80 W characters and 3,661,000 ms paused elapsed exposed bottom clipping in expanded presentation. This was a persisted fixture, not an hour of measured runtime or normal user input. The final layout showed the entire name, 1:01:01, and complete ring; Resume showed 1:01:11 with the running ring still capped at 100%. The goal label was inset after a second rounded-corner clipping observation. [Final paused expanded](evidence/d3-expanded-long-paused.png), [running beyond goal](evidence/d3-expanded-over-goal.png), [Lock Screen at largest text setting](evidence/d3-long-lock-large-text.png). Default text size was restored. The app scrolls to keep controls reachable with a long name.

Lock Screen swipe dismissal was actually observed with Argent: the card disappeared, foreground reconciliation returned missing with the same paused 1:01:01 session, and explicit Retry returned active. This is separate from the D2 disabled-permission test.

The saved [D2 lifecycle replay](flows/d2-lifecycle.yaml) ran on the D3 widget build before the final pending-state repair, with 47 passed, 0 failed, 0 skipped, and 0 errors across 55 recorded steps in 30.768 seconds. It cleans up an existing session, restarts to clear transient form input, tests blank validation and keyboard submission, verifies name/phase/status, pauses, resumes and stops. [Machine result](evidence/d2-flow.json). Its ten-second phase assertion does not by itself prove elapsed freezing; the separate timed observations do.

Independent D3 review accepted the widget and rechecked the saved visual evidence. README adapter ownership and dismissal steps were corrected. Accessibility tradeoff: Lock Screen and expanded layouts cap Dynamic Type at `.large`. Names use 13 pt text, a 70% minimum scale, and up to four lines. Minimal elapsed text uses 9 pt. Full names remain accessible labels. Actual VoiceOver navigation and physical-device acceptance remain unrun.

## D3 measured timing and lifecycle

The [full timeline recording](evidence/d3-realtime.mp4) and [Resume retake](evidence/d3-resume-retake.mp4) retain idle periods. They are compressed 30 fps viewing copies. Measurements below use actual presentation timestamps (PTS) from the original variable-frame-rate recordings, not resampled contact sheets, API completion, or wall-clock creation tags. Original captures remain at `/private/tmp/boldvoice-d1-baseline/d3-final-realtime.mp4` (349.178333 s) and `resume-retake.mp4` (40.423333 s). The viewing copies round their final frame duration; that is not elapsed-time drift.

| Observation                | Original frame PTS, seconds                                                       | Result                                                                     |
| -------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Pause propagation          | Unpressed app at 13.680000; Lock Screen Paused 0:09 at 15.198333                  | Conservative pre-input upper bound **1.518333 s**, passes ≤2 s             |
| Resume propagation, retake | Pressed Resume, still paused at 12.903333; Lock Screen Studying 0:28 at 14.493333 | Conservative pre-command upper bound **1.590000 s**, passes ≤2 s           |
| Paused Lock Screen         | 0:09 at 15.198333 and 30.496667                                                   | Frozen across **15.298334 s**                                              |
| Background and locked      | 0:10 at 79.636667; 1:16 at 145.298333                                             | 66 displayed seconds across **65.661666 s**, within whole-second precision |
| Return to app              | Lock Screen 1:16 at 145.298333; app 00:01:37 at 166.016667                        | 21 displayed seconds across **20.718334 s**, within whole-second precision |

Exact source frames: [before Pause](evidence/d3-pause-before.png), [Pause on Lock Screen](evidence/d3-pause-after.png), [pressed Resume](evidence/d3-resume-before.png), [Resume on Lock Screen](evidence/d3-resume-after.png). The first recording's Resume bound was 2.021667 s because its last static frame preceded the visible press by 1.013333 s. That capture could not prove a strict two-second upper bound. The retake held Resume down for 500 ms; the pressed, still-paused frame precedes release and the `Pressable.onPress` command. Its conservative bound closes the gate without treating the earlier uncertainty as a pass or failure.

The [action log](evidence/d3-actions.json) records termination and relaunch alongside UI operations. Paused termination left 0:09 on the Lock Screen; relaunch restored the same paused session. After Resume and the background check, running termination left the Island counting. Expanded presentation advanced from 2:32 to 3:24 while the app process was terminated, and the goal ring visibly advanced: [before](evidence/d3-ring-before.png), [after](evidence/d3-ring-after.png). Relaunch adopted the session and reported active.

Five rapid Start/Stop cycles followed by a final Pause/Stop returned the app to idle with no cleanup warning. The Island disappeared and `session.json` was absent. [Final idle screen](evidence/d3-after-rapid-stop.png). These were real UI commands, separate from the controlled-adapter concurrency tests. Both running and paused Stop paths were exercised, and subsequent Start created a clean session. The retake's [separate action log](evidence/d3-resume-actions.json) records the final patched-build Resume check; Stop left the app idle afterward.

## Fresh setup and final native repair

A fresh source copy at `/private/tmp/boldvoice-final-clean-check` excluded installed and generated files. Frozen install succeeded with 745 packages and unchanged lockfile SHA-256 `b802b9a2b4835a58f806d6d2672b467a7c269c6e0d2c04ae90a689980b4f6e9d`. Fresh typecheck, lint, 11 Node tests, and 30 Foundation tests passed. Clean prebuild installed CocoaPods; the generated-project verifier passed. Native compilation completed with zero errors and five warnings, installed, launched, and rendered the idle form. `expo-doctor` passed 20/20 and `expo install --check` reported up-to-date dependencies. Logs: `/private/tmp/boldvoice-d1-baseline/final-clean-{native,doctor,swift-tests}.log` and the other `final-clean-*` logs in that directory.

The clean build exposed an exhaustiveness warning for ActivityKit's newer pending state. Treating unknown states as ended could skip reconciliation cleanup. The adapter now maps pending and future states to its existing nonterminal stale representation. A bounded native review confirmed this preserves reconciliation and cleanup. D1 was amended to `aba2dd2` through Graphite MCP and D2 restacked to `c0f8731`; the fix remains in its owning branch.

The final patched native build passed with zero errors and three linker warnings (two missing Metal search paths and one duplicate libc++ entry); the exhaustiveness warning is gone. Actual Start, Pause, Resume, and Stop passed on that installed build, including the measured Resume retake above. Pending state itself was not induced in the simulator. The fresh clean build preceded this small adapter repair; the final repair received a native incremental build and real lifecycle smoke. Log: `/private/tmp/boldvoice-d1-baseline/d1-pending-fix-build.log`.

D3's independent reviewer accepted the widget implementation and visual evidence. The lead checked the original timing frames and final native results before closing its gate. Native generation, builds, installation, and simulator operations were serialized throughout. The complete local app is on `feat/study-timer-live-surfaces`; no branch had been published or merged when implementation acceptance closed. The subsequent user request authorizes publishing the stack for review, without merging. Follow the root [README](../../README.md) for checkout, build, tests, and the reviewer demo.

## UI polish continuation

The approved direction keeps the timer primary: ivory and forest-green light mode, a dark forest palette, restrained typography, native capsule controls, and matching sage/amber Live Activity accents. The native coordinator, persistence, ActivityKit adapter, command serialization, foreground reconciliation, and timestamp arithmetic are unchanged. Widget edits are color-only.

The stack uses the existing Expo UI SwiftUI buttons, Expo Router header, SF Symbols through expo-image, and Reanimated's 180 ms entrance fade with system Reduce Motion handling. `react-native-keyboard-controller` 1.22.4 is the only added dependency. Native keyboard insets alone left Start obscured; KeyboardAwareScrollView now measures the form footer and bounds its clearance so large text cannot push the focused field offscreen. Pressto, Skia, and a general UI kit are deferred: this slice has native button feedback and no custom drawing requirement.

Fresh observations on iPhone 17 Pro / iOS 26.5 after native rebuild:

- [Idle](evidence/ui-polish/01-idle.png), [keyboard](evidence/ui-polish/02-keyboard.png), and [running](evidence/ui-polish/03-running.png): default text shows the complete field and Start action above the keyboard. Blank submission displayed the validation error. Keyboard Done started a real session.
- [Paused dark mode](evidence/ui-polish/04-paused-dark.png): elapsed remained 00:00:11 through more than twenty seconds of inspection. Resume continued from the committed value.
- Home compact presentation counted while backgrounded. The [awake Lock Screen](evidence/ui-polish/06-lock-running.png) displayed the new palette and advancing elapsed time. Returning to the app reconciled to the native time; controls were briefly disabled during reconciliation.
- [Largest accessibility text controls](evidence/ui-polish/09-large-controls.png): actions stack vertically with complete labels. Actual Resume and Stop succeeded. [Keyboard at largest text](evidence/ui-polish/10-large-keyboard.png) retained the complete input above the keyboard; helper text and Start require scrolling at this size. Keyboard Done still started a session, and Stop returned to idle.
- Restored default `large` text size and light appearance, and stopped the test session. No active Island remained on the idle capture.

Validation: format check, lint, typecheck, 11 Node timer tests, and 30 Foundation tests passed. Expo dependency compatibility check and generated-target verifier passed. Native generation, build, install, and launch completed serially; build reported zero errors and four linker warnings, including the existing missing Metal search path. Build log: `/private/tmp/study-timer-ui-polish/native-build.log`. One independent reviewer found the unbounded keyboard-clearance issue; the capped calculation was rechecked with no remaining source-level finding.

This pass is simulator and source evidence. Physical-device testing, VoiceOver navigation, actual Reduce Motion playback, and the combined largest-text/Live-Activities-disabled case remain unrun. The previously recorded D2/D3 disabled-permission, dismissal, termination, and precise propagation timing checks were not fully replayed for this presentation-only continuation. A development-only LogBox prompt appeared after launch; its underlying message was not recovered in this pass.

## Rolling timer animation

Integrated the [reference Digit implementation](https://github.com/hewad-mubariz/reactnative-50-days/blob/main/timer/src/components/Digit.tsx) into the existing elapsed display. The reference App, TimerScreen, Timer, Digit, and IconButton sources were read. The integration retains the paired outgoing/incoming text layers, clipped cell, upward translation, and 300 ms timing. It adapts the reference's demo countdown and Anton styling to the native-authoritative count-up and existing system typography. No gradient screen, placeholder actions, competing navigation, packages, or native changes were added. The existing Expo Router route reaches the animation through normal Start/Resume actions.

Runtime path B: existing Expo development build, iPhone 17 Pro / iOS 26.5. Metro restarted with `--dev-client --clear`; no native rebuild was needed for this TypeScript-only change. The block references Expo 52/Reanimated 3; this app continues to use its existing SDK 58/Reanimated 4 installation. There are no newly installed package versions to reconcile.

Observed on the real simulator:

- [Rolling digits recording](evidence/timer-animation/rolling-digits.mp4) shows outgoing digits moving upward and incoming digits entering from below, including `00:01:59` to `00:02:00`. This is an eight-second excerpt of the simulator capture, resized to 402 px wide; original `/private/tmp/timer-animation/rolling-digits.mp4` retains the full capture.
- Pause settled at `00:02:02` and remained there through opening Settings and returning. Resume continued from that native elapsed value. The accessibility tree exposed a single `Elapsed time` element rather than duplicate outgoing/incoming digits.
- Enabled Reduce Motion in iOS Settings, resumed, and recorded [immediate digit updates](evidence/timer-animation/reduced-motion.mp4), including `00:02:09` to `00:02:10`. Restored the original disabled preference afterward. This validates a real preference change without reloading the app, not an injected flag.
- [Largest accessibility text](evidence/timer-animation/largest-text.png) shows the full `00:02:27` value without horizontal clipping. Restored default `large` text size. The session remains paused rather than being discarded.

Format check, lint, typecheck, and all 11 existing timer command/format tests passed. One independent source reviewer found no actionable issues. Native lifecycle code is unchanged; prior Foundation/ActivityKit acceptance is not claimed as freshly replayed. Android, VoiceOver navigation, and release-build performance on a physical device remain unverified.

The earlier LogBox prompt is now identified as Reanimated's native dependency-array warning. The installed keyboard-controller hooks pass dependency arrays to Reanimated, which reports that they are ignored on native. The new rolling-digit hooks do not supply those arrays. The warning remains visible in development; no dependency patch or suppression was introduced.

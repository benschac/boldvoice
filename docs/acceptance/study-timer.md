# Study timer acceptance

Implementation is in progress. Unobserved gates remain open.

## Environment

- 2026-09-28, macOS host, Xcode 26.6 build 17F113.
- Bun 1.4.0, Node 24.15.0; Expo 58 preview and React Native 0.88 RC from the existing lockfile.
- Selected simulator: iPhone 17 Pro, iOS 26.5, `17B7C9FD-C6DF-4248-9485-0F89AC405A97`.
- Existing local stack: `main → chore/project-skills → docs/study-timer-plan`. No remote. Publishing and merging excluded.

## Baseline evidence

- Initial `bunx expo-doctor`: 19/20 checks; duplicate native packages.
- Clean `bun install --frozen-lockfile`: succeeded, 744 packages; doctor still 19/20 with the same duplicates. This rules out a stale installed tree.
- Hoisted install exposed stale React Native rc.1 peer copies. Root override pins the existing app version rc.2. A clean install from the revised lockfile succeeded; `expo-doctor` passed **20/20** and `expo install --check` reported dependencies up to date. Original installed folders remain under `/private/tmp/boldvoice-d1-baseline` for this run.
- `bun run typecheck` and `bun run lint` both passed after adding the typed platform facade.
- Known preview peer mismatch remains: expo-modules-core 58.0.8 declares worklets through ^0.10, while the SDK-selected app uses 0.13.0. No downgrade; native build is the integration check.
- Starter native build command: `CI=1 bunx expo run:ios --device 17B7C9FD-C6DF-4248-9485-0F89AC405A97 --no-bundler`. Log: `/private/tmp/boldvoice-d1-baseline/starter-build.log`. Native compilation succeeded, zero errors and four warnings. The reported missing Metal toolchain search path did not fail compilation. Expo then stalled in `simctl terminate` and `simctl install`; those task-owned subprocesses were stopped, and the selected simulator was restarted. After the selected simulator restart, `simctl install` and `simctl launch` succeeded. The starter rendered “Welcome to Expo” in the iPhone 17 Pro simulator, observed through screenshot and accessibility tree. Baseline build/launch passed.
- Initial sandboxed simulator inspection failed to connect; host-access retry listed installed simulators successfully. This is a sandbox boundary, not an app failure.

## Open gates

- D1 A: starter launch, macro discovery, real running/paused ActivityKit rendering, long duration, repeated generation, Swift math tests, minimal trigger attempt.
- D1 B: durable store/lifecycle tests, bridge checks, native start/pause/resume/stop smoke.
- D2: screen input, accessibility, foreground/retry, formatting tests, typecheck/lint.
- D3: system layouts, measured update latency, 60-second background, termination/relaunch, rapid commands, disabled/missing activity, clean setup.

Host tests, native compilation, simulator observations, and human review will be recorded separately. No gate is passed by this checklist alone.

## Checkpoint A preparation

- Host `swift test --package-path apps/mobile/native`: 3 behavior tests passed: pause/resume excludes paused time, backward clock delta clamps, repeated transitions are idempotent. These tests do not exercise ActivityKit.
- Macro design correction from installed source: the empty definition is `func definition() -> ModuleDefinition {}`. The originally planned `ModuleDefinition {}` initializer is not public. Native compilation and async bridge invocation remain pending.
- Plugin syntax and ESLint passed. An in-memory project check verified extension target, embed entry, dependency, and shared source membership against the generated starter. Full prebuild regeneration and inline folder membership remain pending.

## Macro integration outcome

The first native spike build failed with `external macro implementation type 'ExpoModulesMacros.ExpoModuleMacro' could not be found ... plugin for module 'ExpoModulesMacros' not found`. The generated provider then could not treat StudyTimerModule as AnyModule. Swift also rejected an implicit ExpoModulesCore import because the generated provider imports it as internal. The documented DSL fallback is being applied; the TypeScript API stays unchanged. Full log: `/private/tmp/boldvoice-d1-baseline/spike-build.log`.

## Native generation

Disposable copy: `/private/tmp/boldvoice-d1-prebuild-check`. Both `CI=1 bunx expo prebuild --platform ios --no-install` and a second run with `--no-clean` passed. After each run, `node plugins/verify-study-timer.js` verified one extension target, one embedding entry, app dependency, shared attributes in both targets once, and exactly one synchronized module folder attached only to the app. Host tests and Package.swift are outside the watched tree. Applying the plugin twice in memory left the project unchanged. Logs: `/private/tmp/boldvoice-d1-baseline/prebuild-first.log` and `prebuild-second.log`.

## Checkpoint A observed result

Passed on iPhone 17 Pro / iOS 26.5 using DSL AsyncFunction fallback. Build: zero errors, three warnings, then install and launch succeeded. `getCapabilities` crossed the JS/native bridge and returned supported/activitiesEnabled true. Start returned an active session. Actual compact Island showed truncated Chapter… and 1:01:10. Awake Lock Screen showed Chapter 5 Review and advanced from 1:01:54 to 1:02:01. Pause committed 3,750,862.812ms; the Lock Screen showed 1:02:30 and remained there after a ten-second wait. Compact Island also showed 1:02:30. Resume preserved accumulated time and set a new anchor; Stop returned idle. These are real simulator observations with a temporary initial timestamp fixture of 3,661,000ms, not one hour of measured runtime. The fixture must be removed before D1 completion.

Evidence: [running Lock Screen](evidence/d1-running-lock.png), [paused Lock Screen](evidence/d1-paused-lock.png); `/private/tmp/boldvoice-d1-baseline/dsl-build.log`. While dimmed, the simulator hides seconds in system timer text. The awake display shows ticking seconds.

Minimal trigger attempt: searched the simulator for Clock while the activity was active. Search returned an App Store Clock listing instead of an installed app. No concurrent activity was started; actual minimal presentation remains OPEN under the documented trigger allowance.

Implementation mistake caught: one rebuild command was launched from the repository root instead of apps/mobile. It generated a root app.json; the process was stopped and that newly generated file was moved to `/private/tmp/boldvoice-d1-baseline/accidental-root-app.json`. The successful build ran from apps/mobile. No generated root project is part of the diff.

## D1 independent review and repairs

One inherited-model reviewer audited D1 read-only using the project interrogate rubric. Three findings accepted: Expo async DSL erased a plain CodedError's public code; storage allowed finite timestamps beyond the widget date range; corrupt-snapshot cleanup hid an unconfirmed end.

Real bridge reproduction before repair: tapping the smoke screen's invalid-name action returned `ERR_UNEXPECTED: Error: UnexpectedException: The operation couldn’t be completed ... TimerBridgeError ... ConcurrentFunctionDefinition.swift:77`, not INVALID_NAME. This demonstrates why Foundation host tests alone were insufficient. Fixes and fresh simulator checks are pending.

## Checkpoint B observed result

The reviewed build passed with zero errors and three warnings. Real JS calls returned INVALID_NAME, SESSION_CONFLICT and STALE_SESSION after the exception fix. A zero-based session created a real active activity and a matching schemaVersion1 snapshot. Session E8F2DD12-DBF3-4F6A-8F5C-AB9722407C08 paused at 17,037.755ms. After `simctl terminate` and relaunch, getSession returned the same paused ID, elapsed value and active activity. Resume kept the committed elapsed value and added a new running anchor. Stop returned idle with no warning; a filesystem check confirmed session.json was absent.

Foundation tests: 30 passed including real file read/write failures, corruption and version rejection, huge timestamp rejection, crash windows, suspended concurrent commands, cleanup failure reporting, and explicit retry. The reviewer rechecked the three fixes and reported no unresolved findings. These tests are controlled-adapter evidence; the simulator observations above exercise the real module and ActivityKit. Logs: `/private/tmp/boldvoice-d1-baseline/d1-reviewed-build.log` and `d1-swift-tests.log`.

D1 gates passed, with the documented minimal-trigger attempt recorded and full minimal visual acceptance deferred to D3. D2 and D3 gates remain open.

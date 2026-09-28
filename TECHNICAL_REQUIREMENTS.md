# Study timer: technical design

Status: proposed implementation, 2026-09-28. [REQUIREMENTS.md](REQUIREMENTS.md) is authoritative. [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) defines delivery order and contains the embedded architecture, data relationship, lifecycle, and stack diagrams.

## Repository baseline

The workspace contains an Expo Router starter in `apps/mobile`, Bun workspaces, and Turbo. `apps/mobile/package.json` requests Expo `~58.0.0-preview.7`; `bun.lock` resolves Expo `58.0.0-preview.8`, `expo-modules-core` `58.0.8`, and React Native `0.88.0-rc.2`. There is no study timer, local native module, or widget extension yet. The existing `ios` script starts Metro; it does not build custom native code. No Git remote is configured at planning time.

Known baseline defects, fixed in D1 before any native work:

- `bunx expo-doctor` fails: multiple copies of `expo`, `expo-constants`, `expo-font`, `expo-glass-effect`, `expo-linking`, `@expo/dom-webview`, and `@expo/log-box` are installed. The installed tree also contains React Native `0.88.0-rc.1` alongside `rc.2`, and `expo-modules-core` declares a `react-native-worklets` peer range (`^0.7`–`^0.10`) that excludes the app's `0.13.0`.
- `app.json` has no `ios.bundleIdentifier`, so `expo run:ios` would prompt interactively and the extension has no parent identifier to derive from.

## Decisions and scope

Build an iOS count-up timer with one active session. React Native owns user interactions and screen presentation. An inline Expo module owns the canonical session snapshot, persistence, and ActivityKit commands. The widget extension renders ActivityKit content through SwiftUI. This avoids two independently ticking sources of truth.

The bridge is an [inline Expo module](https://docs.expo.dev/modules/inline-modules-tutorial/): Swift source inside the app project, compiled into the main app target, with no separate package, podspec, or autolinking step. Inline modules are experimental (SDK 56 and later) and the API may change; this repo is on SDK 58. How the installed version works (`expo-modules-autolinking` 58.0.5, `@expo/inline-modules` 0.2.0):

- `experiments.inlineModules.watchedDirectories` in `app.json` lists the scanned folders. At prebuild, each becomes an Xcode synchronized folder on the main target, so **every file in it is compiled into the app**, including helper Swift files that are not modules.
- A Swift file is registered as a module only if its text matches `func definition() -> …ModuleDefinition`. The JS name is the file name: `StudyTimerModule.swift` is loaded with `requireNativeModule('StudyTimerModule')`.
- Watched folders cannot be `./`, cannot contain spaces or parentheses, and cannot be nested inside another watched folder.

Prefer Expo Modules 2.0 Swift macros (`@ExpoModule`, `@JS`) for the module body. A macro-only module does not contain the text that discovery looks for, so it would not be registered. The macro documentation says its synthesized members are merged into the module's definition, so the plan is `@ExpoModule` with `@JS` methods plus an empty `func definition() -> ModuleDefinition { ModuleDefinition {} }` for discovery. D1 proves this registers and that an async `@JS` call crosses the bridge. If it fails, record the exact failure and use the DSL (`AsyncFunction`) inside `definition()` behind the same TypeScript interface. Generated TypeScript is still upcoming work in the [Expo Modules 2.0 announcement](https://expo.dev/blog/an-early-look-at-expo-modules-2-0), so the contract stays hand-written.

The Live Activity is a WidgetKit extension, not an Expo native view. No Android implementation, backend, push updates, account system, session history, or lock-screen action buttons are required. Web and Android entry points should show an unsupported-feature message without loading an iOS-only binding.

## Documented assumptions

The challenge leaves these open. Each is a deliberate choice the review team should see.

Product behavior:

- Session names are trimmed, required, and limited to 80 Unicode characters. Show a short note that the name appears on the Lock Screen.
- The expanded progress ring represents a fixed 25-minute focus goal. Label it accordingly, cap it at 100%, and let elapsed time continue until Stop. It is a display aid, not a countdown or auto-stop.
- Pause/Resume/Stop remain app controls. Starting another session while one exists requires stopping the first.
- If Live Activities are disabled or a request fails, the local timer still runs with a visible "Live Activity unavailable" status and an explicit foreground retry. Do not claim the lock-screen feature succeeded.

Platform behavior:

- **App killed:** the requirement allows "ends gracefully or persists with last state". We persist. The running timer text is date-based, so the Lock Screen keeps counting after termination; a paused activity stays frozen. The app reconciles on next launch.
- **Lock Screen time format:** the Live Activity uses the system timer text (`Text(timerInterval:pauseTime:countsDown:showsHours:)`) so iOS ticks it without app updates. Its format is chosen by the system and may not match the app's zero-padded `HH:MM:SS` (for example, no leading zero hour). Record the observed format; accept the difference rather than pushing per-second updates.
- **Timer text width:** system timer text reserves space for its widest value, which can clip in compact and minimal Island regions. Give it explicit frames there and verify with long-duration fixtures.
- **Minimal presentation:** iOS shows the minimal view only when more than one app has an active Live Activity. The planned trigger is a concurrent activity from another app (for example, a Clock timer, to be verified on the simulator). If it cannot be reproduced, show previews and leave that acceptance item explicitly open.
- **Eight-hour limit:** iOS ends a Live Activity after about eight hours active. The app timer keeps running; foreground reconciliation reports the activity as missing and offers retry.
- **Update latency:** the 1–2 second target is measured, not assumed. Record the simulator with `xcrun simctl io booted recordVideo` and step through frames around Pause and Resume.
- **Clock changes:** elapsed time uses the wall clock, matching the date-based system timer. Manual clock jumps are a documented limitation; negative deltas are clamped to zero.
- **Deployment targets:** the app uses the SDK's supported minimum; the extension targets at least iOS 16.2 (`ActivityContent`, `request(attributes:content:pushType:)`). Local toolchain at planning time: Xcode 26.6. Use a Dynamic Island simulator for acceptance.

Engineering choices:

- **Corrupt storage is discarded.** An unreadable snapshot ends every activity of this module's type and returns idle with a warning. Losing a corrupt timer is an acceptable outcome for a study timer; a recovery UI is not justified here.
- **Own config plugin, no target-generation package.** The widget extension is a separate Xcode target, and `ios/` is generated, so a config plugin must add that target on every prebuild. We write a single-purpose local plugin instead of adding `@bacons/apple-targets`: it avoids a dependency for one target and keeps the generated project changes readable. If editing the Xcode project blocks D1, stop and ask before adding a dependency.
- **Inline module instead of a local module package.** It removes the `create-expo-module` scaffold, podspec, rename, and autolinking verification, and compiles session code into the app target, where sharing the attributes file with the widget is Apple's standard setup. The trade-off is an experimental API; if it breaks, a `create-expo-module` local module can host the same Swift files behind the same TypeScript interface.
- **Stay on the preview SDK** chosen by the scaffold. Preview/RC risk is recorded rather than downgraded mid-challenge.

## Requirement mapping

| Challenge requirement                         | Implementation owner                  | Acceptance evidence                                                               | Diff   |
| --------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| Custom name; HH:MM:SS elapsed                 | Timer screen + native snapshot        | Start with a custom name; verify formatting past one hour with a fixture          | D1–D2  |
| Pause / Resume                                | Serialized session coordinator        | Frozen time while paused; resume excludes paused interval                         | D1–D2  |
| Stop ends timer and activity                  | Coordinator + ActivityKit             | Stop running and paused sessions; no activity remains                             | D1–D2  |
| Lock Screen name, elapsed, 1–2 second updates | SwiftUI system timer text             | Screen recording around pause/resume                                              | D1, D3 |
| Background behavior                           | OS-rendered time from content         | Background and lock for 60 seconds; no drift on return                            | D3     |
| App killed                                    | Persistence + reconciliation          | Force quit running and paused; relaunch adopts the activity or reports it missing | D1, D3 |
| Rapid start/stop; no zombies                  | FIFO commands + orphan reconciliation | Burst test; zero activities after final Stop                                      | D1, D3 |
| Compact name + time                           | Widget compact regions                | Long-name truncation; time stays visible                                          | D3     |
| Expanded full name, time, ring                | Widget expanded regions               | Bounded name wraps; labeled goal ring reflects state                              | D3     |
| Minimal elapsed                               | Widget minimal region                 | Concurrent-activity trigger or documented open item                               | D3     |
| Clean native bridge                           | Inline Expo module + typed facade     | Native build and API contract checks                                              | D1     |
| Reproducible repo and demo                    | Plugin + README + evidence            | Clean generated build and scripted walkthrough                                    | D1, D3 |

## Timer model

Persisted snapshot fields:

| Field            | Meaning                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `sessionId`      | UUID generated natively at Start; immutable                        |
| `name`           | Validated display name; immutable                                  |
| `phase`          | `running` or `paused`; no snapshot means idle                      |
| `accumulatedMs`  | Elapsed running time committed before the current running segment  |
| `runningSinceMs` | Unix epoch milliseconds for the current segment; null while paused |
| `goalDurationMs` | 1,500,000 for the labeled 25-minute goal                           |

`activityStatus` (`active`, `unavailable`, or `missing`) is computed on every result by looking up the activity whose attributes carry the session ID. It is not persisted, and neither is an activity ID: the session ID in the attributes is the association.

Running elapsed is `accumulatedMs + max(0, nowMs - runningSinceMs)`; paused elapsed is `accumulatedMs`. Pause commits elapsed and clears the anchor; Resume sets a new anchor. The foreground JS interval only redraws the screen. It never updates native state or ActivityKit.

For the widget, derive an effective start date as `runningSinceMs - accumulatedMs`. Render time with `Text(timerInterval: effectiveStart...farFuture, pauseTime: pausedAt, countsDown: false)`, where paused content sets `pauseTime` to freeze the value. Render the running goal ring with `ProgressView(timerInterval: effectiveStart...effectiveStart + goal, countsDown: false)` and a static `ProgressView(value:)` while paused. If the timer-driven ring does not advance in the extension, show a labeled snapshot ring updated at transitions instead.

## Proposed TypeScript contract

This is an API specification, not code already implemented:

```ts
type ActivityStatus = "active" | "unavailable" | "missing";
type SessionSnapshot = {
  sessionId: string;
  name: string;
  phase: "running" | "paused";
  accumulatedMs: number;
  runningSinceMs: number | null;
  goalDurationMs: number;
  activityStatus: ActivityStatus;
};
type TimerWarning = {
  code:
    | "ACTIVITY_UNAVAILABLE"
    | "ACTIVITY_MISSING"
    | "ACTIVITY_CLEANUP_UNCONFIRMED"
    | "SESSION_DISCARDED";
  message: string;
};
type TimerResult = {
  session: SessionSnapshot | null;
  warning: TimerWarning | null;
};
interface StudyTimerModule {
  getCapabilities(): Promise<{
    supported: boolean;
    activitiesEnabled: boolean;
  }>;
  getSession(): Promise<TimerResult>; // reconciles before returning
  start(options: { name: string }): Promise<TimerResult>;
  pause(sessionId: string): Promise<TimerResult>;
  resume(sessionId: string): Promise<TimerResult>;
  stop(sessionId: string): Promise<TimerResult>;
  retryActivity(sessionId: string): Promise<TimerResult>;
}
```

Public time units are milliseconds; native conversion to `Date` happens once at the boundary. Rejections carry stable codes: `INVALID_NAME`, `SESSION_CONFLICT`, `STALE_SESSION`, and `PERSISTENCE_FAILED`. The first three are raised before any write, so they prove state is unchanged. For `PERSISTENCE_FAILED` or an uncoded error, React refreshes with `getSession` before showing state.

Command semantics:

- Start while a session exists rejects with `SESSION_CONFLICT`. Pause while paused and Resume while running return the current snapshot. Stop while idle returns an idle result.
- A command whose session ID differs from the stored session rejects with `STALE_SESSION` and changes nothing.
- Commands are serialized through a FIFO queue across their entire async operation. Actor isolation alone is insufficient because an actor can reenter across `await`. The UI also disables controls while a command is pending.

## Persistence and reconciliation

The store is a native Foundation file, `Application Support/StudyTimer/session.json`, holding `{ schemaVersion: 1, session }`. It is replaced atomically with [Foundation's atomic write option](https://developer.apple.com/documentation/foundation/nsdata/writingoptions/atomic) on each transition, never per second. No App Group is needed because the extension reads ActivityKit content, not the file. There is exactly one writer: the coordinator. React never persists a copy.

Each transition makes one write, and the write is the commit point:

- **Start:** reconcile (end every activity of this type), validate, write the running snapshot, then request the activity. If the request throws, the timer still runs with `ACTIVITY_UNAVAILABLE`.
- **Pause / Resume:** write the new snapshot, then update the matching activity's content.
- **Stop:** delete the snapshot, then end every activity of this type with immediate dismissal. Deleting first means a crash between the two steps leaves only an orphan activity, which the next reconciliation ends.

Reconciliation runs in `getSession` (launch and foreground) and at the start of every Start:

1. Load the snapshot. Missing file means idle. Invalid JSON or an unsupported schema means discard: end all activities of this type, delete the file, and return idle with `SESSION_DISCARDED`. An I/O read failure rejects with `PERSISTENCE_FAILED` and deletes nothing.
2. End every nonterminal activity of `StudyTimerAttributes` whose session ID does not match the stored session. Never touch other attributes types.
3. If a matching nonterminal activity exists, adopt it (`active`). Otherwise report `missing`, or `unavailable` if Live Activities are disabled. Never recreate automatically: an absent activity may have been dismissed by the user. `retryActivity` reconciles, then requests only if no match exists.

## ActivityKit observation boundary

The adapter mirrors the real API: `request` throws; `update` and `end` are nonthrowing async methods. The adapter also exposes enumeration and lifecycle state so tests can model missing, ended, and dismissed activities without inventing thrown update/end failures. See [Apple's Activity API](https://developer.apple.com/documentation/activitykit/activity).

After `end`, enumerate once. Cleanup is confirmed when no nonterminal activity of this type remains. Otherwise return the idle result with `ACTIVITY_CLEANUP_UNCONFIRMED`; the next reconciliation or Start ends the stragglers. After `update`, a missing or terminal matching activity yields `ACTIVITY_MISSING`. No indefinite polling. API completion does not prove visible rendering; actual disappearance and the 1–2 second target remain simulator acceptance items.

Live Activity content is limited to 4 KB combined, so keep payloads to the fields above. See [Apple's Live Activity guide](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities).

## Native build ownership

Native sources live under `apps/mobile/native`, with only the module folder watched:

```
apps/mobile/
├── app.json                          # experiments.inlineModules.watchedDirectories: ["native/StudyTimer"]
├── native/
│   ├── Package.swift                 # SwiftPM root for host tests; outside the watched folder
│   ├── StudyTimer/                   # watched: every file here compiles into the app target
│   │   ├── StudyTimerModule.swift    # inline module: bridge + ActivityKit adapter
│   │   └── Core/                     # Foundation-only coordinator, store, timer math
│   ├── Shared/
│   │   └── StudyTimerAttributes.swift  # added to app and widget targets by our plugin
│   └── Tests/StudyTimerCoreTests/    # host tests; never in the app target
├── widgets/study-timer/              # extension sources; must not import Expo or React Native
├── plugins/with-study-timer.js       # widget target + shared attributes membership
└── src/features/study-timer/         # typed TypeScript facade, hook, and UI
```

Layout rules that follow from how inline modules compile:

- Only `native/StudyTimer` is watched. `Package.swift`, tests, and widget sources stay outside it, or the app build would try to compile them.
- `StudyTimerAttributes.swift` sits outside the watched folder, and the plugin adds it to both the app and widget targets as an ordinary file reference. This avoids adding a file that is already in the app's synchronized folder to a second target. Do not use `inlineModules.xcodeProjectTargets` for the widget: it would add the whole watched folder, including the Expo import, to the extension.
- The app and the extension compile the same attributes file into their own Swift modules, which is Apple's standard setup. D1 still proves an activity requested by the module renders in the extension.

The config plugin in `apps/mobile/plugins` generates the extension target, source membership for the widget and shared attributes, the dependency/embed phase, bundle identifiers, deployment settings, and `NSSupportsLiveActivities`.

Generated `ios/` files are disposable. Persist native project changes in the plugin and configuration, and prove regeneration is idempotent in a disposable checkout. Changing `inlineModules` config, or adding or renaming a module file, requires `bunx expo prebuild` before the next native build; the native-build script runs it. Use a custom development build (`bunx expo run:ios` from `apps/mobile`); Expo Go cannot load this module or extension.

`native/Package.swift` is dependency-free, with a core target at path `StudyTimer/Core` (Foundation only, so it compiles on the macOS host and in the app) and tests in `Tests/StudyTimerCoreTests`. Run `swift test --package-path apps/mobile/native` from the repository root. These host tests do not validate the ActivityKit adapter, the bridge, or the widget.

## Acceptance boundary

Typecheck and lint prove only static correctness. Native compilation proves inline-module registration, macro availability, extension membership, and embedding. Simulator interaction proves the timer and system presentations. Keep those claims separate in the handoff. If a measured requirement fails, record the result and fix it or leave the requirement explicitly open.

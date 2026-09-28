# Argent acceptance flow

`d2-lifecycle.yaml` uses stable `timer-*` identifiers from the real screen. It was prepared against the [Argent Flow YAML reference](https://docs.swmansion.com/argent/docs/reference/flow-yaml/) and checked against the 0.26.0 CLI help. The replay on the D3 widget build, before the final pending-state repair, passed 47 steps with no failures; see the [acceptance log](../study-timer.md) and [machine result](../evidence/d2-flow.json). Rerun it after relevant changes.

The flow stops an existing study session, restarts the process to clear the form, checks blank-name validation, submits a custom name, checks native-returned session and activity status, pauses, resumes, then stops its session. Use a simulator containing only disposable test sessions. Live Activities must be enabled, the development build installed, and Metro running. Launch preserves stored sessions; the name input is React-only state initialized to an empty string on each launch.

Argent 0.26.0 has no documented clear-input directive, and typing appends to the focused field. The second launch after cleanup explicitly resets this app's empty-session form. The flow uses `scroll-to` before controls that may be off-screen; identifier taps do not scroll automatically.

From the repository root, with the lead holding exclusive simulator ownership:

```sh
STUDY_TIMER_SIMULATOR=17B7C9FD-C6DF-4248-9485-0F89AC405A97
bunx @swmansion/argent@0.26.0 flow run docs/acceptance/flows/d2-lifecycle.yaml --platform ios --device "$STUDY_TIMER_SIMULATOR" --json > /private/tmp/study-timer-d2-flow.json
```

Replace the UUID for another machine. This uses the pinned CLI through Bun's cache; it adds no application dependency and does not run Argent's initializer or alter project/global agent configuration. The CLI starts its local tool server when needed.

The YAML checks visible text and controls. It does not inspect the snapshot file or count ActivityKit activities. The ten-second pause checks that the displayed phase remains paused; it cannot establish an unchanged elapsed value without a capture-and-compare operation. Keep real-time recording and system-view observations separate. The flow also does not prove Lock Screen rendering, system update latency, VoiceOver navigation, background duration, or minimal Island layout.

Argent stops at a failed step, so cleanup may be skipped. Retain the complete report, inspect warnings, and stop the test session before retrying. An `idle` warning is not a readiness assertion; the surrounding element/text checks establish the state. These are app UI checks, and successful `Live Activity active` text does not establish visible widget rendering.

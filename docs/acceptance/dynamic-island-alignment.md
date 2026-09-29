# Dynamic Island text alignment

Verified on 2026-09-28 with iPhone 17 Pro, iOS 26.5.

The compact elapsed timer reserved 64 points, but its ticking text aligned to the leading edge inside that space. Aligning the outer frame did not align the text. Explicit trailing text alignment closes the visible right-side gap without removing the width reserved for hour-duration values. The minimal timer also explicitly centers its text within its existing 34-point frame.

The [requirements](../../REQUIREMENTS.md) specify a progress ring in the expanded presentation. The existing system-driven ring remains unchanged. Long-pressing the Island on the rebuilt app showed the session name, advancing elapsed time, and a partially filled 25-minute goal ring.

- [Compact running at 8:39](evidence/dynamic-island-alignment/compact-running.png) shows balanced outer insets.
- [Expanded running at 8:54](evidence/dynamic-island-alignment/expanded-running.png) shows the complete progress ring.

Validation: `bun run format`, `bun run format:check`, `bun run lint`, and `bun run typecheck` passed. Lint and typecheck used existing Turbo cache entries. The native Debug simulator build passed, and the rebuilt app was installed and launched. Build log: `/private/tmp/dynamic-island-fix/build.log`. The build emitted warnings about the missing Metal toolchain search path, duplicate libc++, and an Expo `RCTHostDelegate` declaration.

The shared simulator session changed to a separate motion-review session during follow-up checks. Device interactions stopped to avoid interfering. Paused, minimal, hour-duration, VoiceOver, and physical-device acceptance were not freshly replayed. The existing elapsed-time and goal arithmetic are unchanged.

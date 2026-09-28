# Boldvoice interview

Expo SDK 58 beta app using Expo Router, TypeScript, and Bun.

## Study timer challenge

- [Challenge requirements](REQUIREMENTS.md): the source of truth.
- [Technical requirements](TECHNICAL_REQUIREMENTS.md): contract, timer model, persistence, and documented assumptions.
- [Implementation plan](IMPLEMENTATION_PLAN.md): delivery stack, verification gates, and demo checklist.

## Get started

Use Bun 1.4.0 and Node.js 24.3 or newer on the Node 24 LTS line.

```sh
bun install
bun run dev
```

Run all commands from the repository root:

| Command             | Action                         |
| ------------------- | ------------------------------ |
| `bun run dev`       | Start Expo / Metro             |
| `bun run ios`       | Build and open the iOS app     |
| `bun run android`   | Build and open the Android app |
| `bun run web`       | Start the web app              |
| `bun run typecheck` | Check TypeScript               |
| `bun run lint`      | Run Expo ESLint                |
| `bun run build`     | Export the web app to `dist`   |

## Structure

- `src/app`: Expo Router screens.
- `assets`: Images, icons, and fonts.
- `app.json`: Expo application configuration.
- `bun.lock`: Pinned dependency versions.

Keep environment files at the repository root. Only `EXPO_PUBLIC_*` variables
should be exposed to the client. Never put secrets in public variables.

## SDK 58 beta

This starter uses Expo's official `default@next` template. SDK 58 is a prerelease
and includes React Native 0.88 RC. The store version of Expo Go may still target
SDK 57: use the SDK 58 Expo Go supplied by Expo CLI for simulators/emulators,
or follow Expo's beta instructions for physical devices.

- [SDK 58 beta release notes](https://expo.dev/changelog/sdk-58-beta)

The build command exports web assets; it does not create native iOS/Android binaries.

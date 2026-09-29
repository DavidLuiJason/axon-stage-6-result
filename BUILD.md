# AXON Stage 6 — Android Build

## Exact versions

| Tool | Version |
|------|---------|
| Node.js | 20.x (see `.nvmrc`) — also verified on Node 24.15.0 |
| npm | 10.x / 11.x |
| JDK | 17 (Temurin / OpenJDK 17) |
| Android SDK | API 35 (compileSdk 35), minSdk 24, targetSdk 35 |
| Gradle | 8.11.1 (wrapper) |
| Android Gradle Plugin | 8.7.3 |
| Capacitor | 7.2.x (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`) |

## Install

```bash
nvm use   # or: nvm install 20 && nvm use 20
npm install
```

## Web build

```bash
npm run build
npm run lint
npm run test:bg
```

## Capacitor sync

```bash
npx cap add android   # first time only (project already includes android/)
npx cap sync android
# or: npm run cap:sync
```

## Assemble debug APK

```bash
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Or from repo root:

```bash
npm run android:assemble
```

## Open in Android Studio

```bash
npx cap open android
```

## Permissions required at runtime

- `POST_NOTIFICATIONS` (Android 13+)
- Foreground service (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE`)
- Battery optimization exemption (user action via Settings deep link)

## Foreground service type

**`specialUse`** — chosen because Android 15+ caps `dataSync` and `mediaProcessing` at 6 hours per 24 hours.  
Source: [Android developers — Foreground service types](https://developer.android.com/develop/background-work/services/fg-service-types) (specialUse for cases that do not fit other types; declare use case in manifest).  
`onTimeout` is implemented: checkpoint, log `TIMEOUT`, `stopSelf()`.

## Notes

- Idle = no service, no wake lock, no timer.
- Heartbeats every 5s are written by **native** code to a persistent log.
- Web/browser builds use a foreground-only fallback that states plainly: *cannot run in background; foreground only*.

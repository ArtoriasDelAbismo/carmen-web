# Carmen on Android

Carmen's web app is packaged as an Android app with [Capacitor](https://capacitorjs.com/).
The native project lives in `android/`; the web code is the same as the browser version.

> **WSL note:** build from the WSL terminal, not from Windows Android Studio. Windows Gradle
> can't lock files on `\\wsl.localhost\...` paths and fails with `IOException: Función incorrecta`.
> The phone is reached through the Windows `adb.exe`.

## One-time setup (WSL)

1. **JDK 21** (Capacitor 8 needs 21; Gradle 8.14 doesn't support 25):
   ```bash
   sudo apt update && sudo apt install -y openjdk-21-jdk-headless unzip wget
   ```

2. **Android command-line tools:**
   ```bash
   mkdir -p ~/Android/Sdk/cmdline-tools && cd ~/Android/Sdk/cmdline-tools
   wget https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip
   unzip commandlinetools-linux-13114758_latest.zip && mv cmdline-tools latest
   rm commandlinetools-linux-13114758_latest.zip
   ```

3. **Environment** — add to `~/.bashrc`, then `source ~/.bashrc`:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
   alias adb='/mnt/c/Users/<windows-user>/AppData/Local/Android/Sdk/platform-tools/adb.exe'
   ```
   The `adb` alias uses the Windows `adb.exe` so it can see USB devices. It needs the Android SDK
   platform-tools installed on Windows (Android Studio installs them).

4. **SDK packages** (accept the licenses with `y`):
   ```bash
   sdkmanager --licenses
   sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
   ```

5. **Phone:** Settings → About phone → tap *Build number* 7 times → Developer options → enable
   *USB debugging*. Connect it, run `adb devices`, and accept the prompt on the phone.

## Build and install

From the repo root:

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug && cd ..
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Repeat these three lines after every change to the web code. A change only in `android/`
(e.g. `MainActivity.java`) needs just the last two.

The APK at `android/app/build/outputs/apk/debug/app-debug.apk` can also be sent to testers and
installed directly (they need to allow installing from unknown sources).

## Which backend the app uses

The backend URL and Carmen's mode are baked in when `npm run build` runs (production mode). Vite
reads the env files in this order, each overriding the previous one:

```
.env  <  .env.local  <  .env.production  <  .env.production.local
```

`.env.production` (committed) points at the production backend, and it overrides `.env.local`. To
build the app against another backend, e.g. the dev one with pairing and memory, create
`.env.production.local` (git-ignored):

```
VITE_BACKEND_URL=https://cuidarte-ia-backend-device-pairing-branch-production.up.railway.app
VITE_CARMEN_MODE=data
VITE_VOICE_PROVIDER=elevenlabs
```

Delete or rename it to build against production again. To check which backend a build has:

```bash
grep -oh 'https://[a-z0-9.-]*railway.app' android/app/src/main/assets/public/assets/*.js | sort -u
```

The URL needs `https://`: without it the app requests a relative path and every call fails.
Netlify doesn't read these files; its deploys take these values from its own environment variables.

## Fullscreen

The app is edge-to-edge (`MainActivity.java`): it draws behind the status bar, the navigation bar
and the camera cutout, and the page keeps its controls clear of them with `env(safe-area-inset-*)`.
The fullscreen button hides the system bars with Capacitor's `SystemBars` (see `useFullscreenView`
in `src/DeviceMockup.tsx`); a swipe from the edge shows them briefly.

## Debugging

Open `chrome://inspect` in Chrome on Windows while the app is running on the phone, and click
*inspect* under Carmen's WebView for the console and network tabs.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Gradle JVM version 25` incompatible | Use JDK 21 (`java -version`). |
| `IOException: Función incorrecta` | You're building from Windows over `\\wsl.localhost`. Build from WSL instead. |
| `SDK location not found` | `ANDROID_HOME` isn't set in this shell. `source ~/.bashrc`. |
| `adb devices` shows nothing / `unauthorized` | Re-plug the phone and accept the USB-debugging prompt. |
| "No me pude conectar. Reintentando…" on the pairing screen | The build points at a backend without pairing (production). See [Which backend the app uses](#which-backend-the-app-uses). |
| Mic doesn't work | Check `RECORD_AUDIO` is in `android/app/src/main/AndroidManifest.xml` and the permission was granted. |
| `cmdline-tools;latest` installed into `latest-2` | `cd ~/Android/Sdk/cmdline-tools && rm -rf latest && mv latest-2 latest` |

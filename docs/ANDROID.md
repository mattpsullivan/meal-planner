# Android app

The web app is packaged as a native Android APK with [Capacitor](https://capacitorjs.com/):
the built `dist/` bundle ships inside the APK (offline-capable, no dependence on the hosted
site). Releases are built and signed by CI and published as GitHub Releases; phones install
and update via [Obtainium](https://github.com/ImranR98/Obtainium).

- **appId:** `com.mealplanner.app`
- **Signing:** `~/keystores/meal-planner-release.jks` (alias `mealplanner`), reconstructed in
  CI from the four `RELEASE_*` repo secrets. See `android/keystore.properties.template`.
  Same pattern as dont-break-the-chain ADR-010 / belknap-red-line.
- **Versioning:** versionName = release tag; versionCode = git commit count (CI sets both via
  `ANDROID_VERSION_CODE` / `ANDROID_VERSION_NAME`).

## Cutting a release

```bash
git tag v1.1.0 && git push --tags
```

`.github/workflows/release.yml` regenerates the seed, builds the web bundle with a relative
base path (`pnpm build:app`), syncs Capacitor, assembles + signs the APK, and attaches
`meal-planner-<tag>.apk` to a GitHub Release. Manual runs: the workflow's "Run workflow"
button (versions from `package.json`).

## Installing on a phone (one-time)

1. Install Obtainium (from GitHub via its own APK, or F-Droid).
2. In Obtainium: **Add App** -> source URL `https://github.com/mattpsullivan/meal-planner`
   (source type: GitHub Releases) -> Add.
3. Android will ask once to allow Obtainium to **install unknown apps** - approve it.
4. Install. New releases show up as update notifications from then on.

## Local APK build (optional)

Requires Android SDK + JDK 21. Copy `android/keystore.properties.template` to
`android/keystore.properties`, fill in the real values, then:

```bash
pnpm build:app && npx cap sync android
cd android && ./gradlew assembleRelease
```

Unsigned debug builds need no keystore: `./gradlew assembleDebug`.

## Icons

Source art lives in `assets/` (plate-and-fork on green, generated programmatically);
`npx @capacitor/assets generate --android` regenerates the launcher/splash set after
changing them.

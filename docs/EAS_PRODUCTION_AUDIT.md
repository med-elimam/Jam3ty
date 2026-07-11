# Jam3ty — EAS Production Audit

**Date:** July 11, 2026  
**Expo Account:** `med-limame` (`medlimame9@gmail.com`)  
**EAS Project ID:** `12f47c9c-f0af-446a-aedd-36fbcfddfef8`

---

## 1. App Identity

- **Commercial Name:** `Jam3ty` (User-facing name displayed on device launchers)
- **Slug:** `mobile` (EAS internal project slug required to match the existing cloud projectId history)
- **Scheme:** `jam3ty` (URI deep-linking protocol scheme)
- **EAS Owner:** `med-limame`
- **EAS Project ID:** `12f47c9c-f0af-446a-aedd-36fbcfddfef8`
- **iOS Bundle Identifier:** `com.medlimame.jam3ty`
- **Android Package Name:** `com.medlimame.jam3ty`

---

## 2. Config Plugins Audit

Here is the status of the native libraries used in Jam3ty:

| Library | Requires Config Plugin? | Applied? | Will Work in EAS Build? | Details |
|---|---|---|---|---|
| **expo-video** | No | Yes (Autolink) | Yes | Autolinks natively at build time. No custom configurations needed. |
| **expo-audio** | No | Yes (Autolink) | Yes | Autolinks natively. We block the recording permissions it injects by default. |
| **react-native-pdf** | No | Yes (Autolink) | Yes | Autolinks natively. Requires `react-native-blob-util` to run, which is present. |
| **react-native-blob-util** | No | Yes (Autolink) | Yes | Autolinks and compiles its native code during prebuild automatically. |
| **expo-image-picker** | Yes | Yes | Yes | Custom plugin configured in `app.json` to inject localized description strings for iOS photo library. |
| **expo-router** | Yes | Yes | Yes | Configured with production origin `https://jam3ty-production.up.railway.app/`. |
| **expo-font** | Yes | Yes | Yes | Configured in `app.json`. |
| **expo-web-browser** | Yes | Yes | Yes | Configured in `app.json`. |
| **react-native-keyboard-controller** | No | Yes (Autolink) | Yes | Autolinks natively at build time. |

---

## 3. Permissions Inventory

We conducted a full scan of permissions requested by both Android and iOS configurations. Unused or unsafe legacy permissions are blocked in `app.json`:

### Android (`AndroidManifest.xml`)

| Permission | Reason | Source | Status |
|---|---|---|---|
| `android.permission.INTERNET` | Perform API requests to backend | Base Expo Template | **Active** (Required) |
| `android.permission.RECORD_AUDIO` | Injected by `expo-audio` for recording features | `expo-audio` | **Blocked** (Not used by Jam3ty) |
| `android.permission.ACCESS_COARSE_LOCATION` | Injected by `expo-location` dependency | `expo-location` | **Blocked** (Not used by Jam3ty) |
| `android.permission.ACCESS_FINE_LOCATION` | Injected by `expo-location` dependency | `expo-location` | **Blocked** (Not used by Jam3ty) |
| `android.permission.READ_EXTERNAL_STORAGE` | Injected by legacy storage libraries | dependencies | **Blocked** (Modern Scoped Storage used) |
| `android.permission.WRITE_EXTERNAL_STORAGE` | Injected by legacy storage libraries | dependencies | **Blocked** (Modern Scoped Storage used) |

### iOS (`Info.plist`)

| Permission Key | Reason / Description | Source | Status |
|---|---|---|---|
| `NSPhotoLibraryUsageDescription` | `"Allow Jam3ty to access your photos so you can upload payment receipts and academic attachments."` | `expo-image-picker` | **Active** (Required for uploads) |
| *No Camera Permission* | Camera features are not implemented | `expo-image-picker` | **Omitted** (No permission requested) |
| *No Location / Microphone* | Location and voice features not implemented | dependencies | **Omitted** (No permission requested) |

---

## 4. Icon & Splash Asset Verification

We generated the following dedicated assets as native PNGs under `assets/images`:
- `assets/images/app-icon.png`: **PNG 1024x1024** (opaque). App Store compliant.
- `assets/images/adaptive-icon.png`: **PNG 1024x1024** (transparent background). Adaptable foreground.
- `assets/images/splash.png`: **PNG 1024x1024** (centered logo crest). Solid background color is indigo `#4F46E5`.
- `assets/images/notification-icon.png`: **PNG 1024x1024** (white monochrome flat silhouette). Prepared for notifications.
- `assets/images/favicon.png`: **PNG 1024x1024** (gold logo on rounded navy blue background). Web compliant.

---

## 5. Store-Rejection Risks

- **Tablet Support:** `ios.supportsTablet: false` is configured. This is appropriate for this build since the layout is designed for phones only. App Store metadata must be restricted to iPhone only to prevent rejection.
- **Microphone / Location:** By blocking location and audio recording permissions, we avoid being rejected for requesting access to features not used in the application code.
- **Custom Descriptions:** The photo library permission is customized to outline actual payment evidence/attachment functionality, meeting App Store Review Guidelines.

---

## 6. Build Commands Reference

### Preview Builds (Ad-Hoc / Internal Testing)

```bash
# Android APK Preview
npx eas-cli build --platform android --profile preview

# iOS Ad-Hoc Preview (Requires registering UDIDs or TestFlight)
npx eas-cli build --platform ios --profile preview
```

### Production Builds (Store Submission)

```bash
# Android AAB Production
npx eas-cli build --platform android --profile production

# iOS IPA Production
npx eas-cli build --platform ios --profile production
```

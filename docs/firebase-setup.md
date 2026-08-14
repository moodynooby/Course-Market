# Firebase Push Notifications Setup (10 minutes, free)

Push notifications for the Android app are delivered through **Firebase Cloud Messaging (FCM)**. This is the only piece that needs an external account, and it costs nothing. Until you complete this setup, the app works normally — pushes simply no-op.

## Step 1 — Create a Firebase project

Go to [console.firebase.google.com](https://console.firebase.google.com/) and click **Add project**. Name it anything (e.g. `AuraIsHub`). Disable Google Analytics if you want to skip it — it is not needed for pushes.

## Step 2 — Register the Android app

In the Firebase console, click the **Android** icon to add an app. Use exactly these values:

| Field | Value |
|---|---|
| Android package name | `app.aurais` |
| App nickname | AuraIsHub |
| Debug signing certificate SHA-1 | (optional for FCM) |

Download `google-services.json` when prompted and place it at:

```
android/app/google-services.json
```

This file is already gitignored (add it to `.gitignore` if it is not — it contains your server key and should never be committed).

## Step 3 — Generate a service account key for the backend

The backend (Netlify Functions) needs to send messages through FCM. In the Firebase console: **Project settings → Service accounts → Generate new private key**. This downloads a JSON key file. Keep it — you will paste it into Netlify next.

## Step 4 — Add credentials to Netlify

In the Netlify dashboard for `aurais`: **Site configuration → Functions → Environment variables**, add:

| Variable | Value |
|---|---|
| `FCM_PROJECT_ID` | The project ID from Firebase (e.g. `aurais-xxxx`) |
| `FCM_SERVICE_ACCOUNT_JSON` | The full contents of the JSON key file from Step 3, as one long string |

Redeploy the site once (Netlify → Deploys → Trigger deploy) so the functions pick up the new variables.

## Step 5 — Verify

1. Install the app on an Android phone (`./gradlew assembleRelease` → AAB → Play Console internal testing, or sideload the debug APK).
2. Sign in. The app requests notification permission and silently stores the device token in `user_profiles.push_notification_token`.
3. Have a classmate accept (or decline) one of your open trades — you should see a "trade accepted!" push within a second or two.

## iOS notes

iOS pushes skip Firebase entirely: direct APNs with your `.p8` key. When you have an Apple Developer account, add `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, and `APNS_BUNDLE_ID` to the same Netlify environment variables.

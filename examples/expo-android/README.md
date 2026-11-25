# Expo Android translation example

Trail Notes is a small Expo and React Native app with English and Turkish catalogs. It uses the device's primary language when supported and defaults to English. Tap **English** or **Türkçe** to change the trail description, labels, and distance formatting in the current session.

## Run on Android

Use Node.js 22.13 or newer and [Expo Go for SDK 58](https://expo.dev/go) on an Android phone or emulator.

```sh
cd examples/expo-android
npm ci
npm start
```

Scan the QR code from Expo Go on a phone connected to the same network. For a running Android emulator, use `npm run android` to start Metro and open the app. You can also build the Android JavaScript bundle with `npm run export:android`.

## Preview a translation change

The pretranslated [Turkish catalog](messages/tr.json) and [lock file](translate.lock) ship with the example. The first command succeeds and the second reports no pending translations.

```sh
npm run translations:check
npm run translations:dry-run
```

Edit `trail.description` in [messages/en.json](messages/en.json), then run both commands again. The check exits with status 1 and the dry run reports one changed key to translate into Turkish. Revert the edit to return to a clean check.

Autoglot 0.3.4 runs as a development dependency. The app, check, and dry run need no API key or paid calls. The dry run leaves both catalogs and the lock file untouched.

# Clirt for Android

The Android app for **[Clirt](https://clirt-delta.vercel.app)**, the custom T-shirt shop for Nigeria. Sign in with the same Google account you use on the website, design a tee, and your cart stays in sync between the phone and the web in real time.

- Website: https://clirt-delta.vercel.app
- Web and API repo: https://github.com/babaolu/clirt (see its README for the `/api/v1` reference)

Checkout and order history are on the website for now.

## Features

- **Google sign-in** through the system browser. It uses the same Clirt account as the website, so your cart and orders are shared.
- **Shop:** the six styles (short or long sleeve × round, V or collar neck) with prices from the live catalog.
- **Design:**
  - sleeve and neck toggles, 8 shirt colours, sizes S–XXL, quantity 1–20
  - text (up to 40 characters, 6 fonts, 4 effects) or one of 5 graphics, each with colour swatches
  - design size and position sliders
  - a live preview drawn on the phone with the same renderer the website uses
  - a live price
- **Cart:** server-rendered previews, quantity −/+, remove, subtotal, pull to refresh, and a badge on the tab.
- **Live sync:** add or change something on the website and the phone's cart updates within a second, and the other way round.
- **Account:** your name, email and avatar, and sign out.

## Stack

- Expo SDK 57, React Native 0.86, TypeScript, Expo Router
- `better-auth` with `@better-auth/expo`, pinned to the server's version (1.7.7); the session is kept in `expo-secure-store`
- `react-native-svg` (`SvgXml`) to render SVG previews
- `pusher-js` (React Native build) for live cart updates
- `zod` for the shared customization schema

## How it works

### Auth

`src/lib/auth.ts` creates a Better Auth client with the Expo plugin (`scheme: "clirt"`). **Continue with Google** calls `authClient.signIn.social({ provider: 'google', callbackURL: '/' })`:

1. Google opens in the system browser using the website's OAuth web client.
2. The server's `/api/auth/callback/google` completes sign-in.
3. The server redirects to `clirt://` with the session cookie, which the plugin saves in SecureStore.

One Google account is one Clirt account on both the web and the phone. No extra Google Cloud setup is needed for the app.

Every API call goes through `api()` in `src/lib/api.ts`:

- it sends `authClient.getCookie()` as the `Cookie` header, with `credentials: 'omit'`
- it parses the API's `{ error: { code, message, fields } }` envelope
- a 401 signs you out locally, which returns you to the sign-in screen

### Live cart sync

`CartProvider` in `src/lib/cart.tsx` subscribes to the Pusher private channel `private-user-<userId>`.

- **Channel authorization:** a form-encoded `socket_id` and `channel_name` POST to `/api/v1/realtime/auth`, sent with the session cookie.
- **When something changes:** after any cart change made anywhere (the website's forms, this app, or an order placed on the web), the server publishes `cart-updated` with `{ itemCount, at }`. The app updates the badge immediately and refetches `GET /api/v1/cart`.
- **Safety net:** the cart is also refetched when the app returns to the foreground (`AppState`) and when the Cart tab gains focus.
- **Sign out:** the app unsubscribes and disconnects.

The Pusher key and cluster in `src/config.ts` are public values; they're the same ones the website sends to every browser.

### Shared code

`src/shared/customization.ts`, `src/shared/shirt.ts` and `src/shared/money.ts` are copied from the web repo. Only their import paths differ, and each file names its source path and commit. When the web versions change, copy them again; the server re-validates and re-prices everything, so a stale copy can't produce a wrong price.

`src/lib/svg.tsx` adapts the renderer's SVG for Android: `font-family="'Montserrat', sans-serif"` becomes `Montserrat`, because Android resolves a single family name. The design fonts are the web repo's latin-subset font files, converted to TTF and embedded with the `expo-font` config plugin under the same family names and weights the renderer uses (see `app.json`).

## Develop

```sh
npm install
npx expo run:android      # debug build on a connected device or emulator
npm run typecheck
```

If `npx expo install` or the dev server fail with `ETIMEDOUT` on a slow connection, prefix the command with `NODE_OPTIONS="--network-family-autoselection-attempt-timeout=3000"`.

## Build the signed release APK

The `android/` folder is generated (`expo prebuild`) and not committed. Release signing is injected by `plugins/withReleaseSigning.js`, which reads four Gradle properties. **Keep the keystore and passwords outside the repo.**

1. Create an upload keystore once and back it up. Without it you can't ship updates that install over the existing app.

   ```sh
   mkdir -p ~/.clirt-keys && chmod 700 ~/.clirt-keys
   keytool -genkeypair -storetype PKCS12 -keystore ~/.clirt-keys/clirt-release.keystore \
     -alias clirt -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Clirt, O=babaolu, C=NG"
   ```

2. Add the signing properties to `~/.gradle/gradle.properties`. That file is in your home directory, not in this repo; `chmod 600` it.

   ```properties
   CLIRT_UPLOAD_STORE_FILE=/home/<you>/.clirt-keys/clirt-release.keystore
   CLIRT_UPLOAD_KEY_ALIAS=clirt
   CLIRT_UPLOAD_STORE_PASSWORD=<store password>
   CLIRT_UPLOAD_KEY_PASSWORD=<key password>
   ```

3. Generate the native project and build. This needs JDK 17–21; Android Studio's bundled JBR works, and so does the Android SDK in `~/Android/Sdk`.

   ```sh
   export JAVA_HOME=/opt/android-studio/jbr ANDROID_HOME=$HOME/Android/Sdk
   npx expo prebuild -p android
   cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
   # → android/app/build/outputs/apk/release/app-release.apk
   ```

   Drop `-PreactNativeArchitectures=arm64-v8a` to build for every ABI. That gives a bigger APK and a slower build.

4. Install it on a phone with USB debugging enabled:

   ```sh
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```

If the properties are missing, release builds fall back to the debug key and Gradle prints a warning.

### Build troubleshooting

- **Gradle daemon "disappeared unexpectedly"** (the Linux OOM killer on a machine with about 8 GB of RAM). Lower Gradle's heap, compile Kotlin in-process, and cap the workers:

  ```sh
  ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=2 \
    "-Dorg.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=768m" -Pkotlin.compiler.execution.strategy=in-process
  ```

  The native C++ step runs one compiler job per CPU core. To cap it, wrap the SDK's `cmake/<version>/bin/ninja` in a script that runs the original binary with `-j2`.

- **Downloads fail with `Tag mismatch` / `bad_record_mac`** (TLS errors on a flaky connection). Force TLS 1.2 and retry; Gradle keeps what it has already downloaded:

  ```sh
  export GRADLE_OPTS="-Dhttps.protocols=TLSv1.2 -Djdk.tls.client.protocols=TLSv1.2"
  ./gradlew assembleRelease ... -Dorg.gradle.internal.repository.max.retries=8
  ```

  Also add `-Dhttps.protocols=TLSv1.2 -Djdk.tls.client.protocols=TLSv1.2` to `org.gradle.jvmargs`.

## Licences

The bundled fonts (Montserrat, Playfair Display, Pacifico, Bungee, Space Mono, Oswald, Bricolage Grotesque, Instrument Sans) are under the SIL Open Font License, via Fontsource.

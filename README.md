# Telegram Drive Mobile 🚀

Welcome to **Telegram Drive Mobile**, a standalone React Native Android application that transforms your Telegram saved messages and channels into a fully-functional, secure, and limitless cloud storage interface.

![Telegram Drive File Explorer](file:///C:/Users/sk143/.gemini/antigravity/brain/234ba26f-ec86-4a84-a38f-927a534e8a37/file_explorer_mockup_1778056536264.png)

## 🌟 Overview

This project successfully ports the powerful desktop MTProto capabilities of GramJS into a lightweight, standalone mobile environment. It completely bypasses the need for a local Rust desktop backend by polyfilling Node.js cryptography and networking streams directly within React Native.

### Key Features
*   **Direct MTProto Connection:** Connects directly to Telegram's core servers using AES-encrypted WebSockets.
*   **Standalone Architecture:** Fully decoupled from any desktop application or local server.
*   **Infinite Free Storage:** Leverages your Telegram account's unlimited cloud storage.
*   **Folder Tagging:** Uses `[TD]` tagged private channels to organize your files seamlessly.
*   **Two-Factor Authentication (2FA):** Fully supports 2FA cloud passwords with mathematically verified PBKDF2 cryptography.

## 🛠 Tech Stack

*   **Framework:** React Native / Expo (SDK 54)
*   **Core Library:** GramJS (MTProto Client)
*   **Cryptography:** `crypto-js` (Synchronous SHA & PBKDF2), `expo-crypto`
*   **Styling:** Native Base / Vanilla StyleSheet

## 📦 Download the App

You can download the latest successful Android APK directly from our Expo Cloud build:

👉 **[Download Telegram Drive APK](https://expo.dev/accounts/sathya1403/projects/telegram-drive-mobile/builds/e0b98870-6a39-45e9-8e18-175adf5712e3)**

> [!TIP]
> **Faster Access Note:** If you want the fastest, frictionless login experience while testing the app, we recommend temporarily removing Two-Step Verification (2FA Cloud Password) from your Telegram account. While the app fully supports 2FA, disabling it skips the cryptographic PBKDF2 handshake, making logins instantaneous.

## 🚀 Getting Started Locally

If you want to run the project from source or modify the code:

1. Clone the repository.
2. Install dependencies: `npm install`
3. Start the Expo Server: `npx expo start -c`
4. Scan the QR code with the **Expo Go** app on your Android device.

For a detailed deployment and setup procedure, please refer to the `SETUP_GUIDE.md` file.

## 💡 The Polyfill Magic

Running GramJS on a mobile phone required extensive polyfilling. This repository includes custom-built shims for:
- `crypto`: Using `crypto-js` to replace Node's synchronous `pbkdf2Sync` and `createHash`.
- `net`: WebSockets wrapped to simulate raw TCP streams.
- `window.location`: Mocked to bypass GramJS browser restrictions.
- `Buffer`: Full Uint8Array bridging for media downloads.

## 🤝 Open Source & Contributing

**This project is completely Open Source!** 🎉

You are completely free to fork, clone, and build upon this repository. Because this is an open ecosystem, you can add any features to it, expand its capabilities, or completely redesign the UI to suit your needs.

If you have great ideas for even more features (like a video player, PDF viewer, or multiple account support), feel free to open a Pull Request or just use the code for your own custom Android apps!

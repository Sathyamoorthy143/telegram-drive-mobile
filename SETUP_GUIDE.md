# Telegram Drive Mobile - Setup Guide

This guide walks you through the step-by-step procedure of acquiring your API keys, configuring the app, and using Telegram Drive Mobile.

![Telegram Drive Login](file:///C:/Users/sk143/.gemini/antigravity/brain/234ba26f-ec86-4a84-a38f-927a534e8a37/login_screen_mockup_1778056509619.png)

## Step 1: Obtain Telegram API Credentials
To connect the app to the Telegram network, you must register as a developer.

1. Go to [https://my.telegram.org/auth](https://my.telegram.org/auth) in your web browser.
2. Enter the phone number associated with your Telegram account.
3. You will receive a confirmation code in the Telegram app. Enter it on the website.
4. Go to **"API development tools"**.
5. Fill out the form (App Title and Short Name can be anything, e.g., "Telegram Drive Mobile").
6. Click **"Create application"**.
7. You will now see your **`App api_id`** and **`App api_hash`**. Keep this page open.

## Step 2: Install and Launch the App
1. Download the latest `.apk` from the [Expo Cloud Build](https://expo.dev/accounts/sathya1403/projects/telegram-drive-mobile/builds/e0b98870-6a39-45e9-8e18-175adf5712e3).
2. Install the APK on your Android device (you may need to allow "Install from Unknown Sources").
3. Open the **Telegram Drive** application.

## Step 3: Configure Credentials
1. On the initial login screen, enter the **API ID** you retrieved in Step 1.
2. Enter the **API Hash**.
3. Tap the blue **"Configure & Connect"** button.

## Step 4: Authentication
1. The app will now securely connect to the Telegram MTProto servers via AES-encrypted WebSockets.
2. You will be prompted to enter your **Phone Number** (include the country code, e.g., `+1...`).
3. Telegram will send a verification code to your other active Telegram sessions (or via SMS). Enter this code into the app.
4. **Cloud Password (2FA):** If you have Two-Step Verification enabled, you will be prompted to enter your Cloud Password. 
   > *Note: For faster access and testing, you can temporarily disable 2FA in your Telegram Privacy settings to skip this step.*

## Step 5: Start Using Telegram Drive!
Once authenticated, you will see the File Explorer interface.
*   **Creating Folders:** Any private channel you create with `[TD]` in the title will automatically be recognized as a Folder.
*   **Uploading Files:** You can upload media directly into these designated folders.
*   **Global Search:** Use the search bar to scan your entire Telegram history for specific files.

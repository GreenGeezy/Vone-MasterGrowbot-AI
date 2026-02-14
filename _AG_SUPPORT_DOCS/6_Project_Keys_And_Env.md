# Project Keys & Environment Variables

This project uses a `.env` file to manage sensitive keys. This file is ignored by Git to prevent secret leakage.

## 1. Setup Instructions

1.  **Create `.env` File**:
    - In the root of the project (where `package.json` is), create a file named `.env`.
    - Copy the contents from `.env.example`.

2.  **Add Your Keys**:
    - Fill in the values for the keys listed below.

## 2. Required Keys

### Supabase
Used for Authentication and Database access.
- **VITE_SUPABASE_URL**: `https://auth.mastergrowbotai.com`
- **VITE_SUPABASE_ANON_KEY**: (Your public anon key)

### RevenueCat
Used for In-App Purchases and Subscriptions.
- **VITE_REVENUECAT_ANDROID_KEY**: `(Your existing Android key)`
- **VITE_REVENUECAT_IOS_KEY**: `(REQUIRED FOR IOS)`
    - **Action**: You must generate a new RevenueCat API Key for iOS in the RevenueCat Dashboard and paste it here.

## 3. Important Notes
- **Do not commit `.env` to GitHub**.
- If you change these keys, you must rerun `npm run build` or restart the dev server for them to take effect.

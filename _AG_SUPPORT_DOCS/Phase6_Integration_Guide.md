# 🟢 Phase 6: Final Integrations (Tomorrow's Protocol)

**Goal:** Complete the iOS build configuration 🚀

## 📝 To-Do List (Start Here Tomorrow)
1.  **Run Git Bash Command** (Create the `.p12` file).
2.  **Configure Codemagic** (Update details & add Env Vars).
3.  **Notify Antigravity** (I will then generate the final YAML).

---

## Part 1: Certificate Preparation (Step 1)
**Action:** Open **Git Bash** (not PowerShell) and run this command to create your missing certificate file:

```bash
cd ~/Desktop/MasterGrowbot_iOS_Assets_LLC/Certificates_Profiles
openssl pkcs12 -export -out ios_distribution_private.p12 -inkey ios_distribution_private.key -in AppleDistribution_LLC.cer -passout pass:1234
```
*   **Verify:** Check that `ios_distribution_private.p12` now exists in that folder.

---

## Part 2: Codemagic Repository Setup (Custom App)
1.  Go to your **Codemagic Dashboard** -> **Applications**.
2.  Click **Add Application**.
3.  Choose **Clone repository from URL** (or "Other").
4.  **Repository URL:** `https://github.com/GreenGeezy/Vone-MasterGrowbot-AI.git`
5.  **Check:** ☑️ **Public repository** (Simpler & faster setup).
    *   *Note: Since we moved all secrets to Environment Variables, your code is safe to be public.*
6.  **Select project type:** **iOS**.
7.  Click **Finish: Add application**.

**Branch Note:** Don't worry about the `ios` branch yet. We configure that in the `codemagic.yaml` file later. For now, just create the app.

---

## Part 3: RevenueCat Cleanup (Do This First)
**Status:** Your RevenueCat settings (from your screenshot) use old keys. Apple will REJECT purchases if these don't match.

1.  Go to **RevenueCat Dashboard** -> Project Settings -> **Apps**.
2.  Expand **App Store Connect**.
3.  **Delete** the old `.p8` file (the one ending in `...R6.p8`).
4.  **Rename & Upload** your NEW App Store Connect Key:
    *   **Find Key ID:** Go to Apple Developer -> Users and Access -> Integrations -> App Store Connect API. Find your key. Copy the **Key ID**.
    *   **Rename File:** Rename `AuthKey_LLC_Final.p8` to `AuthKey_[KeyID].p8` (e.g., `AuthKey_12345ABCDE.p8`).
    *   **Upload:** Upload this renamed file to the "App Store Connect API" section.
    *   **Issuer ID:** `61ed196a-0784-46cb-af40-9899d3e055d7`
5.  Click **Save Changes**.

---

## Part 4: Codemagic Environment Variables (The "ios-config" Group)
**Important:** Do **NOT** upload files to the "Code signing identities" tab in Codemagic. Leave it empty/old. We are overriding it here.

Go to your new App -> **Environment variables**.
**Variable Group:** Create a group named `ios-config`. Add ALL variables to this group.

### 1. App Store Connect & Signing
| Variable Name | Value | Secret? |
| :--- | :--- | :--- |
| `APP_STORE_CONNECT_ISSUER_ID` | `61ed196a-0784-46cb-af40-9899d3e055d7` | ✅ Yes |
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | *(Get from your Apple Developer Account - Keys)* | ✅ Yes |
| `APP_STORE_CONNECT_PRIVATE_KEY` | *(Open `AuthKey_LLC_Final.p8` in Notepad & copy ALL text)* | ✅ Yes |
| `CERTIFICATE_PASSWORD` | `1234` | ✅ Yes |
| `CM_CERTIFICATE` | *(Run PowerShell Command 1 below to get this)* | ✅ Yes |
| `CM_PROVISIONING_PROFILE` | *(Run PowerShell Command 2 below to get this)* | ✅ Yes |

### 2. App Configuration (Supabase & RevenueCat)
| Variable Name | Value | Secret? |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://auth.mastergrowbotai.com` | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZndkaGx3c2Fod3hlY2V3eWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTA5NDgsImV4cCI6MjA4MDc4Njk0OH0.Gq2EjdT48L42TeKp2bU0dQi0wBFS9Jfby7RXR1t95Ko` | ✅ Yes |
| `VITE_REVENUECAT_IOS_KEY` | *(Paste your new iOS RevenueCat API Key)* | ✅ Yes |
| `VITE_REVENUECAT_ANDROID_KEY`| `goog_kqOynvNRCABzUPrpfyFvlMvHUna` | ✅ Yes |
| `VITE_REQUIRE_QUIZ_AND_SUBSCRIPTION` | `true` | ✅ Yes |

---

### ⚡ PowerShell Commands for CM_CERTIFICATE & CM_PROVISIONING_PROFILE
Run these in **PowerShell** (not Git Bash) to get the big text blocks for those two variables:

**For `CM_CERTIFICATE`:**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\elidu\Desktop\MasterGrowbot_iOS_Assets_LLC\Certificates_Profiles\ios_distribution_private.p12"))
```

**For `CM_PROVISIONING_PROFILE`:**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\elidu\Desktop\MasterGrowbot_iOS_Assets_LLC\Certificates_Profiles\MasterGrowbot_LLC_AppStore_Final.mobileprovision"))
```

---

## Part 5: Final Check
1.  Did you update RevenueCat?
2.  Did you add **ALL 11 variables** to the `ios-config` group in Codemagic?
3.  **If YES:** Reply "Configuration Complete".
4.  **Then:** I will generate the `codemagic.yaml` file so you can push and build!

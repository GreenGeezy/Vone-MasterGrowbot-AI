Title - Building an Ionic/Capacitor App with CodeMagic

Ionic Capacitor apps
This page guides you through building an Ionic Capacitor app with Codemagic. It covers configuring your codemagic.yaml, setting up code signing, and running builds.

First, add your app to Codemagic. In the Codemagic dashboard, click Apps → Add app, connect your Git repository, and give a name to your Codemagic app. Codemagic will scan your repository and list detected branches. Select the branch you want to build. You can test branch detection by clicking Start auto-detect. If the iOS project isn't automatically detected, click Change workflow next to Auto-detect Workflows and select iOS to enable iOS builds (in Flutter projects, set “iOS” under Configure workflows in the UI).

Next, prepare your codemagic.yaml. After adding the app, choose Workflow Editor then Set up to create a default codemagic.yaml in your repository. This file defines your build configuration. For an Ionic app, the example configuration might include steps to install Node.js, install Capacitor CLI, build the Ionic project, and run Capacitor build. Example snippet:

yaml
Copy
workflows:
  ios-workflow:
    name: iOS Workflow
    scripts:
      - npm install -g @ionic/cli cordova-res
      - ionic cap build ios --prod --release --no-interactive
      - npx cap sync ios
      - push:
          type: capacitor
          ios:
            workspace: ios/App/App.xcworkspace
            scheme: App
Run workflows by pushing to the monitored branch, or use the Start new build button. Codemagic’s iOS workflow will restore CocoaPods caches, fetch pods, and run Xcode archive. Build artifacts (IPAs) can be found in Artifacts.

Code signing
Codemagic supports both automatic and manual iOS code signing. It can use the Apple Developer Portal integration or environment variables to provide signing credentials. Automatic signing uses a p12 certificate and provisioning profile saved in the Code signing section of your app settings. Alternatively, manual signing uses cert_path, cert_password, provisioning_profile_path variables in codemagic.yaml.

For automatic signing, enable the Apple Developer Portal integration under Team settings > Integrations. Then in your workflow, reference the stored certificate by name. For manual signing, set the following environment variables in the Codemagic UI:

CODE_SIGNING_CERTIFICATE: Base64 encoded p12 certificate
PROVISIONING_PROFILE: Base64 encoded provisioning profile
CERTIFICATE_PASSWORD: P12 password
And in codemagic.yaml under the code_signing section, set distribution_method, certificate, and profile:

yaml
Copy
code_signing:
  distribution_method: app-store
  certificate: $CODE_SIGNING_CERTIFICATE
  profile: $PROVISIONING_PROFILE
Codemagic automatically creates a keychain and imports these for signing.

Publishing to App Store
To publish to App Store Connect, configure the App Store Connect API key. In App Store Connect, create an API Key under Users & Access → Keys, grant it App Manager role, and download the .p8 key. Note the Issuer ID and Key ID. In Codemagic, under your app’s Integrations or Environment variables, add:

APP_STORE_CONNECT_PRIVATE_KEY containing the contents of the .p8 file.
APP_STORE_CONNECT_KEY_IDENTIFIER = Key ID.
APP_STORE_CONNECT_ISSUER_ID = Issuer ID.
Alternatively, enable the Apple Developer Portal integration and upload the key under App Store Connect.

In your workflow’s publishing section, add:

yaml
Copy
publishing:
  app_store_connect:
    auth: integration   # or "api_key" if using env vars
    submit_to_testflight: true
    submit_to_app_store: true
    cancel_previous_submissions: true
    beta_groups:
      - "Testers Group Name"
    release_type: SCHEDULED
    earliest_release_date: 2021-12-01T14:00:00+00:00
This will upload the IPA to App Store Connect and submit it to TestFlight or App Store as configured. Note: You must have created an App Store Connect app record and (usually) uploaded at least the first build manually. The workflow shown above uses the Apple integration; if using environment variables, supply api_key, issuer_id, and key_id under publishing.app_store_connect in codemagic.yaml.

Note: Codemagic’s App Store publishing is only for workflows using codemagic.yaml. If using the UI editor, see the corresponding guide.

(This file contains the full build configuration steps from Codemagic’s Ionic/Capacitor guide.)

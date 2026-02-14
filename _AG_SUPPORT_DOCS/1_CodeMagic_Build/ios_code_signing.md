Automatic vs Manual code signing
Signing iOS apps requires an Apple Developer Program membership. Codemagic supports two approaches: Automatic signing and Manual signing.

With Automatic signing, you connect your Apple Developer account (via API keys or via Apple Developer Portal integration) and let Codemagic fetch certificates and profiles. You need an App Store Connect API Key with App Manager role for publishing, but for signing you use a distribution certificate and provisioning profile. Codemagic can retrieve these if you enable Apple Developer Portal integration (under Teams → Integrations) and have the certificate and profile in your developer account.

For Manual signing, you export your certificate (p12) and provisioning profile (mobileprovision) and add them to Codemagic. To do this, encode both files in base64 and store them as environment variables IOS_CERTIFICATE, IOS_PROVISIONING_PROFILE (with password in CERTIFICATE_PASSWORD). In codemagic.yaml, reference them:

yaml
Copy
code_signing:
  distribution_method: app-store
  certificate: $IOS_CERTIFICATE
  profile: $IOS_PROVISIONING_PROFILE
Codemagic will create a keychain at build time, import the certificate and profile, and use them for signing.

To set these variables: encode with base64, then in Codemagic App Settings → Environment variables, create (secure) variables. For example:

bash
Copy
cat Certificate.p12 | base64 | pbcopy
Paste into IOS_CERTIFICATE. Do similar for provisioning profile.

Note: The certificate must match an Apple Developer certificate (App Store or Development), and the profile must match your app’s App ID and certificate.

For automatic signing via Apple Developer Portal integration, ensure in Teams → Integrations → Apple Developer Portal you have “Developer ID” connected. Then you can select it in UI builds or set integration: apple_developer in YAML.

(This file contains detailed instructions from Codemagic’s iOS code signing documentation.)

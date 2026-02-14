Source: Publishing to App Store Connect

App Store Connect publishing using codemagic.yaml
Codemagic allows automatic publishing to App Store Connect (for iOS/macOS apps) using an App Store Connect API Key. Ensure your workflow uses codemagic.yaml.

Requirements: Your API Key must have App Manager permission. Your iOS app must be code-signed with an App Store distribution certificate.

Create App Store Connect API Key
In App Store Connect, go to Users and Access → Keys tab.
Click + to generate a new API key.
Name the key and select App Manager access rights.
Click Generate and then Download API Key (a .p8 file). You can only download it once.
Note the Issuer ID (shown above keys table) and Key ID of the key.
Configure Codemagic Publishing
Using Apple Developer Portal integration (Recommended)
Enable Apple Developer Portal integration in Codemagic (Teams → Personal Account or Team → Integrations). Upload your .p8 file and enter the Issuer ID and Key ID.
In codemagic.yaml, reference the integration:
yaml
Copy
workflows:
  ios-workflow:
    integrations:
      app_store_connect: <Your API Key Name>
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
        submit_to_app_store: true
        beta_groups:
          - TestersGroup
        cancel_previous_submissions: true
        release_type: SCHEDULED
        earliest_release_date: 2021-12-01T14:00:00+00:00
        copyright: 2021 MyCompany
        phased_release: true
Using Environment Variables (Alternative)
If you prefer not to use the integration UI, set environment variables in your Codemagic App settings:

APP_STORE_CONNECT_PRIVATE_KEY = content of your .p8 file.
APP_STORE_CONNECT_KEY_IDENTIFIER = Key ID.
APP_STORE_CONNECT_ISSUER_ID = Issuer ID.
Then in YAML:

yaml
Copy
publishing:
  app_store_connect:
    auth: api_key
    api_key: $APP_STORE_CONNECT_PRIVATE_KEY
    key_id: $APP_STORE_CONNECT_KEY_IDENTIFIER
    issuer_id: $APP_STORE_CONNECT_ISSUER_ID
    submit_to_testflight: true
    submit_to_app_store: true
    cancel_previous_submissions: true
    release_type: MANUAL  # or SCHEDULED/AFTER_APPROVAL
Notes:

You must create an App Store Connect App record beforehand. It’s recommended to upload the first build manually.
After a build, post-processing (“Magic Actions”) will handle submit_to_testflight, submit_to_app_store: true will submit for App Store review.
cancel_previous_submissions: true cancels any in-flight review of previous build.
release_type can be MANUAL, AFTER_APPROVAL, or SCHEDULED (with earliest_release_date).
Store credentials securely and use secret environment variables.
(This file contains the full content from Codemagic’s App Store Connect publishing guide.)

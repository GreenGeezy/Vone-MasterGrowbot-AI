              Register an App ID
An App ID identifies your app in a provisioning profile. It is a two-part string that identifies one or more apps from a single development team. There are two types of App IDs: explicit (for a single app) and wildcard (for a set of apps). Enabled app capabilities (like In-App Purchase, Push Notifications, etc.) serve as an allow list of what the app may use. In-App Purchase is enabled by default for an explicit App ID. Beginning with Xcode 11.4, a single App ID can build iOS, macOS, tvOS, and watchOS apps.

Note: To configure the capabilities your app uses, you need to add them to your Xcode project’s target.

Required role: Account Holder or Admin.

Steps to register an App ID:

In App Store Connect (or Apple Developer Account), go to Certificates, Identifiers & Profiles and click Identifiers, then click the + button.
Select App IDs as the ID type and click Continue.
Confirm App ID Type is selected, click Continue.
Enter a name/description for the App ID in Description.
To create an explicit App ID, choose Explicit App ID and enter the app’s Bundle ID (e.g. com.example.myapp). The Bundle ID must match your Xcode project’s bundle ID.
The explicit App ID entered here should match the bundle ID in the Xcode target’s Summary pane.
To create a wildcard App ID, choose Wildcard App ID and enter a bundle ID suffix (e.g. com.example.*).
Select the checkboxes for the app capabilities you want to enable (e.g. Push Notifications, Game Center, etc.). Capabilities are listed; some require explicit App IDs and will be disabled if you selected wildcard.
Click Continue, review the settings, then click Register.
Your App ID is now created and can be used in provisioning profiles and Xcode signing.

(This file contains the official steps for registering an App ID from Apple’s Account help documentation.)

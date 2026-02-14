Source: Apple App Store Sandbox Testing

Apple App Store & TestFlight Sandbox Testing
This guide explains how to test in-app purchases for iOS using App Store sandbox and TestFlight.

Sandbox Considerations
Prices and metadata in Sandbox/TestFlight may not match your App Store Connect setup due to inconsistencies in the testing environment.
Focus on verifying that purchase flows work, rather than price accuracy.
Create a Sandbox Test Account
In App Store Connect, go to Users and Access → Sandbox Testers.
Create a new sandbox tester with a valid email (you must verify it).
For cross-region testing, set the sandbox user’s App Store Country/Region to the desired territory.
Testing on a Physical Device
Add Sandbox Account to Device:

On iOS 13 or earlier: sign out of your App Store account, then use Settings > App Store > Sandbox Account (or in older iOS, under your Apple ID).
On iOS 14+: go to Settings > App Store > Sandbox Account.
On iOS 18+: go to Settings > Developer > Sandbox Apple Account.
On macOS 11.5+: open App Store app, go to Preferences, then Sandbox Account.
Log in with your sandbox tester credentials.
Tip: If you don’t see the option, run a sandbox purchase and the login prompt will appear; after signing in, the account will be listed.
Run the App:

Build and install the app on the device (from Xcode or via TestFlight).
Initiate a purchase flow; you will be prompted to log in (choose your sandbox account).
The purchase should succeed as a “sandbox” transaction (free test).
Testing in Simulator (StoreKit Testing)
StoreKit testing lets you simulate in-app purchases in the iOS simulator (iOS 14+). However, for iOS 13 or earlier testing, use a device.

Ensure you run from Xcode with a StoreKit configuration file.
StoreKit testing on simulator requires the app to be launched via Xcode (commands like flutter run may not pick up the config file).
Note: StoreKit testing on macOS apps may be incompatible with some SDK versions.
Cancellation and Refunds
Cancel and refund events can be triggered via Xcode’s StoreKit Configuration window (Manage Transactions). These events are not delivered via receipts, so RevenueCat’s backend won’t see them.
(This file is sourced from RevenueCat’s sandbox testing documentation for the Apple App Store.)

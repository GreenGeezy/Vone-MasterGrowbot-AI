Source: RevenueCat iOS Configuration Guide

App Store Connect App-Specific Shared Secret
The App-Specific Shared Secret is a unique key that allows RevenueCat to communicate with Apple’s servers on your behalf for StoreKit 1 receipt validation. It is mandatory for StoreKit 1 (i.e. older) receipts, but not used if you use StoreKit 2.

StoreKit Version Requirements
StoreKit 2 (Recommended) – Use an In-App Purchase Key (App Store Connect API Key) instead of a shared secret. Required for apps targeting iOS 15+/RevenueCat SDK v5+. This key (Issuer ID, Key ID, Private Key) is used for server-to-server API.
StoreKit 1 – Required: App-Specific Shared Secret. For legacy apps (iOS 15 or earlier) using RevenueCat with receipt-based validation.
Setup for StoreKit 1
In App Store Connect, go to My Apps and select your app.
Under General → App Information, click Manage next to App-Specific Shared Secret.
Click Generate and copy the shared secret.
Then enter this secret into your RevenueCat dashboard under your iOS app’s settings (in the RevenueCat dashboard project settings).

Troubleshooting
If you use StoreKit 2 (RevenueCat v5+), you should configure an In-App Purchase Key instead.
If you have StoreKit 1 and see validation errors, ensure the shared secret is correctly set in RevenueCat.
(This file contains RevenueCat’s guide for configuring the Apple shared secret for iOS.)

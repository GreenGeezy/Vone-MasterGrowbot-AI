Source: Configuring iOS Permissions

Managing Permissions
iOS does not require explicit permission declarations like Android, but any app functionality that accesses privacy-sensitive data must provide a Usage Description in Info.plist. These are human-readable strings explaining why the app needs each permission. For example, if your app uses the camera, you must add NSCameraUsageDescription to Info.plist with a string like “This app requires camera access to take profile photos.”

Consult Apple’s Cocoa Keys list for keys ending in UsageDescription. Common keys include:

NSCameraUsageDescription (camera)
NSPhotoLibraryUsageDescription (photos)
NSLocationWhenInUseUsageDescription (location)
NSMicrophoneUsageDescription (microphone)
etc.
Without the appropriate <key>UsageDescription</key> entries, the app will crash at runtime when accessing those features, or be rejected by the App Store.

Apple also provides a Privacy-Sensitive Data App Rejection guide describing required usage descriptions for various APIs.

(This file contains the advice from Capacitor’s iOS configuration guide on setting usage descriptions in Info.plist.)

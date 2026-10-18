# Android 2.0 (159): Google Play review request

Requests Google's native, localized review card after the third technically completed plant analysis and 15 seconds of visible report reading. This timing is a reasoned engagement choice, not a proven guarantee of higher ratings. Failed, inconclusive and malformed reports, onboarding examples and web/iOS usage do not count. Plant health, review sentiment and subscription status never determine eligibility.

The request waits until loading, media selection, saving and the share sheet are closed. Leaving the report cancels the timer; returning for another completed report can create a later opportunity. Backgrounding restarts the reading delay. One attempt is persisted before invoking the native bridge, including native failures or quota suppression. Legacy users whose earlier build already reached three analyses are not prompted again. Storage failures skip reviews without affecting analysis.

No custom pre-prompt, five-star request, incentives or changes to Google's review card are added. Private feedback no longer leads into a public-review confirmation; the existing voluntary Rate on Google Play link remains available in Settings. The API does not disclose whether its card appeared, a review was submitted or which rating was chosen.

Policy references: https://developer.android.com/guide/playcore/in-app-review and https://developer.android.com/guide/playcore/in-app-review/test

For native UI verification, install this build through the Play internal testing track using a tester account that has downloaded the app and has no existing review. Complete three valid reports, then leave the third report visible for at least 15 seconds. Google's production quota may suppress the dialog; tests and browser fixtures cannot prove that a real review is submitted.

No billing, Supabase, subscription catalog, Play listing, title, screenshots or iOS branch changes are part of this update. Android versionName is 2.0; versionCode is 159.

Verification: TypeScript, production web build, 70 source tests, Android release lint and the final synced debug package passed. APK metadata confirms versionName 2.0 and versionCode 159. Playwright used isolated camera/AI/native-review fixtures to verify first/second-report suppression, reading delay, navigation cancellation, a later opportunity and single-attempt behavior with no uncaught page errors. Real Play card display remains a device/internal-track check.

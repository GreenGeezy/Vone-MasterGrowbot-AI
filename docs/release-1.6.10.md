# Release 1.6.10 (171)

## Diagnosis and repairs

- The screenshot's Check status button and verification messages are app access-check failures, not a returned StoreKit yearly-product error. The previous implementation marked an access-service outage as a pending transaction and disabled all billing-period choices. Verification failure is now tracked separately, plan selection remains available, and a rejected session JWT is refreshed once before retrying. A pending Apple purchase still cannot be replayed automatically. Backend authorization remains mandatory.
- Photo requests removed the data URL prefix and implicitly declared every image as JPEG. A live PNG request reproduced HTTP 400 `Image data does not match its MIME type`. Sending the identical PNG with its data URL succeeded in 4.6 seconds before deployment and 3.6 seconds after deployment. The client now preserves the image MIME type. This proves a failure path; the original iPhone image's raw bytes and device network logs were not available to prove it was the sole cause of that particular attempt.
- Removed five indiscriminate photo retries and orphaned timeout requests. Photo, video and access checks now use one bounded request lifecycle, explicit current user JWT, one retry only for an HTTP 401, and cancellation. No retry is made for validation, quota, provider or network errors. The image loader displays elapsed seconds instead of a countdown stuck at zero.
- Video metadata loading now times out and releases the media element. Provider attempts have an 85-second shared inference budget, with up to 45 seconds per attempt, inside the client request deadline. This avoids starting several long provider calls after the client has already given up.
- Video parsing failure previously finalized usage twice for one provider response. Usage is now settled once per attempt, retaining actual returned usage even when parsing fails. Invalid media is validated before reserving quota.
- No report prompts, model routes, response schemas, report rendering or report text were edited. `core.ts` was compared to the live deployment and is unchanged. Five-video daily and $1.90 rolling weekly limits remain enforced. Local configuration now matches production's enabled JWT verification.

## Live service checks

- Supabase `gemini-v3` version **33**, active, `verify_jwt: true`; deployed files read back and compared successfully.
- Fresh anonymous-session wakeup returned 200; an unpaid session's Premium check returned the expected 403 `premium_required`. No entitlement bypass or grant was introduced. Temporary diagnostic users and their usage rows were removed after signing out.
- RevenueCat's three Premium products remain attached to `machine_vision`. The dashboard still allows Sandbox entitlements for **Anybody** and transfers restored receipts to the new app user ID. No RevenueCat configuration mutation was needed.
- Yearly product is active in RevenueCat, US price $199, no trial offer, in MasterGrowbot Subscriptions. App Store state still reports **MISSING_METADATA**, with `review_information: null`.
- A prior weekly subscription does not by itself prove a failed yearly purchase. For equal-level subscriptions with different durations, Apple schedules a crossgrade for the next renewal. Use Apple Subscriptions to inspect the current and scheduled plan. [Apple subscription timing](https://developer.apple.com/app-store/subscriptions/).

## Validation and remaining release steps

- 68 automated tests passed, including MIME preservation, exact report passthrough, rejected-token recovery, identity preservation, timeout cancellation, non-replayed errors, and single usage settlement after malformed video output.
- Playwright at 375×667 passed with mocked native purchase APIs and backend responses: verification outage recovery, selectable yearly cadence, exact yearly product passed to purchasePackage, PNG report display, one photo request, no horizontal overflow and no JavaScript page errors. An intentional HTTP 503 was used to test outage handling. This does not replace a real StoreKit transaction.
- TypeScript, production build, 300-strain validation and Capacitor iOS asset/plugin sync passed. CocoaPods and Xcode are unavailable on Windows; native compilation/signing remains untested here.
- Run Codemagic **MasterGrowbot iOS App Store** (`ios-app-store`) on branch `ios`, then install **1.6.10 (171)** through TestFlight.
- Test a gallery PNG, a camera JPEG, Premium purchase/restore, and two consecutive video analyses. Also test offline recovery and reopening after purchase. Verify the Apple sheet shows the selected yearly product and correct start date; for a clean purchase test use a fresh Sandbox tester with no existing subscription.
- Complete missing subscription review metadata/screenshot and attach the three Premium products to the matching app-version submission. Confirm privacy disclosures before submission. App Review approval is not established by these software checks.

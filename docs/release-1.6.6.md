# iOS 1.6.6 (167)

## Video access and Premium entry

The reported failure exposed a mismatch between a cached SDK entitlement and the backend's JWT-derived customer access. The previous Plant Health screen read the SDK once and could open recording based on stale access. The paywall itself could also immediately dismiss from that cached result. A later server rejection only displayed Retry, creating an unhelpful loop.

Analyze Video now opens Premium immediately. Existing subscribers continue only after a server access check succeeds; other users see the validated Premium plans and Restore Purchases. A `premium_required` response during video analysis reopens Premium with recovery guidance and retains the selected video. Explicit purchase/restore still binds RevenueCat to the authenticated Supabase user. No automatic purchase, promotional access, client-supplied identity, or entitlement bypass was added.

The additive `premium_access` mode is deployed in `gemini-v3` version 28, active with gateway JWT verification enabled. It uses the existing server entitlement check without media, AI inference, or quota reservation. Video inference independently rechecks access. A provider/verification outage remains an availability error, not proof that a subscription must be purchased.

All three Apple Premium products remain attached to `machine_vision` in RevenueCat. The weekly Apple store-state read still reports `MISSING_METADATA`, with no introductory offer and the correct US price. No store prices, purchase transfers, subscription levels or product mappings were changed in this release. Historical configuration findings are in the preceding release notes; a cached customer result cannot establish the exact identity/state on the reporting iPhone.

## UI and sharing

- Compact Plant Health header, Take Pic and Analyze Image above settings; a compact Premium video CTA keeps all three actions prominent. Paywall/video headers reserve space for native status bars.
- Share cards include the analyzed photo or one locally decoded video frame by default. Preview includes an opt-out checkbox. Full video/audio, source metadata, journal and profile are not embedded. No public media upload is added.
- 1080 × 1350 image-led artwork, smaller score, bounded report headline and a clear download invitation. A smaller dialog preview keeps the primary Share button visible on a 375 × 667 viewport.
- Both caption sharing and copy append the verified App Store and Google Play links, including after caption edits. The card and caption invite a free trial with explicit eligibility language and clarify that Premium video is sold separately. Native destinations depend on installed apps; some social apps only accept the image, so Copy caption remains available.
- Existing native cache cleanup and neutral cancellation handling remain. Unreadable media falls back to caption sharing or a card without the image; the user can inspect the preview before sharing.

## Loading improvements

Offerings warm once after SDK configuration. Paywalls reuse configured SDK state rather than repeat unrelated subscription initialization. Removed redundant customer-cache invalidation before Pro offerings, repeated receipt synchronization after a successful purchase, and the additional confirmation alert after a verified restore. Verified store results unlock Pro immediately; unresolved results still receive bounded refreshes. A ref prevents duplicate purchase/restore taps. Native purchase and restore sheets are not raced against JavaScript timeouts.

These changes remove avoidable work; store/network response time and revenue uplift have not been measured on device.

## Validation

- TypeScript passed.
- Premium/catalog/video/backend/recovery/access tests: 42 passed.
- Sharing tests: 5 passed. Authentication reliability: 5 passed. Total: 52.
- Playwright CLI on actual React components with mocked native/backend responses: cached entitlement mismatch, immediate paywall entry, server rejection recovery, restore identity binding, selected video retention, above-fold photo controls, local photo preview, privacy toggle, PNG download, visible Share CTA and no horizontal overflow.
- Browser media test: actual locally recorded test video decoded to a frame and rendered into the exported card; long headline, broken-video fallback and remote-image rejection passed. This checks browser decoding, not native iPhone MOV/HEVC compatibility.
- Pro component test: verified purchase/restore completes without redundant sync/refresh, duplicate taps suppressed.
- Live unpaid-session preflight returned HTTP 403 `premium_required` even with forged Premium/customer fields. Temporary session signed out and test user deleted. No AI call or purchase ran.
- Production build and Capacitor iOS sync passed. CocoaPods/Xcode compilation are unavailable on this Windows host and remain Codemagic checks.

## Before App Review

Run Codemagic from `ios` and test 1.6.6 (167) on the iPhone: unpaid entry → Premium; purchase/restore → video; expiry/rejection → Premium with video retained; photo/video share sheet → selected destination; reopen and confirm journal/entitlement persistence. No Codemagic build was manually started by this task; existing repository push triggers remain configured.

Complete Apple subscription review metadata/screenshots, confirm the Premium service level, attach all three products to the matching app version, and review public privacy disclosures before submission. Use actual device screenshots. This code release does not assert that App Store Connect is ready or that native purchases have been retested.

# iOS 1.6.5 (166)

## Purchase failure: verified cause and configuration fix

RevenueCat recorded an active `mastergrowbot_premium_weekly_v1` Apple Sandbox subscription for a customer using 1.6.4. Its customer and subscription entitlement lists were empty, even though the product was correctly attached to both `pro` and `machine_vision`.

The project's Sandbox testing access was **Nobody**. It was changed to **Anybody**, RevenueCat's default test behavior. The same existing subscription then returned both active entitlements through API v2. No new purchase, promotional grant, product remapping, restore-policy change, or authorization bypass was needed. This setting applies to platform sandbox purchases across the project; production purchases are unaffected. See [RevenueCat Sandbox Testing Access](https://www.revenuecat.com/docs/projects/sandbox-access).

The iOS bundle identifier, public SDK key platform, store credentials, all three Premium package associations, and both entitlement mappings were checked live. Premium US prices remain $12.99/week, $49.99/month, $199/year; no introductory offers. `gemini-v3` is active at version 27 with gateway JWT verification enabled. Its existing server-side entitlement check and usage limits were preserved.

## Application changes

- Premium transactions retain the authenticated customer identity while verification is pending, including after restart. A confirmed initial cancellation can roll back to the prior Pro identity. A returned or unresolved Apple transaction is no longer treated as a failed purchase and rolled back.
- Apple owns the lifetime of purchase/restore operations; a JavaScript timeout no longer races an active StoreKit operation. Repeated taps and closing during those operations are blocked.
- Customer-info cache invalidation and bounded refresh retries handle delayed entitlement delivery. Entitlement updates can unlock an idle paywall. Missing entitlements never unlock Premium based only on a product ID.
- Pending access displays Check status, Apple Subscriptions, and support. Status guidance scrolls into view. Cancellation is neutral; pending approval, connection failure, unavailable product and receipt-account conflicts have separate messages. A user who has checked Apple Subscriptions can deliberately choose a plan again.
- The CTA is **Unlock video analysis**, with its selected localized recurring price directly above it. Restore and legal links have larger touch targets; plan selection has an accessible pressed state. Apple still confirms billing and effective dates.
- Photo and video result screens open **Share Analysis**: a 1080 × 1350 PNG card, preview, editable caption and verified App Store link. The card contains the result headline and an explicitly labeled AI visual score, with uncertainty language. It excludes raw photo/video, profile, location and journal data.
- Native sharing writes only the generated PNG into app cache and removes it after the share activity completes or is cancelled. Cancellation is not reported as failure. Unsupported sharing offers copy/manual-copy fallbacks; browsers also offer PNG download. Available destinations depend on installed apps and platform support; no posting occurs automatically.
- Added a Capacitor 6 filesystem dependency pinned to 6.0.4 and an iOS privacy manifest for app-owned file timestamps and user defaults. The native plugin is included in the Podfile.
- Both tutorial strain counts now say 300+. A final tutorial step introduces sharing. No incentivized, filtered, or forced review request was added.
- Package, profile display, and iOS release versions are 1.6.5 / build 166. Codemagic runs the sharing regression suite and rejects a non-App-Store RevenueCat SDK key.

## Validation

- TypeScript passed.
- Premium/catalog/video/backend/recovery tests: 38 passed.
- Sharing tests: 4 passed, including native cache cleanup after success and cancellation.
- Authentication reliability tests: 5 passed.
- Strain validation: 300 entries; no duplicate IDs/names or missing required fields.
- Production Vite build and Capacitor iOS plugin/assets sync passed. Windows skips CocoaPods and Xcode; native compilation/signing remain Codemagic checks.
- Playwright CLI at 375 × 667: share-card rendering, long headline truncation, PNG export, share cancellation, unavailable sharing, denied clipboard, and horizontal overflow checks passed.
- Actual PremiumPaywall component with mocked native SDK responses: cadence matching, pending identity retention, delayed entitlement unlock, cancellation rollback, restore guidance, and layout passed. These are mocked StoreKit tests, not a physical-device purchase.
- Tutorial counts/share step, visible final CTA, and actual Plant Health photo-result-to-share-dialog integration passed using local test data. Fixtures/screenshots live under ignored/local output directories and are not shipped.

## Remaining native/review work

1. Build and install 1.6.5 (166) through Codemagic/TestFlight. Restore the existing Sandbox subscription before purchasing again. Confirm Premium video succeeds under the authenticated identity and survives relaunch.
2. Test actual recording, picker, share sheet (Messages plus an installed social app), cancellation, and journal persistence on iPhone. Social apps may accept only the PNG; the caption can be copied separately.
3. Apple still reports `MISSING_METADATA` for all three Premium products. Complete real review screenshots/notes, confirm their higher service level in the shared subscription group, and attach them to the matching app-version submission. No error screenshot or browser mock was uploaded as review evidence.
4. Check public App Privacy and privacy-policy disclosures against the existing video path through Supabase, OpenRouter and the selected model provider. MasterGrowbot does not persist raw video; third-party retention must be described according to actual provider policy. The new sharing flow locally prepares a card and sends it only to destinations explicitly selected by the user. A native required-reason privacy manifest is not a replacement for those disclosures.

The dependency install reported 26 audit findings. Broad dependency upgrades are outside this release and should be separately tested, rather than applying a breaking automatic audit fix.

## Measuring the design changes

These are conversion/usability hypotheses, not a measured revenue lift. Compare Premium conversion, purchase-related support reports, refunds, subscriber retention and App Store ratings over comparable periods after rollout. Keep plan prices and acquisition mix in view when interpreting changes. For share-to-install attribution, create an official App Store Connect campaign link and replace the generic store URL only after verifying its provider token and campaign configuration. The release does not invent tracking identifiers or silently collect report content.

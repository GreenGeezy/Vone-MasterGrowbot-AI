# iOS 1.6.2 (163) release handoff — September 7, 2026

## Manual steps and release blockers first

1. Run Codemagic on `ios`, inspect the full archive log, and test build 163 on iPhone and iPad. This Windows workspace cannot run Xcode, CocoaPods, StoreKit, or an iOS archive. Confirm build 163 has not already been uploaded; increase it if necessary. This is a reliability release candidate, not a completed video release.
2. Machine Vision is NOT implemented or sold by this build. Do not submit screenshots or descriptions advertising it as available. The new RevenueCat entitlement is created but has no products attached. Video inference and cannabis cultivation diagnosis enhancements were outside the implementation scope of this pass.
3. Before a future paid feature launch, finalize the App Store subscription group, tier ranking, prices, product review metadata, and Sandbox upgrade/trial tests. Do not expect a separate add-on to end a different subscription's trial. Never charge the base plan programmatically to simulate an upgrade.
4. Test an update over an existing installation, purchase, cancellation, restore, expired subscriptions, trial eligibility, background/resume, offline startup, journal reopen, and interrupted writes. Avoid deleting/reinstalling an important anonymous installation. Purchase restoration does not restore the anonymous database identity on another device.
5. Review privacy disclosures and actual screenshots before submission. Provide reviewer access and explanations of non-obvious purchases. No claim of guaranteed approval, error-free operation, or increased ratings is made.

## Implemented

- One persistent Supabase client and shared pending authentication. Session read failures and timeouts do not create replacement users. An installation marker preserves evidence of an existing identity if the SDK clears an invalid session. Later successful calls reread current tokens rather than caching startup tokens indefinitely.
- Removed nonexistent `profiles.updated_at` writes and restricted profile payloads to known columns. Profile IDs cannot be overridden by an update payload.
- Profile prerequisites are checked before dependent record creation. Failed lookups do not trigger blind inserts. Journal/task read errors propagate instead of appearing as empty data.
- RevenueCat initializes independently of Supabase availability, checks existing configuration, and uses the established Preferences identity. Returning customers see subscription verification before the paywall. Active `pro` remains authoritative, including lifetime access; subscription fallback is limited to known legacy base products rather than any future add-on.
- Bounded subscription configuration, refresh, offering eligibility, restore and verification operations. Apple purchase confirmation itself is not prematurely timed out. Shorter bounded activation retries; Restore remains available.
- Removed unsafe parsing of localized price strings and hard-coded dollar savings. The annual summary uses StoreKit's localized price.
- RevenueCat pinned to 9.2.2 with PurchasesHybridCommon 13.26.0. The published release fixes Xcode type-name collisions and npm declares Capacitor 6 compatibility. This is an evidence-backed compatibility update, not proof that the missing original compiler diagnostic had that cause.
- App version 1.6.2/build 163; Xcode minimum deployment target aligned with the existing iOS 15 Podfile.
- Codemagic validates required public keys, types and regression tests before building, and prints the resolved Podfile.lock for native diagnosis.
- Removed Vite's injection of all environment variables into `process.env`; only Vite's standard public configuration is used. The local public Supabase key is in ignored `.env.local`.
- Bundled Tailwind styles at build time, eliminating the runtime Tailwind CDN dependency. Existing theme preserved. Google Fonts remain external with system font fallback.

## RevenueCat result

Authenticated through the official CLI OAuth flow with the user's approval.

- Project: `projf176df92`.
- iOS app: `app521ff67c60`, bundle `com.mastergrowbot.ai`.
- Existing `pro`: `entle87d63b32e` — unchanged.
- New `machine_vision`: `entl05530ace9d`, display name **MasterGrowbot AI Machine Vision** — created and read back successfully.
- Current `default` offering: unchanged. No product prices, trials, existing entitlement attachments, or customer subscriptions changed.
- Existing catalog includes weekly v2/v3, monthly v2, yearly v2/v3, legacy weekly/monthly, and lifetime. These must be considered in migration and restoration tests.

## Subscription design assessment

The user's requested increments are $4.99/week, $19.99/month, and $99.99/year. Based on the historical base prices in the handoff, the arithmetic combined prices would be $12.98/week, $49.98/month, and $199.98/year. These are arithmetic totals, not verified available Apple price points or live configured prices.

Apple permits only one subscription per group; different groups bill independently. A higher service level in the same group is the appropriate design to investigate for an immediate replacement upgrade. A separate add-on cannot guarantee immediate conversion of the base trial. Apple controls billing, refunds and effective dates. Verify trial-to-upgrade behavior in Sandbox before promising an exact immediate charge.

For a future combined tier, attach both `pro` and `machine_vision` to the combined products, rank them above base products in the existing group, and display the full localized recurring price, billing period, and trial/upgrade terms. Never present only the incremental amount as the amount charged. Do not enable sales until the feature and server authorization are actually implemented and tested.

Source: [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/).

## API price comparison (September 7, 2026)

Public standard OpenRouter rates per million tokens, not measurements of this project's actual bills:

| Model | Input | Output |
| --- | ---: | ---: |
| Gemini 3.8 Flash | $0.75 | $3.75 |
| Gemini 3.7 Flash | $0.75 | $3.75 |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 |

3.8 and 3.7 have equal listed standard token rates. Relative to 2.5 Flash-Lite, 3.8 input is 7.5 times and output 9.375 times as expensive. For an illustrative 10,000 input tokens and 1,000 output tokens, standard cost is $0.01125 versus $0.0014. This is not a per-video estimate: video duration, frame sampling, audio, resolution, reasoning output, retries, caching and provider selection change the bill. No actual video/model evaluation was performed, and no model routing or Edge Functions were deployed. Introductory/provider rates can change; recheck before launch. The handoff's claimed live routing was not independently audited as part of inference implementation.

Sources: [3.8 Flash](https://openrouter.ai/google/gemini-3.8-flash), [3.7 comparison](https://openrouter.ai/compare/google/gemini-3.6-flash/google/gemini-3.7-flash), [Flash-Lite](https://openrouter.ai/google/gemini-2.5-flash-lite).

## Screenshots and App Review

For the current reliability build, retain screenshots that truthfully show shipped functionality. For any later implemented premium feature, capture actual in-app UI and visibly identify paid functionality and its subscription requirement. Do not imply that every feature is included in the base free trial. Use localized StoreKit prices on purchase screens, describe renewals and trial duration accurately, and keep restoration, terms and privacy accessible. Explain the tier distinction and reviewer test steps in App Review notes. Avoid fabricated ratings/testimonials, promises of certain AI outcomes, and screenshots of unavailable features.

Apple guidelines 2.3.2–2.3.3 require accurate metadata, disclosure of additional purchases, and screenshots showing the app in use. See [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/). This is implementation guidance, not assurance of App Review acceptance.

## Backend audit and remaining limits

The connected Supabase project was healthy. A live information_schema query confirmed the exact profile columns and absence of `updated_at`. Reviewed profile/record/task policies include ownership predicates. Security advisors report anonymous-access warnings (the app intentionally uses authenticated anonymous users) and disabled leaked-password protection. No blanket RLS changes were made, and no production user data was deleted. Storage has public-read policies that deserve a separate privacy review before private videos are uploaded. [Supabase advisor reference](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins).

This is not a comprehensive offline-sync or cross-device recovery implementation. Existing local-only records and failed writes still need a durable sync queue and a recoverable identity design before cross-device persistence can be promised. Native testing is required. Existing large JavaScript bundle warnings remain; this release does not claim a measured startup speed improvement.

Native compatibility evidence: [RevenueCat 9.2.2 release](https://github.com/RevenueCat/purchases-capacitor/releases/tag/9.2.2).

## Validation completed

- `npm run typecheck`: passed.
- `npm run test:reliability`: five tests passed, covering refresh failures, concurrent/slow sign-in, refreshed tokens, retry recovery, and prevention of identity replacement after SDK session removal.
- `npm run build`: passed. Remaining warnings: a large JavaScript chunk, mixed static/dynamic imports, and an outdated Browserslist data snapshot.
- `npm run validate:strains`: 300 records; no duplicate IDs/names, missing required fields, or invalid types.
- Playwright production preview: page loads, onboarding navigation and reload work, 390×844 screenshot inspected, zero console errors on the final reload. This does not validate native StoreKit or all app screens.
- `git diff --check`: passed.
- Supabase schema and policies inspected read-only; RevenueCat entitlement read back successfully.
- Not run: Xcode archive, CocoaPods resolution on macOS, iPhone/iPad runtime tests, real Sandbox purchases, full offline synchronization, and video model evaluation.

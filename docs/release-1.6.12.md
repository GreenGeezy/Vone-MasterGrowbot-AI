# MasterGrowbot AI 1.6.12 (173)

## iOS release

Pro now leads with photo check-ins, saved progress, 300 existing profiles and journal tasks. Premium is a compact optional action; its paywall includes Pro in the total price and advertises “Double the strains” only when the validated 300-profile expansion is available. While uploads are disabled, Premium shows “First access to new Premium features” with release-based wording. Both paywalls retain localized prices, renewal terms and restore. Purchase/identity logic, prices, introductory offers, gemini-v3 and report text are unchanged.

Home includes a dismissible action-based checklist and latest saved check-in. iOS notes save without waiting for optional AI enrichment. Android UI uses the existing branch of platform checks; no Android binary is produced.

The additional 300 reference identities have unique names/IDs and individual internal sources. They provide classification and breeder identity, not fabricated potency or growing metrics. Sources are retained internally and not linked or cited in the app. Alias coverage remains limited to known names; this is not a claim that every historical synonym has been resolved.

Customer-facing iOS website links use mastergrowbot.com, including sharing and terms. Native Apple billing remains available, and the rating action uses the native review prompt. The website terms page currently states that Apple’s standard EULA governs App Store submissions; keep the App Store Connect EULA setting consistent and review legal copy before submission.

## Backend rollout

Additive migrations create private journal_documents storage, owner-restricted metadata, catalog records, feature flags and minimal event storage. premium-library verifies JWT identity and Premium on new uploads/profile details. Existing-file read/delete does not require Premium, including a saved-files route from the Pro paywall.

Catalog enabled; uploads DISABLED by agreement. The account is on the free Supabase plan. Dashboard: database 0.682/0.5 GB, storage 0.591/1 GB, egress 0.16/5 GB, cached egress 0.029/5 GB. Existing inline report images cause the database overage. See image-storage-migration.md. No plan upgrade or deletion occurred.

Prepared upload limits: 10 MiB/file, five files/note, 100 MiB/owner and a 100 MiB project launch cap. Reservations serialize quota checks; pending uploads count. Uploads are immutable; short-lived download links require owner authorization. Abandoned unsaved drafts older than 24 hours are cleaned in bounded batches on subsequent uploads. There is no scheduled cleanup job yet. Do not enable uploads until remaining concurrent upload/delete, cleanup-race and native document tests pass.

Events exclude document contents, filenames, journal text and images. RevenueCat remains the revenue source of truth; client success events are diagnostic only. Review mature trial counts, journal saves, return activity, Premium views/purchases and retention at 14 and 28 days. No automatic recurring task was created.

## Verification

90 automated regression tests passed. TypeScript, production build and Capacitor iOS sync passed for 1.6.12 (173). CocoaPods and Xcode compilation remain Codemagic checks. Catalog validator passed 600 unique names/IDs. Database transaction checks verified owner isolation, blocked direct writes, five-file limit, idempotency and conflicting-owner IDs; all test fixtures rolled back. Live existing-session API checks verified config, file listing, catalog pagination and Premium denial. Browser checks at 375×667 verified paywalls, price selection, no horizontal overflow, Home/Journal task recovery and failed-note draft preservation. Browser tests do not establish native StoreKit or file-opening success.

## Before App Review

Run Codemagic ios-app-store on ios and install 1.6.12 (173). Verify existing Pro/trial/lifetime/Premium access, Sandbox purchase/cancel/restore/plan change, image/video analysis, report save/reopen/share, Home tasks, Journal notes and new catalog access. Verify Terms/Privacy and native review behavior. Do not advertise private files while uploads remain disabled.

Before enabling documents, update the public privacy policy and App Privacy disclosures to cover private document storage and minimal product analytics. Describe owner access after cancellation and the limits of anonymous-session recovery. This repository change does not publish website policy or App Store Connect disclosures.

# Android 2.0 / 160 release

## Build and upload

- Use Android main only; iOS stays separate.
- CodeMagic signs with the existing upload key. Local validation bundles use a disposable key and must not be uploaded to Play.
- CodeMagic runs source checks, release lint/tests, R8 and bundle validation. Download its AAB, release-verification.json and mapping.txt.
- Check the highest code already uploaded before building. Code 160 must be unused; otherwise increment versionCode and rebuild.
- Upload the exact CodeMagic artifact to internal testing. Keep automatic protection on.
- Minimum Android is now 7.0 (API 24); existing Android 6 installations remain installed but cannot receive this update.

## Store and billing

- US target prices: weekly $6.99; annual $59.99. Preserve existing country availability and review converted regional prices.
- Existing annual/weekly three-day free-trial offers remain active. Returning subscribers may not be eligible.
- Do not publish the lower-price release-note sentence until both price changes are live.
- Monthly is unavailable for new purchases. Preserve its product and pro entitlement mapping for existing subscribers and restores.
- Do not delete the shared iOS monthly package/product or premium_upgrade / machine_vision configuration.
- Check a fresh eligible account and an ineligible account on the Play-installed release: displayed pricing and trial terms must match Google's checkout sheet.
- Verify existing weekly, annual and monthly subscribers after updating; restore on reinstall; pending/cancelled purchases; renewal, expiry and billing retry.
- Keep Supabase sessions and RevenueCat anonymous identity stable. Do not rotate credentials or change schemas/RLS for this release.

## Device and listing gates

- Test release-minified cold start/resume, camera/gallery, analysis, journal/task persistence, strain screens, support links, restore and native review request on API 24 and a current Android version.
- Playwright fixtures test UI behavior; they do not validate native billing or real account access.
- Review Play's processed bundle for optimization and compatibility findings before production.
- Retain app title, icon and screenshots. Only publish verified listing claims; assess the short-description experiment independently of the release.
- Confirm privacy/data-safety declarations remain accurate for existing analytics.
- Use staged production rollout only after internal device/payment checks pass. Monitor startup, crashes/ANRs, analysis errors, purchase errors, refunds and trial-to-paid conversion.

## Release notes

Use android-2.0-release-notes.txt after the factual changes above are verified. Google asks developers to describe recent updates and prohibits using release notes for promotional purposes or calls to action:
https://support.google.com/googleplay/android-developer/answer/9859348?hl=en

“Reduced ... prices for new subscriptions” describes a configuration change. Avoid sale language, urgency, discount claims, ratings requests or guaranteed outcomes. Google makes the approval decision.

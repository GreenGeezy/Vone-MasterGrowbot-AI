# Android 2.0 (160) validation — 19 October 2026

## Completed

- Shared minimum SDK 24; merged release manifest confirms package com.mastergrowbot.app, name 2.0, code 160 and target SDK 36.
- TypeScript checks pass; 73 source tests pass; 300 strain profiles validated without duplicate IDs/names or missing required fields.
- Release lint, Android unit-test tasks and R8-minified/resource-shrunk release bundle build pass. Lint: 0 errors, 20 warnings. No Gradle/Capacitor/RevenueCat major upgrade.
- Camera's transitive Material library updated from 1.12.0 to stable 1.14.0; AAR metadata validation passes with the existing toolchain.
- Bundletool structure/manifest validation, signer comparison against the configured validation key, R8 mapping output and all ten Capacitor plugins pass.
- Both 64-bit libdatastore_shared_counter.so variants have >=16384-byte ELF LOAD alignment. Bundle requests PAGE_ALIGNMENT_16K; generated universal APK passes zipalign -c -P 16 4.
- Playwright fixtures cover onboarding/resume/summary edit, annual and weekly prices, 83% savings, $1.15 weekly equivalent, tutorial/navigation, eligible/ineligible/unknown trial text, four viewport sizes, support links and camera-error recovery. No uncaught errors in the layout and review checks. Supabase outage responses in isolated browser tests are deliberate fixtures.
- Review fixture confirms third-report timing, reading delay, leaving-screen cancellation, unhealthy-report eligibility and one native attempt.
- Live isolated Supabase checks pass: anonymous sign-in, one session owner, token refresh, profile/grow/plant/journal/diagnosis/task writes and reloads, and restored session after client recreation. Cleanup requests target only the test's records. No schema, RLS, function or authentication configuration changes.

## Store changes

- Annual US price saved at $59.99; weekly US price saved at $6.99. Regional prices calculated by Play, retaining availability. Existing subscribers are not explicitly migrated or canceled.
- Existing annual and weekly P3D zero-price acquisition offers retained; eligibility is determined by Play.
- Monthly base plan is inactive in Play (including its offers for new subscribers). Existing product and entitlement records retained.
- Android monthly product prod626552b4f2 detached from shared package pkge1e603b1bc8. Read-back confirms that package still contains iOS monthly_pro_v2. No iOS product, Premium offering or entitlement renamed/deleted.
- Corrected full listing description saved as a Console draft. Title, icon, screenshots, category and tags retained. Short-description experiment copy is prepared in android-short-description-experiment.txt; start only after the accurate listing is live with the tested release.

## Still required before production

- Run CodeMagic on main with its existing production upload key. The local validation AAB uses a disposable key and must not be uploaded.
- Confirm code 160 is unused on Play before upload; increment and rebuild if necessary. Upload CodeMagic's exact verified AAB to internal testing.
- Confirm Google's processed bundle optimization metric, protection result and deprecated-API warnings. Source changes and local builds cannot certify Google's eventual reports.
- Test the Play-protected release on real devices, including Android 7 and a current Android version: startup/resume, native plugins, camera/gallery, real analysis and data persistence.
- Test Google's checkout sheets, eligible/ineligible offers, purchase cancellation/pending/error/restore, and existing weekly/annual/monthly subscriber access after updating. No connected Android device was available for this work.
- Publish the description alongside the verified release, then start the single short-description experiment. Do not infer conversion or revenue improvements from fixture checks.
- Production rollout remains gated on these tests; use staged rollout and monitor purchase failures, crashes/ANRs, analysis errors, refunds and trial-to-paid conversion.

## Non-blocking local warnings

The build reports upstream Amazon Appstore SDK stack-map warnings (transitive RevenueCat dependency) and Gradle deprecations. They do not fail the current build. Retain the pinned working toolchain and validate native Google Play purchase flows before production rather than suppressing warnings or making an unrelated major upgrade.

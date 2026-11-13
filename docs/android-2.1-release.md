# Android 2.1 / 162

Ports the conversion work from iOS 2.1.0 to Android. Not ported, by decision: Premium plans, video analysis, and the extra Premium strain catalog. No change to purchase, restore, entitlement, RevenueCat, Supabase schema or edge functions, signing, or the iOS branch.

## What changed

- Launch screen: the high-five illustration is replaced by the app logo with the brand text, in both the first HTML paint and the React loader. `public/assets/V13MasterGrowbotWelcome.png` is removed (2.5 MB smaller bundle).
- Welcome screen: whole-plant example photo with its report card, one headline ("Snap a photo. Know what to check next."), one button ("Get started") that goes straight to the three questions. The full example report is still reachable by tapping the report card. Reason: 22% of iOS users left on the old first screen.
- 7-day grow plan on Home: five photo check-ins (days 1, 2, 3, 5, 7), health score trend, a "do today" action, and a day 1 versus latest comparison. Derived only from the grower's own saved reports (`services/growPlan.ts`, `components/ProCheckIn.tsx`).
- Health report: shows the new score next to the last saved check-in; the save button names the plan.
- Pro paywall: trial steps shown only when Google Play reports a free trial on the selected plan; 7-day plan listed as a benefit; `product_id` sent on plan and purchase events. Prices and trial eligibility still come from Google Play at runtime.
- Summary screen button reads "Continue" for everyone. It previously promised a 3-day trial to users Google Play may consider ineligible.
- Post-purchase screen: removed "data is stored locally" and "unlimited AI" (neither is accurate) and "elite circle"; it now points to the first photo check-in.
- Rating request: moved from 15 seconds into reading the third analysis to just after the second saved report. One attempt per install; users an earlier build already asked are not asked again.
- Report a result: each health report has a "Report a problem with this result" link (email to support), for Google Play's AI-generated content policy.
- Manifest: removed `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` and the microphone feature. Nothing in the Android app records audio.
- Version 2.1, versionCode 162. Play Console showed 161 as the highest uploaded code on 2026-11-13.

## Store listing (ASO)

- `docs/android-store-description.txt`: new full description (1,844 characters). Describes only features in this build. Adds the search terms growers use (cannabis, marijuana, grow journal, grow tracker, strain guide, plant health, nutrient deficiency, pests, mold) in normal sentences.
- `docs/android-short-description-experiment.txt`: new short description (78 of 80 characters).
- `docs/android-2.1-release-notes.txt`: release notes (346 of 500 characters).
- The live description must be replaced. It claims "world's most advanced", "award-winning", "maximize yields and potency", "identify 100+ issues", and lists features this app does not have (offline mode, seed bank manager, time-lapse, VPD and EC logging, export). Those are misleading-claims exposure under Google Play's Deceptive Behavior and Metadata policies.
- Optional title (30 of 30 characters): `MasterGrowbot AI Cannabis Grow`. Not part of this submission; change it in a later, separate listing update so a title rejection cannot hold up the release.

## Validation (2026-11-13)

- TypeScript typecheck, vitest suite, 300-strain validation and the web production build were run; see the commit message for counts.
- Browser check at 375x812 against the dev server: launch screen, welcome, three questions, summary, paywall with trial steps (yearly preselected), preview purchase, post-purchase screen, tutorial, Home with the grow plan, all four tabs, and the grow plan's unstarted, checked-today, due, and complete states. No uncaught page errors on a clean load.
- Not tested here: the native Android build (no JDK or Android SDK on this machine; CodeMagic builds it), real Google Play billing, camera and gallery on a device, a live AI analysis, the in-app review sheet, and the email link on a device. These are phone acceptance checks on the internal-testing build before production.

## Phone acceptance before production

1. Fresh install: logo launch screen, welcome, questions, summary, paywall. Trial steps appear only if Google Play offers a trial; price and terms match the Google Play sheet.
2. Buy yearly with a license-test account; tutorial; first analysis; save. Home shows the grow plan on day 1.
3. Second saved report: the Google Play rating sheet may appear once (Google can suppress it).
4. "Report a problem with this result" opens an email draft.
5. Existing subscriber updating from 2.0 (161) keeps access with no paywall.
6. Restore Purchases on a reinstall. Cancelled purchase leaves the paywall usable.
7. Three-button and gesture navigation: bottom buttons stay visible.

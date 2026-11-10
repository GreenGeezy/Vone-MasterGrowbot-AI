# MasterGrowbot AI iOS 2.1.0 — revenue update PRD and agent plan

Prepared 2026-11-10. Baseline: iOS 2.0.3 build 182, commit `979c042` on `origin/ios`.
Status: proposal for owner review. Nothing in this document has been built, changed, or submitted.

## Build status (Nov 10, branch `release/2.1.0`, uncommitted)

Owner decisions: testimonials stay unchanged everywhere; trial stays 3 days; no push notifications in this
release; the existing example photo is kept; the analytics function deploy was approved.

Built and passing typecheck plus 119 tests:
- Welcome screen: whole-plant example with the report card over it, one button, straight to the questions.
- 7-day grow plan (replaces the notification work in P1): one plant, five photo check-ins on days 1, 2, 3, 5
  and 7, a health score trend, a "do today" action from the latest report, a score comparison inside each
  follow-up report, and a day 1 versus latest progress report. Logic in `services/growPlan.ts`, card in
  `components/ProCheckIn.tsx`, comparison in `screens/Diagnose.tsx`.
- Pro paywall: savings shown against weekly when monthly is absent, trial steps for eligible users, the grow
  plan as a benefit, `product_id` on purchase events. Summary button now reads "Continue".
- Premium: gold video card on Plant Health, one capped suggestion after a non-low-severity report (never the
  first report, weekly at most, quiet for 30 days after dismissal), gold catalog section, preselected plan,
  Pro versus Premium comparison table, `entry_point` on every Premium event.
- Rating request moved from the third analysis (it interrupted reading) to the second saved report.
- `conversion-events` v2 deployed: accepts `rc_app_user_id`, `checklist_step`, `review_prompt_requested`,
  `premium_entry_view`.

Correction to section 1: build 182 does request a rating, on the third completed analysis. It was badly
timed, not missing.

Not done: Profile and strain-search Premium entries, store screenshots and keywords, version and build number,
device testing, RevenueCat offering change, App Store Connect entry.

## 1. What the evidence says

Sources: the two handoff files, build 182 source, the live App Store page, mastergrowbot.com, and read-only
aggregate queries on `public.conversion_events` run on Nov 10 (iOS build 182, sandbox-tagged events excluded,
Oct 14 – Nov 10).

| Stage | Observed | Reading |
|---|---|---|
| App Store first downloads | 28 in the 20 days after public release, 61 in the 20 days before | Volume is the hard ceiling. About 1.4 downloads a day. |
| Welcome screen | 37 users saw onboarding; 8 never left step 0, 1 stopped at step 1, 28 reached the last question | The welcome screen loses 22%. After it, almost nobody drops. |
| Pro paywall | 25 viewers, 14 attempted, 10 verified, 4 cancelled | 40% of viewers start. This is already strong. Do not rebuild it; tune it. |
| Activation | All 10 buyers ran a photo analysis, 8 within an hour | First value is not the problem. |
| Return visits | Of 10 buyers: 3 active one day only, 3 two days, 4 three or more. `followup_visit` fired for 2 users | Nothing brings trial users back. The app has no notifications. |
| Trial to paid | 19 of 71 completed trials (26.8%). Annual 11 of 45 (24.4%) | The main monetization leak. |
| Refunds | $346.84 of $1,564.81 gross (22.2%), concentrated in $99.99 annual charges | Surprise annual charges after a 3-day trial. |
| Premium paywall | 2 production views by 2 users in four weeks on build 182. On 1.6.12 (environment untagged): 15 views by 12 users, 5 attempts, 5 verified | Premium is not being rejected. It is not being seen. Build 182 reduced the video entry to a grey row and removed the Journal prompt. Video requests fell from 18 to 0 in the same period. |
| Ratings | 6 ratings, 5.0. Build 182 never asks for a review (the plugin is installed and unused on iOS) | Cheapest acquisition lever available. |

Small counts throughout. Treat every rate as directional.

### Re-check through the Supabase connector (Nov 10)

Same window, with a stricter filter: every user who ever sent a sandbox-tagged event is removed entirely
(2 testers), leaving 40 users.

- Funnel: 35 saw onboarding, 8 never left step 0, 26 reached the last question, 24 completed, 23 saw the Pro
  paywall, 12 attempted, 10 verified. The conclusions above hold.
- Speed: median 38 seconds from first event to the paywall, and 45 seconds from paywall to verified access.
  Onboarding is not too long.
- Buyers stop inside the trial window. Of the 7 buyers with at least 10 days of history, 6 were last seen
  between day 0 and day 4 after purchase; one was still active on day 14. No buyer was active on more than
  3 distinct days.
- Non-buyers: 11 paywall viewers never attempted. Most saw the paywall once. Only 2 non-buyers opened the app
  on a later day.
- Premium: 2 of 10 buyers ever saw the Premium paywall. Zero video events since Oct 14.
- Deployed `conversion-events` v1: the metadata allowlist already accepts `entry_point`, `product_id`, and
  `offering_id`; the client does not send them. It rejects `rc_app_user_id`. The event and surface names are a
  fixed list, so any new event name returns HTTP 400 until the function is redeployed.
- Edge logs, last 24 hours: 500 requests, no 5xx, four 401s, three 404s.
- `whop-activate-tokens` is deployed with JWT verification off. Not part of this release; worth confirming it
  is intentional.

### Honest ceiling

Net revenue is about $300 per 30 days after refunds. With roughly 40 new users a month, in-app changes alone
cannot produce a multiple of that: every funnel improvement multiplies a small number. The in-app work below
targets trial conversion, refunds, and Premium mix, which can plausibly move revenue by tens of percent in 30
days. A larger step needs more downloads, which is why store work and the review prompt are in scope and not
optional extras. $10K MRR is not reachable from this traffic level in 30 or 90 days.

## 2. Priorities, in order of expected revenue effect

### P1. Bring trial users back and remove surprise charges

1. Local notifications (`@capacitor/local-notifications`). Ask permission only after the first saved report,
   with an explanation screen first ("Want a reminder to check this plant again?"). Never at launch.
   - Follow-up check-in: 24 hours after a saved report, "Time to check [plant name] again. Compare with yesterday."
   - Due care tasks: one notification per day at most, only if tasks are due.
   - Trial ending: about 24 hours before the trial ends, "Your free trial ends tomorrow. Your plan renews at
     [localized price] unless you cancel in Apple Subscriptions." Schedule from the RevenueCat expiration date.
   - A settings toggle for each type in Profile.
2. Follow-up loop in the app: after a report is saved, show "Next check-in: tomorrow" on Home and on the plant.
   The second check-in shows the previous and current score side by side. This is the reason to come back on
   day 2 and day 3, and the reason to keep paying.
3. Trial timeline on the Pro paywall, shown only when StoreKit reports the user eligible:
   Today, full access · Day 2, we remind you · Day 3, trial ends and the plan renews at [price]. The charge
   amount and period stay the most prominent price text on the screen.
4. Owner decision (no binary needed): lengthen the annual plan's intro trial from 3 to 7 days in App Store
   Connect. Secondary summaries of RevenueCat's 2026 report put annual-plan trial conversion at 24% for trials
   of four days or less and 33% for 5 to 9 days; this app's annual rate is 24.4%. The paywall already reads
   the duration from StoreKit. Hard-coded "3-day" strings in the app, store description, and website must be
   made duration-neutral first. Cost: revenue from each cohort arrives four days later.

### P2. Make Premium visible at the moments it helps, without nagging Pro subscribers

Rules that keep it from feeling like overselling: no pop-ups or interstitials for anyone with Pro, never in
the first session, at most one contextual prompt per seven days, every prompt dismissible and remembered.

1. Plant Health: replace the grey "Video analysis · Premium · Explore" row with a full card under the two
   photo buttons. Gold 1.5px outline, small gold "PREMIUM" tag, film icon, title "Video check-in", one line
   "Show every angle in one short clip." Same height as the photo buttons. Static, no animation.
2. After a photo report: one inline card at the bottom of the report, only when severity is not low or the
   report itself says more views would help: "One photo shows one side. Add a video check-in for a fuller
   read." Gold outline. Dismissible.
3. Strains: when a search has no result in the 300 Pro profiles but matches the Premium catalog, show the
   match in the main results with a gold lock. Today the catalog hides in a collapsed section at the bottom.
4. Profile: plan row reads "Pro" with a quiet "See Premium" link.
5. Premium paywall fixes:
   - Preselect a plan. Today nothing is selected for most users and the button is disabled until they choose.
     Default to the cadence that matches their Pro plan, otherwise yearly.
   - Show what they get: a real video report captured from the app, above the plan list.
   - Gold accent for Premium so it reads as a different tier from Pro's green.
   - Replace the generic "Example workflow" box, which describes the journal, not Premium.
   - Keep "No free trial" and the full price line exactly as they are.
6. Instrument each entry point with its own `entry_point` value so exposure, plan selection, attempts, and
   verified unlocks can be compared.

### P3. Fix the welcome screen

1. Show the whole plant. `.report-preview .sample-photo` is 150px tall with `object-fit: cover`, so a
   1080×1350 portrait photo is cut to a thin middle strip. Use a 4:5 frame on the welcome screen (about 55% of
   the viewport height) with the scan animation over it, and the report card rising from the bottom.
2. Use an example that shows a problem being caught. The current sample is an 88/100 "Great" plant in normal
   late-flower fade, with alt text that says "yellow lower leaves". A healthy result does not show why anyone
   needs the app. Run a real analysis on an owner-supplied photo of a genuine issue and ship that real output,
   labelled "Example". Do not write the report by hand.
3. One headline, one button. Move the testimonial carousel off this screen.
4. Change the first button from "See an example" to "Check a plant" and merge steps 0 and 1 into one screen.

### P4. Tune the Pro paywall

1. Two plans, yearly and weekly, yearly preselected. Remove the monthly package from the RevenueCat default
   offering (see section 4 for why this is done in RevenueCat and not in App Store Connect).
2. The savings badge currently needs a monthly price. Compute it against weekly instead (about 76% at US
   prices) from StoreKit numbers, and fall back to "Yearly plan" if either price is missing.
3. Replace the text-only hero with the example report image.
4. Summary screen: the button says "Start 3-Day Free Trial" to every user regardless of eligibility. Change it
   to "Continue". The paywall button already uses the correct eligibility-aware label.

### P5. Store listing and ratings

1. Review prompt (`@capacitor-community/in-app-review`, already a dependency): after the second saved report,
   once per version, never during onboarding or on a paywall. No custom "do you like the app" gate.
2. Screenshots: screenshot 1 shows a "2s" processing timer and screenshot 2 says "Personalized Yield & Quality
   Plan". Both are claims the handoff says to avoid. New set of six, real UI only:
   1. "Know what to check next" — whole plant photo with the report card
   2. "Clear next steps" — priority action and checks
   3. "Follow every plant" — journal with two check-ins compared
   4. "600 strain profiles" — strain detail (label Pro 300, Premium 600)
   5. "See every angle" — Premium video report, labelled Premium
   6. "Share your report" — share card
3. Keywords (100 characters, no words repeated from the title or subtitle):
   `weed,marijuana,grower,tracker,diagnosis,autoflower,hydroponic,nutrient,deficiency,harvest,strain`
   Read the current field first and keep any term that already ranks.
4. Description: remove the monthly price lines if monthly leaves the offering, make trial wording
   duration-neutral, keep the legal-cultivation disclaimer.
5. Run the new screenshots as a Product Page Optimization test against the live set if traffic allows.
   At about 100 impressions a day a test needs several weeks; if it cannot reach a result, ship the new set
   with the version and compare 28-day conversion before and after.

### P6. Measurement, so the next release is not guessing

1. Redeploy `conversion-events` so `rc_app_user_id` and the new event names in item 4 are accepted. The
   deployed function drops the first (0 of 1,939 rows have it) and would reject the second with HTTP 400.
   The redeploy must land before the build reaches users, or the new events are lost.
2. Send `product_id` on purchase events and `entry_point` on Premium events. The deployed function already
   accepts both, so this part needs no backend change. Add an attempt ID with the redeploy.
3. Raise the client queue cap from 8 and log drops.
4. New events: `notification_permission` (shown, granted, denied), `notification_open` by type,
   `review_prompt_requested`, `premium_entry_view` by entry point, `followup_checkin_complete`.

## 3. Out of scope for 2.1.0

Price changes, a free pre-paywall scan, a Premium intro offer, a new onboarding question set, category change,
and Android. One variable set per release; the paywall already converts 40% of viewers.

## 4. App Review and account safety

### Reading of the Grok conversation

- Phillip Shoemaker's public criticism of 3.2(f) terminations is real, and 2026 Apple developer forum threads
  describe unexplained notices. The claim of a measured surge, and the exact quoted post, could not be
  confirmed from primary sources. Treat "it is stricter" as plausible and the specifics as unverified.
- The practical advice holds either way: few submissions, complete review notes, fix everything in a rejection
  before resubmitting, argue in Resolution Center instead of shipping another build.
- Submitting this update while a different app is in review is normal. "Don't Go Missing" now appears as live
  on the developer page, so that wait may already be over. Confirm in App Store Connect.

### Monthly plan and the payout hold

- The hold email quotes "discontinuation of content". Forum reports show the same email with no confirmed
  cause, and Grok's explanation that refunds triggered it is a guess.
- Safest route: do not use "Remove from Sale" at all. Remove the monthly package from the RevenueCat default
  offering. The product stays approved in App Store Connect, nothing is discontinued, any existing monthly
  subscriber keeps renewing, and the change is reversible in seconds. The app simply stops offering it.
- Before doing it, confirm active monthly subscribers in RevenueCat (the 90-day data shows one monthly
  purchase that did not renew, so the count is probably zero).
- If the product is later removed from sale anyway, do it only after a payout has landed and with zero active
  subscribers. No source confirms that this avoids the hold.

### Risks found in the current build and listing

| Risk | Where | Fix |
|---|---|---|
| Testimonials that look invented: four names repeated across eight quotes, outcome claims ("best harvests", "spot-on"), a code comment saying they were "reproduced", while the store has 6 ratings | `components/PaywallTestimonials.tsx`, `screens/Paywall.tsx`, website | Owner confirms whether these are real, documented customers. If not, remove them everywhere and use the real App Store review and the true rating. This is the largest 3.2(f)-type exposure in the product. |
| Trial promised to ineligible users | `screens/OnboardingSummary.tsx` button | "Continue" |
| Speed and outcome claims | Live screenshots 1 and 2 | New screenshot set |
| Terms link inconsistency | Paywall uses mastergrowbot.com/terms-of-service, listing cites Apple's standard EULA | Use one, in both places |
| Notification permission | New in this release | Ask in context, never at launch; no marketing content without opt-in (4.5.4) |
| Media sent to an external AI service | Photo and video analysis | Confirm the in-app consent text and privacy label match (5.1.2) |
| Microphone purpose string | Video capture | Confirm the string in Info.plist says why |

### Submission rules for this release

1. One submission containing the binary and all metadata. No separate metadata-only submission before it.
2. Review notes list every change: notifications and when permission is asked, review prompt, Premium entry
   points, two-plan paywall and that monthly remains available to existing subscribers, new screenshots.
   Include a screen recording from a physical iPhone of onboarding, paywall, purchase, and both Premium entries.
3. State that no account is required and how to reach each paywall.
4. Phased release on, seven days.
5. If rejected: fix every cited item, reply in Resolution Center, and resubmit once.

## 5. Work packages and who runs them

Fable 5.2 leads, writes the design-critical code, and reviews every package before merge. All code work
happens on a branch `release/2.1.0` cut from `origin/ios` at `979c042`. The checkout in
`C:\Users\elidu\iOS MasterGrowbot\Vone-MasterGrowbot-AI` is 37 commits behind and must be fast-forwarded
first, or work should happen in `C:\Users\elidu\OneDrive\Documents\MasterGrowbot AI App`.

Rules every agent gets, verbatim:
- Work only on `release/2.1.0`. Do not touch `main` (Android) or files outside your package's list.
- Do not change purchase, restore, entitlement, or identity-binding logic in `Paywall.tsx`,
  `PremiumPaywall.tsx`, `services/paidAccess.ts`, `services/revenueCatIdentity.ts`,
  `services/premiumCatalog.ts`. Presentation only.
- No new claims about accuracy, speed, yield, potency, or genetics identification. No invented testimonials,
  ratings, or user counts.
- Prices and trial terms come from StoreKit at runtime. Never hard-code a price or a trial length.
- Android behaviour stays unchanged; gate with `proFirstRelease`.
- Run `npm run typecheck` and the five `npm run test:*` suites before reporting done. Report failures as
  failures.
- Do not commit secrets, do not open `Phase6_Keys`, `safe_cert.txt`, `safe_profile.txt`, or `profile.xml`.
- Do not submit, publish, or change anything in App Store Connect, RevenueCat, or Supabase unless your
  package says so, and then only up to the stop point it names.

| # | Package | Runs on | Files | Done when |
|---|---|---|---|---|
| A | Welcome screen and example report (P3) | Fable 5.2 | `screens/Onboarding.tsx`, `components/SampleReport.tsx`, `data/sampleReport.json`, `styles.css`, new example image | Whole plant visible at 375×667 and 430×932, reduced-motion respected, steps 0 and 1 merged |
| B | Pro paywall tuning (P4) and trial timeline (P1.3) | Fable 5.2 | `screens/Paywall.tsx` (render block only), `services/planCopy.ts`, `screens/OnboardingSummary.tsx` | Works with 2 or 3 packages, eligible and ineligible states, price line most prominent |
| C | Premium entry points and Premium paywall presentation (P2) | Fable 5.2 | `screens/Diagnose.tsx`, `components/PremiumCatalog.tsx`, `screens/StrainSearch.tsx`, `screens/Profile.tsx`, `screens/PremiumPaywall.tsx` (render block and default selection only), new `services/premiumPrompts.ts` for the frequency cap | Each entry opens the paywall with its `entry_point`; cap and dismissal persist; nothing shown in first session |
| D | Notifications and follow-up loop (P1.1, P1.2) | Opus 5.5 | new `services/notifications.ts`, `screens/Home.tsx`, `components/ProCheckIn.tsx`, `screens/Profile.tsx`, `ios/App/App/Info.plist`, `package.json` | Permission asked only after first saved report; three notification types schedule and cancel correctly; toggles work; unit tests for scheduling logic |
| E | Review prompt (P5.1) and analytics (P6) | Opus 5.5 | new `services/analysisReview.ts` (the Android branch has a reference in `output/android-growth-update/`), `services/premiumLibrary.ts`, `supabase/functions/conversion-events/` | Prompt fires once per version after second save; new fields accepted by the function in a local test. Deploying the function is a separate owner-approved step |
| F | UI regression | Sonnet 5.5 with Playwright | `screens/ReviewGallery.tsx` routes, `scripts/` tests | Screenshots of every changed screen at three widths and at large text; all `npm run test:*` green; a written list of anything that looks wrong |
| G | Code review of A to E | Fable 5.2 | diff of `release/2.1.0` | No change to purchase logic; no hard-coded prices; findings fixed |
| H | Screenshots and listing copy (P5.2 to P5.4) | Fable 5.2 drafts, Sonnet 5.5 captures real UI | `output/aso-v5/` | Six iPhone and iPad images at required sizes, manifest, final description and keyword text in one file |
| I | App Store Connect entry | Codex GPT 6.1, computer use | none in repo | See brief below. Stops before "Add for Review" |
| J | Device and purchase testing | Owner on a physical iPhone | TestFlight build | Checklist in section 6 completed and recorded |

Why this split: the purchase screens carry the most revenue and the most review risk, so one model owns both
and reviews the rest. Notifications and analytics are self-contained and well specified. Regression testing
is repetitive and suits a faster model running in the same repo. App Store Connect has no API access here, so
it is browser work. No agent can complete a real sandbox purchase on a phone.

### Brief for Codex GPT 6.1 (package I)

You are entering prepared content into App Store Connect for app ID 6752221060, version 2.1.0. The owner is
signed in. Use only the files in `output/aso-v5/` and the text in `output/aso-v5/listing.md`.

1. Open the 2.1.0 version page. If it does not exist, stop and tell the owner.
2. Before changing anything, save a screenshot of the current page and copy the current keyword field,
   description, promotional text, and What's New text into `output/aso-v5/before.md`.
3. Replace the iPhone 6.9-inch and iPad 13-inch screenshots with the files named in the manifest, in manifest
   order. Do not delete the app preview video if one exists.
4. Paste the keyword field, description, promotional text, and What's New text exactly as written. Do not
   reword. The keyword field must be 100 characters or fewer.
5. Select the build number the owner gives you. Paste the review notes from `listing.md`.
6. Turn on phased release.
7. Click Save. Take a screenshot of the saved page.
8. Stop. Do not click "Add for Review" or "Submit for Review". Do not open Subscriptions, Pricing,
   Agreements, or Payments. Do not change availability of any product. Do not accept any agreement.
9. If any dialog, warning, or unexpected page appears, stop and report what it says.

The owner reviews the saved page and submits.

## 6. Acceptance tests on a physical iPhone (package J)

- Fresh install, eligible: onboarding, paywall shows trial timeline and both plans, purchase yearly, tutorial,
  first report, save, notification permission explanation appears after the save and not before.
- Fresh install, ineligible Apple ID: no trial wording anywhere, button reads "Continue".
- Weekly purchase, restore on a second install, cancel from the sheet.
- Pro user: Premium card visible on Plant Health; tap opens paywall with a plan preselected; close; no other
  Premium prompt appears in that session; after a report with a problem, the inline card appears once.
- Premium purchase from the video entry and from the catalog entry; video report completes; expanded strain
  opens.
- Existing Pro and existing Premium subscribers updated from 2.0.3 keep access with no paywall.
- Notifications: follow-up fires, task reminder fires, trial-ending reminder fires with the right price,
  each toggle turns its type off.
- Review prompt appears after the second saved report and not again.
- Airplane mode at the paywall, and at report time.
- Large text and iPhone SE width on every changed screen.

Record build, date, device, and pass or fail for each line. Anything paid-but-locked blocks the release.

## 7. Order of work

1. Owner decisions (section 8).
2. Day 0: fast-forward the checkout, cut `release/2.1.0`, connect Supabase and RevenueCat.
3. Packages A, B, C, D, E in parallel (they do not share files except `screens/Profile.tsx`: D owns the
   settings section, C adds one line to the plan row, C goes second).
4. Package F and G, fixes, then H.
5. Codemagic build to TestFlight, package J.
6. RevenueCat offering change to two plans, on the day the build passes J.
7. Package I, owner review, owner submits.
8. Phased release. Readout at day 14 and day 30.

## 8. Decisions needed from the owner

1. Are the in-app and website testimonials from real, documented customers?
2. Remove monthly from the offering through RevenueCat only, leaving the product approved in App Store Connect?
3. Lengthen the annual trial to 7 days?
4. A photo of a real plant problem that you own, for the new example report and screenshot 1.
5. Deploying the updated `conversion-events` function to production.

## 9. Measuring the result

Compare first-seen 2.1.0 cohorts with 2.0.3 at equal maturity, raw counts shown.

| Metric | 2.0.3 baseline | Signal that it worked |
|---|---|---|
| Welcome screen exit | 8 of 37 | Fewer than 15% |
| Completed trial to paid | 19 of 71 | Above 33% once 30 or more trials complete |
| Refunded share of gross | 22% | Under 12% |
| Buyers active on 3 or more days in first week | 4 of 10 | Above 60% |
| Premium paywall views per Pro user | 2 views in four weeks | At least half of active Pro users see an entry; first verified production Premium purchase |
| Ratings count | 6 | 20 or more in 30 days |
| Net revenue per 30 days | about $300 | Report with and without the largest single charge |

Guardrails: any paid-but-locked report, refund share rising, notification opt-out above half, or a review
citing nagging means stop and reassess before the phased release completes.

## 10. Connections

- Supabase: connected on Nov 10 and confirmed against project `vofwdhlwsahwxecewyek` (MasterGrowbot AI,
  healthy). The connector can write and deploy; only SELECT queries, function reads, and log reads were used.
- RevenueCat: `claude mcp add --transport http revenuecat https://mcp.revenuecat.ai/mcp`, then authenticate.
  Or the RevenueCat AI Toolkit plugin.
- App Store Connect: no connector. Browser work by the owner or package I.
- GitHub: the local checkout is already authenticated for fetch.

## Sources

- https://developer.apple.com/forums/thread/855182
- https://mobilegamer.biz/app-store-fraud-crackdown-wrongly-nukes-accounts-and-withholds-millions-from-devs-says-former-apple-exec/
- https://developer.apple.com/forums/thread/799039
- https://developer.apple.com/forums/thread/780921
- https://www.revenuecat.com/docs/tools/mcp/setup
- https://www.revenuecat.com/state-of-subscription-apps-2026/
- https://www.revenuecat.com/blog/growth/free-trial-length

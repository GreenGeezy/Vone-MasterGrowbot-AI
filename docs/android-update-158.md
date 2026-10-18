# Android update 158

Implements the iOS `979c042a` onboarding, summary, tutorial, Pro paywall markup and visual styles on the Android `22b3a811` baseline. This is a selective implementation on an Android branch; the branches are not merged.

## User requirements

- Keep the Play Store title, screenshots and listing assets unchanged.
- Preserve Android's Capacitor 7 / RevenueCat 11.3.2 dependency stack, native billing bootstrap, timeout/reconnection behavior, OAuth callback and existing subscription identities.
- Offer annual and weekly Pro only. No Premium paywall, video analysis, Premium entry buttons or extra strain catalog.
- Use actual Google Play pricing phases and eligible offers. Desired new-purchase reference prices are USD 59.99/year and USD 6.99/week; no legacy-price migration.
- Calculate savings from annual versus 52 weekly payments, rounded down. USD target example: 83% and about $1.15/week equivalent. The annual charge remains prominent.
- All support addresses use support@mastergrowbot.com.

## Implementation

Onboarding has the same example-report walkthrough, three preference questions, undecided choices, summary editing and visual treatment as iOS. Its persisted state resumes after interruption. Existing completed users keep their onboarding status. Purchase success continues through the established Android confirmation screen and the versioned, skippable four-screen tutorial. Settings can replay the tutorial.

Home, Journal, photo analysis controls and strain details use the applicable iOS screen designs. Task mutations wait for database confirmation, numeric IDs remain supported, duplicate actions are locked, and failed notes retain their drafts. Photo reports can be previewed before sharing. Account deletion uses the existing authenticated endpoint and clears device data only after confirmed server success. No Supabase schema, policy or function deployment is required.

Google Play product loading still uses the Android direct-product recovery path before offerings. Both paths normalize prices from full recurring pricing phases and retain the exact eligible subscription option used for purchase. Monthly is excluded from new-purchase UI; existing monthly access remains recognized. A pending purchase blocks another purchase until status/restore is checked or the user explicitly resets the attempt after checking Google Play. Network errors never fabricate access or trial eligibility.

## Verification and release gates

The existing billing, startup, Supabase and AI tests remain in place. Additional checks cover the two-plan catalog, selected-option trial disclosure, malformed/foreign products, localized numeric pricing, savings, onboarding destinations and deletion confirmation. Browser checks use isolated network fixtures, never real purchases or real customer-data deletion.

Before production release, install through a Google Play internal track using license testers. Verify actual weekly and annual prices, eligible/ineligible three-day trials, purchase cancellation, delayed/pending transactions, restore, renewal, grace period, hold, expiry and upgrade over an existing subscriber installation. Verify camera, photo picker, native image sharing and Android Back on device. A successful compile or browser fixture cannot establish that these native behaviors pass.

Keep deployment separate from the code review: a push to main triggers the existing Codemagic release workflow. No live subscriber cancellation, entitlement removal, database migration or broad policy change belongs to this update.

## Store change checklist

1. Re-read the current Play subscription configuration and active monthly subscriptions/trials.
2. Set the weekly/annual new-purchase USD reference prices to 6.99/59.99 and use Play Console's localized bulk conversion for the existing 35 regions. Review tax/rounding before saving. Preserve all legacy cohorts.
3. Keep both existing three-day trial offers and their eligibility rules. Do not invent eligibility in app code.
4. Validate old-build purchase discovery before moving backwards compatibility from monthly to annual and its trial offer.
5. Deactivate monthly offer/base-plan new sales; retain history, renewals and the pro entitlement attachment.
6. Detach only Android monthly from the shared offering package after verification. Keep the iOS monthly association and the shared monthly package.
7. Read back store changes and perform internal-track purchase/restore tests before rollout.

RevenueCat's live read currently includes an irrelevant Apple-territory warning on this Google Play product. Do not follow that warning or invoke Apple price equalization. No Apple store changes are authorized.

## ASO candidates: no listing changes applied

There is no measured evidence yet that a description, category or tag change will increase this app's downloads or paying subscribers. Keep these unchanged pending a controlled test.

1. Test a short description centered on the existing photo-report/journal workflow against the current wording. Measure acquired users and downstream paid conversion, not just impressions.
2. Review the current category and available Google Play tags for accurate relevance; change only if acquisition-source/search evidence supports the choice. Do not select unrelated high-volume tags.
3. Retain a neutral Google Play in-app review request after a completed useful action. Never incentivize reviews, screen users by sentiment, or claim that ratings necessarily improve revenue.

These are low-effort test candidates, not proven revenue gains or guarantees against store enforcement. No title or screenshot experiment is included.

## Codemagic and phone testing

The android-release workflow runs automatically on pushes to main when its webhook is enabled. It installs the locked dependencies, runs TypeScript, regression tests and strain validation, builds web assets, syncs Capacitor, and runs release lint, native unit tests and the signed AAB build. The existing production/app_config secret groups must still contain the signing and Firebase variables checked by the workflow.

Publishing currently emails the AAB; Google Play automatic publishing is not configured. After a successful build, upload the signed AAB to the existing Play internal testing track, review and publish that testing release, then install/update through that track's existing opt-in link. Do not promote to production before physical-device purchase and restore tests. Confirm version code 158 is unused in every Play track before uploading.

The Play prices and monthly store availability have not been modified by these source commits. The paywall reads live store pricing, so it will continue to show current store prices until the separately reviewed store changes are applied.

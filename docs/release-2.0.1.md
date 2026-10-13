# MasterGrowbot iOS 2.0.1 (177)

Goal-based onboarding with three short questions and explicit undecided answers. Skills starts in references, health starts in photo analysis, quality/organization starts in the journal, and undecided starts on Home after verified access. The summary shows a suggested workflow, not a generated plan or promised cultivation outcome. Existing subscribers retain their completed onboarding state. Paywall copy and prices are unchanged by this final design pass; forest green, sage, warm white and restrained Growbot purple support the existing brand.

Includes the earlier reviewed sample walkthrough, all existing testimonials, trial/renewal disclosures, verified purchase recovery, journal save confirmation, and server-side deletion/measurement fixes. Preview fixtures are DEV-only. Released 2.0.0 changes through 3a76280 are included. No routing/DNS changes or customer image migration performed.

## TestFlight steps

1. In Codemagic, open the iOS branch push build and confirm it uses this commit and the iOS App Store workflow. Check the environment group and signing credentials are available. The workflow runs the code checks, syncs Capacitor, signs, and uploads to TestFlight; this does not submit an App Store release.
2. Wait for the build and Apple processing to finish. If export-compliance questions appear, answer them according to the app’s actual encryption use.
3. Open TestFlight on your iPhone and install 2.0.1 (177). On an existing subscription, first verify that saved plants, reports, notes and active access remain available; do not delete the app or its anonymous identity to test onboarding.
4. Use a separate disposable test installation/account to try every goal and Not sure yet. Verify Back, interruption/resume, edits on the summary, and the destination after purchase.
5. Confirm actual localized prices, eligible and ineligible trial wording, cancellation without an error, pending verification recovery, and Restore Purchases. Confirm Pro photo access and Premium video/catalog access with sandbox purchases; no live charge is needed.
6. Save/reopen a report and journal entry, retry a failed save, and check large text, keyboard and reduced-motion behavior. Test account deletion only with a disposable account created for testing.
7. Report any failure before submitting the build to App Review. Native StoreKit and signing cannot be verified by a localhost preview. Existing App Store assets waiting for review remain undisturbed.

Local validation: 114 automated checks, TypeScript, production build, device layout matrix, and goal/undecided paths. Revenue improvement is a hypothesis for verified billing/cohort measurement after complete observation windows.

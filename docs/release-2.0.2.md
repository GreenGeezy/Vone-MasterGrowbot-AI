# iOS 2.0.2 (180)

The onboarding report preview now shows the existing example’s 88/100 AI health score, growth stage, observation and watering tip. One readable Example label identifies the preview. The score is an AI assessment, not a measured diagnosis or promised user outcome. The animation is a short photo-to-report illustration with reduced-motion support and no blocked CTA. No live analysis, backend change or new fabricated report is needed for this design update.

The goal choices are Get better at growing, Keep my plants healthy, Grow bigger plants, Keep track of my grow, and an undecided option. Bigger plants is the user’s goal, not an app guarantee. It opens the journal after verified access to track growth and care. Older saved quality goals remain supported. Existing testimonials, billing, authentication and subscriber gates are preserved. Flowhub’s direct benefit-led tone inspired concise original wording.

Build 179 adds a shared forest-green and violet visual treatment across onboarding, summary, Pro and Premium. Plan prices and selection states are clearer, primary actions remain visible, and beginner copy now explains practical next checks. All testimonials, configured prices, trial eligibility, restoration and purchase behavior are preserved. No backend or routing changes are included.

Build 180 corrects the eligible Pro CTA to Start 3-Day Free Trial using the actual StoreKit offer duration. Unknown/ineligible customers see Get Pro Access. Only the DEV gallery simulates eligibility; native eligibility is never assumed. Premium explicitly has no free trial and its headline reflects video or catalog interest. Journal shows a contextual video card after a saved check-in, while Home encourages saving and returning with truthful completion counts. All prices and pricing comparison text remain unchanged.

Validation for build 180: production build, TypeScript, 27 focused tests, eligible/ineligible/unknown trial states across all three Pro plans, and Journal to Premium and back. Native eligibility, purchase/restore, and upgrade billing still require TestFlight testing. No live backend or routing changes.

## Your next steps

1. Review the Pro trial CTA, Premium paywall, and subscriber check-in flow at http://127.0.0.1:3011/review.
2. Check the latest ios push in Codemagic. The iOS workflow is configured to sign and upload the build to TestFlight. Wait for a successful build and Apple processing.
3. Install 2.0.2 (180) from TestFlight. Check existing subscriber access and saved records before trying onboarding on a separate disposable test installation. Avoid uninstalling an existing anonymous account.
4. Try each goal, undecided answers, Back, resume and summary editing. Verify the bigger-plants goal lands in Journal after verified access.
5. Check actual localized pricing, trial eligibility, purchase cancellation, restore and Premium access with sandbox purchases. Save/reopen a report and journal entry. Check large text and reduced motion on device.
6. Submit only after native checks pass. Local compilation and browser tests do not verify native signing or StoreKit purchases. Revenue lift must be measured after release.

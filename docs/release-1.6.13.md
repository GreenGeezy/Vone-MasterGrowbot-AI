# iOS 1.6.13 (174): paywalls and saved-report sharing

## Changes

- Both iOS paywalls use one compact, fixed-height carousel containing all seven existing quote variants from onboarding and its summary. Quotes are not newly invented or relabeled as Premium reviews. Automatic rotation pauses on interaction; manual previous/next, swipe and pause controls are available. Reduced-motion preferences disable rotation.
- Benefits use relevant imagery instead of checkmarks. Plan selection indicators, localized billing terms, trial eligibility and purchase/restore logic are preserved.
- Removed Files filters, saved-files links, attachment pickers and document benefit copy from reachable app screens. The dormant backend is not deleted or enabled. Existing note photos remain available.
- Camera/photo selection now shows immediate opening feedback and prevents overlapping picker calls. Actual permission/plugin failures display a retry message; cancellation is neutral. Report saves await success, prevent duplicate taps and retain reports on failure.
- Journal reports have Share Analysis at the bottom. Image diagnosis metadata and new video share metadata survive reload. Older formatted video/image reports can use their explicitly recorded score; confidence is never substituted for a health score.
- New saved video reports retain the preview frame (not the video). Saved photo/frame rendering supports only this project's existing public image bucket, plus local app images; arbitrary remote hosts are rejected. Sharing remains user initiated with a preview and an image toggle.
- No changes to Supabase Edge Functions, analysis prompts/report text, RevenueCat configuration, subscription prices, identity binding or entitlements. No Android binary or project changes.

## Validation

- 95 unit/regression checks passed before final browser validation, including new journal share compatibility, score validation, camera failure classification and image-host restrictions.
- TypeScript passed. Production build passed (existing bundle-size/mixed-import warnings).
- Playwright: both paywalls at 375×667, all seven quotes, stable carousel height, reduced motion, plan selection, visible CTA and no reachable file promotion even when uploads are enabled in a fixture.
- Playwright: reopened photo/video reports render share cards and thumbnails (including a mocked saved-storage URL); camera first-tap feedback, duplicate prevention, cancellation, permission errors and plugin errors recover without page exceptions. Existing Home task completion/undo/edit/reload and Journal failed-save draft recovery passed.
- Final production build and Capacitor iOS sync passed. CocoaPods/Xcode are unavailable on Windows and are deferred to Codemagic.
- Browser checks use fixtures, not real purchases or production analysis calls. Native verification remains required below.

## TestFlight release check

Run Codemagic `ios-app-store` from `ios`, then install 1.6.13 (174).

1. Open Pro and Premium. Rotate/swipe quotes, select billing periods and confirm the matching total price. Check eligible Pro trial, purchase and Restore Purchases.
2. Tap Take Photo on the first launch; allow permissions. Cancel and retry. Try Analyze Image with an existing photo. Verify denied permission produces guidance and can recover after changing Settings.
3. Complete image and video analysis, save each to Journal, reopen and tap Share Analysis. Confirm score/photo or preview frame, image opt-out and native social share/cancel. Reopen after restarting the app and repeat.
4. Confirm Home tasks and Journal note saves still work and no Files or Attach file controls appear.
5. New saved video reports retain a preview image using the existing journal media storage. Confirm privacy disclosures describe saved journal photos/preview frames accurately. Raw video is not retained.

Native compilation, StoreKit and camera/share behavior cannot be certified by browser fixtures. User runs Codemagic and the iPhone smoke test before submission. No guaranteed conversion gain or App Review outcome is implied.

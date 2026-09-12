# iOS 1.6.7 (168)

- Video selection now prepares a local poster before Analyze becomes available. The same frame is reused in the result and share card. Stale selections cannot overwrite newer selections. If decoding fails, playback remains available with a clear preview fallback.
- Video reports use a light card layout, summary, plant score (AI estimate), visible observations, possible explanations, areas to review, and environment overview. No confidence percentage or separate limitations section is displayed. Existing server-returned observation text is preserved; no new measurements, cultivation advice, or report fields are generated.
- Premium prices explicitly say total per billing period and Pro included. Apple confirms the plan-change timing and any billing adjustment.
- Default sharing caption is “Checkout my MasterGrowbot Plant Health Score”, followed by the existing both-store download/free-trial CTA. Removed the diagnostic-limitation sentence from the artwork. Trial wording distinguishes eligible Pro trials from Premium, which includes Pro and has no free trial.
- Uploaded avatars use resized image data instead of temporary camera URLs. Startup and retry preserve local avatar/personal preferences when a cloud profile is loaded. Presets and uploads confirm they are saved on the current device. This is device persistence, not cross-device avatar sync.

## Verification

TypeScript, 42 Premium/backend/video tests, 5 sharing tests, and 7 authentication/profile tests passed (54 total). Playwright checks at 375 × 667 passed for uploaded and preset avatar persistence after reload/cloud merge, durable camera options, report score and section layout, Premium total-price wording, poster attachment before Analyze, and horizontal overflow. Native SDK responses were mocked for browser UI checks; screenshots are fixtures, not App Review evidence.

Production Vite build and Capacitor iOS sync passed. Windows cannot compile/sign the native Xcode build. Run Codemagic and verify the actual iPhone camera/MOV preview, avatar after force-close/reopen, purchase/restore, video result and system share sheet before App Review.

The Supabase Edge Function, model prompts, video response contract, and existing photo-analysis behavior were not changed or deployed in this release. RevenueCat product configuration was not changed. App Store review metadata/screenshots identified in earlier releases still require verification/completion; this release does not claim App Store Connect submission readiness.

# iOS 1.6.8 (169)

## Video plant health report

- Expanded only the Premium video result contract and UI. The existing image Plant Health report, route, model, content, and layout remain unchanged.
- Video reports now show the visually inferred growth stage, confidence tied to media clarity, overall visual condition, priority action, journal-ready plant-care and crop-quality checks, visible signs, possible interpretations, and areas to inspect.
- Added a grow-wide overview with canopy and room checks for recordings containing multiple plants or a larger grow space. Environment and media-quality sections explain which conditions are visible and which require sensors or a better recording.
- Each care recommendation and priority action can be added directly to today's grow plan. Saving to the journal preserves the full structured report while retaining no raw video.
- The Gemini 3.8 video prompt is cannabis-specific and observation-led. It connects visible evidence to record review, inspection, sanitation, and environment checks while excluding exact feeding targets, potency advice, harvest timing, medical claims, guarantees, and controlled-substance yield optimization.
- Supabase `gemini-v3` version 30 serves the expanded strict video schema. Existing image, chat, insight, and voice routing remains unchanged.

## Sharing and Premium presentation

- Default photo and video share captions include an invitation to try MasterGrowbot AI free and download it from the App Store or Google Play. The system-share text continues to add verified store links and qualified Pro-trial terms.
- Premium paywall copy now leads with the benefit of checking multiple plant angles, canopy, and grow-space context. It contains no em dash. Transactional prices remain localized StoreKit values, and the displayed price is described as the total Premium subscription price including Pro.
- Nonbreaking transitive production dependency updates resolve the production findings reported by `npm audit --omit=dev`; the production audit now reports zero known vulnerabilities.

## Validation

TypeScript passed. All 57 automated tests passed: 44 Premium/backend/video, 6 sharing, and 7 authentication/profile reliability tests. The 300-strain database validation, production Vite build, and Capacitor iOS sync passed.

Playwright at 375 × 667 verified the expanded report, journal task controls, all Premium plan choices, annual value badge, editable share-caption CTA, full vertical scrolling, and no horizontal overflow. Windows cannot compile or sign the native Xcode project; the Codemagic build and TestFlight device smoke test remain required before App Review.

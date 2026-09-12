# iOS 1.6.9 (170)

## Video analysis reliability and context

- Fixed the reported second-analysis failure by raising the structured video response allowance from 1,100 to 2,000 tokens, accepting complete JSON wrapped by provider Markdown or brief prose, and allowing malformed primary responses to use the existing fallback route. Truncated and schema-invalid responses remain rejected.
- Added Indoor, Outdoor, and Greenhouse choices plus Generic, the full 300-strain library, and a custom strain field directly inside the video workflow. The selected context is sent through the authenticated Supabase request and is treated as user context rather than visual proof.
- Replaced vague report headlines with useful visual-condition labels. The prompt now requires the best-supported working interpretation, ties hypotheses to visible evidence, and provides practical journal-ready plant, canopy, environment, sanitation, and record-review steps even when confidence is limited.
- Image analysis code, response format, report content, and model routing remain unchanged.

## Release checks

Supabase `gemini-v3` version 32 is deployed and read back with the Gemini 3.8 video route, resilient parser, provider-failure fallback, 2,000-token response allowance, and existing Gemini 3.7/2.5 routes intact. RevenueCat readback confirms every Premium product unlocks both `pro` and `machine_vision`, the `premium_upgrade` weekly/monthly/annual packages are correct, and `default` remains current.

`npm ci`, typecheck, 46 Premium/video tests, 6 sharing tests, 7 reliability tests, 300-strain validation, production build, and Capacitor iOS sync passed. Playwright at 375 × 667 verified all grow-setting controls, library/custom strain selection, the action layout, and zero horizontal overflow. Native recording, StoreKit, signing, and TestFlight require Codemagic and an iPhone.

# iOS 1.6.3 (164): Plant Health scrolling

After the next Codemagic build, verify Plant Health scrolling on an iPhone, including landscape and larger accessibility text. The gallery button remains the last control; this release does not add video functionality.

The initial Plant Health screen was absolutely positioned with its own fixed-height scrolling inside the app's existing scroll container. It bypassed the parent's navigation clearance. The page now stays in normal flow and uses the app's scroll container, with additional bottom padding that accounts for the safe area. The center navigation button also has an accessible Plant Health label.

Validation: TypeScript and production build passed. In a 390×667 Playwright production preview, scrolling moved the gallery button fully above the fixed navigation; a bounding-box assertion passed and the screenshot was inspected. Backend requests were blocked for this layout check; network errors in that fixture were expected. Native touch scrolling and iOS safe-area behavior still require device verification.

Version advanced from 1.6.2 (163) to 1.6.3 (164). No subscription, model, inference, or backend changes.

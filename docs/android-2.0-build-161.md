# Android 2.0 / 161

- Replaces WebView internal padding with native system-bar/cutout margins. This changes the actual viewport used by fixed onboarding/paywall buttons and the app navigation. System navigation stays available. Insets already handled natively are zeroed before forwarding; keyboard updates remain available to WebView.
- Restores Plant Health strain search (300 library strains plus saved custom strains), Generic, custom strain creation and Indoor/Outdoor/Greenhouse selection. Selections persist locally across screen changes and restarts and override profile defaults for the analysis request.
- No payment, RevenueCat, Supabase schema/function, signing or iOS branch changes.

Internal phone regression: three-button and gesture navigation; portrait and landscape; onboarding Continue and paywall CTA; main tabs; custom-strain keyboard; camera and gallery analysis using selected settings. Browser viewport fixtures cannot certify native OEM insets; verify the Play-installed build on the affected phone before production.

Release notes:

<en-US>
Fixed bottom-button visibility around Android system navigation.
Restored strain selection, custom strains and growing environment settings on Plant Health.
Plant analyses use your selected strain and environment.
</en-US>

Validation (2026-10-19):
- TypeScript, 79 automated tests, 300-strain validation, web production build and Capacitor Android sync passed.
- Playwright: library search, Generic/custom strains, camera/gallery context, profile override, persistence across navigation/reload, full onboarding/paywall/tutorial/tab flow passed without uncaught page errors. AI/camera/cloud operations were isolated fixtures; these checks did not charge or modify production data.
- Browser simulation of native viewport margins passed at 360x800 (24px top/48px bottom), 393x851 (24px top/24px bottom) and 800x360 (24px top/48px right). Continue and subscription buttons remained in bounds and actionable. This is not a native WindowInsets test.
- Android release lint/test/bundle tasks passed. Lint reports 0 errors and 20 warnings; dependency/Gradle warnings remain non-blocking.
- Generated AAB verification passed: application ID com.mastergrowbot.app, version 2.0 (161), minSdk 24, targetSdk 36, release mapping/plugin checks, test certificate verification and 16 KB APK/ELF alignment. Local artifact uses a disposable validation key; use the CodeMagic artifact signed with the existing production key for Play.
- Native-device startup, Samsung three-button/gesture navigation, keyboard behavior, live analysis and real Play billing remain phone acceptance checks. This validation does not claim zero runtime errors or certify production billing.

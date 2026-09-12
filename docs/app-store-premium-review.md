# MasterGrowbot AI Premium — App Store release checklist

## Current build: 1.6.9 (170)

See [release-1.6.9.md](release-1.6.9.md) for the resilient video response parser, grow-method and strain context, and more actionable evidence-based video reports. The existing photo analysis remains unchanged.

## Previous 1.6.6 (167) video access and visual sharing update

The video button now opens Premium immediately and verifies access using the same JWT-derived server identity as inference. A `premium_required` response returns to purchase/restore while preserving the selected video. The backend adds a no-charge `premium_access` check in gemini-v3 version 28. Cached SDK entitlements alone do not open recording. See [release-1.6.6.md](release-1.6.6.md).

Share cards now optionally include the actual analyzed photo or a locally decoded video frame, with a preview toggle before sharing. Captions carry both verified store links and a qualified free-trial invitation; Premium video has no introductory offer.

## Previous 1.6.5 configuration repair

On September 9, 2026, RevenueCat **Project settings → General → Sandbox testing access** was found set to **Nobody**. Apple had recorded an active Premium weekly Sandbox subscription, but both customer and subscription entitlement lists were empty. Changing this setting to **Anybody** restored both `machine_vision` and `pro` on the existing transaction, verified through RevenueCat API v2. No promotional entitlement or client-side access bypass was used. Restore behavior remains **Transfer to new App User ID**.

Use **Restore Purchases** on the existing TestFlight build before purchasing again. TestFlight purchases use Apple's Sandbox environment. An actual device retest is still required; the live configuration and API entitlement fix do not themselves verify StoreKit UI, recording, or native sharing.

All three Premium products still returned `MISSING_METADATA` during this audit. US prices and absence of introductory offers are correct; review information is missing. Do not use the supplied error screenshots or browser fixtures as the release's App Review screenshot. Capture the corrected paywall from the actual iPhone build.

Version 1.6.5 adds branded, locally rendered photo/video analysis share cards with editable captions and an App Store link. Raw media, location and journal contents are excluded. Sharing is always initiated by the user through the system share sheet. Details and validation are in [release-1.6.5.md](release-1.6.5.md).

## Manual steps required

1. In App Store Connect, complete the name, description, localization, and App Review screenshot for all three Premium subscriptions. Confirm that they remain above every Pro product in the existing **MasterGrowbot Subscriptions** group, use $12.99/week, $49.99/month, and **$199.00/year** in the US storefront, and have no introductory offer.
2. Add all three Premium subscriptions to the 1.6.9 app-version submission. Do not submit them separately before the matching binary is available.
3. Update the public privacy policy and App Privacy answers if needed to disclose that a user-selected video, which can contain audio, is sent through Supabase and OpenRouter to the selected AI provider for visual analysis. MasterGrowbot does not save the raw video, but provider processing practices must be described accurately.
4. Run the **MasterGrowbot iOS App Store** (`ios-app-store`) Codemagic workflow from branch `ios`. Test build 170 in Sandbox/TestFlight before submitting it for review.

## Products to add to version 1.6.9

| Plan | Product ID | Apple ID | Duration | US target |
| --- | --- | ---: | --- | ---: |
| Premium Weekly | `mastergrowbot_premium_weekly_v1` | 6809541369 | 1 week | $12.99 |
| Premium Monthly | `mastergrowbot_premium_monthly_v1` | 6809542736 | 1 month | $49.99 |
| Premium Yearly | `mastergrowbot_premium_yearly_v1` | 6809543789 | 1 year | $199.00 |

These products are higher service levels in the same Apple subscription group as Pro. They replace the current tier through StoreKit; they are not separately billed add-ons. Apple controls upgrade, proration, and introductory-trial billing. The app never cancels a plan, ends a trial, or charges a base plan itself.

## Exact App Review screenshot

On an actual iPhone running build 170:

1. Use a Sandbox account with Pro access but without Premium.
2. Open **Plant Health** and scroll past Growing Environment.
3. Tap **Video Plant Analysis** on the MasterGrowbot AI Premium card.
4. Capture the Premium paywall with the title, feature summary, all three localized recurring prices, annual value badge, **Unlock video analysis**, renewal disclosure, **Restore Purchases**, **Terms**, and **Privacy** visible. If the device cannot show the complete scrollable page at once, capture the purchase choices and required subscription disclosure in the same image.
5. Use the actual app screen, not a mockup. Repeat with each plan selected if App Store Connect requires a product-specific screenshot.

For public App Store screenshots, use one screenshot of the Plant Health Premium card and optionally one real video-result screen based on a plant video you own. Do not imply that video is part of the Pro trial, promise a diagnosis or outcome, show private locations, or display credentials.

## App Review Notes

> MasterGrowbot AI is intended only for lawful use where permitted by applicable local laws. It does not sell or deliver cannabis, provide consumption functionality, or provide medical claims. Version 1.6.9 provides evidence-based visual estimates from user-supplied plant videos with confidence, priority inspection, journal-ready care checks, grow-setting context, and optional strain context. Results distinguish visible evidence from likely interpretations and do not provide controlled-substance cultivation optimization instructions.
>
> No email, password, or social login is required. The app creates and persists an anonymous authenticated Supabase session. To review Premium, open Plant Health, scroll below Growing Environment, and tap Video Plant Analysis. MasterGrowbot AI Premium includes Pro plus video visual analysis. Its three products are higher tiers in the existing MasterGrowbot Subscriptions group and have no introductory offer. Existing Pro products retain their introductory offers. StoreKit controls upgrade billing and shows the applicable terms before purchase.
>
> After a Sandbox Premium purchase, choose Record Video or Choose Video, select an MP4 or MOV no longer than 20 seconds and 8 MB, and tap Analyze. The app sends the media transiently to its authenticated Supabase Edge Function, which verifies the Premium entitlement before inference. The app does not upload video to public storage or retain the raw video. Saved journal entries contain only the resulting written observations. A chosen video can contain audio, but the analysis prompt uses visual evidence only. Users are advised not to record private conversations.
>
> Restore Purchases, Terms, and Privacy are at the bottom of the Premium subscription screen. The base Pro paywall also includes Restore Purchases.

## Media permissions and privacy

- Recording uses the native iOS file capture interface and the camera usage description: “MasterGrowbot uses the camera to photograph plants and record short plant videos for visual health analysis.”
- Choosing an existing video uses the system file picker. The app does not request broad Photos-library access for this flow.
- MP4 and MOV are accepted, with a 20-second and 8 MB client/server limit. One analysis runs at a time and can be cancelled or retried.
- Raw video is sent inline over the authenticated request and is not written to Supabase Storage. It exists only in app memory and during request processing. The existing public `user_uploads` bucket is not used for video.
- App Privacy and the public privacy policy must still reflect third-party processor handling. Do not claim that OpenRouter or its model provider retains nothing unless the configured provider terms support that statement.

## Codemagic workflow

1. Push or confirm the final commit on branch `ios`.
2. In Codemagic, open **MasterGrowbot iOS App Store**.
3. Verify the `ios-config` group contains `VITE_SUPABASE_ANON_KEY` and `VITE_REVENUECAT_IOS_KEY`.
4. Run the workflow for `ios` at the final commit. It uses Node 20.11.1, Xcode 26.6, runs typecheck and both test suites, builds, syncs Capacitor/CocoaPods, signs the App Store IPA, and uploads it to TestFlight.
5. Confirm TestFlight reports version **1.6.9 (170)**. If build 170 already exists, increment only the iOS build number, commit it, and rerun.

## Five-minute iPhone smoke test

1. Launch as an existing subscriber; confirm there is no indefinite connection screen.
2. Run one image analysis and confirm the existing result UI still works.
3. Open the Premium card; confirm cadence matching and localized price, then complete a Sandbox Premium purchase.
4. Record or select a short plant video; confirm a structured Gemini 3.8 result appears and can be saved to the journal.
5. Force-close and reopen; confirm Premium and the journal entry persist, then use Restore Purchases and confirm Premium stays unlocked.

Release blockers are: paid access fails on launch; the wrong Premium product or price appears or purchase fails; image analysis regresses; video authorization or inference fails; Premium or journal access is lost after relaunch or restore.

## Quick customer scenarios

- New user → weekly Pro trial → image analysis → Premium card → weekly Premium upgrade.
- Monthly Pro subscriber → Premium → monthly Premium upgrade.
- Yearly Pro subscriber → Premium → annual localized price corresponding to the $199.00 US tier.
- Premium subscriber → image analysis → video analysis → save journal observation → close and reopen.
- Returning Premium subscriber → Restore Purchases → `machine_vision` unlocks.

Also test cancellation, unknown or lifetime cadence, offline loading, a 21-second file, a file over 8 MB, invalid media, retry, and the friendly usage-availability message. Playwright validates web-renderable layout only; StoreKit, capture, system picker, signing, and TestFlight behavior require the iPhone build.

References: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [submit an in-app purchase](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/), and [App Privacy details](https://developer.apple.com/app-store/app-privacy-details/).

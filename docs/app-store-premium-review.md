# Premium video submission preparation — NOT READY TO SUBMIT

This is a preparation checklist, not evidence that the video feature is implemented.
The current app remains 1.6.3 (164). The requested 1.6.4 (165) release is blocked.

## Required now

Add a dedicated RevenueCat server credential with customer/entitlement read access
to Supabase project `vofwdhlwsahwxecewyek`, Edge Functions → Secrets, named
`REVENUECAT_SECRET_API_KEY`. Do not put the credential in the app, Git, or chat.
The September 8 secret-name readback did not contain it. Dashboard OAuth approval
for the CLI is separate from this deployed-function credential.

Adding this secret is necessary for the proposed private-key implementation but
does not complete the feature: secure customer identity binding, video UI/backend,
cost reservations, measurements, and native tests remain engineering work.

## Verified RevenueCat catalog

Project: `projf176df92`. iOS app: `app521ff67c60`, `com.mastergrowbot.ai`.
Entitlements: `pro` (`entle87d63b32e`) and `machine_vision` (`entl05530ace9d`).
The latter's display name is now **MasterGrowbot AI Premium**; identifier unchanged.

| Product | Apple product ID | RevenueCat product | pro | machine_vision | premium_upgrade package |
| --- | --- | --- | --- | --- | --- |
| Weekly | mastergrowbot_premium_weekly_v1 | prod2f42a4283e | Yes | Yes | weekly / pkge230ac7e64c |
| Monthly | mastergrowbot_premium_monthly_v1 | prodb6a111db06 | Yes | Yes | monthly / pkge5e33513da4 |
| Yearly | mastergrowbot_premium_yearly_v1 | prod9a6f8b846b | Yes | Yes | annual / pkgedded595011 |

Offering `premium_upgrade` is `ofrng4a696d2461`, not current/default. The existing
default `ofrngd4a3a17923` remains current. Pro retains all nine previous products,
including lifetime, plus the three Premium products. Premium has exactly those
three products. No Apple products, prices, subscription ranks, or trial offers
were changed by this work. RevenueCat returned null duration/trial metadata;
that is not verification of Apple price, rank, or introductory-offer settings.

User-specified US prices are $12.99/week, $49.99/month, and **$199.00/year**.
The eventual purchase UI must use StoreKit localized prices. Products are combined
higher-tier subscriptions in the same Apple group, not independent add-ons.
Never charge a base plan separately or promise that an introductory trial ends
immediately. Apple confirms applicable billing terms on its payment sheet.

## Screenshot to capture after implementation

On an actual iPhone running the completed build, open **Plant Health → Analyze
Video → MasterGrowbot AI Premium** as a Pro subscriber without Premium. Capture
the actual upgrade screen with its full localized recurring price, Everything in
Pro + Advanced Video Plant Analysis, renewal explanation, Restore Purchases,
Terms, and Privacy. Supply that screenshot to the App Review screenshot field
for each of the three new subscriptions. Do not use a design mockup as proof of
implemented functionality.

For public App Store screenshots, show the actual Plant Health Premium card and
optionally an actual observation result from a plant video you own. Visible copy:
**Video plant observations — Premium subscription required.** Do not imply that
video is included in the normal Pro trial. Do not show credentials or private
locations in screenshots. Do not submit these subscriptions automatically.

## Draft App Review Notes — use only once these statements are verified

> MasterGrowbot AI is intended only for lawful use where permitted by applicable
> local laws. The app does not sell or deliver cannabis and does not provide
> consumption functionality. This update adds general visual observations from
> user-supplied plant videos, including visible discoloration, damage, viewing
> limitations, and areas that merit closer visual inspection. It does not provide
> medical claims or controlled-substance cultivation optimization instructions.
>
> No account registration or login is required; the app maintains an anonymous
> session. To review the feature, open Plant Health, select Analyze Video, and
> open MasterGrowbot AI Premium. Premium includes Pro access and video analysis.
> The new products are higher-tier auto-renewable subscriptions in the existing
> MasterGrowbot Subscriptions group. Existing Pro products retain their trial;
> Premium products have no introductory trial. Apple controls upgrade billing.
>
> Restore Purchases is available on the subscription screen. After a Sandbox
> Premium purchase or restore, record or choose a short plant video and start
> analysis. Results describe visible evidence with uncertainty and confidence,
> not a guaranteed diagnosis. Camera access is requested when recording; media
> selection uses the system picker. See the final release's media limits and
> privacy description for actual processing and retention behavior.

The navigation, video picker, Premium Restore location, and data-retention
statements above still require implementation and validation. Replace this draft
with verified behavior before submission. Existing Pro Restore Purchases is at
the bottom of the current Pro paywall.

## Subscriptions to include with the completed app-version submission

- `mastergrowbot_premium_weekly_v1` — Apple ID 6809541369.
- `mastergrowbot_premium_monthly_v1` — Apple ID 6809542736.
- `mastergrowbot_premium_yearly_v1` — Apple ID 6809543789.

Verify all are in the existing subscription group at a higher service level than
Pro, use the intended prices, and have no introductory offers. Prepare for
Submission/Missing Metadata alone does not prove a code failure. Complete
localizations and review screenshots and allow metadata propagation before
testing. Apple subscription ranking was not changed or verified through the CLI.

## Privacy and permissions review still required

The finished privacy policy and App Privacy answers must accurately describe
video/photos sent to Supabase, OpenRouter, and the selected model provider,
purpose, identity linkage, and retention. Do not claim zero retention by providers
merely because the app does not retain raw video. Assess the actual processor
settings and Apple's current collection definitions. Raw video must never enter
the existing public-readable `user_uploads` bucket. Camera usage text must explain
short plant-video capture. Broad Photos access should not be requested if the
system picker suffices. Audio handling must match the final implementation.

## Five-minute release smoke test (after completion; not a substitute for full tests)

Use an existing Sandbox subscriber, a prepared 10-second plant video, and a saved
journal entry. Purchase/network latency may take this beyond five minutes.

1. 0:00–0:30: launch an existing subscriber; confirm access without a connection loop.
2. 0:30–1:10: run an existing image analysis and inspect its result.
3. 1:10–2:00: open Premium; verify matching cadence, localized full price, then Sandbox purchase.
4. 2:00–3:30: record or select a short video; receive a structured visual assessment.
5. 3:30–4:10: close/reopen; confirm Premium and the saved journal entry persist.
6. 4:10–5:00: Restore Purchases; verify Premium remains unlocked.

Five absolute blockers: existing paid launch/image regression; wrong product or
price/failed purchase; video authorization or inference failure; cost cap bypass;
lost entitlement/journal after reopen or restore. Verify the cost blocker in
server tests, not by this smoke test. Confirm the exact provider model from
server evidence, not from a plausible response in the UI.

## Required customer scenarios

A. New customer → weekly Pro trial → image → Premium → weekly Premium purchase.
B. Monthly Pro → Premium → monthly combined product.
C. Yearly Pro → Premium → localized US annual tier of $199.00, not $199.99.
D. Premium → image → video → journal → close/reopen with data and access intact.
E. Returning Premium → Restore Purchases → machine_vision unlocks.

Also test cancelled purchases, unknown/lifetime cadence, timeouts, interrupted
uploads, retries, oversize/long/invalid media, quota errors, and concurrent calls.

## Codemagic

The existing workflow is **ios-app-store**, displayed as **MasterGrowbot iOS App
Store**, branch **ios**. This checkpoint is not the requested 1.6.4 (165) build.
Do not submit it as the video release. Xcode is currently `latest`; a fixed
Apple-supported stable toolchain still needs verification for the final build.

Current Apple references: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/),
[submit an in-app purchase](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/),
and [App Privacy details](https://developer.apple.com/app-store/app-privacy-details/).
Submission preparation does not guarantee App Review approval.

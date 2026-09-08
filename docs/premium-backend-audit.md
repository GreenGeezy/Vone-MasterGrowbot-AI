# Premium backend audit — incomplete release

Live readback: gemini-v3 version **24**, active, gateway JWT verification disabled;
the handler's own authentication can fail open. No deployment or database/schema
mutation was made during this Premium checkpoint.

## Current cost evidence

Prices verified against OpenRouter on September 7, 2026, per one million tokens.
Illustrations below use 2,000 input tokens and 900 output tokens for lightweight
text, and 2,000 input + 1,400 output for diagnosis. These are calculations, not
measurements of real app requests. Video tokenization has not been measured.

| Feature | Model in live code | Input | Output | Illustrative request cost | Conservative maximum | Current quota |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Image diagnosis | google/gemini-3.7-flash | $0.75 | $3.75 | $0.00675 at stated token counts | Not bounded: media/prompt size and attempts matter | Shared 100/day, bypassable |
| Chat, insight, voice modes | google/gemini-2.5-flash-lite | $0.10 | $0.40 | $0.00056 at stated token counts | Not bounded | Same counter |
| Fallback | google/gemini-3.1-flash-lite | $0.25 | $1.50 | $0.00260 for 2,000 in + 1,400 out | Not bounded; additional attempted cost | Same counter, no cost accounting |
| Emergency fallback | OPENROUTER_EMERGENCY_FREE_MODEL, default openrouter/free | Configuration-dependent | Configuration-dependent | Not verified | Not verified | Same counter |
| Requested video, not deployed | google/gemini-3.8-flash | $0.75 | $3.75 | Not measured | Not measured | Not implemented |

Sources: [3.8 Flash](https://openrouter.ai/google/gemini-3.8-flash),
[3.7 Flash](https://openrouter.ai/google/gemini-3.7-flash),
[2.5 Flash-Lite](https://openrouter.ai/google/gemini-2.5-flash-lite),
[3.1 Flash-Lite](https://openrouter.ai/google/gemini-3.1-flash-lite),
[video input](https://openrouter.ai/docs/guides/overview/multimodal/videos).
Provider prices can differ; 3.8 currently lists discounted and priority rates.
Do not extrapolate a video request's cost from its duration without measuring
media tokens, output/reasoning tokens, retries, and provider usage.

**Can a heavy legitimate user exceed $1/week under current controls? Yes.**
Even the illustrative diagnosis cost at 100 requests/day gives
100 × 7 × $0.00675 = **$4.725/week**, before retries/fallbacks. This is not a
measured typical workload or a worst-case ceiling. The requested $0.90 rolling
weekly budget is not implemented, so no contrary guarantee is justified.

## Findings requiring implementation

- `user_daily_usage` contains user_id, date, request_count only. Authenticated
  clients have an ALL policy for their own row, so they can reset the counter.
- SELECT followed by UPSERT is not atomic admission control under concurrency.
- Authentication failures/backend errors can bypass the current limiter.
- Requests lack comprehensive prompt/media size bounds; fallback attempts have
  no independent reservations, and the provider call has no bounded fetch timeout.
- Supabase auth UUID and RevenueCat's persisted custom UUID are different.
  Accepting an arbitrary client RevenueCat ID or premium boolean is not a secure
  binding. An identity migration/verified binding must preserve existing Pro and
  lifetime access and be tested for purchase, cancellation, restore, and reinstall.
- No private RevenueCat credential exists in the September 8 secret-name audit.
- `user_uploads` has public SELECT policies. Do not store raw video there.
- A separate legacy gemini-gateway function remains active (version 54). Audit
  any billable alternate endpoint before claiming a total per-user cost ceiling.

Required design: authenticated server-side entitlement lookup bound to the actual
user; service-role-only atomic budget reservation before every billable attempt;
conservative preflight bounds and provider price ceilings; reconciliation using
actual usage while retaining reservations when a timeout leaves charge uncertain;
daily video quota derived from measured short clips; private transient media.
Use a precise rolling week or a conservatively longer daily-bucket window.
Never refund an uncertain reservation merely because the client cancelled.

Security advisors returned 13 warnings: 12 anonymous-access-policy notices and
one disabled leaked-password-protection notice. Anonymous sessions are intended
in this no-login app; inspect ownership rather than disabling them wholesale.
Performance advisors returned 102 notices: 3 missing foreign-key indexes,
32 RLS auth-call initialization notices, and 67 overlapping permissive-policy
notices. These were audited, not remediated in this checkpoint.
See [Supabase advisors](https://supabase.com/docs/guides/database/database-advisors)
and [RLS evaluation](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).

## Implemented locally in this checkpoint

- Pure, tested Premium catalog mappings, entitlement check, strict package/product
  association filtering, and localized numeric annual-savings calculation.
- Observation-only result contract with bounded structural validation. Unknown
  fields are projected out; this does not guarantee semantic content safety.
- `npm run test:premium` runs these tests. Neither module is wired into the app's
  existing image/purchase flow yet. Existing app functionality is unchanged.

## Outstanding engineering work (not user manual steps)

Premium card/paywall, record/device picker, cancellation/progress/retry/result UI,
server authorization and identity binding, video_visual_analysis model route,
cost reservations and RLS migration, measured daily quota, provider failure tests,
Playwright video states, native Sandbox testing, and version 1.6.4 (165) release
validation. A server secret alone does not finish this list.

## Checkpoint validation, September 8

Plain `npm ci` initially failed because picomatch lock entries were inconsistent.
The lockfile was repaired without changing declared dependencies; plain `npm ci`
then passed. TypeScript passed; reliability tests 5/5 and Premium foundation tests
21/21 passed; all 300 strain profiles validated; production web build passed.
The iOS workflow now includes the new test command. `npx cap sync ios` completed
asset/plugin sync but skipped CocoaPods and Xcode, which are unavailable on this
Windows machine. No Podfile.lock is present locally. Native compilation and
StoreKit compatibility remain unverified. Playwright was not run for this
checkpoint because no UI changes were implemented.

The dependency audit still reports 25 vulnerabilities (1 low, 5 moderate, 16 high,
3 critical); this checkpoint did not apply broad breaking dependency upgrades or
establish runtime exploitability. Build warnings include outdated Browserslist
data and a 565 kB main JS chunk. These findings must not be described as a clean
security/native release validation.

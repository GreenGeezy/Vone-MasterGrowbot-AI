# Premium video backend and cost audit

## Authentication and identity

The app calls `supabase.auth.signInAnonymously()` and Supabase creates a real persisted anonymous Auth user. Requests carry that authenticated user's JWT; the verified JWT `sub` is the application identity used by the Edge Function. Anonymous Auth users therefore run as `authenticated`, not as unauthenticated database traffic. The single shared Supabase client retains `persistSession` and `autoRefreshToken`, owns refresh centrally, and refuses to replace an established identity after a transient startup, refresh, or network failure.

The previous RevenueCat identity was a random UUID in Capacitor Preferences under `mg_rc_stable_id`. It survives relaunches and normal app updates, but differs from the Supabase user UUID. RevenueCat `logIn` and `logOut` were not previously used. For Premium purchase and restore, the app now securely identifies RevenueCat with the verified Supabase Auth UUID before StoreKit action. An interrupted identity transition records the previous ID and either commits after a verified `machine_vision` entitlement or rolls back. The server never accepts a client-supplied RevenueCat customer ID or Premium boolean: it derives the customer from the verified JWT subject and reads active entitlements through RevenueCat API v2.

This preserves current Pro and lifetime identities until a user explicitly buys or restores Premium. Relaunch and an ordinary App Store update retain both identities. Uninstall or app-data deletion can lose the anonymous Supabase session and legacy local RevenueCat ID. A new device likewise creates a new anonymous app identity; Apple Restore Purchases is required to bind the receipt to that device's authenticated identity. Cross-device journal data is unavailable without a user-facing account system, which this release intentionally does not invent.

## Live architecture

`iOS → authenticated gemini-v3 Edge Function → OpenRouter → Gemini`. The deployed `gemini-v3` version is 27 with gateway JWT verification enabled. `REVENUECAT_SECRET_API_KEY` is a server-only Edge Function secret with customer-read access; its value is never sent to or stored by the app.

Video authorization order is JWT verification, authenticated user resolution, server-derived RevenueCat customer lookup, active `machine_vision`, rolling budget, daily availability, media validation, then OpenRouter. An unauthorized request reaches no billable model. Usage admission uses a transaction-scoped advisory lock and service-role-only RPC; app clients cannot read, reset, or increment authoritative counters.

Video is inline and transient. It is never stored in Supabase Storage, and the existing public `user_uploads` bucket is not used by this feature. The server accepts signature-valid MP4 or MOV up to 8 MB and approximately 20 seconds, limits output, validates structured JSON, and bounds provider calls with a timeout. The visual prompt separates observations from interpretations and excludes optimization, potency, harvest, yield, medical, sales, delivery, consumption, and illegal-use guidance.

## Model routing and cost controls

Prices were verified on OpenRouter on September 8, 2026 and are per one million tokens. Provider pricing can change.

| Feature | Model | Input | Output | Typical estimated cost | Conservative reservation | Availability control | Exclusive weekly maximum |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: |
| Premium video | `google/gemini-3.8-flash` | $0.75 | $3.75 | $0.00411 measured average | $0.060 | Up to 5/day, internal | 31 attempts / $1.86 reserved |
| Image diagnosis | `google/gemini-3.7-flash` | $0.75 | $3.75 | $0.00675 estimate | $0.025 | Shared request/budget admission | 76 attempts / $1.90 reserved |
| Chat, insight, voice | `google/gemini-2.5-flash-lite` | $0.10 | $0.40 | $0.00056 estimate | $0.005 | Shared request/budget admission | 380 attempts / $1.90 reserved |
| Modality-compatible fallback | `google/gemini-3.1-flash-lite` | $0.25 | $1.50 | $0.00260 estimate | $0.015 | Separate fallback reservation | 126 attempts / $1.89 reserved |
| Emergency fallback | `openrouter/free` only | $0 | $0 | $0 provider price | $0.020 accounting reservation | Separate fallback reservation | 95 attempts / $1.90 reserved |

Video media tokens cannot be inferred reliably from duration alone. Two representative real calls using 10-second and 20-second MP4 files returned 3,062 input and 1,578 output tokens combined. At $0.75 and $3.75 per million, total model cost was **$0.008214**, or **$0.004107 per video**. Both calls returned structured results from `google/gemini-3.8-flash` in about 9.7 and 10.4 seconds. The $0.060 preflight reservation is roughly 14.6 times that measured average.

The rolling seven-day server budget is **$1.90 per authenticated user**. Five videos per calendar day is a separate upper bound; the rolling budget can make fewer available after other AI use or retries. At the measured average, 35 video calls cost about **$0.1437/week**. At the conservative reservation, 31 video attempts reserve $1.86 and the 32nd is denied because $1.92 would cross the cap. Image, chat, insight, voice, and each paid fallback draw from the same budget. Provider-reported cost and tokens are stored when returned; otherwise the conservative reservation becomes the estimate. A timed-out or failed attempt retains its reservation so retry cannot bypass accounting.

The application never advertises the daily count or dollar budget. When admission is unavailable it shows a neutral message explaining that more analyses become available later.

Sources: [Gemini 3.8 Flash](https://openrouter.ai/google/gemini-3.8-flash), [Gemini 3.7 Flash](https://openrouter.ai/google/gemini-3.7-flash), [Gemini 2.5 Flash-Lite](https://openrouter.ai/google/gemini-2.5-flash-lite), [Gemini 3.1 Flash-Lite](https://openrouter.ai/google/gemini-3.1-flash-lite), and [OpenRouter video inputs](https://openrouter.ai/docs/guides/overview/multimodal/videos).

## Database implementation

`user_daily_usage` now tracks `request_count`, `video_request_count`, `estimated_cost_usd`, `reserved_cost_usd`, `input_tokens`, and `output_tokens`. The app-facing ALL policy and direct grants were removed. Only service role can execute `reserve_ai_usage` and `finalize_ai_usage`. Admission serializes each user's concurrent requests with `pg_advisory_xact_lock`, sums the current day plus six prior days, enforces the rolling budget, and records reservations before model calls.

Live transactional verification allowed video reservations one through five, denied six with `daily_video_limit`, allowed 31 isolated $0.06 reservations, and denied the 32nd with `weekly_cost_limit`. The transaction was rolled back, leaving no test usage rows.

Supabase advisors continue to report 12 pre-existing security warnings (11 intentional anonymous-auth policy notices and disabled leaked-password protection) and 101 performance notices (3 unindexed foreign keys, 31 RLS initialization-plan notices, and 67 overlapping-policy notices) across the wider application. The Premium migrations add no public counter policy, no broken migration, and no production-data deletion.

## Validation boundaries

Automated TypeScript, reliability, catalog, result-schema, routing, media-validation, authorization-order, atomic-limit, build, and Capacitor sync checks run on Windows. Live API checks verified inactive Premium denial, active entitlement gating, unchanged insight routing, and both representative Gemini 3.8 video calls. Playwright covers responsive web UI and scroll behavior. Native camera, system picker, StoreKit payment, receipt transfer, signing, and TestFlight require the final Codemagic and iPhone smoke test.

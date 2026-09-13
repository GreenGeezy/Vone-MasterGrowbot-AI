# Release 1.6.11 (172): Home and Journal reliability

## Root cause

The live `tasks.id` column is `bigint`. The app loaded raw numeric IDs in one path, then called `taskId.startsWith(...)` when a task was marked complete. A numeric ID throws a TypeError. The same helper also skipped every numeric string as if it were an unsaved local task, so simply converting IDs to strings would have hidden the crash without fixing cloud persistence.

The click handler awaited that operation without catching rejection. The global `unhandledrejection` listener then replaced `document.body.innerHTML` with the raw stack trace, destroying the React root and navigation. This explains the unrecoverable red screen. The exact TestFlight bundle in the screenshot was not present locally; the numeric-ID failure was reproduced against the current source and the database schema was verified live.

## Repairs

- Normalize loaded and newly created task IDs to strings. Treat numeric database IDs as persisted records; distinguish prefixed local placeholders.
- Completion, Undo, editing and deletion require a returned database row before changing the UI. Failed or empty updates cannot report success. Requests have cancellation and bounded waiting; per-task locks prevent repeated taps from launching overlapping changes.
- Catch action failures and show recoverable feedback. Unexpected background rejections log diagnostics and notify the app; they never overwrite the React root or inject raw exception text as HTML.
- Reload all task states, preserving notes, repeat labels, future due dates and completed history. Home separates due tasks from completed history; Journal retains upcoming tasks.
- A shared task editor saves the selected due date and maps it to `due_date`. New Journal tasks use the selected plant. Plant cards open that plant's journal.
- Journal saves wait for persistence before claiming success. A rejected note save keeps the editor's draft. Secondary diagnosis-record synchronization cannot turn a successfully saved journal note into an apparent failure. Note deletion updates the screen after database confirmation.

## 80/20 product changes

| Change | User benefit | Expected business effect |
| --- | --- | --- |
| Explicit Home instructions and Done/Undo controls | Users understand the task circle and can reverse mistakes | Less frustration during the trial |
| Visible Add note / Add task buttons | Creation no longer depends on discovering a floating plus menu | Easier first useful action |
| All / Notes / Tasks filters and selected-plant label | Separate observations from plans and understand where notes are saved | More useful repeat visits |
| Due dates, preserved notes and completed history | The journal becomes a reliable record | Stronger reason to continue using the app |
| Clear saving/error states and retained drafts | Avoid lost work and false success | Better trust and fewer support problems |
| Report line breaks and scrollable note viewer | Saved reports remain readable on a small phone | Easier follow-through on saved information |

These are conversion/retention hypotheses, not measured revenue gains. Evaluate trial-to-paid conversion alongside first-day note creation, task completion and repeat Journal visits. No pricing, trial duration or subscription behavior was changed. Repeat labels remain labels, not automated reminders; the editor explicitly says so.

## Scope and release verification

Premium paywalls, RevenueCat configuration, image/video services, report content and all Supabase Edge Functions are unchanged in this release. No production schema migration or deployment was needed. Live task RLS policies were inspected but not changed.

A temporary anonymous account passed live create → complete using a numeric ID → edit → reload → Undo → delete checks. The diagnostic account and task were removed after signing out.

Validation completed: **75/75 automated tests**, TypeScript, production build, 300-strain validation, and Capacitor iOS asset/plugin sync. Playwright at **375×667** passed completion/Undo, failed task-save recovery, task editing/date persistence, report viewing, and note draft retention/retry. Browser checks used isolated UI fixtures and mocked persistence failures; live task persistence was verified separately. No JavaScript page errors or horizontal overflow were detected. Native CocoaPods/Xcode compilation is unavailable on Windows.

Run Codemagic **MasterGrowbot iOS App Store** (`ios-app-store`) from branch `ios`, then install **1.6.11 (172)**. On the iPhone, save an analysis task, mark it done from Home and Journal, undo it, edit its notes/date, and reopen the app to confirm persistence. Test an offline task action and confirm navigation remains available. Open a saved report and add a note with a photo.

Native compilation/signing and StoreKit testing require Codemagic/TestFlight. App Review approval is not guaranteed by code or browser checks. Complete the previously outstanding subscription review metadata and screenshot before submission.

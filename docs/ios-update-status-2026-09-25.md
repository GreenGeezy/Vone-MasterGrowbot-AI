# iOS update status — September 25, 2026

This is a partial reliability update on `ios`, not a release approval.

## Implemented locally

- Secondary reports reuse the journal's persisted image URL instead of duplicating the original inline image.
- Authenticated journal photo saves stop on upload failure instead of placing large base64 images in Postgres. The save returns an error so the UI can retain the draft for retry.
- Uploads preserve supported data-URL MIME types, retain legacy bare JPEG compatibility, and avoid overwriting existing objects. New journal uploads use unique paths.
- Premium checkout accepts available, validated billing options even when another cadence is absent. Product mapping and duplicate rejection remain intact.
- Codemagic now runs the existing journal-sharing and library checks and validates the bundled catalog structure.
- Existing Pro trial duration, prices, identities, entitlements and subscription products remain unchanged.

## Validation

TypeScript, reliability, Premium, sharing and library suites passed. The 300-profile structural validator passed; this does not verify factual profile content. Four new media persistence tests cover MIME/bytes, upload failure, legacy camera compatibility and stored report references. Production web build passed with existing chunk-size, mixed-import and Browserslist warnings.

## Production storage remains unresolved

Read-only inspection: database 686 MB; 165 reports; 138 inline images containing 582,917,490 bytes of encoded text. Object storage: 216 objects totaling 666,800,826 bytes. No production data was changed.

Existing images are customer data, not established disposable space. Follow `image-storage-migration.md`: encrypted backup, decoded-byte capacity inventory, owner-matching hash verification, released-client compatibility, then reversible reference migration. Reclaiming allocated Postgres space is a separate maintenance step. New uploads plus failed downstream writes can still leave orphan candidates; no automatic deletion is enabled without reference verification.

## Release blockers and unfinished scope

- Historical image migration and confirmation that the Free-plan warning clears.
- Account deletion currently targets nonexistent `grow_logs`, filters `chat_messages` by a nonexistent ownership column, clears local state too early and can report success after remote failures. A verified server-side deletion workflow and device tests are required.
- Factual verification of all strain profiles and Premium/Pro detail parity were not completed. No researched dataset was imported.
- Cannabis cultivation advice, strain-specific growing intelligence and growing-environment optimization were not implemented.
- Fresh browser/device visual verification, StoreKit sandbox purchase/restore/trial eligibility, existing-subscriber upgrades and reinstall recovery remain required.
- Select an unused App Store build number and update version references after checking App Store Connect. Version/build were not bumped.
- Native iOS archive, signing, TestFlight installation and App Store submission were not run from this Windows workspace.

No repository push, backend deployment, paid plan change or App Store submission was performed. These fixes address concrete failure paths; a revenue increase has not been measured or guaranteed.

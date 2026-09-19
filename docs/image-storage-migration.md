# Saved-report image migration — prepared, not executed

## Verified inventory, September 19, 2026

The database dashboard reports 650.76 MB against the free 500 MB allowance. `diagnosis_reports` contains 155 records: 128 inline data-URL images occupy approximately 515 MB; report JSON occupies about 175 KB. Existing object storage occupies 631,395,969 bytes. No customer record or image was deleted or changed during this release.

## Required approach

1. Export an encrypted backup of affected rows to a user-approved private location. Keep credentials in environment variables, never in the export or logs. Record IDs, original-value hashes, decoded byte hashes, MIME types and byte lengths in a restricted manifest.
2. Decode images without recompression. Determine unique binary hashes and actual destination size before any upload. Base64 column size does not establish decoded storage requirements. Compare against live storage headroom, including other projects and pending reservations. Stop if there is insufficient room; do not purchase capacity automatically.
3. First look for byte-identical, owner-matching objects already saved by the journal. Verify downloaded bytes against the manifest. Never infer a match from filenames or timestamps alone.
4. Prefer a separate private image bucket with owner-only authorization. Confirm compatibility with released iOS/Android clients before replacing data URLs: those clients must be able to resolve private images. A short-lived signed URL cannot be persisted as a permanent replacement. Do not move private images into the existing public bucket to avoid updating a client.
5. If released clients cannot read the chosen private representation, retain existing rows until a compatible binary is adopted. The present release does not modify image/video analysis or report rendering.
6. Stage each new object with an immutable path and verify its full downloaded SHA-256 hash. Only then update the associated row with a compare-and-swap condition matching the original image value. Preserve report IDs, owner IDs, timestamps and diagnosis JSON. Record every change in the encrypted rollback manifest.
7. Exercise report reopening, journal, sharing, reinstall/support recovery and two-owner isolation on actual supported clients. Restore original values from the backup for any failure.
8. Reclaim obsolete database storage only after verified backups and successful checks. Ordinary updates may leave reusable database space without shrinking its allocated size. Any table-rewriting maintenance must be planned separately because it can lock writes and need temporary disk space.
9. Recheck the dashboard allowance and native file tests before enabling `mobile_features.uploads_enabled`. Keep existing document reads/deletes available regardless of this flag.

## Current decision

Uploads remain disabled. No image migration has run. The compatibility and destination-capacity checks above must be resolved before executing it. This is a staged migration design, not a claim that existing storage is already repaired.

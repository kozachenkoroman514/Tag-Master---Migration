## Goal

Add a "Scan Picklist" workflow on the Labels page. The user takes a photo or uploads a picklist image/PDF; Lovable AI (Gemini vision) extracts the part lines; the user reviews/edits the results and the chosen label format (2x4 or 4x6) is printed in one batch.

## Entry point

- New tile/button on `src/pages/LabelsPage.tsx`: **Scan Picklist** (camera icon), placed next to the existing Part Label tiles.
- Opens a new `ScanPicklistDialog` component (kept in `LabelsPage.tsx` alongside the other dialogs, to match the file's current pattern).

## User flow

1. **Capture step**
   - Two buttons: `Take Photo` (native `<input type="file" accept="image/*" capture="environment">`) and `Upload File` (accepts `image/*,application/pdf`).
   - Show thumbnail preview after selection. PDFs: first page only (render via existing approach if available, otherwise send raw PDF to AI — Gemini accepts PDFs).
2. **Parse step**
   - "Scan Picklist" button → calls a new edge function `scan-picklist` (see below). Spinner + status text while waiting.
   - On success, populate an editable table of rows.
3. **Review step**
   - Editable table columns matching `PartEntry`:
     `Part # · Qty · Job # · SO # · Goes With · Description · Rev · Item`
     (2x4 requires Part #, Qty, Job #; 4x6 requires Part #, Qty, Description — same validation as existing dialog.)
   - Per-row delete; "Add Row" button; "Re-scan" to start over.
   - Label-size selector: 2x4 (default) / 4x6 (radio, mirrors existing PartLabelDialog options).
4. **Print step**
   - "Print N Labels" button. Validates required fields per chosen size; missing cells highlight red (reuse existing `missing` pattern).
   - Calls a new `printPartBatch(parts, size)` helper that loops in chunks (existing `printPart2x4` / `printPart4x6` are written for 1–2 parts per sheet — the new helper concatenates all parts into a single print doc by reusing `buildPart2x4Doc` / `buildPart4x6Doc` per page, joined with CSS page breaks). Existing single-window `afterprint → window.close()` handler is reused.

## Edge function: `supabase/functions/scan-picklist/index.ts`

- POST `{ imageBase64, mimeType }` → returns `{ parts: PartEntry[] }`.
- Uses Lovable AI Gateway (`LOVABLE_API_KEY`, model `google/gemini-3-flash-preview`) with the AI SDK `Output.object` structured-output API.
- Schema: array of `{ partNumber, qty, jobNumber, soNumber, goesWith, description, rev, item }` (all strings, empty when not present).
- System prompt instructs the model: "Extract every line item on this picklist. Return strings only — no inference for missing fields."
- Returns 400 on missing input; surfaces 429/402 from gateway to the client.
- `verify_jwt = false` not needed — keep default (authed users only).

## Files touched

- `src/pages/LabelsPage.tsx` — add tile, `ScanPicklistDialog`, `printPartBatch` helper.
- `supabase/functions/scan-picklist/index.ts` — new edge function.
- No DB/schema changes. No new dependencies (uses existing `npm:ai` pattern already present in the project, or `fetch` to gateway if AI SDK not yet wired — will pick whichever the project already uses; otherwise direct `fetch` to `https://ai.gateway.lovable.dev/v1/chat/completions` with vision message content).

## Out of scope

- Multi-page PDFs (first page only).
- Saving scanned picklists to history.
- Auto-print without review (always shows review step for safety).

## Technical notes

- `LOVABLE_API_KEY` is already provisioned (Lovable Cloud is on). No user secret prompt.
- Image is sent as base64 data URL inside the chat-completions `image_url` content part — Gemini vision supports this via the gateway.
- Existing 2-part cap in `PartLabelDialog` does not apply here; new dialog has no cap.
- Print uses the existing hidden-iframe / `window.open` pattern with the `afterprint` auto-close handler already added.

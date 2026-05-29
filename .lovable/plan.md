# ILD + Kiosk + Shared Acknowledge — Implementation Plan

## Open questions (need confirmation before I build)

1. **Truncated sentence**: "Printed timestamps are generated whenever an Order ___". Combined with later rule "Printed times should only exist for orders in PICKING status", I'll assume: **`printedAt` is set the moment an order enters PICKING (and cleared otherwise)**. Confirm?
2. **Save Filters scope**: filter presets stored in `localStorage` (per browser) for now, with the existing store hook ready to swap to a Cloud `user_filter_presets` table later. OK?
3. **Bin "negative count"**: bins are currently strings like `P3A1`. To color RED on negative qty, I'll attach a `qty` number per bin (mock data). Display: `P3A1 (12)`, red when `< 0`. OK?
4. **Part-number template**: keep existing `INT4-{W}x{H}-LHE-30k-{M|C}` shape, vary W/H per line, and emit mirror+chassis pairs on some orders (chassis = `M`, mirror = `C` sharing the same dims). OK?
5. **Next Stage / Back a Stage on ILD**: same ERP-controlled-status warning as Kiosk (ORDERED/CUTTING/PENDING/IN-BUILD), or silent on ILD?

## Data model (store)

- `MockOrder`:
  - `printedAt`: set only when `status === "PICKING"`, cleared on transition out.
  - `statusHistory: { status: OrderStatus; at: string }[]` — appended every `setStatus`, seeded for existing mocks.
  - `holdReason?: { reason: "Sales Changes" | "Material Issues" | "Other"; note?: string; at: string }`
  - `seeCommentsReason?: { note: string; at: string }`
  - `acknowledgedHoldFallAt?: string | null` — set when user Acknowledges an ERP-hold fall.
- `partsFor(id)` rewrite:
  - `jobNo`: 250000–260000 range; Stock parts → no job number.
  - `partNo`: `INT4-{W}x{H}-LHE-30k-{C|M}` with varied W/H; emit complementary mirror+chassis pairs on some orders.
  - Bins by source/qty:
    - WIP qty < 5 → `P1A1`–`P12A1`
    - WIP qty ≥ 5 → `AN1A1`–`AN1D1`
    - Stock qty < 20 → `G24A1`–`G40A1`
    - Stock qty ≥ 20 → `SMZ8`
  - Each bin gets a numeric `qty` (occasionally negative to demo the RED).
- New store actions:
  - `nextStage(id)`, `prevStage(id)` — walk `STATUSES` array (skipping HOLD / SEE COMMENTS).
  - `setHold(id, reason, note?)`, `setSeeComments(id, note)`.
  - `acknowledgeHoldFall(id)` — resets push/printed state to pre-IN-STASIS baseline.
  - `setPrintedNow(id)` — manual print stamp (gated by status === PICKING).
  - `saveFilterPreset(name, state)` / `deleteFilterPreset(name)` / `presets` map persisted to `localStorage`.

## ILD changes (`Dashboard.tsx`)

- **Columns / details table** (expanded row):
  - Column order: `Ln.Rel | Release | Ship By | Job # | Part # (+copy btn, +bin stack) | Qty | Source | …`
  - Copy button (clipboard icon) next to each Part #.
  - Bin stack under Part #: larger font (`text-sm`), each bin shows `qty`; RED when `qty < 0`.
  - Stock rows: Job # column shows `—`.
- **Action buttons in expanded row** (left → right):
  `ORDER PACKAGING · ASSIGN · NEXT STAGE (gold) · BACK A STAGE` — Next/Back always visible; Packaging/Assign gated on selected lines.
- **EDIT dialog**: tabs/sections for Comments, Set HOLD, Set SEE COMMENTS.
  - HOLD: radio (Sales Changes / Material Issues / Other). "Other" requires note → appended to comments as `[HOLD — Other — {timestamp}] {note}`.
  - SEE COMMENTS: required note → appended similarly.
  - Save runs `setHold` / `setSeeComments` → flips status accordingly.
- **Filters**: multi-select per column + Save preset (dropdown of saved presets, save / delete). Persist via `localStorage`.
- **Times column**: collapsed by default. Expanded view shows Appeared / Printed + per-status timeline from `statusHistory`.
- **Acknowledge**: small ✓ button on rows that are HOLD-flashing (either ERP-fall or manual). Pulses HOLD purple. Clicking on an ERP-fall removes the order from view; on manual-HOLD just stops the flash.
  - For now I'll simulate "ERP-fall HOLD" via a flag on a couple of seed orders so the flow is demoable.

## Kiosk changes (`KioskPage.tsx`)

- Filter out `IN-STASIS` and anything past `IN-PROCESS` (i.e., `PROCESSED`).
- Sortable column headers (Order / Project / Team / Ship By / Status).
- Remove "Update Status" column.
- Add three buttons per row:
  - **Print Labels** → opens 4×6 landscape print sheet titled "Order Labels" (one per order; barcodes for Order # and Project ID; placeholder layout, refinable).
  - **Print Paperwork** → toast `"Coming soon — will use ILD details + ERP API"`.
  - **Next Stage** / **Back a Stage** → call store; if current (Next) or target (Back) status is in `{ORDERED, CUTTING, PENDING, IN-BUILD}`, show confirm dialog with the Woodshop Manager override warning.
- Acknowledge ✓ button on HOLD rows (same behavior as ILD).

## Files touched

- `src/store/dashboardStore.ts` — model + new actions + regenerated mock data.
- `src/components/Dashboard.tsx` — details table reorg, EDIT dialog rewrite, filter presets glue, Next/Back buttons, Acknowledge, times timeline, copy buttons.
- `src/components/DashboardFilters.tsx` — multi-value filters + Save Preset UI.
- `src/pages/KioskPage.tsx` — filter/sort, new action buttons, ERP-status warning dialog, Acknowledge.

## Out of scope (will stub with toast)

- Actual ERP / Woodshop Manager API.
- Per-user persistence (presets are browser-local until Cloud migration).
- Paperwork print layout.

Please confirm the 5 questions above (or just say "go with your assumptions") and I'll build it in one pass.

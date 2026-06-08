## Goal
Refresh the 4x6 Pack Unit label to match the newly uploaded HTML + tile icon, and add an optional **Priority** field (TOP / HOT) that only renders on the label when set. 2x4 Pack Unit label is untouched.

## Changes

### 1. Tile icon (4x6 Pack Unit)
- Replace the asset behind `src/assets/unit-label-icon.png.asset.json` with the uploaded `UNIT Label Icon.png` (via `lovable-assets create` from `/mnt/user-uploads/`).
- `unit-label-2x4-icon.png` is left as-is.

### 2. 4x6 label doc (`buildUnit4x6Doc` in `src/pages/LabelsPage.tsx`)
Rewrite the inline CSS + markup to mirror the uploaded `unit_label.html`:
- Wider `status-cell` (width 240px → matches the "STATUS / TOP" block in the reference).
- Same row structure: Sales Order + QR, Project + QR, meta row (Unit / N of M / Date), bottom row (Area / Status).
- Keep the existing "omit blank field" behavior. Status cell only renders when `status` is non-empty (already the case).
- Rename the visible status header inside the label from "Status" to "Status" (reference uses "STATUS") — no change needed to label text, just confirming.

### 3. Priority field in the form (4x6 only)
Two places use the 4x6 unit label:

**a. `PackUnitLabelDialog`** (standalone "Pack Unit Label" dialog)
- Add `const [priority, setPriority] = useState("")`.
- When `size === "4x6"`, render a new "Priority (optional)" Select with options: *None* (empty), `TOP`, `HOT`.
- Pass `status: priority` into both `buildUnit4x6Doc` (preview) and `printUnit4x6` (print). The existing `status: ""` literal is replaced.
- Include `priority` in the reset logic on close/print and in the preview effect deps.
- Hidden when `size === "2x4"` (2x4 builder has no status arg — leave untouched).

**b. Scan Picklist's `packUnit` state** (`SmartLabelDialog`)
- Add `priority: ""` to the `packUnit` state shape.
- In the Pack Unit form grid, add a 7th cell (or reflow to `grid-cols-7`) with a `Priority` Select (None / TOP / HOT), gated to `size === "4x6"`. When 2x4 is selected, hide it.
- `handlePrintPackUnit` passes `status: packUnit.priority` only on the 4x6 branch (2x4 branch stays as-is, no status).
- Scanner does NOT need to extract this — it is purely user-entered.

### 4. Out of scope
- 2x4 Pack Unit label markup, icon, and form (per the user's note).
- Edge function changes — Priority is not pulled from the picklist.
- No DB / schema changes.

## Files touched
- `src/assets/unit-label-icon.png.asset.json` (replaced via lovable-assets CLI)
- `src/pages/LabelsPage.tsx` (4x6 doc builder + both pack-unit forms)

## Validation
- Open the 4x6 Pack Unit Label dialog → confirm preview matches the uploaded reference image, Priority select appears, selecting TOP/HOT renders in the bottom-right status cell, selecting "None" hides the cell.
- Switch the same dialog to 2x4 → Priority field is hidden; 2x4 label unchanged.
- Run Scan Picklist → Pack Unit row shows Priority dropdown when 4x6 is the active size; printing routes the value through.

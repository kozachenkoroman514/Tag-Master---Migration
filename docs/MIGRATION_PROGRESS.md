# Tag Master migration — progress

_Last updated: 2026-10-08_

## Goal
Move Tag Master off Lovable to our own setup, then upgrade it with read-only Epicor Kinetic lookups so label fields fill in from ERP data instead of manual entry.

## Done (all pushed to `origin/main`)
| Commit | Change |
|---|---|
| `f572d2b` | `.env` untracked (it was committed in the Lovable history; publishable Supabase key only) |
| `999f865`, `5a40778` | Scan Picklist removed (Lovable AI gateway OCR — user called it a gimmick) |
| `9327467` | Label icons bundled locally (were Lovable-hosted `/__l5e/` asset pointers); `run-dev.cmd` + launch config on port 8081 |
| `a551d1d` | Lovable leftovers removed: Lovable/Supabase/Playwright packages, `src/integrations`, `supabase/` (old migrations — app has no backend), meta tags, README. Responsive tile grid (3→2→1 columns by available width) with gold scrollbar |
| `7fd96b7` | All label dialogs share one layout; previews same size per label size; multi-label preview uses a pager; forms fit without scrolling (4x6 Part shows 2 parts side by side) |
| `8fb1b58`, `8c25b4c` | Misc label font size selector: Auto (original shrink ladder) or a fixed size up to 200pt (4x6) / 96pt (2x4). Fixed sizes split text by measuring it against the label area; words only split when they can't fit one label |

## Kinetic integration — findings (company EM01, read-only queries via the Kinetic ERP connector)
| Label field | Kinetic source | Lookup key |
|---|---|---|
| Part #, Rev, Description, Qty | `Erp.JobHead.PartNum / RevisionNum / PartDescription / ProdQty` | Job # |
| SO / Line / Release | `Erp.JobProd.OrderNum / OrderLine / OrderRelNum` (OrderNum 0 = build-to-stock) | Job # |
| Project | `Erp.OrderDtl.ProjectID` (e.g. "Ferguson Order") | SO + line |
| Ship-by date | `Erp.OrderRel.ReqDate` | SO / line / release |
| Inspection: customer, address, SO | `Erp.RMAHead` → `Erp.Customer` / `Erp.ShipTo` (ShipTo first, fall back to Customer); `Erp.RMADtl.OrderNum` | RMA # |

Notes:
- Firm jobs are 6-digit numeric (264824–266456 for jobs created since 2026-09-01). `MRP…` jobs are unfirm placeholders — exclude (`JobFirm = 1`).
- ~1/3 of firm jobs link to a sales order (456 of 1,326 since 2026-09-01); stock jobs have no SO/project.
- A job can feed multiple releases (several `JobProd` rows) — the UI must let the user pick one.
- `-M` (mirror) / `-C` (chassis) parts for the same unit sit on adjacent lines of the same SO — the 4x6 Part label could fill both halves from one SO.
- Always join on `Company`; filter `Company = 'EM01'`.
- `JobHead.JobClosed = 0` includes stale jobs back to 2016 — bound by date if listing.
- At least one RMA has a bad `RMADate` (year 4333) — don't trust it for sorting.

## Open decisions (blocking the Kinetic build)
1. **How the deployed app reaches Kinetic.** The SQL server (`EM-ERPSQL\ERPSQL`, DB `KineticERP`) is on-prem. Options:
   - **(Recommended)** Small internal Node API with a dedicated read-only SQL login; 3 endpoints (job, SO, RMA). Credentials stay server-side.
   - Kinetic REST API v2 + 3 BAQs. No custom server, but needs Kinetic admin work, per-user or service-account auth, and CORS.
2. **Hosting.** Tag Master should be hosted inside the network next to whichever lookup is used (a public HTTPS page can't call an internal server).
3. Which internal server/IIS box to use — ask IT.

The Kinetic ERP connector in Claude is for development-time schema/data exploration only; the app cannot use it at runtime. IT issued a token for the connector on 2026-10-08 — it was configured in the Claude app, not stored anywhere in this repo. (It was pasted into a chat once; IT should rotate it.)

## Next steps
1. Get answers to the open decisions above.
2. Build the lookup service (or BAQs) for: job → part fields + SO/line/rel; SO → project + ship-by + lines; RMA → customer/address/SO.
3. Add "look up" to Part (Job #), Pack Unit (SO # / Job #) and Inspection (RMA #) dialogs; manual entry stays as the fallback.
4. Choose frontend hosting (internal) and cut over from Lovable; keep the Lovable app live until the team signs off.

## Other loose ends
- 8 pre-existing lint errors in shadcn/template files.
- Dashboard prototype is unused — decide later whether it becomes a live ERP order board.

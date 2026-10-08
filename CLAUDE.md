# Tag Master (migration repo)

Browser-only label printing app (React 18, Vite, TS, Tailwind, shadcn/ui). No backend. Labels are HTML docs printed via `window.print()`; QR codes from the `qrcode` package.

**Read `docs/MIGRATION_PROGRESS.md` first** — current status, decisions, Kinetic findings, and what's next. Update it at the end of every session.

## Repos and remotes
- This repo: `kozachenkoroman514/Tag-Master---Migration`, remote `origin`. Work on `main`, push when a change is verified.
- `source-app` remote = the original Lovable repo `Tag-Master`. Fetch-only (push URL disabled). It is live with the teams via Lovable — never push to it.
- `..\Tag-Master` is an untouched clone of the original (push also disabled).

## Run / check
- `run-dev.cmd` (portable Node from `..\..\Migration_WM\nodetools`), http://localhost:8081. Woodshop uses 8080.
- Node is not on PATH; prefix commands with that portable Node dir.
- `npm install --legacy-peer-deps`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`.
- `npm run lint` has 8 pre-existing errors in stock shadcn/ui, `src/test/setup.ts` and `tailwind.config.ts`; files we touch should lint clean.

## Code map
- Almost everything is in `src/pages/LabelsPage.tsx`: tile grid, five label dialogs (Part, Pack Unit, Status Note, Misc, Inspection), and the HTML doc builders for 2x4 and 4x6.
- All label dialogs share `LABEL_DIALOG_CLS` / `LABEL_DIALOG_BODY_CLS` / `LABEL_FORM_CLS` and `PreviewPane`. Keep it that way so previews stay the same size across label kinds.
- `PreviewPane` shows one label at a time with a pager; multi-label docs must mark each page with `class="label"`.
- Forms are laid out to fit without scrolling at 1536x730 and up. Re-check both label sizes after form changes.
- `src/components/Dashboard.tsx` (+ `DashboardFilters`, `dashboardStore`) is an orphaned prototype order board on mock data, kept as a possible future Kinetic-driven view.

## Conventions
- Semantic color tokens; gold accent is `--ring`. Gold scrollbars: `.gold-scroll` (content), `.sidebar-gold-scroll` (sidebar).
- Kinetic access is read-only, company EM01 (EMDEMO = test). Never put ERP credentials or tokens in this repo or in `VITE_` vars.

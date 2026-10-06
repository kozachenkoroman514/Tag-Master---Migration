# Tag Master

Browser-based tool for printing QR-coded thermal labels (Part, Pack Unit, Status Note, Misc, Inspection) in 2"×4" and 4"×6" sizes. Labels are built as HTML and printed through the browser's print dialog.

Frontend only: React 18, Vite, TypeScript, Tailwind, shadcn/ui. No backend.

Migrated off Lovable. The original Lovable-linked repo (`Tag-Master`) is the fetch-only `source-app` remote and must not be pushed to.

## Run locally

```
run-dev.cmd
```

Uses the portable Node in `Documents\Migration_WM\nodetools` and serves on http://localhost:8081 (Woodshop Manager uses 8080). Install dependencies first with `npm install --legacy-peer-deps`.

## Scripts

- `npm run dev`: dev server
- `npm run build`: production build to `dist/`
- `npm run lint`: ESLint
- `npm test`: Vitest

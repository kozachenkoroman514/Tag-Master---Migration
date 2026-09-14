# Sample Text label — auto-shrinking font

## What you asked for (my understanding)

On the Sample Text (Misc) label, the text currently prints at one fixed large size, and once it passes a set character count it spills onto extra labels.

You want instead:

1. As more text is typed, the font shrinks automatically so the text keeps fitting on the label.
2. Shrinking stops at size 10 — that's the floor, it never goes smaller.
3. If the text still doesn't fit at size 10, the font stays at 10 and the leftover text rolls onto additional labels using the existing overflow rules (same as today).
4. This applies to both label sizes, 4x6 and 2x4, each measured against its own printable area.
5. The live preview shows exactly what will print: the shrunken font, and every overflow label.

## How it will work

- Build a set of font-size steps for each label size, from today's large size down to 10pt.
- For a given amount of text, pick the largest step where the whole text still fits the label's printable area.
- Each step has its own capacity: bigger font = fewer characters per label, size 10 = the most.
- If the text exceeds even the size-10 capacity, lock the font at 10 and split the remainder into extra labels with the current word-aware chunking.
- Preview and print use the same chosen size, so what you see matches the print.

## Technical notes

- In `src/pages/LabelsPage.tsx`, `MiscLabelDialog`: replace the fixed `maxChars` (70 / 95) with a size-step table mapping font size to per-label character capacity for each label size.
- `buildBody` takes the resolved font size and inlines it instead of relying on the fixed `.huge` class size.
- `chunkMiscText` is reused unchanged, called with the size-10 capacity only when overflow is unavoidable.
- Print paths (`printLabel`, `printMiscMultiPage`) stay as-is; they just receive bodies already carrying the chosen font size.
- No other label types are touched.

## Note on fit accuracy

Fit is estimated from character counts per font size, calibrated per label size — the same approach used today, just extended across sizes. It is conservative by design so text never runs off the edge; very wide characters or many line breaks may cause it to shrink slightly earlier than strictly needed.

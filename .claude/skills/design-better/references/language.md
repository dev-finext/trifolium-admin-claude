# The design language — what is signed, what is set, what was decided

This file is the memory of the redesign. §1 does not change. §2 is the
direction as it stands and is edited when a system-level decision lands. §3
is the roadmap. §4 grows by three lines per finished piece and is never
rewritten — a decision that is reversed gets a new entry saying so.

## 1 · The brand, as approved and signed

Source: the design-approval letter signed by Trifolium (Noam Oren) and Finext on
10.7.2026 for version 2.5 of the practitioner system; the exported prototype
`Trifolium V2.6 (with EN).html`; the brand's own logo file; and the UI/UX
design task Avichai wrote for the project ("Think natural pharmacy. Not tech
product. Calm. Clean. Trustworthy. Colors: soft greens, beige, white. Avoid
heavy UI, avoid noise."). These are facts, not taste:

**The mark.** A dandelion seed-head drawn as a radial burst of fine white
strokes, with two symmetric sprays of leaves beneath it on a single stem. One
colour, white on the brand ground or sage on white. It is the only picture the
brand owns. *The admin console does not use it today — the sidebar shows a
generic leaf icon.*

**The wordmark.** `TRIFOLIUM` in wide-tracked serif capitals — Cormorant
Garamond 500 in the approved prototype (66 px in the hero, 32 px in the nav) —
with `בית מרקחת לצמחי מרפא` beneath in Assistant. The serif appears nowhere
else in the approved system: it is the brand's voice, used once.

**The colours.** The approved prototype's tokens, which the admin inherited
with an `a-` prefix:

| role | value | note |
|---|---|---|
| accent | `#3d5a3a` | deep sage — the one primary colour |
| accent ink | `#2a4028` | hover / pressed |
| ink | `#1f2e1d` | text, a green-black, never pure black |
| ink 2 / 3 / 4 | `#36433a` `#54614f` `#8a9384` | the reading ramp |
| background | `#f6f8f5` (admin: `#f4f6f2`) | cool pale green-grey |
| surface | `#ffffff` | cards, inputs |
| sunk | `#eef1ec` (admin: `#eaeee6`) | recessed panels |
| line | `#e2e6dd` · strong `#cdd4c5` | hairlines, 0.8 px in the prototype |
| muted | `#908b7d` | **warm grey-beige — the "beige" of the brief; absent from the admin today** |
| danger / warning / success | `#a23a2d` · `#a87521` · `#3d5a3a` | status, not decoration |

The legacy web shop (trifolium.co.il) is teal `#5aafa8` and Heebo; the
practitioner app it replaced was cyan, purple and a blue gradient. The signed
redesign moved the software to deep sage on purpose. **Teal is the past.**

**The materials.** In the approved prototype: radius 6 px on cards and
controls, 999 px on pills; borders 0.8 px hairline; no drop shadows on cards
(one soft 1 px shadow on floating elements only); inputs and primary buttons
40 px tall, secondary buttons 32 px; page title Assistant 600 28 px, section
title Assistant 600 22 px, body 14–15 px; white cards on the pale ground; a
numbered step rail with a connecting line; a sticky summary bar at the bottom
of a multi-step flow; soft single-tint illustration cards (lilac, pale blue,
warm beige, pale green) carrying thin sage line illustrations; botanical
photography only in the home hero.

## 2 · The direction — set by the design lead, pending the first task

The admin is **the back room of the same pharmacy**: the same materials as the
approved practitioner system, denser, faster, more exact. "Apothecary, not
dashboard." What that means in practice, as the opening position the first
(system-level) task will put to Avichai as variants:

- **Radius 10 → 6.** Match the approved system. The 10 px everywhere is the
  single most "AI template" signal in the console.
- **Hairlines and tone, not shadow.** 0.8–1 px borders in `--a-line`; depth by
  `--a-sunk` against `--a-surface`. Shadows only on things that float (drawer,
  modal, menu).
- **The mark replaces the leaf.** The dandelion in the sidebar brand block;
  the wordmark in Cormorant Garamond 500, tracked, once. Favicon from the mark.
- **Assistant stays; the scale shrinks.** Fewer sizes, each with a job: page
  title, section title, table text, caption, code. `tabular-nums` on every
  numeric column. Inter only inside LTR islands.
- **A warm neutral enters.** `--a-muted` ≈ `#908b7d` for secondary text and
  captions, so the greys stop reading cold against the green.
- **One accent per screen.** Sage on the primary action and the selected
  state; everywhere else ink. Status colours only on status.
- **Chrome loses weight.** Cards only where they separate concerns; no
  card-in-card; section titles instead of boxed sections; table and filter bar
  share one surface.
- **Rows 36–40 px.** Dense tables are the product. Space between groups, not
  inside cells.
- **States get the brand's illustration vocabulary.** Empty / zero / locked:
  thin sage line drawing, one plain sentence, one action.
- **Motion ≤150 ms, state changes only.**

## 3 · Roadmap — in this order

1. **The system** — type scale, radius, borders and depth, neutral ramp,
   brand block, base button / input / select / chip / table header. Shown on
   two real screens (a dense table, a drawer form). One commit per primitive.
2. The shell — sidebar, top bar, page head, breadcrumbs.
3. The table — header, row density, selection, row actions, pager, empty state.
4. Forms and drawers — field groups, hints, gates, confirmation dialogs.
5. Then screen by screen, by how many hours a day it is open: orders, items,
   deliveries, pricing, purchasing, the rest.

## 4 · Decisions — three lines each, newest last

Format: `### <date> · <piece>` then *was · decided · why*. Append only.

*(empty — the first entry is the system task)*

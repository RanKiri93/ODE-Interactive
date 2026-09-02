# Cross-module consistency audit — 2026-09-02

Scope: all four modules (`phase-plane`, `constant-coefficients-euler`,
`linear-homogeneous`, `function-sequences-series`) plus `app/globals.css`.

**Headline:** the visual inconsistency between modules is real, and it is almost entirely
**phase-plane versus the other three**. The three layered modules are in good shape — their
`MathText`, `DisplayMath` and `mathTypography` copies are byte-identical, so the deliberate
duplication has not drifted. The phase-plane module, being the monolith, never adopted the
math-sizing system at all.

Counts: 1 bug · 5 inconsistencies · 5 drift risks · 2 cosmetic.

## Method and limits

Static analysis only — ripgrep sweeps and source reading. **No rendered output was
inspected.** I did not run the dev server and cannot confirm actual on-screen spacing,
reflow, or whether any of the size differences below are perceptually objectionable. Every
size claim is derived from which CSS rule wins, not from measurement.

Dimension 9 (UI chrome wording) was **not** audited in depth; only the already-known
difficulty-label split is recorded. A wording pass belongs to `hebrew-copy`.

Note: the editor's structured Grep tool silently returns "no matches" on `app/globals.css`
and `app/phase-plane-module.tsx`. All findings here were produced with ripgrep and
PowerShell. Do not re-verify with Grep.

---

## Bugs

### B1 — Four LTR surfaces lack bidi isolation

`direction: ltr` is declared without `unicode-bidi: isolate` at:

| Line | Selector |
| --- | --- |
| 623 | `.formula-input-label` |
| 631 | `.formula-input-label input` |
| 1793 | `.initial-coefficient-input` |
| 2390 | `.math-parameter-input` |

Overall the file has 20 `direction: ltr` against 18 `unicode-bidi`, so coverage is nearly
complete — these four are the gap, and they are all formula or numeric input surfaces,
which is the worst place for it.

Confidence differs across the four. `.formula-input-label` is the wrapper around the
free-formula field in `linear-homogeneous` and genuinely needs isolation: without it the
element's text can still participate in the surrounding RTL run at its boundaries. For the
three that are `<input>` elements the practical risk is lower, since a text input
establishes its own bidi context for its value. Add the property to all four regardless —
it is free, and the rule in `ARCHITECTURE.md` §8 asks for both halves.

---

## Inconsistencies

### I1 — Phase-plane inline math ignores the size tokens

`.math-render` declares **no base `font-size`**; sizes are applied only through
`.math-render[data-variant="…"]` (globals.css 245–262). The phase-plane module's local
`MathText` (phase-plane-module.tsx:1390) renders `<span className="math-render" dir="ltr">`
with no `data-variant`, so its formulas fall through to KaTeX's own default rather than
resolving `--math-size-inline`.

This affects **276 `<MathText>` call sites** — the single largest concentration of
mathematics on the site.

### I2 — Phase-plane has no `DisplayMath` at all

Zero `<DisplayMath>` usages in `phase-plane-module.tsx`. No element in that module ever
receives `.math-display`, so `--math-size-standard` (`clamp(1.28rem, 1.55vw, 1.4rem)`) is
unreachable there. Displayed equations are rendered as inline spans instead.

This is the larger of the two math findings: it is a structural difference in how block
equations are presented, not just a size offset. Fixing I1 without I2 leaves phase-plane
with correctly-sized inline math and still no display math.

### I3 — Four different column ratios for the same three-column layout

All six grids share `gap: 16px`, `max-width: 1540px`, and
`min-height: calc(100vh - 142px)`, but disagree on columns:

| Columns (control / content / analysis) | Grids |
| --- | --- |
| `minmax(250px,310px) minmax(460px,1fr) minmax(240px,300px)` | `.lab-grid`, `.function-series-lab-grid` |
| `minmax(270px,330px) minmax(460px,1fr) minmax(260px,340px)` | `.assembler-grid`, `.equation-assembler-grid` |
| `minmax(260px,320px) minmax(520px,1fr) minmax(260px,340px)` | `.practice-grid` |
| `minmax(260px,320px) minmax(520px,1fr) minmax(280px,360px)` | `.fundamental-activity-grid` |

Control columns span 250–270px minimum, analysis columns 240–280px minimum. Navigating
between modules shifts the side panels, which reads as the page "jumping".

### I4 — Two spellings of the same prop

`MathText` accepts both `variant` and the deprecated `size` alias
(`resolvedVariant = variant ?? size ?? "inline"`). Current usage:

- `size="…"` — **27 occurrences, all in `constant-coefficients-euler`**
- `variant="…"` — **2 occurrences, both in `linear-homogeneous`**

The deprecated spelling is more than ten times as common as the current one. Behaviour is
identical today; the cost is that the deprecation is meaningless and new code has no clear
example to copy.

### I5 — `function-sequences-series` uses neither variant nor `DisplayMath`

Its content components use no `variant`/`size` prop and no `<DisplayMath>` — every formula
renders at the default inline variant. Partly explained by four of five tabs being
placeholders, but it means the newest module is not yet following the layered modules'
conventions, and will bake in the default if built out as-is.

---

## Drift risks

### D1 — Token values re-typed as literals

`rgba(37, 43, 51, 0.16)` appears **9 times** and is exactly `--line`. Similar re-typing
around the shadow value (`rgba(37,43,51,0.12)`, 8×). `#fffdf8` appears **12 times** as a
raised-surface colour and has no token at all despite being pervasive.

### D2 — Colours outside the documented palette

`#b42318`, `#555b58`, `#c38c2c`, `#efe4cf`, `#dcece7`, `#fff` are each used without being
tokens or documented semantic literals. `#b42318` is notable: it is a third red, distinct
from both `--rust` (`#b85735`) and the sanctioned wrong-input `rgba(180,50,50,0.55)`.

Sanctioned literals confirmed present and correct: legend swatches `#2c456b`, `#83aff0`,
`#ff9d00`.

### D3 — Three redeclarations that silently override

| Selector | Lines | Property overridden |
| --- | --- | --- |
| `.analysis-panel` | 171, 2825 | `gap` |
| `.quiz-option` | 709, 770 | `box-shadow` |
| `.segmented-control button` | 376, 412 | `background` |

Eleven other selectors are declared twice with non-overlapping properties, which is normal
progressive layering and needs no action.

### D4 — Two undocumented breakpoints

`ARCHITECTURE.md` §8 documents 1180 / 820 / 680 / 640px. The stylesheet also contains
`@media (max-width: 960px)` (line 1536, `.stability-classification-grid`) and
`@media (min-width: 760px)` (line 1705, `.lambda-option-list`) — the only min-width query
in the file.

### D5 — The size-token verifier does not enforce variants

`scripts/verify-math-size-tokens.mjs` exists but did not catch I1. Whatever it checks, it
does not assert that every `.math-render` carries a `data-variant`.

---

## Cosmetic

### C1 — Verbatim duplicated rule

globals.css 278–288: the same comment, selector
(`.math-formula-row .math-render[data-variant] .katex`) and declaration appear twice in
succession. Exactly one verbatim duplicate exists in the whole file.

### C2 — `.function-series-lab-grid` defined but unused

Already recorded in `ARCHITECTURE.md` as intentional groundwork. No action; listed so the
next audit does not re-raise it.

---

## Work orders

Sequenced. WO-1 and WO-2 both touch the phase-plane `MathText`; do them together.

### WO-1 — Give phase-plane inline math a size variant ✅ done
- **Owner:** `design`
- **Severity:** inconsistency (I1)
- **Files:** `app/phase-plane-module.tsx:1390`, `app/globals.css:245`
- **Problem:** The local `MathText` emits `.math-render` with no `data-variant`, so 276 call sites bypass `--math-size-inline`.
- **Change:** Add `data-variant="inline"` as the default in the local component, with an optional `variant` prop matching the shared `MathText` signature.
- **Done when:** No variantless `.math-render` remains in the module, and inline math measures the same there as in `linear-homogeneous`.
- **Risk:** Formulas get slightly smaller. Check the analysis panel, the legend, and the eigenvalue rows for reflow.

### WO-2 — Introduce display math in the phase-plane module ✅ done
- **Owner:** `design`
- **Severity:** inconsistency (I2)
- **Files:** `app/phase-plane-module.tsx`
- **Problem:** No `DisplayMath`, so `--math-size-standard` is unreachable and block equations are inline spans.
- **Change:** Add a local `DisplayMath` mirroring `app/constant-coefficients-euler/components/DisplayMath.tsx`, then convert standalone block equations — start with the general-solution and eigenvalue formulas around lines 1008–1021 and 3033–3040.
- **Done when:** Block equations in phase-plane render at `--math-size-standard`, matching the other modules.
- **Risk:** This is a judgement call per call site; not every current `MathText` is a block equation. Convert deliberately, not by search-and-replace.
- **Note:** Do not extract a shared component as part of this order. The deliberate duplication is documented; changing it is a separate decision.

### WO-3 — Add bidi isolation to the four LTR surfaces ✅ done
- **Owner:** `design`
- **Severity:** bug (B1)
- **Files:** `app/globals.css:623, 631, 1793, 2390`
- **Change:** Add `unicode-bidi: isolate;` alongside the existing `direction: ltr;`.
- **Done when:** Every block declaring `direction: ltr` also declares `unicode-bidi`.
- **Risk:** Minimal. Verify the formula field in `linear-homogeneous` still shows its live preview correctly with mixed Hebrew labels adjacent.

### WO-4 — Migrate `size=` to `variant=` ✅ done
- **Owner:** default implementing agent
- **Severity:** inconsistency (I4)
- **Files:** 15 files under `app/constant-coefficients-euler/components/`, 27 occurrences
- **Change:** Rename the prop at every call site, then remove the `size` alias and the `MathSize` deprecated type from all three `MathText.tsx` copies and all three `mathTypography.ts` copies.
- **Done when:** `rg -c "size=.(compact|standard|inline)" app` returns nothing, and `npm run typecheck` passes.
- **Risk:** Mechanical, but the three copies must stay byte-identical afterwards — diff them.

### WO-5 — Unify the three-column grid ratios ✅ done
- **Owner:** `design`
- **Severity:** inconsistency (I3)
- **Files:** `app/globals.css:117, 126, 135, 468, 477, 491`
- **Change:** Agree one control/analysis column spec and apply it to all six grids, keeping the content column's `460px` vs `520px` minimum only where a canvas genuinely requires it.
- **Landed spec:** `minmax(270px, 330px) minmax(520px, 1fr) minmax(260px, 340px)` on all six desktop grids. Content floor is 520 everywhere (canvas did not require keeping 460). 1180/820 collapse rules unchanged.
- **Done when:** Side panels do not change width when navigating between modules.
- **Risk:** Highest-risk order here — it moves every module's layout at once. Check all four modules at desktop, 1180px and 820px before accepting.

### WO-6 — Replace re-typed token literals with `var()` ✅ done
- **Owner:** `design`
- **Severity:** drift risk (D1, D2)
- **Files:** `app/globals.css`
- **Change:** Replace the 9 `rgba(37, 43, 51, 0.16)` literals with `var(--line)`. Introduce a token for `#fffdf8` (12 uses) — it is a raised-surface colour with no name. Then triage `#b42318`, `#555b58`, `#c38c2c`, `#efe4cf`, `#dcece7`, `#fff`: promote to tokens, map onto existing ones, or document as sanctioned.
- **Landed:** `--raised: #fffdf8` (12 uses). 8 `var(--line)` border replacements (9th hit is the `:root` definition). `.sample-row input` `#fbf7ed` → `var(--paper)`. Approved triage: `--danger: #b42318` (kept distinct from `--rust`); `#555b58` → `var(--muted)`; document `--gold`, `--paper-deep` (reserved), `--green-soft`; `#fff` on `.polynomial-coefficient-tooltip` is a sanctioned inverse-text literal. Token table in `.agents/design.md` updated; `ARCHITECTURE.md` left for scribe.
- **Done when:** No literal duplicates an existing token value, and every remaining literal is either a legend swatch or documented.
- **Risk:** `#b42318` may be intentional. Ask before collapsing it into `--rust`.

### WO-7 — Resolve the CSS redeclarations ✅ done
- **Owner:** `design`
- **Severity:** drift risk (D3) + cosmetic (C1)
- **Files:** `app/globals.css:171/2825, 709/770, 376/412, 280/286`
- **Change:** For the three overlapping-property pairs, keep the winning declaration and delete the dead one, or merge the blocks. Delete the duplicated block at 286.
- **Landed:** Current lines at edit time were 173/2832, 713/774, 378/414, 282/288. Merged each pair so the property is declared once, keeping the later value: `.analysis-panel` `gap: 12px` (control-panel keeps `14px`); `.quiz-option` `box-shadow: none` (practice-main / practice-large-portrait keep `var(--shadow)`); `.segmented-control button` `background: transparent` (preset-grid buttons keep `var(--raised)`). Deleted the second verbatim `.math-formula-row .math-render[data-variant] .katex` block.
- **Done when:** No selector declares the same property twice, and no verbatim duplicate block remains.
- **Risk:** The later rule currently wins — preserve its value, not the earlier one.

### WO-8 — Extend the size-token verifier ✅ done
- **Owner:** `verifier`
- **Severity:** drift risk (D5)
- **Files:** `scripts/verify-math-size-tokens.mjs`
- **Change:** Assert that every `.math-render` span in the codebase carries a `data-variant`, and that no CSS literal duplicates a `:root` token value.
- **Done when:** The script fails on the pre-WO-1 state and passes after.
- **Depends on:** WO-1, WO-6.
- **Landed:** Kept clamp evaluation; added source checks A (every TSX `.math-render` span has `data-variant`; `inlineMathClassName` helper-only return is ignored) and B (hex/rgba outside `:root` must not equal a token value; `#fff` on `.polynomial-coefficient-tooltip` and legend swatches excluded). In-script self-check reproduces the pre-WO-1 variantless span (I1) and a `--line` rgba retype. `node scripts/verify-math-size-tokens.mjs` exits 0 on the current tree.

### WO-9 — Update `ARCHITECTURE.md` ✅ done
- **Owner:** `scribe`
- **Severity:** drift risk (D4)
- **Change:** §8 breakpoints must include 960px and the 760px min-width query. §7's note that phase-plane has its own `MathText` should record that it also has no `DisplayMath`, if WO-2 does not change that.
- **Depends on:** whichever of WO-1…WO-7 land.

### WO-10 — Hebrew wording consistency pass ✅ done
- **Owner:** `hebrew-copy`
- **Severity:** not assessed
- **Scope:** Dimension 9 was not audited. Start from the known difficulty-label split
  (`קשה` in Euler vs `מתקדם` in linear-homogeneous, recorded in `.agents/glossary.md`),
  then compare action labels across modules.
- **Landed:** practice tab `תרגול`; assemble-equation tab `הרכבת המשוואה`; post-check
  advance `שאלה הבאה`; awaiting-check `ממתינים לבדיקה`; correct status `נכון`; nav
  `aria-label` `ניווט באתר`; answered-count `שאלות`. Third-tier difficulty unified:
  `מתקדם` → `קשה` (key `advanced` unchanged). Action-label table and settled
  difficulty chips (`קל / בינוני / קשה` + `מעורב`) are in `.agents/glossary.md`.

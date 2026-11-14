# Flamescope design system

> **SI flag:** this design system was proposed with SI assistance (Claude, using the frontend-design and design-system skills) and reviewed by the team. The tokens live in `design-tokens.json` and are applied in `web/style.css`.

## Subject, audience, job
- **Subject:** NASA microgravity flame-spread experiments and the cabin atmospheres planned for Moon and Mars crews.
- **Audience:** mission planners, crew-safety engineers, hackathon judges.
- **Job:** find, compare, and trust the evidence, and see where it runs out.

## The one bold element: the evidence map
The hero plots every run that has a recorded oxygen level and pressure, with the Moon and Mars cabin targets drawn as rings.
- **Dot color encodes oxygen.** It runs from flame blue to soot amber, because the SSCE flames went from blue to orange and grew sootier as oxygen rose (passage C-0004).
- **Dot fill encodes verification:** hollow means awaiting a check, filled means verified.
- **A dotted line marks the lowest tested pressure,** so the gap at the lunar atmosphere is visible without reading anything.
- **The headline is computed from the tables** (`web/app.js`), so it can never contradict them.

Everything else stays quiet: neutral chrome, hairline rules, no shadows.

## Color
| Token | Light | Dark | Use |
|---|---|---|---|
| paper | `#f2f4f7` | `#0e1730` | page background (cool lab white, deep chamber navy) |
| surface | `#ffffff` | `#15203d` | panels, inputs |
| ink | `#18233a` | `#e7ebf4` | text |
| ink-2 | `#4b5670` | `#a3aec6` | secondary text |
| rule | `#d6dce6` | `#2a3758` | borders, gridlines |
| flame | `#2d5bd0` | `#86a6ff` | links, focus, SI answers, low-O2 end of the map |
| soot | `#d9902a` | `#f0b45a` | high-O2 end of the map, warnings, unverified |
| ember | `#b0384a` | `#f08a98` | excluded rows, conflicts, uncited targets |
| verified | `#1e7559` | `#6fd3ab` | rows a second person has checked |

The map mixes flame into soot in OKLCH, so mid-range oxygen shows as violet rather than grey. The legend gradient uses the same mix.

## Type
- **Spectral** (serif) for the headline, insight titles, and reading text. It suits evidence that people read closely.
- **IBM Plex Sans Condensed** for the interface, tables, IDs, and numbers. It's condensed so that wide run tables fit, and numbers use tabular figures.
- **Scale:** hero clamps from 26 to 36 px; then 23 / 21 / 17 / 15 / 14 / 12 px. Reading width is about 70 characters.
- **No all-caps labels, no monospace data labels, no single-word accents.**

## Layout
```
Flamescope   Microgravity fire evidence for crews on the Moon and Mars
┌───────────────────────────────┬──────────────────────────────┐
│ Headline (serif, left)        │  Evidence map: O2 × kPa       │
│ Lede                          │  flame-coloured runs,         │
│ Ledger: runs, verified, …     │  Moon and Mars target rings   │
└───────────────────────────────┴──────────────────────────────┘
Ask | Insights | Rank | Runs | Atmospheres | Sources | Evaluation | About & SI use   (sticky)
```
- Left-aligned throughout.
- The hero stacks at 900 px and insight rows stack at 700 px.
- Insights are an evidence list: a status and audience column, then the claim. It is not a card grid.

## Decisions against generic defaults
- **Dropped the terracotta accent** (`#c2410c`) from the first build. It is the default "warm clay" look and has nothing to do with this subject.
- **Dropped identical shadowed rounded cards, `·`-joined meta strings, uppercase badges, and monospace ID pills** for the same reason.
- **Removed a load-in animation on the map dots.** Animating SVG circles left them unpainted in Chromium during testing, so the map is static.

## Quality floor
- Visible keyboard focus.
- Arrow-key navigation between tabs.
- Dark mode via `prefers-color-scheme`.
- No horizontal scroll at 375 px (checked on every tab).
- Text contrast on paper and surface meets WCAG AA for body text.
- Every interactive control is a real `button`, `input`, or `select`.

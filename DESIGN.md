# Flamescope design system

> **SI flag:** this design system was proposed by SI (Claude, using the frontend-design, design-system, and design-taste-frontend skills) at the team's request. The tokens are listed in `design-tokens.json` and applied in `site/src/app/globals.css`. The demo deck (`site/public/deck.html`) mirrors them.

## Subject, audience, job
- **Subject:** NASA microgravity flame-spread experiments and the cabin atmospheres planned for Moon and Mars crews.
- **Audience:** mission planners, crew-safety engineers, hackathon judges.
- **Job:** find, compare, and trust the evidence, and see where it runs out.

## Direction
One dark, uncluttered page. The team asked for a site that is "less cluttered" and "immersive", so the eight tabs of the first build became five scrolling sections, and the supporting material folded into panels in the About section.

- **The hero is a flame without gravity.** A canvas animation shows hot gas drifting out evenly in every direction, with no plume. It is drawn by code and labeled "Illustration, not data".
- **The headline is computed from the tables** (`site/src/components/Dashboard.tsx`), so it can never contradict them.
- **The evidence map** plots every run with a known oxygen level and pressure against the Moon and Mars cabin targets.
  - Dot color encodes oxygen, from flame blue to ember, because the SSCE flames went from blue to orange as oxygen rose (passage C-0004).
  - Dot fill encodes verification: hollow means awaiting a check, filled means verified.
  - A dotted line marks the lowest tested pressure, so the gap at the lunar atmosphere is visible at a glance.

## Color
| Token | Value | Use |
|---|---|---|
| void | `#0b0d12` | page background (never pure black) |
| panel | `#12151c` | panels, inputs |
| raise | `#181c25` | raised chips, active pills |
| line | `#242a37` | borders, gridlines |
| ink | `#e8eaf0` | text |
| mute | `#9aa1b2` | secondary text |
| ember | `#e8913a` | the one accent: buttons, section labels, warnings, high-oxygen end of the map |
| flame | `#5b84e8` | data encoding only: low-oxygen end of the map, SI answer tags |
| ok | `#4fb38a` | verified |
| bad | `#e06c7a` | excluded, conflicts, errors |

The map mixes flame into ember in OKLCH, so mid-range oxygen shows as violet rather than grey.

## Type
- **Geist** for everything readable. Headlines are medium weight with tight tracking; the hero is 3xl to 5xl, kept smaller than a typical landing-page headline.
- **Geist Mono** for numbers, run and passage IDs, and table figures.
- No serif, no all-caps labels. Body text stays under about 65 characters per line.

## Layout
```
            [ Flamescope | Ask  Evidence  Rank  Runs  About | sign out ]   floating glass pill
┌──────────────────────────────┬───────────────────────────┐
│ section label (ember)        │                           │
│ Headline, left-aligned       │   flame canvas            │
│ lede, two buttons, ledger    │                           │
└──────────────────────────────┴───────────────────────────┘
Ask       command bar, example chips, answers | how it works, own-key panel
Evidence  evidence map | insight list with decision filter
Rank      target switch, preview toggle, ranked list | map with the target ringed
Runs      filters, one fold per platform
About     fold-out panels: how it works, SI use, NASA data, references, evaluation, demo, limits
```
- Left-aligned, asymmetric two-column sections that collapse to one column on phones.
- Lists and dividers instead of card grids. Panels are used only for answers and inputs.

## Motion
- Spring easing on reveals, the nav pill, the filter pills, and the citation dialog (Framer Motion).
- The flame canvas pauses when it is off screen.
- `prefers-reduced-motion` turns the flame into a still frame and stops the typewriter, shimmer, and breathing dot.

## Quality floor
- Visible keyboard focus on every control.
- Labels above inputs, inline error text, loading skeletons, and written empty states.
- No horizontal scroll at 375 px (checked on the dashboard).
- A grain texture sits on a fixed, non-interactive layer, so scrolling never repaints it.
- No NASA logos or branding.

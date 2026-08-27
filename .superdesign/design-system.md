# HedgeFlow Product Dashboard Design System

## Product and job
HedgeFlow helps a BTC or ETH holder understand and configure short-duration downside protection using live DreamDEX Event Contracts. The primary job is operational: enter exposure and budget, inspect the proposed hedge and residual loss, then review the underlying contracts. It must feel like a trustworthy risk tool, not a crypto marketing page or speculative trading casino.

## Information hierarchy
1. Compact app header with product name, read-only status, Shannon network state, and future wallet location.
2. Page title no larger than 28px: “Build a downside hedge”. One-line explanatory subtitle.
3. Desktop two-column work area: configuration form at 360–400px left; hedge plan and scenario outcome at right.
4. Full-width live contracts table below, optimized for scanning.
5. Small plain-language risk disclosure at the bottom.

## Visual direction
- Technical editorial fintech, adapted from the Mosaic Grid Architecture style: precise hairline grid, flat panels, strong alignment, useful negative space, and visual explanations.
- Warm paper canvas with deep ink/navy structure; cobalt is the primary action color, coral communicates portfolio loss, and teal communicates hedge protection.
- Use an asymmetric but disciplined 12-column grid. The primary visual is a large scenario graphic showing the unhedged loss being offset by the hedge payout; this can combine a clean portfolio line, a shield/protection band, and labeled outcome bars.
- Add one high-quality product illustration/data visualization in the top work area. It must explain protection or market outcomes—never use a generic crypto coin photograph.
- No green-washed page, oversized 80px headline, empty decorative circle, glassmorphism, neon glow, or poster-like composition.

## Tokens
- Canvas/paper: #f4f1e8
- Primary surface: #fffdf7
- Secondary surface: #e9edf5
- Ink/navy: #111a2e
- Secondary text: #596274
- Muted text: #7e8797
- Border: rgba(17,26,46,.18)
- Primary cobalt: #315efb
- Cobalt hover: #244bd6
- Cobalt soft: #dfe6ff
- Protection teal: #0f9f8f
- Risk coral: #ef6a5b
- Warning gold: #d99b22
- Fonts: Geist Sans; Geist Mono for prices, percentages, market IDs, and timestamps.
- Base font: 14px; labels 12px; page title 26–28px; section title 16–18px.
- Radius: 4px inputs/buttons, 6px cards; no pill cards except tiny status badges.
- Spacing: 4px base grid; 16px card padding; 20–24px major gaps.
- Shadows: none by default; one subtle 0 8px 30px rgba(0,0,0,.18) only for overlays.

## Components
- Header height 60px, deep navy, compact white wordmark, border-bottom; no large logo mark.
- Status badges are compact, 24px high, uppercase optional only for network/read-only state.
- Inputs use visible labels above controls, inline units, and strong keyboard focus states.
- Segmented asset control uses two equal buttons and does not look like a marketing CTA.
- Primary button reserved for “Review hedge”; disabled/read-only state must be explicit.
- Metric cards use small label, mono value, and optional one-line explanation.
- Scenario comparison is the main visual focal point: a crisp editorial chart/illustration with a coral loss area, teal protection band, and labeled residual-loss endpoint. Pair it with a compact three-column numeric comparison: Unhedged loss, hedge payout, residual loss.
- Tables use 40–44px rows, sticky/clear headers, right-aligned numeric columns, and no excessive padding.

## Content constraints
- Call the instrument “DOWN contract” or “downside protection”, not insurance.
- Always show budget, estimated cost, payout if DOWN wins, scenario loss, residual loss/coverage, contract expiry, and live quote freshness.
- Label top-of-book estimates as indicative and disclose missing depth/slippage/fees.
- Transaction execution remains disabled in Phase 0; do not render a fake functional buy button.

## Motion and responsive behavior
- 120–180ms color/border transitions only; no entrance animation.
- At under 900px, stack configuration above plan; table becomes horizontally scrollable.
- At mobile width, preserve labels and numeric alignment; do not collapse critical risks into hidden drawers.

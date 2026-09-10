# Downrail Rebuild Design System

## Product and audience

Downrail helps BTC and ETH holders build short-duration, conditional downside protection using DreamDEX Event Contracts on Somnia. The visitor should understand three things quickly: they keep the underlying asset, a winning DOWN contract can offset part of a loss, and the payout comes from prefunded Event Contract collateral rather than from Downrail.

The landing experience is persuasive and visual. The `/app` route remains the working surface for building plans, reviewing calls, settlement, claims and rollover. The `/docs` route explains the mechanics and risks.

## Primary visual reference

Use the design language of the Spline community scene “Reeded liquid glass — Prism hero section concept” by Krystian Bieda as inspiration, not as a pixel copy.

- A single pale-mint environment fills the opening frame.
- Oversized, calm sans-serif typography carries the hierarchy.
- One dominant refracted-glass object occupies roughly half the frame and creates perceived depth.
- Vertical reeded refraction, blur, distortion and bright green light are the signature motif.
- Copy is short and left aligned; the visual field remains spacious.
- The primary CTA is a deep-forest capsule with acid-lime text and a distinct acid-lime circular arrow target.
- Rounded geometry is concentrated in the hero frame and CTA rather than repeated on every section.

## Downrail interpretation

The refracted object represents market risk passing through a protection rail. A red price movement enters the lens; the other side separates into a bright protection offset and a darker uncovered remainder. The visual must explain this transformation instead of behaving as arbitrary decoration.

Do not present Downrail as a generic crypto dashboard, AI product, insurance company or prediction market. Do not use coin photography, floating glass cards, purple gradients, shield clip-art, decorative grids or a collection of small metric widgets in the hero.

## Palette

- Mint field: `#B0FFB5`
- Deep forest: `#003632`
- Acid lime: `#A7FC00`
- Carbon: `#1E1E1E`
- Soft white: `#F7FFF8`
- Risk red: `#FF513F`
- Secondary mint: `#80E99A`
- Muted forest: `#38645E`

The first viewport is mint-led. Use carbon for grounding sections and risk red only for negative market movement. Acid lime is reserved for actions, winning offsets and live-state emphasis.

## Typography

- Geist Sans throughout; Geist Mono only for prices, percentages, market IDs, timestamps and transaction fingerprints.
- Hero headline: 76–112px desktop, 52–68px mobile, regular-to-medium weight, very tight tracking, compact line height.
- Section headlines: 48–72px desktop, 36–48px mobile.
- Main body copy: 17–20px with generous line height.
- Labels and metadata: 12–14px; never smaller than 12px.
- Avoid uppercase paragraph copy. Use uppercase sparingly for status and compact overlines.

## Page architecture

### Opening frame

Full-viewport mint composition. Left side: concise product statement and one primary CTA. Right side: dominant refracted risk object integrated into the canvas, not inside a card. The Downrail logo remains visible but quiet. The first screen must say what the product does, not merely create atmosphere.

Preferred headline direction: “Stay in the position. Put a rail under the fall.” Supporting copy should mention BTC/ETH, DreamDEX Event Contracts and bounded spend without explaining every feature.

### Protection demonstration

A large interactive story rather than a standard calculator card. The visitor drags a market-fall control. Show the underlying position falling, the conditional DOWN payout, the hedge cost and remaining loss. Keep these values visually connected in one composition.

### Human story

Use one concrete scenario: Maya has $1,000 of ETH, pays $10, the selected DOWN contract pays $20 if it wins, and a 10% ETH drop becomes a $90 combined loss after cost and payout. Also show the losing-condition branch briefly and honestly.

### Source of payout

Explain prefunded collateral as a clear flow: participants fund the Event Contract market, the market settles, the winning outcome receives collateral. Explicitly state that Downrail does not create or guarantee the payout.

### Product proof

Show the real workflow: live DreamDEX depth, bounded spend, exact wallet-call review, transaction receipts, settlement, claim and rollover. Prefer one continuous rail or timeline over a grid of generic feature cards.

### Final action

Return to the mint/forest language with the same capsule CTA. Offer `/app` as primary and `/docs` as secondary.

## Components and shape

- Primary CTA: 60–68px tall deep-forest capsule, left-aligned acid-lime label, 48–54px acid-lime circular arrow target, small rotational arrow response on hover.
- Secondary links: plain forest text with a small arrow; no outlined pill by default.
- Content surfaces: mostly open canvas separated by color fields, spacing and typography. Use a card only when the content is genuinely self-contained.
- Borders: sparse, one-pixel forest at 16–24% opacity.
- Corners: 22–28px for major canvas frames, full radius for CTA, 8–12px for functional controls.
- Shadows: broad and soft only under the refracted hero object or floating functional controls.

## Motion

- The refracted object should respond slowly to pointer movement or scroll with subtle depth.
- Vertical reeds can shift 4–10px to reveal altered content behind them.
- Controls use 160–220ms transitions.
- Avoid constant floating, particle effects, spinning objects and large entrance animations.
- Respect reduced-motion preferences and preserve the same information without animation.

## Content and trust constraints

- Say “DOWN contract,” “downside protection,” or “conditional hedge”; never call it insurance.
- Never imply guaranteed coverage or profit.
- Keep the distinction between portfolio loss and selected market condition explicit.
- State that live liquidity, fills, fees and market settlement determine actual outcomes.
- Never use decorative slash-number section labels. Numbering is only for a genuinely ordered process.
- No emojis. Use Lucide icons or product-specific data visuals.
- Use the real Downrail logo in every logo position; never substitute initials or a generic mark.

## Responsive behavior

- Preserve the refracted object as a meaningful visual on mobile; move it beneath the main message rather than removing it.
- Keep the CTA thumb-friendly and at least 52px tall.
- Collapse the protection demonstration into a vertical money flow while retaining all critical values.
- Avoid horizontal overflow and maintain at least 18px side padding.

# Extractable Components

There are no mature shared layout components yet. The current navigation, status panel, market table, and footer are embedded in `src/app/page.tsx` and should be redesigned before extraction.

## HedgePreview
- Source: `src/components/hedge-preview.tsx`
- Category: basic
- Description: Interactive single-leg hedge estimator with asset, exposure, budget, and scenario controls.
- Extractable props: markets
- Hardcoded: BTC/ETH labels, Phase 0 disclosure, output metrics
- Decision: do not extract to Superdesign; it is page-specific and should remain inline in the first dashboard redesign.


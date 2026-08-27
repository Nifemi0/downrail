# Theme

## Compact token summary
- Framework: Next.js 16 App Router, React 19, custom vanilla global CSS.
- Current palette: near-black green backgrounds, pale mint text, bright mint accent, muted gray-green borders and text.
- Typography: Geist Sans for interface text; Geist Mono for market identifiers and numeric details.
- Shape: mostly 14–24px rounded cards, pill controls, thin translucent borders.
- Layout: max-width centered page with large editorial hero followed by full-width planner and market table.
- Breakpoints: responsive rules embedded in the global stylesheet.

## Raw global stylesheet

```css
@import "tailwindcss";

:root { --ink:#effff7; --muted:#91a99e; --line:rgba(154,255,205,.14); --mint:#73f6b2; --mint-strong:#28d984; --amber:#ffd27a; --background:#06100d; --foreground:var(--ink); }
@theme inline { --color-background:var(--background); --color-foreground:var(--foreground); --font-sans:var(--font-geist-sans); --font-mono:var(--font-geist-mono); }
* { box-sizing:border-box; }
html { scroll-behavior:smooth; }
body { margin:0; background:radial-gradient(circle at 78% 4%,rgba(39,217,132,.12),transparent 29rem),radial-gradient(circle at 10% 34%,rgba(255,210,122,.07),transparent 25rem),var(--background); color:var(--foreground); font-family:Arial,Helvetica,sans-serif; }
button,input { font:inherit; }
a { color:inherit; text-decoration:none; }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }

.topbar { position:sticky; top:0; z-index:20; display:flex; align-items:center; justify-content:space-between; min-height:72px; padding:0 5vw; border-bottom:1px solid var(--line); background:rgba(6,16,13,.78); backdrop-filter:blur(20px); }
.brand { display:inline-flex; align-items:center; gap:12px; font-size:1.05rem; font-weight:720; letter-spacing:-.03em; }
.brand-mark { display:grid; width:34px; height:34px; place-items:center; border:1px solid rgba(115,246,178,.5); border-radius:11px; background:linear-gradient(145deg,rgba(115,246,178,.2),rgba(115,246,178,.02)); color:var(--mint); font-family:var(--font-geist-mono),monospace; }
.network-chip,.phase-pill { display:inline-flex; align-items:center; gap:8px; border:1px solid var(--line); border-radius:999px; color:var(--muted); font-size:.72rem; letter-spacing:.06em; padding:8px 12px; text-transform:uppercase; }
.status-dot { width:7px; height:7px; border-radius:50%; background:#67736d; }
.status-dot.live { background:var(--mint-strong); box-shadow:0 0 12px rgba(40,217,132,.8); }
.page-shell { width:min(1180px,90vw); margin:0 auto; }

.hero { display:grid; grid-template-columns:1.45fr .55fr; gap:clamp(3rem,8vw,8rem); align-items:center; min-height:710px; padding:90px 0 70px; }
.eyebrow { margin:0 0 18px; color:var(--mint); font-family:var(--font-geist-mono),monospace; font-size:.72rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; }
.hero h1 { max-width:760px; margin:0; font-size:clamp(4rem,8vw,7.6rem); font-weight:580; letter-spacing:-.075em; line-height:.89; }
.hero h1 span { display:block; color:transparent; background:linear-gradient(105deg,var(--mint) 0%,#d2ffe8 52%,var(--amber) 112%); background-clip:text; }
.hero-text { max-width:650px; margin:32px 0 0; color:var(--muted); font-size:clamp(1rem,1.6vw,1.25rem); line-height:1.65; }
.hero-actions { display:flex; align-items:center; gap:24px; margin-top:38px; }
.primary-action { border-radius:10px; background:var(--mint); color:#062116; font-size:.9rem; font-weight:760; padding:14px 19px; transition:transform 180ms ease,box-shadow 180ms ease; }
.primary-action:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(40,217,132,.22); }
.text-action { color:#c6d9d0; font-size:.9rem; }

.hero-metric { justify-self:end; width:min(100%,300px); }
.metric-orbit { display:grid; width:240px; height:240px; margin-left:auto; place-items:center; border:1px solid rgba(115,246,178,.22); border-radius:50%; background:radial-gradient(circle,rgba(115,246,178,.08) 0 36%,transparent 37%),conic-gradient(from 110deg,var(--mint-strong),transparent 20%,transparent 78%,var(--amber)); padding:1px; }
.metric-orbit>div { display:grid; width:98%; height:98%; place-content:center; border-radius:50%; background:#081611; text-align:center; }
.metric-orbit strong { font-size:2.15rem; letter-spacing:-.05em; }
.metric-orbit span { margin-top:5px; color:var(--muted); font-size:.72rem; }
.hero-metric ul { display:grid; gap:12px; margin:28px 0 0; padding:0; color:#c9ddd3; font-size:.82rem; list-style:none; }
.hero-metric li span { display:inline-block; width:22px; color:var(--mint); }
.hero-metric li.pending,.hero-metric li.pending span { color:#62756b; }

.planner-card,.markets-section { border:1px solid var(--line); border-radius:22px; background:linear-gradient(145deg,rgba(15,39,32,.82),rgba(8,22,18,.9)); box-shadow:0 34px 90px rgba(0,0,0,.23); overflow:hidden; }
.section-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:2rem; padding:28px 32px; border-bottom:1px solid var(--line); }
.section-heading .eyebrow { margin-bottom:9px; }
.section-heading h2 { margin:0; font-size:clamp(1.6rem,3vw,2.25rem); font-weight:620; letter-spacing:-.045em; }
.planner-grid { display:grid; grid-template-columns:1fr 1fr; }
.input-stack,.result-panel { min-height:390px; padding:34px 32px; }
.input-stack { display:grid; gap:25px; border-right:1px solid var(--line); }
.input-stack label { display:grid; gap:9px; color:var(--muted); font-size:.78rem; }
.asset-switch { display:grid; grid-template-columns:repeat(2,1fr); gap:7px; margin:0; padding:5px; border:1px solid var(--line); border-radius:12px; }
.asset-switch button { border:0; border-radius:8px; background:transparent; color:var(--muted); cursor:pointer; padding:11px; }
.asset-switch button.active { background:rgba(115,246,178,.12); color:var(--mint); }
.money-input { display:flex; align-items:center; gap:9px; border-bottom:1px solid rgba(145,169,158,.35); color:var(--mint); font-size:1.4rem; }
.money-input input { width:100%; border:0; outline:0; background:transparent; color:var(--ink); font-size:1.45rem; padding:8px 0; }
.range-row { display:flex; align-items:center; gap:18px; }
.range-row input { flex:1; accent-color:var(--mint-strong); }
.range-row strong { min-width:52px; color:var(--ink); font-size:1.1rem; }
.result-panel { display:grid; align-content:center; background:radial-gradient(circle at 50% 30%,rgba(115,246,178,.09),transparent 55%); }
.result-kicker { margin:0 0 8px; color:var(--muted); font-size:.78rem; text-transform:uppercase; }
.coverage-value { display:flex; align-items:flex-end; gap:13px; margin-bottom:30px; }
.coverage-value strong { color:var(--mint); font-size:clamp(3rem,6vw,5rem); letter-spacing:-.08em; line-height:1; }
.coverage-value span { max-width:90px; margin-bottom:7px; color:var(--muted); font-size:.72rem; line-height:1.3; }
.result-list { display:grid; gap:13px; margin:0; }
.result-list div { display:flex; justify-content:space-between; gap:1rem; padding-bottom:11px; border-bottom:1px solid var(--line); }
.result-list dt { color:var(--muted); font-size:.76rem; }
.result-list dd { margin:0; font-family:var(--font-geist-mono),monospace; font-size:.78rem; }
.empty-result { max-width:340px; margin:0 auto; text-align:center; }
.empty-result>span { color:var(--mint); font-size:3rem; }
.empty-result h3 { margin:14px 0 8px; }
.empty-result p,.planner-note { color:var(--muted); font-size:.78rem; line-height:1.6; }
.planner-note { margin:0; padding:16px 32px; border-top:1px solid var(--line); background:rgba(0,0,0,.12); }

.markets-section { margin-top:90px; }
.refresh-note { margin:5px 0 0; color:var(--muted); font-family:var(--font-geist-mono),monospace; font-size:.7rem; }
.market-row { display:grid; grid-template-columns:.65fr .75fr 1fr 1fr 1.4fr; align-items:center; gap:18px; min-height:62px; padding:0 32px; border-bottom:1px solid var(--line); color:#d8ebe2; font-size:.82rem; }
.market-row:last-child { border-bottom:0; }
.market-header { min-height:45px; color:#60776c; font-size:.66rem; letter-spacing:.08em; text-transform:uppercase; }
.asset-badge { width:fit-content; border:1px solid var(--line); border-radius:7px; font-family:var(--font-geist-mono),monospace; font-weight:700; padding:6px 9px; }
.asset-badge.btc { color:var(--amber); }
.asset-badge.eth { color:#a4b9ff; }
.quote-value { color:var(--mint); font-weight:700; }
.mono { color:var(--muted); font-family:var(--font-geist-mono),monospace; font-size:.72rem; }
.feed-error { padding:32px; color:#ffb8a7; }
.feed-error p { margin-bottom:0; color:var(--muted); }

.principles { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; margin:90px 0; border:1px solid var(--line); border-radius:18px; background:var(--line); overflow:hidden; }
.principles article { min-height:220px; padding:30px; background:#081612; }
.principles article>span { color:var(--mint); font-family:var(--font-geist-mono),monospace; font-size:.72rem; }
.principles h3 { margin:45px 0 10px; font-size:1.25rem; }
.principles p { margin:0; color:var(--muted); font-size:.84rem; line-height:1.55; }
footer { display:flex; justify-content:space-between; gap:2rem; padding:28px 0 42px; border-top:1px solid var(--line); color:#667a70; font-size:.72rem; }
footer p { margin:0; }

@media (max-width:850px) { .hero { grid-template-columns:1fr; min-height:auto; padding-top:100px; } .hero-metric { justify-self:start; } .metric-orbit { margin-left:0; } .planner-grid,.principles { grid-template-columns:1fr; } .input-stack { border-right:0; border-bottom:1px solid var(--line); } .market-row { grid-template-columns:.6fr .7fr 1fr 1fr; } .market-row>:last-child { display:none; } }
@media (max-width:560px) { .network-chip { font-size:0; } .network-chip::after { content:"Testnet"; font-size:.7rem; } .hero h1 { font-size:3.7rem; } .hero-actions,footer { align-items:flex-start; flex-direction:column; } .section-heading,.input-stack,.result-panel,.planner-note { padding-left:20px; padding-right:20px; } .market-row { grid-template-columns:.6fr .8fr 1fr; padding:0 20px; } .market-row>:nth-child(4) { display:none; } }

```


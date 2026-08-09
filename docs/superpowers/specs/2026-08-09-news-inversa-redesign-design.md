# News page redesign — Inversa-inspired direction

**Status:** Approved (validated iteratively via live Artifact mockups). Scope: `news.html` only — no other site pages.

## Context

The News page (`news.html`) was rebuilt earlier as a scrollytelling page reusing the portfolio site's `cs-hero` / `cs-section` / `story-scrolly` component language. The user felt the overall site (and News specifically) was too plain/cold and didn't feel "senior" given the underlying work (GIS/urban planning analysis). Reference: [inversa.com](https://inversa.com) (built by Exo Ape) — a dark, cinematic, instrument-panel-style site for an ecology/tech company.

Three visual directions were pitched (Cartographic Editorial, Studio Dark, Warm Paper). The user chose to extend **Studio Dark** with Inversa's specific visual/interaction vocabulary, scoped to News only.

## Design language (validated via 4 rounds of live Artifact mockups)

**Palette (single-theme, dark-only — deliberate, not an oversight):**
- `--bg:#0b0c0e` `--surface:#111316` `--surface-2:#171a1e`
- `--ink:#f0eee7` `--ink-soft:#a9a59b` `--muted:#6b6862`
- `--line:rgba(240,238,231,.10)` `--line-strong:rgba(240,238,231,.20)`
- `--accent:#8fe0c4` (mint/teal — signal color) `--accent-ink:#b6f0da` `--accent-soft:#132623`
- `--warn:#e0a06a` (used for rupiah/negative-leaning readouts)

**Type:** `--mono` (ui-monospace) for HUD labels, counters, timestamps, category tags — this is the "instrument" voice. `--display` (system sans, bold/tight tracking) for headlines and KPI numerals. Body copy stays a plain system sans.

**Nav:** minimal — wordmark + 1-2 links, no heavy chrome.

**Hero:** HUD readout strip (live ticker figures: USD/IDR, IHSG, S&P 500 — monospace, small caps labels, pulsing "live" dot) sits above a large bold headline. Chapter index below styled as a bordered pill-row menu ("01 International", "02 National", …), not prose links.

**Card grid** (International/National/Economy/Solutions): no drop shadows, no rounded corners — thin hairline borders between cells (grid-line layout, cells share 1px lines rather than individual card borders). Photos get a subtle grayscale/contrast treatment. A small monospace index tag ("001 / 08") sits on the image. Category + source in monospace uppercase. Fact-check status shown as a small colored dot + one-line caption, not a big colored badge pill.

**Scrollytelling panels** (MBG, Currency, Markets, Connect the Dots): same sticky-panel + numbered-step mechanism already built (`bindNewsStory` in `news.js`, IntersectionObserver-driven), restyled:
- Sticky "stage" panel is a **photograph with a gradient scrim**, not a flat color card. The photo **crossfades per step** (each step declares which image is active). Text (counter, KPI, label, note) sits on top of the scrim, right-aligned bottom.
- The big KPI number **tweens** on step change (150ms fade-out → swap text → fade-in) rather than snapping instantly.
- A thin **segmented progress bar** (one segment per step) fills left-to-right as steps activate — replaces the old dot-progress indicator.
- Currency's panel keeps its live converter + gauge as the "instrument" (no photo swap needed — the tool itself is the visual).
- MBG and Connect the Dots panels get per-step photos reusing images already sourced for their respective news cards (Kemenkeu seal, BGN logo, Kejaksaan Agung insignia, MBG documentation photo for MBG; Hormuz satellite, Zelensky portrait, NYSE, Nasdaq Tower, Kompas rupiah/IHSG illustrations for Connect the Dots, reused from the International/Economy cards where the same events are covered).

**Images:** must be embedded as real, working URLs at a validated Wikimedia thumbnail bucket size (Wikimedia only serves a fixed whitelist of widths — verified 960/1280/1920px work, arbitrary widths like 700/800/1000px 400-error). Prefer 1280px source width for story-panel hero photography (sharp at typical panel render size); existing 330px thumbnails already used in the card grid stay as-is (small enough there to not show blur).

## Fixed bugs from mockup iteration (must not regress)

1. **Sticky-panel stacking order.** The sticky "stage" panel must have an explicit `z-index` higher than the scrolling step-text column, and the step column must not be given a z-index that beats it — otherwise step text visually paints over the panel as it scrolls past (confirmed bug, screenshot: "tulisan tertimpa tulisan").
2. **No competing sticky elements near the top of the same section.** Any instructional/sticky banner placed above a story-scrolly section must not remain `position:sticky` once the section is live — a sticky banner with a higher z-index than the stage panel will cover the top of the panel while both are pinned (confirmed bug: "gambar... tertutup").
3. **Only use validated Wikimedia thumbnail widths** (960/1280/1920 confirmed working for the two Wall St. photos already in use; test before trusting any new width).

## Non-goals

- Not touching Home, About, Portfolio, Contact, 404, or the five project case-study pages — those remain the existing light/dark editorial system.
- Not redoing the Urban & Regional Planning / GIS reference chapter's content — only its visual skin, applied consistently with the rest of News.
- Not adding video/WebGL atmosphere (Inversa uses heavy video backgrounds) — kept to CSS-only motion for load performance, per user's implicit preference for the site staying fast (GitHub Pages, no build step).

## Implementation plan

1. Extend `news.css` with the new dark-only HUD tokens and components (hero HUD strip, chapter index pills, grid-line card style, stage photo+scrim+tween).
2. Extend `news.js`: image-crossfade-per-step (swap `img.on` class keyed by `data-step`), numeric tween on KPI/label/note change, segmented progress bar fill.
3. Rewrite `news.html` hero and all four card-grid sections (International, National, Economy, Solutions) in the new card markup.
4. Add per-step photo sets to the MBG, Markets, and Connect the Dots `story-scrolly` blocks (Currency keeps its converter/gauge, no photos).
5. Verify locally (local static server + browser), then commit and push to `main` (GitHub Pages auto-deploys).

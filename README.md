# ✅ Implemented — The Solar System (interactive orrery)

This design has been built as a standalone static site (vanilla HTML/CSS/JS + Three.js).

**Run it:** open `index.html` in any modern browser — no build step, no server required.
(Optionally serve it, e.g. `python3 -m http.server`, then visit the page.)

**Layout:**
- `index.html` — page structure (header, legend, controls, info panel, ticker, canvas mounts)
- `styles.css` — all chrome styling, ported 1:1 from the prototype
- `src/data.js` — the 12 bodies (Sun → Pluto, Moon, asteroid belt) with miles/°F stats + blurbs
- `src/facts.js` — the rotating quote/fact pool
- `src/ui.js` — state + DOM rendering for legend, play/pause, speed, panel, ticker
- `src/scene.js` — the full Three.js scene (textures, orbits, atmospheres, bloom, shadows, stars, etc.)
- `src/main.js` — boot wiring
- `vendor/three/` — Three.js r128 + post-processing addons, vendored locally (no CDN)

The original design bundle is preserved untouched under `project/` and `chats/`.

---

# CODING AGENTS: READ THIS FIRST

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do — IMPORTANT

**Read the chat transcripts first.** There are 1 chat transcript(s) in `chats/`. The transcripts show the full back-and-forth between the user and the design assistant — they tell you **what the user actually wants** and **where they landed** after iterating. Don't skip them. The final HTML files are the output, but the chat is where the intent lives.

**Read `project/Solar System.dc.html` in full.** The user had this file open when they triggered the handoff, so it's almost certainly the primary design they want built. Read it top to bottom — don't skim. Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `README.md` — this file
- `chats/` — conversation transcripts (read these!)
- `project/` — the `Interactive 3D Solar System` project files (HTML prototypes, assets, components)

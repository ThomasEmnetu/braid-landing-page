# Braid landing page

**Site:** https://thomasemnetu.github.io/braid-landing-page/

**Repository:** https://github.com/ThomasEmnetu/braid-landing-page

A focused product preview for Braid: shared AI coding sessions with branching
and a visible conversation history. The source repository is public, as approved
by the owner, and the static site is deployed with GitHub Pages.

**Email signup is not connected yet.** The forms validate input but do not send
or store addresses. See [OPEN_ITEMS.md](./OPEN_ITEMS.md) for the decisions,
implementation work, and acceptance criteria needed for real end-to-end capture.

## Run locally

From the directory containing this README, using Node.js 24 LTS:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5174/. No credentials, database, demo server, or external
services are needed to view the site.

```sh
npm run build
npm run preview
```

The static output is `dist/`. Stop the development server before starting preview,
since both use port 5174.

## Deployment

`.github/workflows/pages.yml` builds and deploys pushes to `main`, and can also be
run with **Actions > Deploy GitHub Pages > Run workflow**. Repository Pages
settings use **GitHub Actions** as the publishing source.

Only `dist/` is published. Environment files, capture scratch space, dependencies,
test output, and source-development artifacts are ignored or excluded from the
deployment artifact.

GitHub Pages cannot run a signup API. Keep the preview notice until a separately
hosted, approved backend genuinely persists addresses. Do not put service keys
in browser code or `VITE_*` variables.

## Product and content boundaries

[PRODUCT_SCOPE.md](./PRODUCT_SCOPE.md) documents the MVP feature and retention
claims. The original [landing brief](./landing-page.md) is also retained.

The page deliberately avoids fabricated counts, customer logos, testimonials,
or finalized retention promises. Product previews use simulated demo data.
Merging in v1 is a branch-outcome summary posted to the parent session; actual
code review and merging remain in GitHub.

The visible copy is intentionally minimal. Preserve useful headings, short
explanations, necessary privacy/preview notices, and accessible motion controls.
Do not reintroduce repeated overlines, tiny numbered labels, or decorative
captions under every visual.

## Product media

The committed media and textures are derived from the actual Braid demo UI,
originally at source commit `93526d9`; they are not unrelated mockups.

| Asset | Purpose |
| --- | --- |
| `branch-map` | Main chat, Branch map click, token-bucket selection, full branch conversation |
| `live-session` | A real demo prompt followed by a streamed agent reply |
| `branch-session` | Fork an agent reply, name the branch, and continue in its new chat |
| `media/scenes/` | Actual UI textures for the dimensional branch and human-ping compositions |
| `branch-detail`, `teammate-ping` | Retained alternate recordings, not duplicated on the page |

Desktop and mobile films have separate camera edits. The capture pipeline uses
3x lossless source frames, lossless intermediates, and a final silent H.264 encode.
Loops return to their genuine first frame rather than cutting to black.

The hero starts on page load without visible player controls. If a browser
declines native autoplay, the same film runs as a compact animated AVIF.
Browsers without animated AVIF support receive a full-frame WebP version.
The compatibility frames are independently encoded, avoiding the lossy
delta/blend corruption that previously appeared during zooms. Only the needed
format is fetched; no browser or operating-system settings are changed.
A keyboard-focus-only background motion stop remains available.

The dimensional branch scene uses real card textures, native 3D transforms, and
connectors measured from the actual projected card ports. Its motion is
coordinated rather than driven by a separate, guessed SVG layout. Both
illustrations support pause/replay, mobile layouts, and reduced-motion settings.

## Optional asset regeneration

Building or deploying the site does **not** require the original demo.
Recapturing product UI does: run that demo separately, then point these scripts
at it. The source demo is intentionally not bundled into this marketing repo.

```sh
DEMO_SOURCE_DIR=/absolute/path/to/the/original/demo \
DEMO_URL=http://127.0.0.1:4179 npm run capture:demo -- branch-map

DEMO_SOURCE_DIR=/absolute/path/to/the/original/demo \
DEMO_URL=http://127.0.0.1:4179 npm run capture:scenes
```

When a known demo is already served elsewhere, `DEMO_SOURCE_REVISION` can provide
its exact source revision instead of a local checkout. Do not invent that value.
In the original multi-project workspace, the sibling `../demo` is detected.

Capture uses the existing Playwright Chromium runtime and FFmpeg. Install a
browser only if Playwright reports it missing. `STUDIO_OUTPUT` can stage new
films elsewhere before replacing committed media.

To rebuild only the ambient fallback from the committed hero MP4s:

```sh
npm run capture:ambient
```

`media-manifest.json` and `scene-manifest.json` record dimensions, revisions,
durations, and source provenance. Temporary capture files live in ignored
`.capture/` and are removed after encoding.

## Development commands

```sh
npm run typecheck
npm run test:e2e -- --project=chromium
npm run build
LANDING_PREVIEW=1 npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=webkit
```

The runner starts its own server on port 4181 and uses one worker so real media
timing does not compete for a decoder. Install the corresponding Playwright
browser if the runner reports it missing.

Coverage includes automatic repeat playback, moving fallback frames, projected
branch connections, responsive layouts, native scene controls, and the explicit
non-capturing form boundary. Standard feature-video autoplay remains subject to
browser policy; the hero has an automatic moving fallback.

## Code map

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Page structure and product copy |
| `src/components/WaitlistForm.tsx` | Shared form and current preview boundary |
| `src/components/AmbientProductMedia.tsx` | Unobstructed hero playback and animated fallback |
| `src/components/ProductMedia.tsx` | Standard feature-film controls |
| `src/components/useVideoPlayback.ts` | Native playback lifecycle and recovery |
| `src/components/ProductScenes.tsx` | Dimensional branch and ping compositions |
| `src/components/useBranchConnections.ts` | Projected, continuously attached branch paths |
| `src/components/useSceneMotion.ts` | Native animation lifecycle and accessibility |
| `src/content.css` | Readable, minimal page typography |
| `scripts/` | Reproducible media capture and encoding |

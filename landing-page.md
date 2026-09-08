# Landing Page Build Brief

## Multiplayer AI Coding Environment — Marketing Site + Waitlist

## Status of This Document & Build Order

This brief assumes two things already exist in this workspace and should be referenced directly:

1. **The demo build** (mocked-data interactive demo, built from `multiplayer-ai-demo-spec.md`) — pull real visuals/clips/screenshots from this. Do not invent new UI mockups from scratch if the demo already has a polished version of that UI.
1. **The MVP PRD** (`multiplayer-ai-mvp-prd.md`) — use this for accurate feature descriptions, positioning, and the data-retention stance. The landing page’s copy should describe the real product vision, not the simplified demo narrative.

Reference model: **rogo.com** — a marketing site for an AI product in a technical/enterprise-adjacent space, using short, looping, zoomed-in product video snippets to communicate specific features rather than long demo walkthroughs or generic stock imagery. Match that general approach: real product visuals, credible/technical tone, no vague AI-hype language.

-----

## 1. Goals of This Page

1. **Primary goal: waitlist signups.** This is the top priority. The page exists to convert visitors — engineers, potential early customers, and eventually YC reviewers — into real waitlist signups with real email addresses.
1. **Secondary goal: credibility.** Communicate that this is a serious, thoughtfully-built product for engineers, not a generic AI wrapper. Tone should read as technical and confident, not hypey or consumer-flashy.
1. **Tertiary goal: company narrative.** Briefly communicate mission/values (see Section 5) — useful both for visitors and for anyone (including YC) evaluating the company, not just the product.

**Non-goal**: this is not meant to explain every feature in exhaustive detail. It’s a funnel, not documentation.

-----

## 2. Required Sections

### 2.1 Hero

- Clear, specific headline — avoid generic AI-startup phrasing (“The future of X,” “AI-powered Y”). Should communicate the actual differentiator: AI coding sessions that teams work in together, live, with the ability to branch and merge like git.
- Subheadline: one sentence expanding on the problem this solves (isolated single-player AI chat vs. shared team sessions).
- A looping, zoomed-in video snippet (silent, autoplay, muted, looped) showing the **branch visualizer** — this is the single most differentiated visual asset from the demo build and should be the hero’s centerpiece, not buried further down the page.
- Primary CTA: waitlist signup (email input + submit button), visible without scrolling.

### 2.2 Problem Framing (short)

- 2–3 sentences, not a full essay: today, AI coding agents are single-player; teams end up with isolated chats and read-only transcript links instead of real collaboration. Keep this tight — this is a landing page, not a blog post.

### 2.3 Feature Showcase (the core of the page)

Structure as 3–4 distinct sections, each with a short headline, 1–2 sentence description, and a looping/zoomed video snippet or high-quality screenshot pulled from the demo build:

1. **Live multiplayer sessions** — multiple engineers, one shared AI agent, real-time.
1. **Branching** — fork a session from any point to explore an idea without disrupting the team; this and the visualizer are the two features that should get the most visual real estate on the page.
1. **Visualizer** — the branch/session tree view; reiterate here even though it’s also in the hero, since it’s the strongest asset — a second, more detailed look at it (e.g. zoomed into the summary labels, hover states) reinforces the differentiation.
1. **(Optional, if a clean asset exists from the demo)** Tagging/mentions — keep this brief, one line, don’t oversell it as a hero feature — it wasn’t the hero feature in the demo either and shouldn’t become one here.

Each section: video/screenshot on one side, short copy on the other (alternate left/right per section for visual rhythm, common and effective pattern for feature showcases).

### 2.4 Company / Mission Section

Short section (not a full “About” page) covering:

- **Why this exists**: reference the broader thesis briefly — AI hasn’t had its multiplayer moment yet, the way docs/design tools did — without repeating the full problem framing from 2.2 verbatim.
- **Values**, stated plainly and specifically rather than as vague buzzwords. At minimum, include:
  - **Data handling / zero-retention stance**: state clearly and specifically what the product does and doesn’t retain, per the MVP PRD’s data posture (Section 4.5 of the PRD). Do not write vague “we take security seriously” copy — be specific enough to be credible to an engineering audience (e.g. what’s stored, for how long, what’s deletable). If exact retention policy details aren’t finalized yet, write this section honestly as a stated commitment/direction rather than overclaiming specifics that aren’t true yet — this matters for credibility with both users and YC.
  - Any other values genuinely held (e.g. built by engineers for engineers, design-led product philosophy) — keep this to 2–3 values max, specific over generic.

### 2.5 Waitlist Signup (primary conversion point)

- A real, functioning signup form — email input, submit, confirmation state. This must actually collect and store real email addresses (e.g. into a simple database, Airtable, or an email service provider’s list) — **not a fake/decorative form**. This is a hard requirement: the whole point of the waitlist is to be able to honestly cite real signup numbers later (including in a YC application), so the form must genuinely work end-to-end.
- Repeat the signup CTA at both the top (hero) and bottom of the page at minimum — standard, effective pattern for conversion-focused pages.
- Optional but recommended: after signup, show a simple live or periodically-updated count (“Join 240 engineers on the waitlist”) once real numbers exist — do not fabricate a starting number; start at the real count (even if small) and let it grow honestly.

### 2.6 Footer

- Standard: company name, minimal nav (if other pages exist), contact/social links if applicable. Keep minimal — this is a single-page funnel, not a full marketing site with multiple pages, unless there’s a clear reason to expand later.

-----

## 3. Visual & Tone Direction

- **Reuse the demo’s visual language** where possible (dark-mode-first, clean sans-serif + monospace-for-code aesthetic, restrained accent colors) — see `multiplayer-ai-demo-spec.md` Section 6 for the original direction. The landing page and product should feel like the same product family, not two unrelated designs.
- Tone: confident, specific, technical. Write for an engineering audience that is skeptical of AI hype — avoid superlatives (“revolutionary,” “game-changing”) in favor of concrete, specific claims about what the product actually does.
- Video snippets should be genuinely zoomed/cropped to specific interactions (per the rogo.com reference model), not full-screen unedited recordings of the whole demo — e.g. a tight loop of just the branch-visualizer hover/summary interaction, not the entire session view.

-----

## 4. Technical Requirements

- Real, working waitlist form with actual data capture (see 2.5) — this is the one non-negotiable functional requirement on an otherwise mostly-static marketing page.
- Should be fast-loading and mobile-responsive — a meaningful share of traffic (social shares, YC reviewers on various devices) will not be on desktop.
- Deployed to a real, shareable URL (e.g. Vercel or similar) — this is what gets pasted into the YC application’s product-link field, so it needs to be live and stable, not just running locally.

-----

## 5. Explicit Non-Goals

- Do not build a full multi-page marketing site (pricing page, blog, docs, etc.) — this is a single, focused landing page.
- Do not fabricate waitlist numbers, testimonials, or logos of companies/users that aren’t real. If there’s nothing real to show yet in a given spot (e.g. “trusted by” logos), omit that section entirely rather than filling it with placeholder/fake content — false social proof is a real risk (to credibility generally, and specifically if surfaced in a YC application).
- Do not overclaim technical capabilities beyond what the MVP PRD actually specifies — copy should be accurate to the real product being built, not aspirational beyond it.

-----

## 6. Success Criteria

The landing page is “done enough” when:

1. It’s live at a real, shareable URL.
1. The waitlist form genuinely captures and stores real email addresses.
1. It visually and narratively feels like the same product as the demo (consistent design language, accurate feature descriptions per the MVP PRD).
1. It could be shared on Twitter/social or pasted into a YC application without the founder needing to caveat or explain anything about it — it stands on its own.
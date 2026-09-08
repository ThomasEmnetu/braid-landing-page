# Product scope and copy guardrails

Braid is a web-based shared AI coding workspace for engineering teams.
The landing page describes the MVP vision; its UI previews use simulated demo
data, not a production agent backend.

## Capabilities specified for the MVP

- GitHub OAuth, repository access, and sessions scoped to a real repo and branch.
- Multiple engineers directing one shared agent, with synchronized conversation,
  streamed output, presence, and relevant code context.
- Forking a session from a past point, inheriting its history up to that point.
- Independent branches with summaries, participants, and visible relative state.
- A branch/session tree that navigates into the corresponding conversation.
- Human-only `@mentions` that notify a teammate without prompting the agent.

## Important limits

Merging in v1 posts a summary of a branch's outcome into its parent session.
Do not claim seamless reconciliation of arbitrary conversation histories.
Code review and merging remain in the normal GitHub PR workflow.

Enterprise SSO, audit logs, compliance certifications, a full browser IDE,
IDE extensions, and multiple AI providers are not MVP commitments.
Do not add customer logos, testimonials, or waitlist counts without evidence.

## Data posture

The MVP's commitment is minimal retention: keep code and conversation data only
as needed for the product, and make session/account deletion work. Exact
retention windows and provider terms are not finalized. Do not imply that a
persistent shared session stores nothing or that a finalized zero-retention
policy already exists.

## Source UI

The product surfaces were captured from the completed Braid interactive demo
(baseline commit `93526d9` in the original workspace). Captures, dimensional UI
textures, and their source metadata are committed here, so the site builds
without the demo.

If product visuals are updated, use the actual demo/product UI rather than
inventing unrelated mockups. The optional capture scripts require the source
demo to be running and an explicit source checkout/revision; see the README.

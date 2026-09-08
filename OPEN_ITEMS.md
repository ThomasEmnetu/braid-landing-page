# Open items before collecting real signups

## Current state

The public preview is live at
https://thomasemnetu.github.io/braid-landing-page/. GitHub Pages deployment is
complete; there is **no signup API or database**.

Both forms in `src/components/WaitlistForm.tsx` validate input but deliberately
send and store nothing. A valid submission says that signup storage is not
connected and the email has not been saved. Do not remove this notice or show a
success state until durable capture works end to end.

## Decisions requiring the owner's approval

- Choose the database, hosted form service, or email-list provider. No provider
  has been approved. GitHub Pages cannot host the backend.
- Confirm the storage region, retention/deletion policy, and who can access or
  export the list.
- Supply an approved public contact for product questions and deletion requests.
- Decide whether to retain single opt-in or introduce email verification.
  The currently approved direction is **email + signup timestamp**, single
  opt-in for early-access updates. Do not add profiling, stored IP addresses,
  or broader marketing consent silently.

## Required implementation

1. Add a separately hosted HTTPS endpoint or approved managed form integration.
   Keep service credentials server-side, never in `VITE_*` variables or this
   repository.
2. Validate and normalize email server-side. Use a unique constraint and
   idempotent writes so retries, concurrent requests, and both page forms cannot
   inflate the count.
3. Persist only the approved fields. Add appropriate abuse prevention and rate
   limits; configure CORS for the actual site origin rather than treating CORS
   as authentication.
4. Connect the shared `WaitlistForm` component. Add pending, confirmed,
   already-subscribed, and actionable error states. Never report success from
   an HTTP status alone if the address was not persisted.
5. Provide owner access to real records, export, and deletion. Keep test records
   separate from genuine signups.
6. Replace the preview notice only after the deployed site is confirmed to save
   real addresses. Add a public count only if it comes from genuine stored
   signups; do not seed a marketing number.

## Acceptance criteria

- A real address submitted on the deployed site appears in the approved store
  and remains there after a service restart.
- Whitespace/case variants, double submissions, and network retries produce one
  signup, not duplicate rows.
- Invalid input is rejected by the API, not only by the browser.
- An outage never produces a fake success state or exposes credentials.
- Both forms behave consistently on desktop/mobile and with a keyboard.
- A deletion request actually removes the signup from active storage and
  downstream lists according to the chosen policy.
- The owner can cite the real count without including test or fabricated data.

The existing `e2e/waitlist.spec.ts` intentionally enforces the current
non-capturing boundary. Update those cases when introducing a real backend and
add coverage for the persisted-record, duplicate, failure, and deletion paths.

## Remaining launch decisions

- Finalize the signup privacy notice, contact details, and any consent wording
  required by the selected service and audience.
- Choose a custom domain if desired; update canonical/social metadata and CORS
  together.
- Confirm product availability before removing the MVP/preview disclosure.
  GitHub OAuth, shared agent sessions, and data deletion described in the
  product vision are not implemented by this marketing repository.
- Finalize session/account retention windows and model-provider terms before
  opening the real product. The page currently states a direction, not a
  finalized zero-retention guarantee.

See [PRODUCT_SCOPE.md](./PRODUCT_SCOPE.md) for copy boundaries and
[README.md](./README.md) for local development, deployment, and asset regeneration.

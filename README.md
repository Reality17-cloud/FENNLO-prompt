# FENNLO — Client Next Move

A persistent workspace for client conversations. Each **Client Thread** keeps a goal, chronological client Reality, and verified next moves. Add what the client said or what changed; Fennlo determines one nearest valid operation and the exact message to send. If waiting is appropriate, `send: null` produces **No message yet**, without a copy button or invented check-in.

The goal is direction, not evidence. **Never jump over a missing Formation.** The product remains specialized Client Next Move, with no CRM, general chatbot, integrations, billing, credits, uploads or media generation.

## Architecture

Next.js App Router / React / TypeScript; PostgreSQL via `pg`; Zod validates request, state and result boundaries. Authentication, database access and the OpenAI-compatible provider are server-only modules.

- `/`: compact public page with an explicitly labeled example.
- `/signup`, `/signin`: email/password authentication.
- `/app`: authenticated thread creation and navigation.
- `/app/[threadId]`: saved timeline, persistent goal, new-Reality composer, results and thread settings.
- `/account`: email, sign out and password-confirmed account deletion.
- `/privacy`, `/terms`: implementation-specific beta policies.

API:

| Endpoint                       | Operation                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `POST /api/auth/signup`        | `{ email, password }`, create account and session                                               |
| `POST /api/auth/signin`        | `{ email, password }`, establish session                                                        |
| `POST /api/auth/signout`       | Revoke current session                                                                          |
| `POST /api/auth/delete`        | `{ password, confirmation: "DELETE" }`, cascade account data                                    |
| `GET/POST /api/threads`        | List owned threads / create `{ title?, goal }`                                                  |
| `GET /api/threads/[id]`        | Owned thread and latest 50 timeline entries; `?before=sequence` loads older entries             |
| `PATCH /api/threads/[id]`      | Explicit `{ version, title?, goal?, status? }` mutation                                         |
| `POST /api/threads/[id]/turns` | `{ id: UUID, reality }`, idempotent determination/retry                                         |
| `POST /api/next-move`          | Authenticated compatibility endpoint; retains the original three-field one-shot result contract |

Owner IDs always come from a valid session, never request data. Private JSON responses use `Cache-Control: no-store`. The model receives neither user identity nor database IDs. Ordinary accounts begin empty. Test fixtures are never imported into production application code.

## Authentication and privacy

Passwords require 15–128 characters and use salted asynchronous scrypt (`N=32768, r=8, p=3`), with constant-time comparison. Random 32-byte session tokens are held in HttpOnly, SameSite=Lax cookies; only SHA-256 token hashes are stored server-side. Sessions expire after 12 hours and survive application restarts. HTTPS `APP_URL` enables Secure cookies; HTTP is allowed only for loopback local development/testing.

Signin/signup use PostgreSQL-backed per-email and service-wide rate limits; an optional trusted proxy IP header adds per-IP limits. AI requests are capped at 30/account and 500/service per 15 minutes. Thread creation is capped at 60/account per 15 minutes and 1,000 saved threads/account. These are operational beta limits, not billing. Origin checks use the configured canonical `APP_URL`; JSON-only mutations and SameSite cookies protect browser requests. There is no CORS allowance for external origins.

Delete requires the current password plus literal `DELETE`. A transaction deletes the account and account-specific limit keys. Foreign-key cascades remove all sessions, threads, Reality, goal events, results and snapshots. Deleting an account during inference prevents the result from recreating data. Hash-based anti-abuse counters expire by their window and are removed by authentication cleanup after one day. Backups and external provider records follow operator/provider retention; account deletion does not erase those copies.

Application errors log fixed codes/statuses, not Reality, prompts, passwords or provider response bodies. Configure infrastructure logs separately. Data is **not end-to-end encrypted**; operators/database administrators can access it. Read the Privacy page before submitting client information. No provider training or retention guarantee is made.

## PostgreSQL and migrations

Migration `001_workspace.sql` adds:

- `users`: normalized unique email, password hash, creation time.
- `user_sessions`: opaque token hash, owner, expiry.
- `rate_limits`: durable counters and windows.
- `client_threads`: owner, title, goal, active/archive/complete status, version, current internal Formation and inference lease.
- `thread_turns`: ordered immutable Reality/explicit-goal events, original goal, pending/complete/failed status, public result and verified internal snapshot.

`002_generation_lease.sql` adds a distinct attempt token, so an expired worker cannot commit over a retry of the same turn ID. `schema_migrations` records ordered migration checksums. The runner uses a PostgreSQL advisory lock and one transaction per migration. Applied migrations must not be edited; add a new migration.

Use PostgreSQL 15+ for deployment (local verification uses actual PostgreSQL 18). Set `DATABASE_URL`, then run from the repository root:

```sh
npm run migrate
```

The application never auto-creates a production schema. Run migrations as a release step before accepting requests. Database queries are parameterized and owner-scoped; short transactions use row locks. Inference happens outside database transactions and checks the reserved version/attempt lease before committing.

## Formation continuity

The original Formation system prompt, strict structured result, strategic fixtures, evidence validation and generic provider remain the foundation. The continuing-turn adapter supplies:

```text
persistent goal + bounded previous Formation snapshot + new Reality
→ strict model proposal → local validation → atomic persisted transition
→ public { next_move, send, why }
```

The snapshot contains `current_state`, at most eight verbatim `formed` evidence excerpts, at most eight `missing` uncertainties, one `constraint`, and one `next_formation`. Each string has a schema limit. It is a concise derived state, never chain-of-thought. Formed entries must be excerpts of the new Reality or previously verified evidence. Prior AI summaries are not accepted as evidence. Prompt rules distinguish reported facts from unknowns and require new Reality to supersede contradictory older information.

The model cannot return owner, account, goal, timestamp, permission or identity fields: extra keys fail the strict schema. Goal edits are explicit user events, with the prior goal retained in the timeline. Historical Reality and goals-at-turn are never rewritten by model output.

A turn's Reality is saved before inference. Successful validation commits its public result and new authoritative snapshot together. Provider failures retain the Reality as retryable and preserve the last verified state. The same turn ID replays a successful result without a duplicate provider call. A 90-second lease serializes determinations within each thread; expiration makes interrupted turns retryable. Outstanding turns must be resolved before adding more Reality or changing the goal. Other threads remain independent. Timeline pagination does not affect the bounded model input.

## Reused Fennlo infrastructure

Inspected `Reality17-cloud/fennlo-goal`, `fennlo-state`, `fennlo-ai` and `fennlo`.

- **fennlo-goal / fennlo-ai:** scrypt security helpers, hashed opaque sessions, durable auth counters, session lifecycle, cascading ownership and password-confirmed deletion patterns. No commercial tables or credits copied.
- **fennlo-goal:** pooled `pg`, transactional checksum migrations with an advisory lock, and persistent local native PostgreSQL development pattern. Native `pg_ctl` handles reliable Windows restart control.
- **fennlo-state:** previous state + new event + structured decision, local validation before authoritative persistence, version guards and idempotent request patterns.
- **fennlo:** actual process restart verification and transport test separation informed the test harness.

No world renderer, graph, prompt tree, old ontology, billing or generic AI identities were carried over.

## Local setup

Requires Node.js **22.13+**, npm and PostgreSQL. The lockfile pins the verified dependency tree.

```powershell
npm install
Copy-Item .env.example .env.local
npm run db:local
```

Keep the database terminal running. `db:local` starts a real native PostgreSQL cluster bound to `127.0.0.1:55435`, with persistent files under ignored `work/postgres`. It creates `fennlo_prompt` and the dedicated `fennlo_prompt_test` database. The example credentials are **local-only**, never suitable for a hosted database. This helper is optional; use your own PostgreSQL connection instead.

In another terminal, configure `.env.local`, then:

```powershell
npm run migrate
npm run dev -- --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000`. `APP_URL` must match the browser's origin, including port. Accounts and thread management work without AI credentials; a determination then fails clearly as unconfigured. There is no demo/mock fallback in the application.

## Qwen / compatible provider

Server-side configuration only:

```dotenv
APP_URL=https://YOUR_PUBLIC_HOST
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
AI_API_KEY=YOUR_PROVIDER_KEY
AI_BASE_URL=YOUR_SINGAPORE_WORKSPACE_COMPATIBLE_BASE_URL
AI_MODEL=YOUR_AVAILABLE_QWEN_MODEL
AI_FREE_QUOTA_ONLY_CONFIRMED=true
AI_OUTPUT_MODE=json_object
AI_TIMEOUT_MS=30000
AI_MAX_OUTPUT_TOKENS=2400
AI_ENABLE_THINKING=false
TRUSTED_CLIENT_IP_HEADER=
```

Copy the exact Singapore OpenAI-compatible endpoint from your Alibaba Cloud Model Studio workspace. Choose a Qwen text model with active free quota; the model name is configured only through the environment. The key, model and URL are validated. Provider URLs must be HTTPS except loopback testing. Base URLs containing credentials/query/hash are rejected.

**Enable Free Quota Only in Alibaba's console before setting the acknowledgment.** The environment gate is not a remote billing control and cannot independently prevent charges if the provider console is configured differently. No automatic provider switch, paid fallback, repair call or retry exists. Unavailable/exhausted quota fails safely. Manual retries consume another provider request.

`json_schema` enables strict schema response format when supported by the chosen model; `json_object` is the default; `json_only` sends the schema in the system request without response-format metadata. `AI_ENABLE_THINKING` can be blank for providers that do not accept this Qwen extension. Timeouts cover headers and response bodies, response sizes are bounded, and refusal/truncation/tool calls/invalid schema/unsupported evidence are rejected.

No Qwen credentials were supplied for this implementation. Automated transport and continuity tests use an explicitly configured local fixture endpoint, **not evidence of live-model strategic quality or active Alibaba quota**.

Optional real-provider verification, after confirming console quota settings:

```sh
npm run verify:live -- --confirm-free-quota --case price-uncertain
# One request per fixture; never part of normal tests:
npm run verify:live -- --confirm-free-quota --all
```

Review the saved public results against the fixture rubrics. Syntactic validation cannot prove the quality of a next move or detect every contextual contradiction.

## Verification

Start the local database or set `TEST_DATABASE_URL` to a dedicated PostgreSQL database whose name ends with `_test`.

```sh
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:restart
npm run format:check
```

- Unit/boundary/strategic fixture tests preserve the original one-shot behavior and exercise provider limits, timeouts, errors, no fallback, strict mutations and bounded continuity.
- Real PostgreSQL tests create an isolated schema, run migrations twice, exercise auth/hash/expiry/rate limits, owner isolation, lifecycle, independent threads, chronology, concurrency, interrupted-turn recovery, pagination and account erasure, then clean up that schema.
- Playwright uses the **production build**, desktop Chromium and mobile Chromium at an iPhone-sized viewport, an isolated `_test` database and local fixture HTTP provider. Global setup migrates and **truncates that test database's users and limits**. Never point it at live data. Tests cover signup/signin/logout, private APIs, copy/manual copy, WAIT, errors/retry, goal edits, navigation, long input/output, 320px overflow, session expiry, deletion and malformed client responses. No test uses live AI credentials.
- `test:restart` uses a separate native PostgreSQL cluster at port 55436 and production application at port 3110. It signs up, saves a thread/goal/Reality/result, stops **both** app and PostgreSQL, restarts both, signs in, reopens exact persisted history, and continues only if the fixture provider receives the persisted Formation evidence. It deletes the test account afterwards. Fixture transport is at port 3111.

## Deployment

Use a Node host with durable PostgreSQL, HTTPS and environment secrets. Install dependencies, run migrations, build, then `npm run start`. The web process may be replaced or scaled without losing threads or sessions; PostgreSQL is authoritative. The server runtime must allow up to 75 seconds for determination routes; provider timeout must remain below the 90-second inference lease. Configure provider/network egress and appropriate connection capacity (pool max 12 per process).

Use the exact HTTPS `APP_URL`, a restricted PostgreSQL role, verified TLS for remote database connections (for example your provider's supported `sslmode=verify-full` connection string), managed backups and tested restores. Do not disable certificate verification. Terminate TLS at your trusted reverse proxy and redirect HTTP there. Set `TRUSTED_CLIENT_IP_HEADER` only when that proxy replaces the header and blocks direct access; otherwise leave it unset. Security headers prohibit framing and camera/microphone/geolocation permissions. Deploy static public pages and dynamic authenticated routes together.

Before public registration, the operator must provision a real database and provider key, confirm provider privacy/quota settings, run live strategic review for the chosen model, set actual backup retention and operational support arrangements, and assess local privacy/terms obligations. The included policy describes implementation behavior, not a guarantee about infrastructure outside this repository.

## Current beta limitations

No OAuth, email verification, email delivery, forgotten-password reset, password change, billing, teams or client-message delivery. Losing a password currently means losing account access; users should keep it securely. No claim of business outcome or flawless reasoning. Bounded snapshots may omit older context; provide relevant new Reality if something matters again. State/evidence checks are structural and excerpt-based, not proof of semantic truth. Failed Reality must be retried before continuing that thread. Rate limits are fixed service policy; no quota dashboard. No live Qwen quality, paid-quota protection or hosted deployment has been verified without operator credentials/configuration. Browser checks cover Chromium and emulated mobile; Safari/Firefox and real-device keyboard behavior remain unverified.

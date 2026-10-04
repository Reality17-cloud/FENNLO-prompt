# Fennlo — Client Next Move

Fennlo v0 is a text-first Formation Prompt Intelligence product for real client conversations.

The user supplies only:

1. the current client conversation; and
2. the goal they want to achieve.

Fennlo does **not** blindly optimize the requested tactic. It first determines what is actually established, what critical condition is missing, and the nearest valid next Formation. It then returns one next move and one sendable client message.

```text
Client conversation + Goal
          ↓
Formation Prompt Intelligence
          ↓
What has actually formed?
What is missing?
What constrains the goal?
What should form next?
          ↓
ONE next move
          ↓
ONE message to send
```

## MVP boundary

Included:

- one client-conversation input;
- one goal input;
- one structured Formation determination per run;
- one next move;
- one final client-facing message;
- one short explanation;
- no persistence.

Deliberately excluded from v0: accounts, CRM, billing, credits, graph/world renderer, mind maps, image/voice/video, multi-agent orchestration, prompt editing and automatic external actions.

## Run locally

Requires Node.js 22+.

```sh
npm install
cp .env.example .env.local
```

Set both server-only variables:

```text
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

Then:

```sh
npm run dev
```

Open `http://localhost:3000`.

Verification:

```sh
npm run typecheck
npm run build
```

## Product test

The primary MVP metric is **second use**.

For each real case, observe:

```text
Generated → user actually sends it → client responds → user returns with the next client message
```

The first target is 10 real users × 10 real client situations = 100 Formation cases. The product should be judged first on whether it chooses the correct next move, not on prose style.

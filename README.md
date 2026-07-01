# InboxPilot — Autopilot Agent for B2B Sales Quotes

> **Qwen Cloud Global AI Hackathon 2026 — Track 4: Autopilot Agent**

InboxPilot is a production-grade autonomous agent that turns inbound B2B sales emails into
sent price quotes — with zero human involvement for high-confidence requests and a
one-click approval flow for anything ambiguous.

---

## Demo Video

[![InboxPilot Demo](https://img.shields.io/badge/▶_Watch_Demo-1--3_min-blue)](https://github.com/Osiyomeoh/InboxPilot)

---

## Architecture

```
Inbound Email (IMAP / Webhook / Demo)
        │
        ▼
  [Postgres · Neon]  ←──── Inquiry record persisted
        │
        ▼
  [BullMQ · Upstash Redis]  ←──── deduplicated job enqueued
        │
        ▼
  ┌─────────────────────────────────────────────────────┐
  │              6-Step Qwen Reasoning Chain            │
  │                                                     │
  │  1. Intake     (qwen3.7-max)  – parse intent        │
  │  2. Decide     (qwen3.7-max)  – plan MCP tool calls │
  │        │                                            │
  │        ▼  ── MCP HTTP Server (:4001) ──             │
  │     lookup_customer · get_pricing · check_calendar  │
  │     create_quote    · flag_for_human                │
  │        │                                            │
  │  3. Verify     (qwen3.7-max)  – data completeness   │
  │  4. Draft Quote(qwen3.7-plus) – structured quote    │
  │  5. QA Review  (qwen3.7-max)  – self-review         │
  │  6. Write Email(qwen3.7-plus) – cover email         │
  └──────────────────┬──────────────────────────────────┘
                     │
          Confidence Gate (default 0.8)
          ┌──────────┴──────────┐
          ▼                     ▼
    confidence ≥ 0.8      confidence < 0.8
    AUTO-SEND             AWAITING_APPROVAL
    (Resend API)          (dashboard HITL)
          │
          ▼
    Follow-up Queue (BullMQ delayed, +2 days)

WebSocket live feed → Next.js Dashboard (real-time step trace)
```

---

## Features

| Feature | Detail |
|---|---|
| **6-step Qwen reasoning chain** | Each step is a discrete Qwen3.7 call with structured JSON output, persisted to DB as a `StepTrace` |
| **Custom MCP server** | 5 tools exposed over HTTP with API-key auth — pricing lookup, CRM check, calendar, quote creation, HITL escalation |
| **Confidence-gated routing** | Auto-send if confidence ≥ threshold, human-in-the-loop otherwise — threshold is live-adjustable in the dashboard |
| **Real-time WebSocket trace** | Every step event broadcasts over WebSocket; the dashboard shows the reasoning chain as it runs |
| **Live settings persistence** | Confidence threshold and follow-up config stored in Postgres; changes take effect on the next job |
| **PDF quote generation** | Puppeteer renders a PDF invoice (requires Chrome — graceful fallback if unavailable) |
| **Follow-up automation** | BullMQ delayed job sends a follow-up after N days (configurable, max 2×) |
| **Demo mode** | Two injectable scenarios: `demo-auto` (high-confidence → SENT) and `demo-hitl` (always escalates) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI Models | Qwen3.7-max (reasoning), Qwen3.7-plus (generation) via DashScope International |
| API / Worker | Fastify, BullMQ, Prisma, TypeScript |
| Database | Neon Serverless Postgres (pgbouncer pooler) |
| Queue | Upstash Redis (TLS, `rediss://`) |
| MCP Server | Custom HTTP server (`@inbox-pilot/mcp`) with 5 tools |
| Frontend | Next.js 14, NextAuth, Tailwind CSS, WebSocket |
| Email | Resend (outbound), IMAP polling (inbound) |
| PDF | Puppeteer |
| Monorepo | npm workspaces + Turborepo |

---

## Judging Criteria Alignment

| Criterion | How InboxPilot addresses it |
|---|---|
| **Innovation & AI Creativity (30%)** | 6-step reasoning chain with per-step model selection, confidence-gated routing, and MCP tool-call normalisation for Qwen's non-standard arg formats |
| **Technical Depth & Engineering (30%)** | Custom MCP HTTP server, WebSocket live trace, BullMQ job deduplication, Neon serverless Postgres with pgbouncer, Upstash TLS Redis |
| **Problem Value & Impact (25%)** | Automates the most time-consuming part of B2B sales: turning email inquiries into quotes within ~40s, 24/7, with zero human input for standard orders |
| **Presentation & Documentation (15%)** | Live reasoning trace panel, architecture diagram, this README, demo inject endpoints |

---

## Quickstart (Local)

### Prerequisites

- Node.js 20+
- Neon Postgres database
- Upstash Redis (`rediss://` URL)
- Qwen Cloud API key (`sk-...` from dashscope-intl.aliyuncs.com)

### 1. Clone & install

```bash
git clone https://github.com/Osiyomeoh/InboxPilot.git
cd InboxPilot
npm install
```

### 2. Configure environment

Copy `.env.example` to `apps/api/.env`, `packages/mcp/.env`, and `apps/web/.env.local`:

```bash
cp .env.example apps/api/.env
cp .env.example packages/mcp/.env
cp .env.example apps/web/.env.local
```

Required variables:

```env
DATABASE_URL="postgresql://..."       # Neon pooled URL (?pgbouncer=true)
DATABASE_URL_UNPOOLED="postgresql://..." # Neon direct URL (for migrations)
REDIS_URL="rediss://..."              # Upstash Redis URL
QWEN_API_KEY="sk-..."                 # Qwen Cloud API key
QWEN_BASE_URL="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
DEMO_PASSWORD="demo"                  # Dashboard login password
MCP_API_KEY="internal-secret"
NEXTAUTH_SECRET="..."
```

### 3. Run database migrations

```bash
cd packages/db
npx prisma db push        # push schema to Neon
```

### 4. Start all services

```bash
# Terminal 1 — MCP server (:4001)
npm run dev --workspace=packages/mcp

# Terminal 2 — API + worker (:3001)
npm run dev --workspace=apps/api

# Terminal 3 — Next.js dashboard (:3000)
npm run dev --workspace=apps/web
```

### 5. Trigger a demo

```bash
# Auto-send scenario (confidence ≥ 0.8 → SENT)
curl -X POST http://localhost:3001/demo/inject/demo-auto

# Human-review scenario (threshold=1.0 → AWAITING_APPROVAL)
curl -X POST http://localhost:3001/demo/inject/demo-hitl
```

Open http://localhost:3000, log in with any email + password `demo`.

---

## Alibaba Cloud Deployment (Docker Compose)

See [`docker-compose.alibaba.yml`](docker-compose.alibaba.yml) for the full production stack.

### Quick deploy on Alibaba Cloud SAS

```bash
# 1. Provision an SAS instance (Docker image, 2 vCPU / 4 GB RAM recommended)
# 2. SSH in and clone the repo
git clone https://github.com/Osiyomeoh/InboxPilot.git /opt/inboxpilot
cd /opt/inboxpilot

# 3. Create .env with your credentials
cp .env.example .env
nano .env  # fill in QWEN_API_KEY, DATABASE_URL, REDIS_URL, etc.

# 4. Start
docker compose -f docker-compose.alibaba.yml up -d

# 5. Open firewall ports 3000 (web) and 3001 (API) in the SAS console
```

The stack will be accessible at `http://<your-sas-ip>:3000`.

---

## Repository Structure

```
inbox-pilot/
├── apps/
│   ├── api/          # Fastify API + BullMQ workers
│   └── web/          # Next.js 14 dashboard
├── packages/
│   ├── agent/        # 6-step Qwen reasoning chain
│   ├── db/           # Prisma schema + migrations
│   └── mcp/          # Custom MCP HTTP server (5 tools)
├── docker-compose.yml          # Local dev (Postgres + Redis only)
├── docker-compose.alibaba.yml  # Full production stack for Alibaba Cloud
└── LICENSE                     # MIT
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/demo/inject/:id` | Inject a demo email (`demo-auto` or `demo-hitl`) |
| `GET` | `/demo/status/:id` | Poll inquiry status + full agent trace |
| `GET` | `/inquiries` | List inquiries (filterable by status) |
| `GET` | `/settings` | Read live settings |
| `PATCH` | `/settings` | Update confidence threshold / follow-up config |
| `GET` | `/activity/stats` | Success rate + avg response time |
| `GET` | `/ws` | WebSocket — live step events |

---

## License

MIT — see [LICENSE](LICENSE).

Built for the **Qwen Cloud Global AI Hackathon 2026** · Track 4: Autopilot Agent.

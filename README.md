# Precode

Precode is an Architect Mode workspace for turning a rough app idea into a build-ready planning package before handing the work to a coding agent.

The product is intentionally upstream of code generation. It guides the user through a short architecture interview, recommends a default build route, and exports planning artifacts such as a PRD, architecture brief, and a universal coding-agent prompt.

## What It Does

- Runs a guided product and architecture interview for full-stack app ideas
- Adapts the conversation toward users, scope, risks, and implementation constraints
- Produces an export package with:
  - `PRD.md`
  - `ARCHITECTURE.md`
  - a universal agent prompt for Codex, Cursor, Claude Code, and similar tools
- Uses anonymous trial sessions with rate limits and export gating

## Product Boundaries

- Precode is not a general-purpose chatbot
- It should not write code in the planning chat
- It should not invent product scope during export
- It should keep recommendations specific, practical, and grounded in the captured session

## Stack

- Next.js App Router
- React
- Prisma + PostgreSQL
- Groq for planning/export generation
- Upstash Redis for anonymous session abuse controls and locking

## Local Setup

Create a local `.env` with the required runtime services:

```bash
DATABASE_URL="postgresql://..."
GROQ_API_KEY="..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
RATE_LIMIT_SECRET="change-me-to-a-long-random-value"
ANON_DAILY_MESSAGE_LIMIT=10
ANON_DAILY_SESSION_LIMIT=3
ANON_DAILY_EXPORT_LIMIT=2
ANON_MESSAGE_CHAR_LIMIT=4000
```

Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Main App Areas

- `/home`
  - session starter and workspace entry
- `/chat`
  - Architect Mode interview flow inside Precode
- `/export`
  - PRD and architecture package
- `/export/agent-prompt`
  - universal Precode prompt for downstream coding agents

## Development Notes

- UI changes should preserve the design direction in `DESIGN.md`
- This repo uses a modified Next.js version; check `node_modules/next/dist/docs/` before relying on older Next assumptions
- Anonymous usage controls rely on Redis counters and session locks; avoid weakening those paths when changing chat or export flows

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

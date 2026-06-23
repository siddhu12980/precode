# Precode

Precode is a focused planning workspace that turns a rough product idea into a build-ready handoff for a coding agent.

Instead of jumping straight into code generation, Precode forces the useful work first: clarify the product, tighten scope, surface risks, settle on a default architecture, then export a package that an implementation agent can actually follow.

It is designed for the awkward gap between "I have an idea" and "I am ready to build this in a real repo."

## Why It Exists

Most AI app builders fail in one of two ways:

- they start coding before the product is clear
- they generate generic planning docs that do not survive contact with a real codebase

Precode is intentionally upstream of implementation. It runs a short architect-style interview, recommends a practical build route, and produces planning artifacts that are meant to be handed to Codex, Cursor, Claude Code, or another coding agent without losing the shape of the product.

## What You Get

- A guided product and architecture interview
- A recommendation for the default build route
- A final export package with:
  - `PRD.md`
  - `ARCHITECTURE.md`
  - an agent handoff prompt
- Anonymous trial sessions with rate limits and export gating

## Product Feel

Precode is not a generic chatbot and not a landing-page toy. The product should feel like a calm architecture instrument:

- narrow scope
- structured outputs
- low-noise UI
- clear system boundaries
- handoff quality over conversational flourish

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

## Flow

1. Start with a rough product idea
2. Move through users, features, risks, and architecture
3. Confirm a practical default implementation route
4. Export the final package
5. Hand the package to a coding agent for implementation

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

## Demo URLs

Frontend-only demo mode is available for loading-state and interaction testing without consuming backend quota:

- `/chat?demo=1`
- `/export?demo=1`

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
- Anonymous usage controls rely on Redis counters, visitor-bound session ownership, and Redis locks; avoid weakening those paths when changing chat or export flows

## Production Notes

- Anonymous sessions are bound to a signed visitor cookie and should only be readable/mutable by that visitor
- Redis rate limits and locks are part of the security model, not optional infrastructure polish
- Do not expose raw model output without validation
- Treat exported planning artifacts as user-derived content, not trusted system instructions

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

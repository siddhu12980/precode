# PRD: AI Architecture Interviewer
*(Pre-coding spec & architecture builder for Claude Code / Cursor / Codex / Bolt users)*

---

## 1. Product Overview

A guided AI interview tool that turns a vague app idea into a complete, build-ready spec for AI coding agents. The user describes their idea in plain language; the AI asks structured questions, detects missing decisions, recommends a sensible default architecture, and generates a set of documents (PRD, architecture plan, tech stack, security checklist, task list, agent-ready prompts) that can be handed to Claude Code, Cursor, Codex, or similar tools.

The product does not write or edit code. It sits strictly before the coding phase.

---

## 2. Problem Statement

Coding agents are good at execution but bad at filling gaps in unclear instructions. When a user gives a vague prompt, the agent guesses at architecture, database design, auth, roles, and security — often wrong, and often expensively (tokens, time, rewrites). Most users, including many developers, don't have a repeatable process for thinking through these decisions before opening a coding agent. The result: wasted tokens, messy codebases, late discovery of missing requirements (roles, payment edge cases, permissions).

---

## 3. Target Users

1. Developers/semi-technical builders who can code but want a structured planning pass before using Claude Code/Cursor.
2. Power users of coding agents who keep hitting architecture confusion mid-build.
3. Junior developers who know a stack but don't yet know which decisions matter for a given product type.
4. Non-technical/semi-technical founders who need a clean spec to hand to a developer or an AI agent.

---

## 4. User Personas

**Aman — Junior Full-Stack Dev.** Knows React + Node. Has used Cursor for small projects. Doesn't know when to introduce queues, multi-tenancy, or stronger auth. Wants a sanity check before starting a bigger app.

**Priya — Solo Indie Hacker.** Technical, time-constrained. Wants to move fast with Claude Code but knows from experience that an unclear first prompt costs her hours of cleanup later.

**Raghav — Non-Technical Founder.** Has a business idea, no coding background. Needs a document a freelance developer or an AI agent can act on without him knowing the jargon.

---

## 5. Core Value Proposition

Spend 10–20 minutes answering the right questions instead of discovering missing requirements 2 hours and several thousand tokens into a Claude Code session. The output is a second opinion from a "senior architect," not a generic prompt template.

---

## 6. Main User Journey

1. User enters a rough idea in one or two sentences.
2. AI runs a short universal discovery phase (same first few questions for everyone).
3. AI classifies the app type (SaaS, marketplace, booking, e-commerce, internal tool, etc.).
4. AI branches into deeper questions — technical depth for developers, plain-language business/flow questions for non-developers.
5. AI flags missing decisions and risks explicitly, before generating anything.
6. AI proposes a default architecture/tech route with reasoning; user accepts or overrides.
7. AI generates the output document set.
8. User exports agent-ready prompts and copies the rest into their project as reference docs.

---

## 7. MVP Feature List

- Conversational interview flow (chat-based, not a form)
- Technical-level detection (ask once, adapt rest of interview)
- App-type detection after universal questions
- Missing-decision detector shown explicitly before final generation
- Default architecture recommendation engine with reasoning ("why this default")
- User can override any recommended decision
- Document generation: PRD, architecture plan, tech stack + reasoning, entity/data model (conceptual, not full schema), API/module breakdown (conceptual), security checklist, MVP vs later split, implementation task list, Claude Code prompt, Cursor/Codex prompt
- Export as downloadable files (.md)
- Single session — no project memory required across sessions for v1

---

## 8. Non-MVP Features (later)

- VS Code/Cursor extension that writes files directly into a project folder
- Multi-session projects with saved/editable specs
- Team accounts / collaboration
- Direct integration with Claude Code/Cursor via API (auto-handoff)
- Versioned spec history / diffing when requirements change
- Payment/billing system
- Project folder scanning or import of an existing codebase
- Browser preview or any code execution

---

## 9. Detailed Feature Requirements

**9.1 Interview Engine**
- Must ask one question at a time (or small grouped batches), not a long form.
- Must be able to skip ahead if the user's free-text answer already covers multiple questions.
- Must detect technical level from early answers (vocabulary, specificity) rather than a single "are you a developer?" toggle, though an explicit toggle should also be available as an escape hatch.

**9.2 App-Type Classifier**
- After universal questions, classify into a known category (SaaS, marketplace, booking, inventory, social/community, admin dashboard, e-commerce, internal tool, learning platform, other).
- Category determines which deeper question set runs next.
- Must support "other" gracefully with a generic deeper question set.

**9.3 Missing Decision Detector**
- Before generating final docs, must show an explicit list of unresolved/unknown decisions (e.g., roles, payment failure handling, data ownership, MVP boundary).
- User must be able to resolve these inline before proceeding, or explicitly choose to proceed with assumptions stated.

**9.4 Recommendation Engine**
- For each major decision (frontend, backend, database, auth, hosting, real-time needs, file storage, multi-tenancy), provide one strong default plus the reasoning.
- Reasoning must reference the user's actual answers ("Because you mentioned X, we recommend Y") rather than generic boilerplate.
- User can override; if an override conflicts with stated requirements (e.g., picking SQLite for a multi-tenant SaaS with heavy concurrent writes), the system should warn, not block.

**9.5 Output Generator**
- Generates the document set listed in Section 12.
- Data model and API sections stay conceptual (entities, relationships, key fields, endpoint groupings) — not full SQL/code, since the user will hand this to a coding agent that will generate the actual schema/code.
- Claude Code / Cursor prompts must be self-contained enough that a coding agent could start work without re-reading the full PRD.

---

## 10. AI Interview Flow

**Phase 1 — Universal (same for everyone):**
What are you building → who uses it → what problem it solves → main user actions → does it involve money/private data/roles/files/notifications → what's the MVP.

**Phase 2 — Classification:**
AI states detected app type and confirms with user.

**Phase 3 — Branch by technical level:**
- Developer track: stack preferences, existing constraints, database leanings, auth complexity, API style, deployment target, testing expectations.
- Non-developer track: who approves what, what happens when something goes wrong, what data is sensitive, is anything time-based (bookings/expiry), what should never be visible to which user type.

**Phase 4 — App-type-specific deep dive:**
Question sets per category (e.g., marketplace → two-sided roles, commission, dispute handling; booking → availability conflicts, cancellation policy, timezone handling).

**Phase 5 — Missing Decision Review:**
Explicit checklist of gaps, resolved interactively.

**Phase 6 — Route Recommendation:**
Present default architecture, await accept/modify.

**Phase 7 — Generation:**
Produce final document set.

---

## 11. Recommended Tech Route System

Works like a defaults system, not a free-choice menu:

- Always start from one strong default per category, with reasoning shown.
- Default for a standard full-stack web app (SaaS/dashboard-style): Next.js, Postgres, an ORM, Auth.js/Clerk-style managed auth, Tailwind + component library, Vercel-style deploy, managed Postgres.
- Deviations triggered by signals from the interview, not asked as open questions:
  - High backend complexity / long-running jobs → separate backend service.
  - Fast MVP, low complexity → managed backend-as-a-service.
  - Real-time or background-task requirements → WebSockets/queue layer.
  - File-heavy app → object storage.
  - Multi-tenant/team/SaaS → multi-tenant data isolation pattern called out explicitly.
  - Payments, admin panels, sensitive data, heavy roles → stronger security pattern flagged in the checklist, not just the stack choice.
- Every recommendation carries a one-line "why," and a one-line "what changes if you don't pick this."

---

## 12. Output Document Structure

1. `PRD.md` — problem, users, MVP scope, feature list
2. `ARCHITECTURE.md` — chosen stack, reasoning, system diagram description (textual), module boundaries
3. `DATA_MODEL.md` — entities, relationships, key fields, ownership rules (conceptual, not full schema)
4. `API_SPEC.md` — endpoint/module groupings and responsibilities (conceptual)
5. `SECURITY_CHECKLIST.md` — risks identified during interview + mitigations
6. `IMPLEMENTATION_TASKS.md` — ordered build steps, MVP-first
7. `CLAUDE_CODE_PROMPT.md` — single prompt summarizing the above for Claude Code
8. `CURSOR_RULES.md` / `CODEX_PROMPT.md` — equivalent for other agents
9. `DEVELOPER_HANDOFF.md` — plain-language summary for non-technical founders handing this to a developer

---

## 13. UX Requirements

- Chat-first interface; documents render progressively as the interview completes, not all at once at the end.
- Always show interview progress (e.g., "Core questions done → App-specific questions → Architecture review").
- Missing-decision list must be visually distinct (a checklist, not buried in chat text).
- Every recommended decision must be editable inline without restarting the interview.
- Final screen: document list with individual download/copy, plus a "copy all as one Claude Code prompt" option.
- No dead ends — if the user gives a low-effort answer, AI should infer reasonable defaults and move on rather than blocking on a strict required field.

---

## 14. Data Model Suggestion

(Conceptual only — actual schema design is the coding agent's job downstream.)

Core entities for the product itself (not the user's app):
- `Project` — one interview session/spec, holds idea description, detected app type, technical level.
- `Answer` — individual interview responses, linked to a question key and project.
- `Decision` — each architecture decision (category, default chosen, user override, reasoning shown).
- `MissingItem` — flagged gaps, resolved/unresolved state.
- `OutputDocument` — generated doc type, content, version.

Keep this minimal for v1 — single-user, single-session-per-project is enough; no need for collaborative editing or org-level structures yet.

---

## 15. Suggested Technical Architecture

For building the product itself (not the user's app being planned):

- Frontend: chat-style UI, streaming responses, progressive document rendering.
- Backend: stores interview state, decision tree/branching logic, calls an LLM for question generation, classification, and document generation.
- Question/branching logic should be a defined structure (a decision tree or rule set) rather than leaving the LLM to freestyle the entire interview — this is what keeps output consistent and "opinionated," matching the shadcn-style philosophy in this PRD. The LLM fills in language/reasoning/follow-ups within that structure.
- Storage: a single project record per interview is enough for v1; no need for complex relational modeling beyond what's listed in Section 14.
- No code execution, no sandboxing, no project folder access needed for v1 — keeps infra simple.

---

## 16. Monetization Possibilities

- Freemium: limited number of full interviews/exports per month, unlimited with subscription.
- One-time pricing per exported spec (pay only when you actually generate the final document set).
- Bundle with a future Cursor/VS Code extension as a paid upgrade.
- Positioning angle: priced as "cheaper than the tokens you'd waste fixing one bad architecture decision."

---

## 17. Success Metrics

- % of users who complete the full interview (not just start it).
- % of users who export at least one document.
- Self-reported or inferred: did the user actually paste the output into Claude Code/Cursor (track via a simple "did this help" follow-up or copy-button analytics).
- Repeat usage — do users come back for a second project idea.
- Qualitative: feedback on whether the generated spec caught something they hadn't thought of.

---

## 18. Risks and Mitigations

- **Risk:** Coding agents add their own "plan mode" and absorb this use case.
  **Mitigation:** Differentiate on structured interview quality and multi-document output, not just "ask clarifying questions."
- **Risk:** Users skip the interview and just want a PRD instantly.
  **Mitigation:** Allow a "quick mode" that's clearly lower quality, but make the full interview the default and visibly more valuable.
- **Risk:** Recommendation engine gives generic, unconvincing defaults.
  **Mitigation:** Tie every recommendation back to a specific answer the user gave; avoid boilerplate reasoning.
- **Risk:** Non-developers don't trust technical output they can't verify.
  **Mitigation:** Plain-language summary document (`DEVELOPER_HANDOFF.md`) alongside technical docs.
- **Risk:** Scope creep into becoming a coding agent.
  **Mitigation:** Hard rule for v1 — no code execution, no file editing, no project folder access.

---

## 19. Development Phases

**Phase 1 (Week 1 goal):** Universal interview + app-type classification + missing-decision detector + basic recommendation engine for one app category (standard SaaS/dashboard) + PRD + Architecture doc generation only.

**Phase 2:** Expand app-type-specific question sets (marketplace, booking, e-commerce, etc.) + full document set (data model, API spec, security checklist, tasks, agent prompts).

**Phase 3:** Polish UX (progressive rendering, inline edits, document download/export flow), add technical-level adaptive branching refinements.

**Phase 4 (post-validation):** Cursor/VS Code extension, saved projects, team accounts.

---

## 20. Final MVP Scope

A single-session, chat-based tool that:
- Runs the universal + branched interview for one well-supported app category to start (standard full-stack SaaS/dashboard apps).
- Detects and surfaces missing decisions before generating anything.
- Recommends one default architecture route with reasoning, editable by the user.
- Generates PRD, Architecture, Data Model (conceptual), Security Checklist, Implementation Tasks, and a Claude Code-ready prompt.
- Exports as downloadable markdown files.

No code execution. No file editing. No project folder access. No team accounts. No payment integration in v1.
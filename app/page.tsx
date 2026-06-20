import Link from "next/link";
import { ArchitectIcon } from "./components/icons";

const proofPoints = [
  {
    label: "Before code",
    value: "10-20 min",
    text: "Answer the right planning questions before a coding agent starts guessing.",
  },
  {
    label: "Output",
    value: "9 docs",
    text: "PRD, architecture plan, data model, security checklist, tasks, and agent prompts.",
  },
  {
    label: "Position",
    value: "No IDE",
    text: "Architect Mode plans the build. Claude Code, Cursor, and Codex execute it.",
  },
];

const workflow = [
  {
    title: "Describe the idea plainly",
    text: "Start with one or two sentences. Architect Mode extracts the product shape, user type, and risky unknowns.",
  },
  {
    title: "Answer guided questions",
    text: "The interview adapts to technical level and app type instead of dumping a long form on the user.",
  },
  {
    title: "Review missing decisions",
    text: "Roles, payments, data ownership, MVP scope, and security gaps are shown before final generation.",
  },
  {
    title: "Export the build pack",
    text: "Receive structured docs and prompts ready for Claude Code, Cursor, Codex, or a developer handoff.",
  },
];

const outputs = ["PRD.md", "ARCHITECTURE.md", "DATA_MODEL.md", "SECURITY_CHECKLIST.md", "IMPLEMENTATION_TASKS.md", "CLAUDE_CODE_PROMPT.md"];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#12131a] text-[#e2e1eb]">
      <header className="sticky top-0 z-20 border-b border-[#2a2d37] bg-[#12131a]/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[4px] border border-[#424754] bg-[#1e1f26]">
              <span className="font-mono text-xs font-medium tracking-[0.08em] text-[#adc6ff]">AM</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[#f7f7fa]">Architect Mode</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8c909f]">Pre-coding architecture workspace</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a className="text-sm text-[#8c909f] transition hover:text-[#c2c6d6]" href="#process">
              Process
            </a>
            <a className="text-sm text-[#8c909f] transition hover:text-[#c2c6d6]" href="#outputs">
              Outputs
            </a>
            <Link className="rounded-[3px] bg-[#adc6ff] px-4 py-2 font-mono text-xs font-medium tracking-[0.08em] text-[#002e6a] transition hover:bg-[#d8e2ff]" href="/home">
              Start planning
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1180px] content-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#8c909f]">For builders using Claude Code, Cursor, and Codex</p>
          <h1 className="mt-6 max-w-4xl text-[44px] font-light leading-[1.04] tracking-[-0.03em] text-[#f7f7fa] sm:text-[64px] lg:text-[76px]">
            Stop giving coding agents vague plans.
          </h1>
          <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-[#c2c6d6]/80 sm:text-xl sm:leading-9">
            Architect Mode turns a rough app idea into a clear build plan through guided questions, missing-decision review, and opinionated architecture defaults.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-[3px] bg-[#adc6ff] px-6 py-3 text-center font-mono text-xs font-medium uppercase tracking-[0.1em] text-[#002e6a] transition hover:bg-[#d8e2ff]" href="/home">
              Start with an idea
            </Link>
            <a className="rounded-[3px] border border-[#424754] bg-[#1a1b22] px-6 py-3 text-center font-mono text-xs font-medium uppercase tracking-[0.1em] text-[#c2c6d6] transition hover:border-[#adc6ff] hover:text-[#e2e1eb]" href="#process">
              See how it works
            </a>
          </div>
        </div>

        <div className="rounded-[6px] border border-[#33343c] bg-[#0c0e14] p-4 sm:p-5">
          <div className="border-b border-[#2a2d37] pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Planning readout</p>
            <p className="mt-2 text-lg font-medium text-[#f7f7fa]">Rough idea → build-ready pack</p>
          </div>
          <div className="space-y-3 py-5">
            {proofPoints.map((point) => (
              <div className="grid gap-3 rounded-[4px] border border-[#2a2d37] bg-[#12131a] p-4 sm:grid-cols-[96px_1fr]" key={point.label}>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c909f]">{point.label}</p>
                  <p className="mt-2 text-xl font-light text-[#adc6ff]">{point.value}</p>
                </div>
                <p className="text-sm leading-6 text-[#c2c6d6]">{point.text}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[4px] border border-[#33343c] bg-[#1a1b22] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ArchitectIcon className="h-4 w-4 text-[#adc6ff]" name="warning" />
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e2e1eb]">Why it matters</p>
            </div>
            <p className="text-sm leading-6 text-[#c2c6d6]">
              Coding agents are strong at execution, but weak instructions make them guess at auth, roles, data ownership, architecture, and edge cases.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-[#2a2d37] bg-[#0c0e14]" id="process">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#8c909f]">The workflow</p>
            <h2 className="mt-4 text-3xl font-light tracking-[-0.02em] text-[#f7f7fa] sm:text-5xl">A planning interview, not a prompt template.</h2>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {workflow.map((item, index) => (
              <article className="rounded-[4px] border border-[#33343c] bg-[#12131a] p-5" key={item.title}>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#adc6ff]">Step {String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 text-xl font-medium text-[#f7f7fa]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-20" id="outputs">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#8c909f]">What you get</p>
          <h2 className="mt-4 text-3xl font-light tracking-[-0.02em] text-[#f7f7fa] sm:text-5xl">A build pack your coding agent can actually use.</h2>
          <p className="mt-5 text-base leading-7 text-[#c2c6d6]/80">
            The goal is not to write code. The goal is to remove ambiguity before code generation starts, so your agent has clear product requirements, architecture choices, and implementation order.
          </p>
        </div>
        <div className="rounded-[6px] border border-[#33343c] bg-[#0c0e14] p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {outputs.map((output) => (
              <div className="rounded-[3px] border border-[#2a2d37] bg-[#1a1b22] px-4 py-3 font-mono text-xs tracking-[0.06em] text-[#e2e1eb]" key={output}>
                {output}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[4px] border border-[#33343c] bg-[#12131a] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Default architecture route</p>
            <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">
              One strong recommendation per major decision, with reasoning tied to the user&apos;s answers and clear trade-offs when they override it.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[#2a2d37] bg-[#0c0e14]">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#8c909f]">Start before the first commit</p>
            <h2 className="mt-3 text-2xl font-light text-[#f7f7fa] sm:text-3xl">Turn the rough idea into a serious build plan.</h2>
          </div>
          <Link className="rounded-[3px] bg-[#adc6ff] px-6 py-3 text-center font-mono text-xs font-medium uppercase tracking-[0.1em] text-[#002e6a] transition hover:bg-[#d8e2ff]" href="/home">
            Open workspace
          </Link>
        </div>
      </section>
    </main>
  );
}

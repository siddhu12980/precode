import Link from "next/link";
import { ArchitectIcon, type IconName } from "./icons";

export type WorkflowStep = { label: string; icon: IconName; active?: boolean; completed?: boolean; gap?: boolean };

const defaultSteps: WorkflowStep[] = [
  { label: "Idea", icon: "idea", active: true },
  { label: "Users", icon: "users" },
  { label: "Features", icon: "features" },
  { label: "Risks", icon: "risks" },
  { label: "Architecture", icon: "architecture" },
  { label: "Export", icon: "export", gap: true },
];

export function ProfileBadge({ initial = "S" }: { initial?: string }) {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-full border border-[#424754] bg-[#1e1f26] font-mono text-xs text-[#adc6ff]">
      {initial}
    </div>
  );
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-4 px-8 py-6">
      <Link
        aria-label="Go to home"
        className="grid h-10 w-10 place-items-center rounded-[4px] border border-[#424754] bg-[#1e1f26] transition hover:border-[#adc6ff] hover:bg-[#202331] focus:outline-none focus:ring-2 focus:ring-[#adc6ff]/60"
        href="/home"
      >
        <span className="font-mono text-xs font-medium tracking-[0.08em] text-[#adc6ff]">AM</span>
      </Link>
      <div>
        <p className="text-sm font-medium text-[#f7f7fa]">Architect Mode</p>
        <p className="font-mono text-[10px] tracking-[0.08em] text-[#8c909f]">V1.0.4 - Workspace</p>
      </div>
    </div>
  );
}

function WorkflowSteps({ steps = defaultSteps }: { steps?: WorkflowStep[] }) {
  return (
    <nav className="relative flex-1 py-8" aria-label="Architect workflow">
      <div className="absolute bottom-12 left-[65px] top-12 w-px bg-[#282a31]" />
      <ul className="relative space-y-3">
        {steps.map((step) => (
          <li className={step.gap ? "pt-8" : ""} key={step.label}>
            <a
              className={`group relative mr-4 flex items-center overflow-hidden rounded-r-[6px] py-2 transition ${
                step.active
                  ? "bg-[#1a1b22] text-[#adc6ff] shadow-[inset_2px_0_0_#adc6ff]"
                  : step.completed
                    ? "text-[#d8e2ff] hover:bg-[#1a1b22]"
                    : "text-[#8c909f] hover:bg-[#1a1b22] hover:text-[#c2c6d6]"
              }`}
              href="#"
            >
              {step.active ? <span className="absolute bottom-1 left-[64px] top-1 w-px bg-[#adc6ff] shadow-[0_0_18px_3px_rgba(173,198,255,0.55)]" /> : null}
              <span className="flex w-[96px] justify-center">
                <span
                  className={`relative h-2 w-2 rounded-full ring-4 ring-[#12131a] ${
                    step.active
                      ? "bg-[#adc6ff] shadow-[0_0_18px_4px_rgba(173,198,255,0.65)]"
                      : step.completed
                        ? "bg-[#d8e2ff]"
                        : step.gap
                          ? "bg-transparent"
                          : "bg-[#33343c]"
                  }`}
                >
                  {step.active ? <span className="absolute inset-[-7px] rounded-full border border-[#adc6ff]/40" /> : null}
                </span>
              </span>
              <span className="flex items-center gap-4">
                <ArchitectIcon className={`h-[18px] w-[18px] ${step.completed ? "text-[#adc6ff]" : ""}`} name={step.icon} />
                <span className="text-sm">{step.label}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function WorkflowSidebar({
  projectTitle,
  projectMeta = "Current project",
  steps = defaultSteps,
}: {
  projectTitle?: string;
  projectMeta?: string;
  steps?: WorkflowStep[];
}) {
  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[280px] border-r border-[#2a2d37] bg-[#12131a] lg:flex lg:flex-col">
      <BrandMark />

      {projectTitle ? (
        <div className="px-6 pb-2 pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Current project</p>
          <div className="mt-3 rounded-[4px] border border-[#424754] bg-[#1a1b22] p-4">
            <p className="text-sm font-medium leading-5 text-[#f7f7fa]">{projectTitle}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#8c909f]">{projectMeta}</p>
          </div>
        </div>
      ) : null}

      <WorkflowSteps steps={steps} />
    </aside>
  );
}

export function ProjectSidebar() {
  const projects = [
    { title: "New product", meta: "Start here", active: true },
    { title: "Anonymous trial", meta: "1 product limit", active: false },
  ];

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[280px] border-r border-[#2a2d37] bg-[#12131a] lg:flex lg:flex-col">
      <BrandMark />

      <div className="flex-1 px-6 py-8">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Projects</p>
          <button className="rounded-[3px] border border-[#424754] bg-[#1a1b22] px-2 py-1 font-mono text-[10px] text-[#adc6ff] transition hover:border-[#adc6ff]">
            New
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {projects.map((project) => (
            <a
              className={`block rounded-[4px] border p-4 transition ${
                project.active
                  ? "border-[#424754] bg-[#1a1b22] text-[#f7f7fa]"
                  : "border-transparent bg-transparent text-[#8c909f] hover:border-[#33343c] hover:bg-[#1a1b22] hover:text-[#c2c6d6]"
              }`}
              href="#"
              key={project.title}
            >
              <p className="text-sm font-medium">{project.title}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#8c909f]">{project.meta}</p>
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-[#2a2d37] px-6 py-5">
        <p className="text-xs leading-5 text-[#8c909f]">Anonymous users can test one product with a limited conversation.</p>
      </div>
    </aside>
  );
}

import { ArchitectIcon } from "../components/icons";
import { ProfileBadge, ProjectSidebar } from "../components/workflow-sidebar";
import { SessionStarter } from "./session-starter";

const contextTags = ["AI planning", "Full-stack apps", "Coding agents"];
const starterHints = ["Who will use it?", "What problem does it solve?", "What should the first version do?"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#12131a] text-[#e2e1eb] lg:h-screen lg:overflow-hidden">
      <div className="lg:hidden border-b border-[#2a2d37] bg-[#12131a] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-medium text-[#f7f7fa]">Architect Mode</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8c909f]">Strategy Canvas</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-[3px] bg-[#adc6ff] px-4 py-2 text-sm font-medium text-[#002e6a]">Save</button>
            <ProfileBadge />
          </div>
        </div>
      </div>

      <ProjectSidebar />

      <header className="hidden h-16 items-center justify-between bg-[#12131a]/85 px-10 backdrop-blur-md lg:fixed lg:left-[280px] lg:right-[320px] lg:top-0 lg:z-20 lg:flex">
        <p className="text-base tracking-wide text-[#c2c6d6]">Strategy Canvas</p>
        <div className="flex items-center gap-6">
          <button className="rounded-[3px] bg-[#1e2230] px-5 py-2.5 font-mono text-xs tracking-[0.1em] text-[#d8e2ff] transition hover:bg-[#282f43]">
            Save Draft
          </button>
          <ProfileBadge />
        </div>
      </header>

      <section className="lg:ml-[280px] lg:mr-[320px] lg:h-screen">
        <div className="mx-auto flex min-h-screen max-w-[1000px] flex-col px-5 pb-12 pt-10 sm:px-10 lg:h-screen lg:min-h-0 lg:px-14 lg:pb-8 lg:pt-24">
          <div className="mb-10 max-w-3xl lg:mb-10">
            <h1 className="text-[40px] font-light leading-tight tracking-[-0.02em] text-[#f7f7fa] sm:text-[44px] lg:text-[42px]">
              Define your product.
            </h1>
            <p className="mt-5 text-lg font-light leading-8 text-[#c2c6d6]/75 lg:max-w-2xl lg:text-[18px] lg:leading-8">
              Start with one plain-language description. Architect Mode will ask the next useful question after that.
            </p>
          </div>

          <div className="max-w-3xl shrink-0 rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">What to include</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {starterHints.map((hint) => (
                <div className="rounded-[3px] border border-[#2a2d37] bg-[#12131a] px-3 py-2 text-sm text-[#c2c6d6]" key={hint}>
                  {hint}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-[#8c909f]">Example: I want to build a booking app for local fitness coaches.</p>
          </div>

          <div className="mt-auto">
            <div className="mb-6 border-t border-[#282a31]" />
            <SessionStarter />
          </div>
        </div>
      </section>

      <aside className="border-t border-[#2a2d37] bg-[#12131a] px-5 py-8 lg:fixed lg:right-0 lg:top-0 lg:flex lg:h-screen lg:w-[320px] lg:flex-col lg:border-l lg:border-t-0 lg:px-7 lg:py-8">
        <h2 className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-[#e2e1eb]/80">Intelligence Panel</h2>

        <div className="mt-8 space-y-7 lg:flex-1 lg:overflow-hidden">
          <section>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Detected Context</h3>
            <div className="flex flex-wrap gap-2">
              {contextTags.map((tag) => (
                <span className="rounded-[3px] border border-[#424754] bg-[#282a31] px-2.5 py-1.5 font-mono text-[11px] text-[#e2e1eb]" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-[#8c909f]">These will update after you describe the product.</p>
          </section>

          <section>
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Clarity Score</h3>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-[0.08em] text-[#e2e1eb]">Vision Definition</span>
              <span className="font-mono text-[11px] text-[#adc6ff]">68%</span>
            </div>
            <div className="h-[2px] overflow-hidden rounded-full bg-[#33343c]">
              <div className="h-full w-[68%] bg-[#adc6ff]" />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#8c909f]">Readiness starts after the first product description.</p>
          </section>

          <section className="rounded-[3px] border border-[#33343c] bg-[#1a1b22] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ArchitectIcon className="h-4 w-4 text-[#adc6ff]" name="spark" />
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e2e1eb]">Suggestion</h3>
            </div>
            <p className="text-sm leading-6 text-[#c2c6d6]">For best results, mention the user, the problem, and the first useful version. One sentence is enough.</p>
          </section>
        </div>
      </aside>
    </main>
  );
}

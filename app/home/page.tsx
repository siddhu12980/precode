"use client";

import { useState } from "react";
import { ArchitectIcon } from "../components/icons";
import { ProfileBadge, ProjectSidebar } from "../components/workflow-sidebar";
import { homeStarterHasBlockingCard, SessionStarter } from "./session-starter";

const contextPlaceholders = ["Product type", "Primary users", "Build target"];
const starterHints = ["Who will use it?", "What problem does it solve?", "What should the first version do?"];

export default function Home() {
  const [showTrialLimitCard, setShowTrialLimitCard] = useState(false);
  const [showQuotaLimitCard, setShowQuotaLimitCard] = useState(false);
  const hideStarterHints = homeStarterHasBlockingCard({ showTrialLimitCard, showQuotaLimitCard });

  return (
    <main className="min-h-screen bg-[#12131a] text-[#e2e1eb] lg:h-screen lg:overflow-hidden">
      <div className="lg:hidden border-b border-[#2a2d37] bg-[#12131a] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-medium text-[#f7f7fa]">Precode</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8c909f]">Strategy Canvas</p>
          </div>
          <ProfileBadge />
        </div>
      </div>

      <ProjectSidebar />

      <header className="hidden h-16 items-center justify-between bg-[#12131a]/85 px-10 backdrop-blur-md lg:fixed lg:left-[280px] lg:right-[320px] lg:top-0 lg:z-20 lg:flex">
        <p className="text-base tracking-wide text-[#c2c6d6]">Strategy Canvas</p>
        <ProfileBadge />
      </header>

      <section className="lg:ml-[280px] lg:mr-[320px] lg:h-screen">
        <div className="mx-auto flex min-h-[calc(100vh-69px)] max-w-[1000px] flex-col justify-between px-5 pb-[124px] pt-6 sm:min-h-screen sm:px-10 sm:pb-[140px] sm:pt-8 lg:h-screen lg:min-h-0 lg:px-14 lg:pb-8 lg:pt-24">
          <div className="mb-6 max-w-3xl sm:mb-8 lg:mb-10">
            <h1 className="text-[32px] font-light leading-tight tracking-[-0.02em] text-[#f7f7fa] sm:text-[40px] lg:text-[42px]">
              Define your product.
            </h1>
            <p className="mt-3 text-base font-light leading-7 text-[#c2c6d6]/75 sm:mt-4 sm:text-lg sm:leading-8 lg:max-w-2xl lg:text-[18px] lg:leading-8">
              Start with one plain-language description. Precode will ask the next useful question after that.
            </p>
          </div>

          {!hideStarterHints ? (
            <div className="max-w-3xl shrink-0 rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-4 sm:p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">What to include</p>
              <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-3">
                {starterHints.map((hint) => (
                  <div className="rounded-[3px] border border-[#2a2d37] bg-[#12131a] px-3 py-2 text-sm text-[#c2c6d6]" key={hint}>
                    {hint}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-[#8c909f]">Example: I want to build a booking app for local fitness coaches.</p>
            </div>
          ) : null}

          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2a2d37] bg-[#12131a]/95 px-5 py-4 backdrop-blur-md sm:px-10 sm:py-5 lg:static lg:mt-auto lg:border-t-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
            <div className="mx-auto max-w-[1000px] lg:max-w-none">
              <div className="mb-4 hidden border-t border-[#282a31] sm:mb-6 lg:block" />
            <SessionStarter onBlockingCardChange={({ trial, quota }) => {
              setShowTrialLimitCard(trial);
              setShowQuotaLimitCard(quota);
            }} />
            </div>
          </div>
        </div>
      </section>

      <aside className="hidden border-t border-[#2a2d37] bg-[#12131a] px-5 py-8 lg:fixed lg:right-0 lg:top-0 lg:flex lg:h-screen lg:w-[320px] lg:flex-col lg:border-l lg:border-t-0 lg:px-7 lg:py-8">
        <h2 className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-[#e2e1eb]/80">Intelligence Panel</h2>

        <div className="mt-8 space-y-7 lg:flex-1 lg:overflow-hidden">
          <section>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Context to capture</h3>
            <div className="flex flex-wrap gap-2">
              {contextPlaceholders.map((tag) => (
                <span className="rounded-[3px] border border-dashed border-[#424754] bg-[#0c0e14] px-2.5 py-1.5 font-mono text-[11px] text-[#8c909f]" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-[#8c909f]">Precode will fill these after your first product description.</p>
          </section>

          <section>
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Readiness preview</h3>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-[0.08em] text-[#e2e1eb]">Waiting for idea</span>
              <span className="font-mono text-[11px] text-[#8c909f]">0%</span>
            </div>
            <div className="h-[2px] overflow-hidden rounded-full bg-[#33343c]">
              <div className="h-full w-0 bg-[#adc6ff]" />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#8c909f]">The score starts once the interview has real context to evaluate.</p>
          </section>

          <section className="rounded-[3px] border border-[#33343c] bg-[#1a1b22] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ArchitectIcon className="h-4 w-4 text-[#adc6ff]" name="spark" />
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e2e1eb]">Suggestion</h3>
            </div>
            <p className="text-sm leading-6 text-[#c2c6d6]">Start with the user, the problem, and the first useful version. The panel will update as the interview learns more.</p>
          </section>
        </div>
      </aside>
    </main>
  );
}

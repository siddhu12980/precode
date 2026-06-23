"use client";

import { ArchitectIcon, type IconName } from "./icons";

export type ProcessingStage = {
  label: string;
  detail: string;
  icon: IconName;
};

export function InlineProcessingRow({
  label,
  detail,
  chips = [],
  icon,
}: {
  label: string;
  detail: string;
  chips?: string[];
  icon: IconName;
}) {
  return (
    <section aria-live="polite" className="rounded-[4px] border border-[#33343c] bg-[#0f1218] px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-[#424754] bg-[#1a1b22] text-[#adc6ff]">
          <ArchitectIcon className="h-4 w-4" name={icon} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#adc6ff]">{label}</p>
            <div className="flex items-center gap-1.5">
              <span className="processing-ping h-1.5 w-1.5 rounded-full bg-[#adc6ff]" />
              <span className="processing-ping h-1.5 w-1.5 rounded-full bg-[#adc6ff]" style={{ animationDelay: "180ms" }} />
              <span className="processing-ping h-1.5 w-1.5 rounded-full bg-[#adc6ff]" style={{ animationDelay: "360ms" }} />
            </div>
          </div>
          <p className="mt-1 text-sm leading-6 text-[#c2c6d6]">{detail}</p>
          {chips.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span className="rounded-[3px] border border-[#2a2d37] bg-[#12131a] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8c909f]" key={chip}>
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ProcessingPanel({
  eyebrow,
  title,
  description,
  stages,
  activeStage,
  notes,
  chips = [],
  mode = "default",
  allowFullProgress = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  stages: ProcessingStage[];
  activeStage: number;
  notes: string[];
  chips?: string[];
  mode?: "default" | "compact";
  allowFullProgress?: boolean;
}) {
  const currentStage = stages[Math.min(activeStage, stages.length - 1)] ?? stages[0];
  const rawProgress = stages.length > 1 ? Math.min((activeStage / (stages.length - 1)) * 100, 100) : 100;
  const progress = !allowFullProgress && activeStage >= stages.length - 1 ? 94 : rawProgress;
  const compact = mode === "compact";
  const showNotesPanel = !compact;

  return (
    <section
      aria-live="polite"
      className={`overflow-hidden rounded-[4px] border border-[#33343c] bg-[#0c0e14] ${
        compact ? "p-4" : "p-5 sm:p-6 lg:p-7"
      }`}
    >
      <div className={`grid gap-5 ${compact ? "" : showNotesPanel ? "xl:grid-cols-[minmax(0,1.2fr)_280px]" : ""}`}>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#adc6ff]">{eyebrow}</p>
          <h2 className={`${compact ? "mt-2 text-base" : "mt-3 text-[1.4rem]"} font-medium tracking-[-0.02em] text-[#f7f7fa]`}>{title}</h2>
          <p className={`text-[#c2c6d6] ${compact ? "mt-2 text-sm leading-6" : "mt-3 max-w-[62ch] text-sm leading-6 sm:text-base"}`}>{description}</p>

          <div className="mt-5 rounded-[4px] border border-[#2a2d37] bg-[#12131a] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Active operation</p>
                <div className="mt-2 flex items-center gap-3 text-[#f7f7fa]">
                  <span className="grid h-8 w-8 place-items-center rounded-[4px] border border-[#424754] bg-[#1a1b22] text-[#adc6ff]">
                    <ArchitectIcon className="h-4 w-4" name={currentStage.icon} />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{currentStage.label}</p>
                    <p className="text-sm text-[#8c909f]">{currentStage.detail}</p>
                  </div>
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Progress</p>
                <p className="mt-2 font-mono text-xl text-[#adc6ff]">{Math.round(progress)}%</p>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#1a1b22]">
              <div className="processing-progress h-full rounded-full bg-[#adc6ff]" style={{ width: `${Math.max(progress, 10)}%` }} />
            </div>

            <div className={`mt-4 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
              {stages.map((stage, index) => {
                const state = index < activeStage ? "done" : index === activeStage ? "active" : "idle";

                return (
                  <div
                    className={`rounded-[4px] border px-3 py-3 transition ${
                      state === "active"
                        ? "border-[#adc6ff] bg-[#1a2233]"
                        : state === "done"
                          ? "border-[#424754] bg-[#151821] text-[#d8e2ff]"
                          : "border-[#2a2d37] bg-[#101218] text-[#8c909f]"
                    }`}
                    key={`${stage.label}-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-[3px] border ${
                          state === "active"
                            ? "border-[#adc6ff] bg-[#202331] text-[#adc6ff]"
                            : state === "done"
                              ? "border-[#424754] bg-[#1a1b22] text-[#d8e2ff]"
                              : "border-[#33343c] bg-[#12131a] text-[#626774]"
                        }`}
                      >
                        <ArchitectIcon className="h-3.5 w-3.5" name={stage.icon} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em]">{stage.label}</p>
                        <p className="mt-1 text-sm">{stage.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {chips.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span className="rounded-[3px] border border-[#33343c] bg-[#12131a] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#c2c6d6]" key={chip}>
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {showNotesPanel ? (
          <div className="hidden rounded-[4px] border border-[#2a2d37] bg-[#12131a] p-4 xl:block">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">System notes</p>
            <div className="mt-4 space-y-3">
              {notes.map((note, index) => (
                <div className="flex gap-3 rounded-[4px] border border-[#33343c] bg-[#0c0e14] px-3 py-3 text-sm leading-6 text-[#c2c6d6]" key={`${note}-${index}`}>
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#424754] bg-[#1a1b22] text-[#adc6ff]">
                    <span className="processing-ping h-1.5 w-1.5 rounded-full bg-current" />
                  </span>
                  <span>{note}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-[#2a2d37] pt-4">
              <div className="processing-grid rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-3">
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 18 }).map((_, index) => (
                    <span className="processing-cell block h-6 rounded-[2px] border border-[#2a2d37] bg-[#12131a]" key={index} style={{ animationDelay: `${index * 120}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

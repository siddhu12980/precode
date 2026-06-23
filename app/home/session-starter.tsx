"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Composer } from "../components/composer";
import { ArchitectIcon } from "../components/icons";
import { startAnonymousSession } from "../lib/anonymous-session-client";

export function SessionStarter({
  onBlockingCardChange,
}: {
  onBlockingCardChange?: (state: { trial: boolean; quota: boolean }) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTrialLimitCard, setShowTrialLimitCard] = useState(false);
  const [showQuotaLimitCard, setShowQuotaLimitCard] = useState(false);

  function syncBlockingCards(nextState: { trial: boolean; quota: boolean }) {
    onBlockingCardChange?.(nextState);
  }

  async function handleStart(message: string) {
    setIsSubmitting(true);
    setShowTrialLimitCard(false);
    setShowQuotaLimitCard(false);
    syncBlockingCards({ trial: false, quota: false });
    setStatus("Starting Precode session...");

    try {
      await startAnonymousSession(message);
      setStatus("Opening chat...");
      router.push("/chat");
    } catch (error) {
      const nextStatus = error instanceof Error ? error.message : "Something went wrong starting the session.";
      const looksLikeCompletedTrial =
        nextStatus.includes("This project is complete.") || nextStatus.includes("Open the export screen to copy or download the final plan.");
      const looksLikeQuotaCooldown =
        nextStatus.includes("Anonymous quota reached.") || nextStatus.includes("wait for the cooldown");

      if (looksLikeCompletedTrial) {
        setShowTrialLimitCard(true);
        setStatus(null);
        syncBlockingCards({ trial: true, quota: false });
      } else if (looksLikeQuotaCooldown) {
        setShowQuotaLimitCard(true);
        setStatus(null);
        syncBlockingCards({ trial: false, quota: true });
      } else {
        setStatus(nextStatus);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="shrink-0">
      {showQuotaLimitCard ? (
        <div className="mb-4 rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-4 sm:mb-5 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] border border-[#424754] bg-[#1a1b22] text-[#adc6ff] sm:h-10 sm:w-10">
              <ArchitectIcon className="h-4 w-4 sm:h-5 sm:w-5" name="warning" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#adc6ff]">⚠️ Anonymous Mode Exhausted</p>
              <p className="mt-2 text-sm leading-5 text-[#f7f7fa] sm:mt-3 sm:leading-6">Congratulations. You managed to burn through the free anonymous quota faster than expected.</p>
              <p className="mt-1.5 text-sm leading-5 text-[#c2c6d6] sm:mt-2 sm:leading-6">Unfortunately, GPUs are powered by electricity, not hopes and dreams, and my wallet has filed a formal complaint.</p>
              <p className="mt-1.5 text-sm leading-5 text-[#c2c6d6] sm:mt-2 sm:leading-6">The AI has been returned to its containment chamber until the cooldown expires.</p>
              <div className="mt-3 rounded-[4px] border border-[#2a2d37] bg-[#12131a] px-3 py-3 sm:mt-4 sm:px-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">You can</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-5 text-[#c2c6d6] sm:mt-3 sm:space-y-2 sm:leading-6">
                  <li>• Revisit your previous chat</li>
                  <li>• Export what you&apos;ve got</li>
                  <li>• Come back later</li>
                  <li>• Convince a billionaire to sponsor your conversations</li>
                </ul>
              </div>
              <p className="mt-3 text-sm leading-5 text-[#8c909f] sm:mt-4 sm:leading-6">See you after the timeout, speedrunner.</p>
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
                <Link
                  className="inline-flex items-center gap-2 rounded-[3px] bg-[#adc6ff] px-4 py-2 font-mono text-xs font-medium tracking-[0.08em] text-[#002e6a] transition hover:bg-[#d8e2ff]"
                  href="/export"
                >
                  <ArchitectIcon className="h-4 w-4" name="export" />
                  Open export
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-[3px] border border-[#424754] bg-[#12131a] px-4 py-2 font-mono text-xs tracking-[0.08em] text-[#d8e2ff] transition hover:border-[#adc6ff] hover:text-[#adc6ff]"
                  href="/chat"
                >
                  <ArchitectIcon className="h-4 w-4" name="note" />
                  View old chat
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showTrialLimitCard ? (
        <div className="mb-4 rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-4 sm:mb-5 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] border border-[#424754] bg-[#1a1b22] text-[#adc6ff] sm:h-10 sm:w-10">
              <ArchitectIcon className="h-4 w-4 sm:h-5 sm:w-5" name="warning" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#adc6ff]">Anonymous trial tapped out</p>
              <p className="mt-2 text-sm leading-5 text-[#f7f7fa] sm:mt-3 sm:leading-6">Congratulations. You managed to burn through the free anonymous quota faster than expected.</p>
              <p className="mt-1.5 text-sm leading-5 text-[#c2c6d6] sm:mt-2 sm:leading-6">Unfortunately, GPUs are powered by electricity, not hopes and dreams, and my wallet has filed a formal complaint.</p>
              <p className="mt-1.5 text-sm leading-5 text-[#c2c6d6] sm:mt-2 sm:leading-6">The AI has been returned to its containment chamber until the cooldown expires.</p>
              <div className="mt-3 rounded-[4px] border border-[#2a2d37] bg-[#12131a] px-3 py-3 sm:mt-4 sm:px-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">You can</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-5 text-[#c2c6d6] sm:mt-3 sm:space-y-2 sm:leading-6">
                  <li>• Revisit your previous chat</li>
                  <li>• Export what you&apos;ve got</li>
                  <li>• Come back later</li>
                  <li>• Convince a billionaire to sponsor your conversations</li>
                </ul>
              </div>
              <p className="mt-3 text-sm leading-5 text-[#8c909f] sm:mt-4 sm:leading-6">See you after the timeout, speedrunner.</p>
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
                <Link
                  className="inline-flex items-center gap-2 rounded-[3px] bg-[#adc6ff] px-4 py-2 font-mono text-xs font-medium tracking-[0.08em] text-[#002e6a] transition hover:bg-[#d8e2ff]"
                  href="/export"
                >
                  <ArchitectIcon className="h-4 w-4" name="export" />
                  Open export
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-[3px] border border-[#424754] bg-[#12131a] px-4 py-2 font-mono text-xs tracking-[0.08em] text-[#d8e2ff] transition hover:border-[#adc6ff] hover:text-[#adc6ff]"
                  href="/chat"
                >
                  <ArchitectIcon className="h-4 w-4" name="note" />
                  View old chat
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Composer
        actionLabel={isSubmitting ? "Starting" : "Start"}
        context="Context: New product"
        disabled={isSubmitting}
        onSubmit={handleStart}
        placeholder={showTrialLimitCard || showQuotaLimitCard ? "Anonymous trial is cooling down." : "Tell Precode what you want to build..."}
      />
      {status ? <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c909f]">{status}</p> : null}
    </div>
  );
}

export function homeStarterHasBlockingCard({
  showTrialLimitCard,
  showQuotaLimitCard,
}: {
  showTrialLimitCard: boolean;
  showQuotaLimitCard: boolean;
}) {
  return showTrialLimitCard || showQuotaLimitCard;
}

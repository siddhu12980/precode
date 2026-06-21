"use client";

import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ArchitectIcon } from "./icons";

export function Composer({
  context,
  placeholder,
  actionLabel = "Send",
  className = "",
  disabled = false,
  value,
  onChange,
  onSubmit,
}: {
  context: string;
  placeholder: string;
  actionLabel?: string;
  className?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (message: string) => void;
  onSubmit?: (message: string) => Promise<void> | void;
}) {
  const [uncontrolledMessage, setUncontrolledMessage] = useState("");
  const message = value ?? uncontrolledMessage;

  function updateMessage(nextMessage: string) {
    if (onChange) {
      onChange(nextMessage);
      return;
    }

    setUncontrolledMessage(nextMessage);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = message.trim();

    if (!trimmed || disabled) {
      return;
    }

    updateMessage("");
    await onSubmit?.(trimmed);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form className={`rounded-[6px] border border-[#33343c] bg-[#1a1b22]/70 p-4 transition focus-within:border-[#adc6ff] ${className}`} onSubmit={handleSubmit}>
      <div className="flex items-start gap-4">
        <button className="mt-2 text-[#8c909f] transition hover:text-[#adc6ff]" aria-label="Attach context" type="button">
          <ArchitectIcon className="h-5 w-5" name="attach" />
        </button>
        <textarea
          value={message}
          className="min-h-[58px] flex-1 resize-none border-0 bg-transparent p-0 text-base leading-7 text-[#e2e1eb] outline-none placeholder:text-[#626774] focus:ring-0 lg:h-[60px] lg:min-h-0"
          disabled={disabled}
          onChange={(event) => updateMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]/70">{context}</span>
        <button
          className="flex items-center gap-2 rounded-[3px] bg-[#adc6ff] px-5 py-2 font-mono text-xs font-medium tracking-[0.08em] text-[#002e6a] transition hover:bg-[#d8e2ff] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !message.trim()}
          type="submit"
        >
          <ArchitectIcon className="h-4 w-4" name="send" />
          {actionLabel}
        </button>
      </div>
    </form>
  );
}

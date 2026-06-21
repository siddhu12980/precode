import type { ReactNode } from "react";

export type IconName =
  | "idea"
  | "users"
  | "features"
  | "risks"
  | "architecture"
  | "export"
  | "attach"
  | "send"
  | "database"
  | "tree"
  | "spark"
  | "check"
  | "warning"
  | "code"
  | "layers"
  | "note"
  | "copy"
  | "download";

export function ArchitectIcon({ name, className = "" }: { name: IconName; className?: string }) {
  const common = "fill-none stroke-current stroke-[1.6] stroke-linecap-round stroke-linejoin-round";

  const paths: Record<IconName, ReactNode> = {
    idea: (
      <>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M8.2 14.6a6 6 0 1 1 7.6 0c-.8.6-1.3 1.5-1.3 2.4h-5c0-.9-.5-1.8-1.3-2.4Z" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M21 21v-2a3.5 3.5 0 0 0-2.6-3.4" />
        <path d="M16.5 3.3a4 4 0 0 1 0 7.4" />
      </>
    ),
    features: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
    risks: (
      <>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </>
    ),
    architecture: (
      <>
        <path d="M12 3v18" />
        <path d="m6 9 6-6 6 6" />
        <path d="M5 21h14" />
        <path d="M8 21v-8h8v8" />
      </>
    ),
    export: (
      <>
        <path d="M12 3v12" />
        <path d="m7 8 5-5 5 5" />
        <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
      </>
    ),
    attach: (
      <>
        <path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4 20-7Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
        <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </>
    ),
    tree: (
      <>
        <path d="M12 3v6" />
        <path d="M6 15v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3" />
        <path d="M4 21h4v-6H4v6Z" />
        <path d="M10 21h4v-6h-4v6Z" />
        <path d="M16 21h4v-6h-4v6Z" />
      </>
    ),
    spark: (
      <>
        <path d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2L12 3Z" />
        <path d="M19 3v4" />
        <path d="M21 5h-4" />
      </>
    ),
    check: <path d="m20 6-11 11-5-5" />,
    warning: (
      <>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </>
    ),
    code: (
      <>
        <path d="m16 18 6-6-6-6" />
        <path d="m8 6-6 6 6 6" />
      </>
    ),
    layers: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </>
    ),
    note: (
      <>
        <path d="M4 4h16v16H4z" />
        <path d="M8 9h8" />
        <path d="M8 13h6" />
      </>
    ),
    copy: (
      <>
        <path d="M8 8h12v12H8z" />
        <path d="M4 16V4h12" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <g className={common}>{paths[name]}</g>
    </svg>
  );
}

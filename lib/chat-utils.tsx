import React, { type ReactNode } from "react";
import { URL_REGEX, MAX_URLS } from "./chat-types";

export function extractUrlsFromText(text: string): string[] {
  if (!text?.trim()) return [];
  const matches = text.match(URL_REGEX) || [];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const u of matches) {
    const normalized = u.replace(/[.,;:!?)]+$/, "");
    if (!seen.has(normalized) && urls.length < MAX_URLS) {
      seen.add(normalized);
      urls.push(normalized);
    }
  }
  return urls;
}

const defaultUrlClassName = "chat-message-url";

export function renderTextWithUrls(
  text: string,
  options?: { urlClassName?: string }
): ReactNode {
  if (!text?.trim()) return text;
  const urlClassName = options?.urlClassName ?? defaultUrlClassName;
  const parts: { type: "text" | "url"; value: string }[] = [];
  let lastIndex = 0;
  const re = new RegExp(URL_REGEX.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, m.index) });
    }
    parts.push({ type: "url", value: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  if (parts.length === 0) return text;
  return parts.map((p, i) =>
    p.type === "url" ? (
      <a
        key={i}
        href={p.value}
        target="_blank"
        rel="noopener noreferrer"
        className={urlClassName}
      >
        {p.value}
      </a>
    ) : (
      <span key={i}>{p.value}</span>
    )
  );
}

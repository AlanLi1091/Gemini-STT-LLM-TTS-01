const MESSAGE_LIMIT = 2000;

/** Preserve text verbatim; prefer paragraph/line endings within Discord's limit. */
export function splitMessage(content: string): string[] {
  const parts: string[] = [];
  let offset = 0;
  while (offset < content.length) {
    const remaining = content.slice(offset);
    if (remaining.length <= MESSAGE_LIMIT) { parts.push(remaining); break; }
    const window = remaining.slice(0, MESSAGE_LIMIT);
    let cut = 0;
    for (const match of window.matchAll(/\r?\n\r?\n/g)) {
      const end = match.index! + match[0].length;
      if (window.slice(0, end).trim()) cut = end;
    }
    if (!cut) {
      const end = window.lastIndexOf('\n') + 1;
      if (end && window.slice(0, end).trim()) cut = end;
    }
    if (!cut) cut = MESSAGE_LIMIT;
    // A hard boundary must not separate a surrogate pair or a CRLF sequence.
    const before = remaining.charCodeAt(cut - 1);
    const after = remaining.charCodeAt(cut);
    if ((before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff) ||
        (before === 13 && after === 10)) cut--;
    parts.push(remaining.slice(0, cut));
    offset += cut;
  }
  return parts;
}

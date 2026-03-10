export interface M3UChannel {
  name: string;
  group: string;
  logoUrl: string;
  url: string;
  epgId: string;
  tvgName: string;
}

interface ExtInfAttributes {
  [key: string]: string;
}

function parseAttributes(line: string): ExtInfAttributes {
  const attrs: ExtInfAttributes = {};
  const regex = /(\w[\w-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function extractDisplayName(line: string): string {
  const commaIdx = line.lastIndexOf(",");
  if (commaIdx === -1) return "";
  return line.substring(commaIdx + 1).trim();
}

export function parseM3U(content: string): M3UChannel[] {
  const lines = content.split(/\r?\n/);
  const channels: M3UChannel[] = [];

  let currentAttrs: ExtInfAttributes = {};
  let currentName = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "#EXTM3U") continue;

    if (trimmed.startsWith("#EXTINF:")) {
      currentAttrs = parseAttributes(trimmed);
      currentName = extractDisplayName(trimmed);
      continue;
    }

    if (trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("http") || trimmed.startsWith("rtmp")) {
      channels.push({
        name: currentAttrs["tvg-name"] || currentName,
        group: currentAttrs["group-title"] || "",
        logoUrl: currentAttrs["tvg-logo"] || "",
        url: trimmed,
        epgId: currentAttrs["tvg-id"] || "",
        tvgName: currentAttrs["tvg-name"] || currentName,
      });
      currentAttrs = {};
      currentName = "";
    }
  }

  return channels;
}

export function groupByCategory(
  channels: M3UChannel[],
): Record<string, M3UChannel[]> {
  const groups: Record<string, M3UChannel[]> = {};
  for (const ch of channels) {
    const key = ch.group || "Uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(ch);
  }
  return groups;
}

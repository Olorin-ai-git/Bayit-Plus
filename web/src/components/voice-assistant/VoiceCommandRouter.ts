import logger from "@bayit/shared-utils/logger";

const routerLogger = logger.scope("VoiceCommandRouter");

export type VoiceIntent =
  | "play"
  | "search"
  | "navigate"
  | "control"
  | "timer"
  | "chat";

export interface VoiceCommand {
  intent: VoiceIntent;
  rawText: string;
  params: Record<string, string>;
}

export interface VoiceAction {
  type: "navigate" | "play" | "control" | "search" | "timer" | "chat";
  payload: Record<string, string>;
}

const PLAY_PATTERNS = [
  /play\s+channel\s+(\d+)/i,
  /play\s+(.+)/i,
  /watch\s+(.+)/i,
  /listen\s+to\s+(.+)/i,
];

const NAV_PATTERNS: Array<{ pattern: RegExp; route: string }> = [
  { pattern: /go\s+(?:to\s+)?home/i, route: "/" },
  { pattern: /go\s+(?:to\s+)?live/i, route: "/live" },
  { pattern: /go\s+(?:to\s+)?radio/i, route: "/radio" },
  { pattern: /go\s+(?:to\s+)?settings/i, route: "/settings" },
  { pattern: /go\s+(?:to\s+)?discover/i, route: "/discover" },
  { pattern: /go\s+(?:to\s+)?search/i, route: "/search" },
  { pattern: /go\s+(?:to\s+)?messages/i, route: "/messages" },
];

const CONTROL_PATTERNS = [
  /pause/i,
  /resume/i,
  /stop/i,
  /mute/i,
  /unmute/i,
  /volume\s+(up|down)/i,
  /next\s+(?:episode|channel)/i,
  /previous\s+(?:episode|channel)/i,
];

const TIMER_PATTERN =
  /(?:set\s+)?(?:sleep\s+)?timer\s+(?:for\s+)?(\d+)\s*(min|minute|minutes|hour|hours)/i;

export function parseVoiceCommand(text: string): VoiceCommand {
  const normalized = text.trim().toLowerCase();

  for (const { pattern, route } of NAV_PATTERNS) {
    if (pattern.test(normalized)) {
      return { intent: "navigate", rawText: text, params: { route } };
    }
  }

  const timerMatch = normalized.match(TIMER_PATTERN);
  if (timerMatch) {
    const amount = timerMatch[1];
    const unit = timerMatch[2].startsWith("hour") ? "hours" : "minutes";
    return {
      intent: "timer",
      rawText: text,
      params: { amount, unit },
    };
  }

  for (const pattern of PLAY_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      return {
        intent: "play",
        rawText: text,
        params: { query: match[1] },
      };
    }
  }

  for (const pattern of CONTROL_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      return {
        intent: "control",
        rawText: text,
        params: { action: match[0] },
      };
    }
  }

  if (/search\s+(?:for\s+)?(.+)/i.test(normalized)) {
    const match = normalized.match(/search\s+(?:for\s+)?(.+)/i);
    return {
      intent: "search",
      rawText: text,
      params: { query: match?.[1] || text },
    };
  }

  return { intent: "chat", rawText: text, params: {} };
}

export function routeCommand(command: VoiceCommand): VoiceAction {
  routerLogger.info("Routing voice command", {
    intent: command.intent,
    params: command.params,
  });

  switch (command.intent) {
    case "navigate":
      return { type: "navigate", payload: { route: command.params.route } };
    case "play":
      return { type: "play", payload: { query: command.params.query } };
    case "search":
      return { type: "search", payload: { query: command.params.query } };
    case "control":
      return { type: "control", payload: { action: command.params.action } };
    case "timer":
      return {
        type: "timer",
        payload: {
          amount: command.params.amount,
          unit: command.params.unit,
        },
      };
    case "chat":
    default:
      return { type: "chat", payload: { message: command.rawText } };
  }
}

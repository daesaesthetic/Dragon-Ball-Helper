import type { Message } from "discord.js";
import { logger } from "../../lib/logger.js";
import { getCachedGuildConfig } from "./config.js";

// ---------- Types ----------
export interface AutomodResult {
  flagged: boolean;
  reason?: string;
  action: "none" | "delete" | "delete_warn" | "timeout";
  timeoutSeconds?: number;
}

// ---------- Spam tracking ----------
interface SpamEntry {
  content: string;
  timestamps: number[];
}
const spamTracker = new Map<string, SpamEntry>(); // userId-guildId -> entry

// ---------- Rule: Banned words ----------
function checkBannedWords(content: string, guildId: string): AutomodResult {
  const cfg = getCachedGuildConfig(guildId);
  const lower = content.toLowerCase();

  for (const word of cfg.bannedWords) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(lower)) {
      return {
        flagged: true,
        reason: `Banned word detected: \`${word}\``,
        action: "delete_warn",
      };
    }
  }
  return { flagged: false, action: "none" };
}

// ---------- Rule: Invite links ----------
const INVITE_REGEX =
  /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/[a-z0-9-]+/i;
const URL_REGEX = /https?:\/\/[^\s]+/i;

function checkLinks(content: string, guildId: string): AutomodResult {
  const cfg = getCachedGuildConfig(guildId);
  if (!cfg.linkFilter) return { flagged: false, action: "none" };

  if (INVITE_REGEX.test(content)) {
    return {
      flagged: true,
      reason: "Unsolicited Discord invite link",
      action: "delete_warn",
    };
  }
  if (URL_REGEX.test(content)) {
    return {
      flagged: true,
      reason: "Link detected — links are restricted in this server",
      action: "delete",
    };
  }
  return { flagged: false, action: "none" };
}

// ---------- Rule: Mass mentions ----------
function checkMentions(message: Message, guildId: string): AutomodResult {
  const cfg = getCachedGuildConfig(guildId);
  const mentionCount =
    message.mentions.users.size + message.mentions.roles.size;

  if (mentionCount > cfg.maxMentions) {
    return {
      flagged: true,
      reason: `Mass mention (${mentionCount} mentions)`,
      action: "delete_warn",
    };
  }
  return { flagged: false, action: "none" };
}

// ---------- Rule: Spam (repeated messages) ----------
function checkSpam(message: Message, guildId: string): AutomodResult {
  const cfg = getCachedGuildConfig(guildId);
  if (!cfg.spamFilter) return { flagged: false, action: "none" };

  const key = `${message.author.id}-${guildId}`;
  const now = Date.now();
  const windowMs = 5000; // 5-second window

  const entry = spamTracker.get(key) ?? { content: "", timestamps: [] };

  // Keep only timestamps within the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.content === message.content) {
    entry.timestamps.push(now);
    if (entry.timestamps.length >= cfg.maxDuplicateMessages) {
      spamTracker.set(key, entry);
      return {
        flagged: true,
        reason: `Spam: ${entry.timestamps.length} identical messages in 5 seconds`,
        action: "delete_warn",
        timeoutSeconds: 60,
      };
    }
  } else {
    entry.content = message.content;
    entry.timestamps = [now];
  }

  spamTracker.set(key, entry);
  return { flagged: false, action: "none" };
}

// ---------- Main evaluator ----------
export async function evaluateMessage(message: Message): Promise<AutomodResult> {
  if (!message.guild) return { flagged: false, action: "none" };
  if (message.author.bot) return { flagged: false, action: "none" };

  const guildId = message.guild.id;
  const content = message.content;

  const checks: AutomodResult[] = [
    checkBannedWords(content, guildId),
    checkLinks(content, guildId),
    checkMentions(message, guildId),
    checkSpam(message, guildId),
  ];

  // Return the most severe result
  const flagged = checks.find((r) => r.flagged);
  if (flagged) {
    logger.info(
      { guildId, userId: message.author.id, reason: flagged.reason },
      "Automod flagged message",
    );
    return flagged;
  }

  return { flagged: false, action: "none" };
}

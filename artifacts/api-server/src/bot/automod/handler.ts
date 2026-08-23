import type { Message, GuildMember } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { evaluateMessage } from "./rules.js";
import { logger } from "../../lib/logger.js";
import { recordModerationLog } from "../moderation-log.js";

async function tryTimeout(
  member: GuildMember,
  seconds: number,
  reason: string,
): Promise<void> {
  try {
    await member.timeout(seconds * 1000, reason);
  } catch (err) {
    logger.warn({ err }, "Failed to timeout member");
  }
}

export async function handleAutomod(message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;

  // Don't moderate admins or moderators
  const member = message.member;
  if (
    member?.permissions.has(PermissionFlagsBits.ManageMessages) ||
    member?.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return;
  }

  const result = await evaluateMessage(message);
  if (!result.flagged) return;

  const { action, reason, timeoutSeconds } = result;

  // Delete the message
  if (action === "delete" || action === "delete_warn") {
    try {
      await message.delete();
    } catch (err) {
      logger.warn({ err }, "Failed to delete flagged message");
    }
  }

  // Warn the user via DM / channel notice
  if (action === "delete_warn") {
    try {
      if (!("send" in message.channel)) return;
      const warning = await message.channel.send({
        content: `⚠️ <@${message.author.id}>, your message was removed: **${reason}**`,
      });
      // Auto-delete the warning after 8 seconds
      setTimeout(() => {
        warning.delete().catch(() => {});
      }, 8000);
    } catch (err) {
      logger.warn({ err }, "Failed to send automod warning");
    }
  }

  // Timeout the member if spam
  if (action === "timeout" && member && timeoutSeconds) {
    await tryTimeout(member, timeoutSeconds, reason ?? "Automod timeout");
  } else if (
    action === "delete_warn" &&
    result.timeoutSeconds &&
    member
  ) {
    await tryTimeout(member, result.timeoutSeconds, reason ?? "Automod timeout");
  }

  logger.info(
    { action, reason, userId: message.author.id, guildId: message.guild.id },
    "Automod action taken",
  );
  await recordModerationLog({
    guildId: message.guild.id,
    userId: message.author.id,
    username: message.author.username,
    action,
    reason: reason ?? "Automod action",
    messageContent: message.content,
  });
}

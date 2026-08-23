import { and, eq, isNotNull } from "drizzle-orm";
import type { Client, Guild } from "discord.js";
import { db, infractionsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

function schedule(callback: () => Promise<void>, delayMs: number): void {
  const maxDelay = 2_147_000_000;
  if (delayMs > maxDelay) {
    setTimeout(() => schedule(callback, delayMs - maxDelay), maxDelay);
    return;
  }
  setTimeout(() => {
    callback().catch((err) => logger.warn({ err }, "Timed ban unban failed"));
  }, Math.max(0, delayMs));
}

export function scheduleTimedUnban(
  guild: Guild,
  userId: string,
  durationSeconds: number,
): void {
  schedule(async () => {
    await guild.members.unban(userId, "Temporary ban duration completed");
    logger.info({ guildId: guild.id, userId }, "Temporary ban completed");
  }, durationSeconds * 1000);
}

export async function restoreTimedBans(client: Client): Promise<void> {
  const timedBans = await db
    .select()
    .from(infractionsTable)
    .where(
      and(
        eq(infractionsTable.type, "ban"),
        isNotNull(infractionsTable.durationSeconds),
      ),
    );

  for (const ban of timedBans) {
    if (!ban.durationSeconds) continue;
    const delayMs = ban.createdAt.getTime() + ban.durationSeconds * 1000 - Date.now();
    const guild = client.guilds.cache.get(ban.guildId);
    if (!guild) continue;
    scheduleTimedUnban(guild, ban.userId, Math.max(0, Math.ceil(delayMs / 1000)));
  }
}
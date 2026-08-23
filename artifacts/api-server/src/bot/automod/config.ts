import { db, guildAutomodConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface GuildAutomodConfig {
  bannedWords: string[];
  linkFilter: boolean;
  spamFilter: boolean;
  maxMentions: number;
  maxDuplicateMessages: number;
}

export const DEFAULT_AUTOMOD_CONFIG: GuildAutomodConfig = {
  bannedWords: [],
  linkFilter: true,
  spamFilter: true,
  maxMentions: 5,
  maxDuplicateMessages: 3,
};

export const guildConfigs = new Map<string, GuildAutomodConfig>();

function toConfig(row: typeof guildAutomodConfigsTable.$inferSelect): GuildAutomodConfig {
  return {
    bannedWords: row.bannedWords,
    linkFilter: row.linkFilter,
    spamFilter: row.spamFilter,
    maxMentions: row.maxMentions,
    maxDuplicateMessages: row.maxDuplicateMessages,
  };
}

export function getCachedGuildConfig(guildId: string): GuildAutomodConfig {
  const cached = guildConfigs.get(guildId);
  if (cached) return cached;

  const config = { ...DEFAULT_AUTOMOD_CONFIG, bannedWords: [] };
  guildConfigs.set(guildId, config);
  return config;
}

export async function loadGuildConfig(guildId: string): Promise<GuildAutomodConfig> {
  const [row] = await db
    .select()
    .from(guildAutomodConfigsTable)
    .where(eq(guildAutomodConfigsTable.guildId, guildId));

  if (!row) {
    return getCachedGuildConfig(guildId);
  }

  const config = toConfig(row);
  guildConfigs.set(guildId, config);
  return config;
}

export async function saveGuildConfig(
  guildId: string,
  update: Partial<GuildAutomodConfig>,
): Promise<GuildAutomodConfig> {
  const config = { ...getCachedGuildConfig(guildId), ...update };
  guildConfigs.set(guildId, config);

  const [row] = await db
    .insert(guildAutomodConfigsTable)
    .values({ guildId, ...config })
    .onConflictDoUpdate({
      target: guildAutomodConfigsTable.guildId,
      set: { ...config, updatedAt: new Date() },
    })
    .returning();

  return toConfig(row);
}

export async function hydrateAutomodConfigCache(): Promise<void> {
  const rows = await db.select().from(guildAutomodConfigsTable);
  for (const row of rows) {
    guildConfigs.set(row.guildId, toConfig(row));
  }
}
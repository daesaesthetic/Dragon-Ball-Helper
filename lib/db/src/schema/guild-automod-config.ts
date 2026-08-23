import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const guildAutomodConfigsTable = pgTable("guild_automod_configs", {
  guildId: text("guild_id").primaryKey(),
  linkFilter: boolean("link_filter").notNull().default(true),
  spamFilter: boolean("spam_filter").notNull().default(true),
  maxMentions: integer("max_mentions").notNull().default(5),
  maxDuplicateMessages: integer("max_duplicate_messages").notNull().default(3),
  bannedWords: text("banned_words")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertGuildAutomodConfigSchema = createInsertSchema(
  guildAutomodConfigsTable,
).omit({ updatedAt: true });

export type InsertGuildAutomodConfig = z.infer<
  typeof insertGuildAutomodConfigSchema
>;
export type GuildAutomodConfig = typeof guildAutomodConfigsTable.$inferSelect;
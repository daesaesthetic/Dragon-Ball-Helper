import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const moderationLogsTable = pgTable("moderation_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  messageContent: text("message_content"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertModerationLogSchema = createInsertSchema(
  moderationLogsTable,
).omit({ createdAt: true });

export type InsertModerationLog = z.infer<typeof insertModerationLogSchema>;
export type ModerationLog = typeof moderationLogsTable.$inferSelect;
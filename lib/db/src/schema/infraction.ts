import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const infractionsTable = pgTable("infractions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  moderatorId: text("moderator_id").notNull(),
  moderatorUsername: text("moderator_username").notNull(),
  type: text("type").notNull(),
  reason: text("reason").notNull(),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertInfractionSchema = createInsertSchema(infractionsTable).omit({
  createdAt: true,
});

export type InsertInfraction = z.infer<typeof insertInfractionSchema>;
export type Infraction = typeof infractionsTable.$inferSelect;
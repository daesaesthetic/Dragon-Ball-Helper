import { db, moderationLogsTable } from "@workspace/db";

export async function recordModerationLog(input: {
  guildId: string;
  userId: string;
  username: string;
  action: string;
  reason: string;
  messageContent?: string | null;
}): Promise<void> {
  await db.insert(moderationLogsTable).values({
    ...input,
    messageContent: input.messageContent ?? null,
  });
}
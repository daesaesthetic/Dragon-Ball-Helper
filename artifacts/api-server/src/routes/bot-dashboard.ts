import { Router, type IRouter } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import {
  AddBannedWordBody,
  AddBannedWordParams,
  AddBannedWordResponse,
  CreateInfractionBody,
  CreateInfractionParams,
  CreateInfractionResponse,
  DeleteInfractionParams,
  GetBotStatusResponse,
  GetGuildConfigParams,
  GetGuildConfigResponse,
  GetGuildsResponse,
  GetInfractionsParams,
  GetInfractionsQueryParams,
  GetInfractionsResponse,
  GetModerationLogsParams,
  GetModerationLogsQueryParams,
  GetModerationLogsResponse,
  RemoveBannedWordBody,
  RemoveBannedWordParams,
  RemoveBannedWordResponse,
  UpdateGuildConfigBody,
  UpdateGuildConfigParams,
  UpdateGuildConfigResponse,
} from "@workspace/api-zod";
import {
  db,
  infractionsTable,
  moderationLogsTable,
} from "@workspace/db";
import { client } from "../bot/index.js";
import {
  loadGuildConfig,
  saveGuildConfig,
} from "../bot/automod/config.js";

const router: IRouter = Router();

function parseOrRespond<T extends { success: boolean }>(
  result: T,
  res: Parameters<typeof router.get>[1] extends never ? never : any,
): result is T & { success: true } {
  if (!result.success) {
    res.status(400).json({ error: "Invalid request data" });
    return false;
  }
  return true;
}

function serializeConfig(guildId: string, config: Awaited<ReturnType<typeof loadGuildConfig>>) {
  return {
    guildId,
    ...config,
    updatedAt: new Date(),
  };
}

router.get("/bot/status", (_req, res): void => {
  const online = client.isReady();
  const data = GetBotStatusResponse.parse({
    online,
    guildCount: client.guilds.cache.size,
    uptime: online ? Math.floor((client.uptime ?? 0) / 1000) : 0,
    latencyMs: online ? Math.max(0, Math.round(client.ws.ping)) : 0,
    username: client.user?.username ?? "Discord Bot",
    tag:
      client.user?.discriminator && client.user.discriminator !== "0"
        ? client.user.discriminator
        : "",
  });
  res.json(data);
});

router.get("/guilds", (_req, res): void => {
  const data = [...client.guilds.cache.values()].map((guild) => ({
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
    iconUrl: guild.iconURL(),
  }));
  res.json(GetGuildsResponse.parse(data));
});

router.get("/guilds/:guildId/config", async (req, res): Promise<void> => {
  const params = GetGuildConfigParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const config = await loadGuildConfig(params.data.guildId);
  res.json(GetGuildConfigResponse.parse(serializeConfig(params.data.guildId, config)));
});

router.put("/guilds/:guildId/config", async (req, res): Promise<void> => {
  const params = UpdateGuildConfigParams.safeParse(req.params);
  const body = UpdateGuildConfigBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid configuration update" });
    return;
  }
  const config = await saveGuildConfig(params.data.guildId, body.data);
  res.json(UpdateGuildConfigResponse.parse(serializeConfig(params.data.guildId, config)));
});

router.post("/guilds/:guildId/config/words", async (req, res): Promise<void> => {
  const params = AddBannedWordParams.safeParse(req.params);
  const body = AddBannedWordBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid banned word request" });
    return;
  }
  const word = body.data.word.toLowerCase().trim();
  const current = await loadGuildConfig(params.data.guildId);
  const config = await saveGuildConfig(params.data.guildId, {
    bannedWords: current.bannedWords.includes(word)
      ? current.bannedWords
      : [...current.bannedWords, word],
  });
  res.json(AddBannedWordResponse.parse(serializeConfig(params.data.guildId, config)));
});

router.delete("/guilds/:guildId/config/words", async (req, res): Promise<void> => {
  const params = RemoveBannedWordParams.safeParse(req.params);
  const body = RemoveBannedWordBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid banned word request" });
    return;
  }
  const word = body.data.word.toLowerCase().trim();
  const current = await loadGuildConfig(params.data.guildId);
  const config = await saveGuildConfig(params.data.guildId, {
    bannedWords: current.bannedWords.filter((entry) => entry !== word),
  });
  res.json(RemoveBannedWordResponse.parse(serializeConfig(params.data.guildId, config)));
});

router.get("/guilds/:guildId/logs", async (req, res): Promise<void> => {
  const params = GetModerationLogsParams.safeParse(req.params);
  const query = GetModerationLogsQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Invalid log query" });
    return;
  }
  const { page, limit } = query.data;
  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(moderationLogsTable)
      .where(eq(moderationLogsTable.guildId, params.data.guildId))
      .orderBy(desc(moderationLogsTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ total: count() })
      .from(moderationLogsTable)
      .where(eq(moderationLogsTable.guildId, params.data.guildId)),
  ]);
  res.json(
    GetModerationLogsResponse.parse({
      items,
      total: totalResult[0]?.total ?? 0,
      page,
      limit,
    }),
  );
});

router.get("/guilds/:guildId/infractions", async (req, res): Promise<void> => {
  const params = GetInfractionsParams.safeParse(req.params);
  const query = GetInfractionsQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Invalid infraction query" });
    return;
  }
  const { page, limit, userId } = query.data;
  const condition = userId
    ? and(
        eq(infractionsTable.guildId, params.data.guildId),
        eq(infractionsTable.userId, userId),
      )
    : eq(infractionsTable.guildId, params.data.guildId);
  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(infractionsTable)
      .where(condition)
      .orderBy(desc(infractionsTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(infractionsTable).where(condition),
  ]);
  res.json(
    GetInfractionsResponse.parse({
      items,
      total: totalResult[0]?.total ?? 0,
      page,
      limit,
    }),
  );
});

router.post("/guilds/:guildId/infractions", async (req, res): Promise<void> => {
  const params = CreateInfractionParams.safeParse(req.params);
  const body = CreateInfractionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid infraction request" });
    return;
  }
  const [infraction] = await db
    .insert(infractionsTable)
    .values({ guildId: params.data.guildId, ...body.data, durationSeconds: body.data.durationSeconds ?? null })
    .returning();
  res.status(201).json(CreateInfractionResponse.parse(infraction));
});

router.delete(
  "/guilds/:guildId/infractions/:infractionId",
  async (req, res): Promise<void> => {
    const params = DeleteInfractionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(infractionsTable)
      .where(
        and(
          eq(infractionsTable.guildId, params.data.guildId),
          eq(infractionsTable.id, params.data.infractionId),
        ),
      );
    res.sendStatus(204);
  },
);

export default router;
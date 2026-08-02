/**
 * Registers (or updates) slash commands with Discord.
 * Run: node --import tsx/esm src/bot/deploy-commands.ts
 * Or via: pnpm --filter @workspace/api-server run deploy-commands
 *
 * Supports both user installs and guild installs by using
 * global (application-level) command registration with the appropriate
 * integration types.
 */
import { REST, Routes } from "discord.js";
import { ApplicationIntegrationType, InteractionContextType } from "discord.js";
import * as speakCommand from "./commands/speak.js";
import * as automodCommand from "./commands/automod.js";
import { logger } from "../lib/logger.js";

const token = process.env["DISCORD_BOT_TOKEN"];
const applicationId = process.env["DISCORD_APPLICATION_ID"];

if (!token || !applicationId) {
  logger.error("DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID must be set");
  process.exit(1);
}

// Build command payloads with integration type metadata
// GUILD_INSTALL + USER_INSTALL = works everywhere (any server + user-installed contexts)
const commandsPayload = [speakCommand.data, automodCommand.data].map((cmd) => {
  const json = cmd.toJSON() as unknown as Record<string, unknown>;
  json["integration_types"] = [
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  ];
  json["contexts"] = [
    InteractionContextType.Guild,
    InteractionContextType.BotDM,
    InteractionContextType.PrivateChannel,
  ];
  return json;
});

const rest = new REST({ version: "10" }).setToken(token);

async function deploy() {
  logger.info("Registering global slash commands…");

  const data = await rest.put(Routes.applicationCommands(applicationId!), {
    body: commandsPayload,
  });

  logger.info(
    { count: (data as unknown[]).length },
    "Successfully registered global slash commands",
  );
}

deploy().catch((err) => {
  logger.error({ err }, "Failed to register commands");
  process.exit(1);
});

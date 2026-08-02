import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
  type ChatInputCommandInteraction,
  type SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { handleAutomod } from "./automod/handler.js";
import * as speakCommand from "./commands/speak.js";
import * as automodCommand from "./commands/automod.js";

// ---------- Command registry ----------
interface Command {
  data: SlashCommandBuilder | ReturnType<SlashCommandBuilder["addSubcommand"]>;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();
commands.set(speakCommand.data.name, speakCommand as unknown as Command);
commands.set(automodCommand.data.name, automodCommand as unknown as Command);

// ---------- Client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ---------- Ready ----------
client.once(Events.ClientReady, (readyClient) => {
  logger.info({ tag: readyClient.user.tag }, "Discord bot is ready");
});

// ---------- Messages → automod ----------
client.on(Events.MessageCreate, async (message) => {
  try {
    await handleAutomod(message);
  } catch (err) {
    logger.error({ err }, "Error in automod handler");
  }
});

// ---------- Interaction → commands ----------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    logger.error({ err, command: interaction.commandName }, "Command error");
    const reply = { content: "❌ An error occurred running that command.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

// ---------- Start ----------
export async function startBot(): Promise<void> {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    logger.warn("DISCORD_BOT_TOKEN not set — bot will not start");
    return;
  }

  await client.login(token);
}

export { client, commands };

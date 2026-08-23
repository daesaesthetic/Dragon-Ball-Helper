import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import {
  getCachedGuildConfig,
  loadGuildConfig,
  saveGuildConfig,
} from "../automod/config.js";

export const data = new SlashCommandBuilder()
  .setName("automod")
  .setDescription("Configure automatic moderation for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub.setName("status").setDescription("Show current automod settings"),
  )
  .addSubcommand((sub) =>
    sub
      .setName("linkfilter")
      .setDescription("Toggle the link/invite filter on or off")
      .addBooleanOption((o) =>
        o.setName("enabled").setDescription("Enable or disable").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("spamfilter")
      .setDescription("Toggle the spam/duplicate-message filter on or off")
      .addBooleanOption((o) =>
        o.setName("enabled").setDescription("Enable or disable").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("addword")
      .setDescription("Add a word to the banned-words list")
      .addStringOption((o) =>
        o.setName("word").setDescription("The word to ban").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("removeword")
      .setDescription("Remove a word from the banned-words list")
      .addStringOption((o) =>
        o.setName("word").setDescription("The word to remove").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("maxmentions")
      .setDescription("Set the maximum allowed mentions per message")
      .addIntegerOption((o) =>
        o
          .setName("count")
          .setDescription("Maximum mentions (default: 5)")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(20),
      ),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const cfg = await loadGuildConfig(guildId);

  switch (sub) {
    case "status": {
      const embed = new EmbedBuilder()
        .setTitle("🛡️ Automod Status")
        .setColor(0x5865f2)
        .addFields(
          {
            name: "Link Filter",
            value: cfg.linkFilter ? "✅ Enabled" : "❌ Disabled",
            inline: true,
          },
          {
            name: "Spam Filter",
            value: cfg.spamFilter ? "✅ Enabled" : "❌ Disabled",
            inline: true,
          },
          {
            name: "Max Mentions",
            value: `${cfg.maxMentions}`,
            inline: true,
          },
          {
            name: "Banned Words",
            value:
              cfg.bannedWords.length > 0
                ? `||${cfg.bannedWords.join(", ")}||`
                : "None",
          },
        )
        .setFooter({ text: "Settings are saved automatically" });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      break;
    }

    case "linkfilter": {
      await saveGuildConfig(guildId, {
        linkFilter: interaction.options.getBoolean("enabled", true),
      });
      await interaction.reply({
        content: `Link filter is now **${getCachedGuildConfig(guildId).linkFilter ? "enabled" : "disabled"}**.`,
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case "spamfilter": {
      await saveGuildConfig(guildId, {
        spamFilter: interaction.options.getBoolean("enabled", true),
      });
      await interaction.reply({
        content: `Spam filter is now **${getCachedGuildConfig(guildId).spamFilter ? "enabled" : "disabled"}**.`,
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case "addword": {
      const word = interaction.options.getString("word", true).toLowerCase().trim();
      if (!cfg.bannedWords.includes(word)) {
        await saveGuildConfig(guildId, {
          bannedWords: [...cfg.bannedWords, word],
        });
      }
      await interaction.reply({
        content: `Added \`${word}\` to the banned-words list.`,
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case "removeword": {
      const word = interaction.options.getString("word", true).toLowerCase().trim();
      const idx = cfg.bannedWords.indexOf(word);
      if (idx !== -1) {
        await saveGuildConfig(guildId, {
          bannedWords: cfg.bannedWords.filter((savedWord) => savedWord !== word),
        });
      }
      await interaction.reply({
        content:
          idx !== -1
            ? `Removed \`${word}\` from the banned-words list.`
            : `\`${word}\` was not in the list.`,
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    case "maxmentions": {
      await saveGuildConfig(guildId, {
        maxMentions: interaction.options.getInteger("count", true),
      });
      await interaction.reply({
        content: `Max mentions per message set to **${getCachedGuildConfig(guildId).maxMentions}**.`,
        flags: MessageFlags.Ephemeral,
      });
      break;
    }

    default:
      await interaction.reply({
        content: "Unknown subcommand.",
        flags: MessageFlags.Ephemeral,
      });
  }
}

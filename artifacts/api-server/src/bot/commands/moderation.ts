import {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { and, desc, eq } from "drizzle-orm";
import { db, infractionsTable } from "@workspace/db";
import { scheduleTimedUnban } from "../timed-bans.js";

interface Command {
  data: ReturnType<SlashCommandBuilder["addUserOption"]>;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

function requireGuild(interaction: ChatInputCommandInteraction): boolean {
  return Boolean(interaction.guild && interaction.guildId);
}

async function createInfraction(input: {
  interaction: ChatInputCommandInteraction;
  member: GuildMember;
  type: "warn" | "kick" | "ban";
  reason: string;
  durationSeconds?: number;
}): Promise<void> {
  const { interaction, member, type, reason, durationSeconds } = input;
  await db.insert(infractionsTable).values({
    guildId: interaction.guildId!,
    userId: member.id,
    username: member.user.username,
    moderatorId: interaction.user.id,
    moderatorUsername: interaction.user.username,
    type,
    reason,
    durationSeconds: durationSeconds ?? null,
  });
}

function parseDuration(raw: string): number | null {
  const match = /^(\d+)\s*([mhdw])$/i.exec(raw.trim());
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier: Record<string, number> = {
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };
  const seconds = value * multiplier[unit]!;
  return seconds > 0 && seconds <= 2_592_000 ? seconds : null;
}

export const warnCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member and record the infraction")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to warn").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for warning").setRequired(true),
    ),
  async execute(interaction) {
    if (!requireGuild(interaction)) {
      await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    const member = await interaction.guild!.members.fetch(
      interaction.options.getUser("user", true).id,
    );
    const reason = interaction.options.getString("reason", true);
    await createInfraction({ interaction, member, type: "warn", reason });
    await member.send(`You received a warning in **${interaction.guild!.name}**: ${reason}`).catch(() => {});
    await interaction.reply({ content: `Warning recorded for ${member.user.tag}.`, flags: MessageFlags.Ephemeral });
  },
};

export const kickCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member and record the infraction")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to kick").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for kick").setRequired(true),
    ),
  async execute(interaction) {
    if (!requireGuild(interaction)) {
      await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    const member = await interaction.guild!.members.fetch(
      interaction.options.getUser("user", true).id,
    );
    const reason = interaction.options.getString("reason", true);
    if (!member.kickable) {
      await interaction.reply({ content: "I cannot kick that member. Check my role and permissions.", flags: MessageFlags.Ephemeral });
      return;
    }
    await member.send(`You were removed from **${interaction.guild!.name}**: ${reason}`).catch(() => {});
    await member.kick(reason);
    await createInfraction({ interaction, member, type: "kick", reason });
    await interaction.reply({ content: `${member.user.tag} was kicked and the infraction was recorded.`, flags: MessageFlags.Ephemeral });
  },
};

export const banCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member and record the infraction")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to ban").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for ban").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("duration").setDescription("Optional temporary ban, e.g. 30m, 6h, 7d (max 30d)"),
    ),
  async execute(interaction) {
    if (!requireGuild(interaction)) {
      await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    const member = await interaction.guild!.members.fetch(
      interaction.options.getUser("user", true).id,
    );
    const reason = interaction.options.getString("reason", true);
    const durationRaw = interaction.options.getString("duration");
    const durationSeconds = durationRaw ? parseDuration(durationRaw) : null;
    if (durationRaw && !durationSeconds) {
      await interaction.reply({ content: "Use a duration such as `30m`, `6h`, `7d`, or `2w` (max 30d).", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!member.bannable) {
      await interaction.reply({ content: "I cannot ban that member. Check my role and permissions.", flags: MessageFlags.Ephemeral });
      return;
    }
    await member.send(`You were banned from **${interaction.guild!.name}**: ${reason}`).catch(() => {});
    await member.ban({ reason });
    await createInfraction({ interaction, member, type: "ban", reason, durationSeconds: durationSeconds ?? undefined });
    if (durationSeconds) scheduleTimedUnban(interaction.guild!, member.id, durationSeconds);
    await interaction.reply({
      content: `${member.user.tag} was ${durationSeconds ? `temporarily banned for ${durationRaw}` : "banned"} and the infraction was recorded.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export const infractionsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("infractions")
    .setDescription("View a member's moderation history")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to look up").setRequired(true),
    ),
  async execute(interaction) {
    if (!requireGuild(interaction)) {
      await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    const user = interaction.options.getUser("user", true);
    const infractions = await db
      .select()
      .from(infractionsTable)
      .where(and(eq(infractionsTable.guildId, interaction.guildId!), eq(infractionsTable.userId, user.id)))
      .orderBy(desc(infractionsTable.createdAt))
      .limit(10);

    const embed = new EmbedBuilder()
      .setTitle(`Moderation history: ${user.tag}`)
      .setColor(0x5865f2)
      .setDescription(
        infractions.length
          ? infractions
              .map((entry) => `**${entry.type.toUpperCase()}** — ${entry.reason}\n<t:${Math.floor(entry.createdAt.getTime() / 1000)}:R> by ${entry.moderatorUsername}`)
              .join("\n\n")
          : "No infractions found.",
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
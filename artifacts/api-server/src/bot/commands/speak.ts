import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("speak")
  .setDescription("Make the bot send a message in the current channel")
  .addStringOption((option) =>
    option
      .setName("message")
      .setDescription("The message to send")
      .setRequired(true)
      .setMaxLength(2000),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const message = interaction.options.getString("message", true);

  // Acknowledge the interaction ephemerally first
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Send the message to the channel
    if (interaction.channel && "send" in interaction.channel) {
      await interaction.channel.send(message);
    }
    await interaction.editReply({ content: "✅ Message sent." });
  } catch {
    await interaction.editReply({
      content: "❌ Failed to send the message. Check my permissions.",
    });
  }
}

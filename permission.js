const { SlashCommandBuilder } = require('@discordjs/builders');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const handlePermission = require('../../handlePermission'); // Update this path as needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('permission')
        .setDescription('Parent command for permission-related actions.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('request')
                .setDescription('Request permission for something.')
        ),
        
    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'request') {
            const modal = new ModalBuilder()
                .setCustomId('permission_request_modal')
                .setTitle('Permission Request Form');

            const robloxUsernameInput = new TextInputBuilder()
                .setCustomId('roblox_username')
                .setLabel('Roblox Username')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your Roblox username')
                .setRequired(true);

            const durationInput = new TextInputBuilder()
                .setCustomId('duration')
                .setLabel('Duration')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter the duration (e.g., 1 hour, 30 minutes)')
                .setRequired(true);

            const roleplayRequestInput = new TextInputBuilder()
                .setCustomId('roleplay_request')
                .setLabel('Roleplay Request')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter the roleplay you are requesting')
                .setRequired(true);

            const locationInput = new TextInputBuilder()
                .setCustomId('location')
                .setLabel('Location (Optional)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter the location (if applicable)')
                .setRequired(false); // This field is optional

            const firstActionRow = new ActionRowBuilder().addComponents(robloxUsernameInput);
            const secondActionRow = new ActionRowBuilder().addComponents(durationInput);
            const thirdActionRow = new ActionRowBuilder().addComponents(roleplayRequestInput);
            const fourthActionRow = new ActionRowBuilder().addComponents(locationInput);

            modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

            await interaction.showModal(modal);
        } else if (interaction.isButton() || interaction.isModalSubmit()) {
            await handlePermission.execute(interaction);
        }
    }
};

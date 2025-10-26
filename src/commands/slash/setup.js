const { PermissionsBitField, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'setup',
    description: 'Setup the ban appeal system',
    async execute(message, args) {
        // Delete the user's command message
        await message.delete().catch(console.error);

        // Check if user has admin permissions      
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('You need administrator permissions to use this command!')
                .setColor('#FF0000')
            return message.author.send({ embeds: [errorEmbed] }).catch(console.error);
        }

        const channel = message.mentions.channels.first() || message.channel;

        // Create the button
        const button = new ButtonBuilder()
            .setCustomId('ban_appeal')
            .setLabel('Ban Appeal')
            .setEmoji('1324117528657657887')
            .setStyle(ButtonStyle.Secondary);

        // Create the action row
        const row = new ActionRowBuilder()
            .addComponents(button);

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle('Game Ban Appeal')
            .setDescription('Select the button below to submit an in-game ban appeal.')
            .setColor('#2d2d31');

        try {
            const msg = await channel.send({
                embeds: [embed],
                components: [row]
            });

            // Store the message ID for recreation if needed
            message.client.banAppealMessage = {
                channelId: channel.id,
                messageId: msg.id
            };
            // Create success embed for DM
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Setup Complete')
                .setDescription('Ban appeal system has been setup successfully!')
                .setColor('#2f3136')
                .setTimestamp()

            await message.author.send({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Error setting up ban appeal:', error);
            
            // Create error embed for DM
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('There was an error setting up the ban appeal system!')
                .setColor('#FF0000')
                .setTimestamp()

            await message.author.send({ embeds: [errorEmbed] });
        }
    },
};
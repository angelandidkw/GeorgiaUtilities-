const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { setSessionState, getSessionState } = require('./sessionState');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forcesession')
        .setDescription('Force session state')
        .addBooleanOption(option =>
            option.setName('state')
                .setDescription('Set session state (true/false)')
                .setRequired(true)),

    async execute(interaction) {
        // Check if user has the required role (Session Manager)
        if (!interaction.member.roles.cache.has('1244398079852019812')) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
        }

        const newState = interaction.options.getBoolean('state');
        setSessionState(newState);

        const embed = new EmbedBuilder()
            .setColor(newState ? '#3ba55c' : '#ed4245')
            .setAuthor({ 
                name: 'Session State Updated', 
                iconURL: 'https://media.discordapp.net/attachments/1174868806900916304/1340710948197109791/image_21_1.png'
            })
            .setDescription(`Session state has been forcefully set to: **${newState ? 'Active' : 'Inactive'}**`)
            .setFooter({ text: 'Georgia Utilities' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

        // Log the change to a specific channel if needed
        try {
            const logChannel = interaction.guild.channels.cache.get('YOUR_LOG_CHANNEL_ID');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#2d2d31')
                    .setAuthor({
                        name: 'Session State Changed',
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setDescription(`Session state was forcefully changed to: **${newState ? 'Active' : 'Inactive'}**`)
                    .addFields({
                        name: 'Changed By',
                        value: `${interaction.user.toString()} (${interaction.user.id})`
                    })
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('Error logging session state change:', error);
        }
    },
};

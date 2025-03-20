const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('groupinfo')
        .setDescription('Fetches information about our Roblox group.'),
    async execute(interaction) {
        const groupId = '34360233'; // Hardcoded group ID
        const groupUrl = `https://www.roblox.com/groups/${groupId}`;
        
        try {
            // Fetch group details from Roblox API
            const response = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}`);
            const groupInfo = response.data;

            if (!groupInfo || groupInfo.errors) {
                return interaction.reply({ content: '<:X_:1247716366509936772> Group not found or an error occurred.', ephemeral: true });
            }

            // Construct the group URL
            const groupUrl = `https://www.roblox.com/groups/${groupId}`;

            // Fetch group icon
            const iconResponse = await axios.get(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&size=150x150&format=png`);
            const iconUrl = iconResponse.data.data[0]?.imageUrl || null;

            // Construct the owner's profile URL
            const ownerProfileUrl = `https://www.roblox.com/users/${groupInfo.owner.userId}/profile`;

            // Create the embed message
            const groupEmbed = new EmbedBuilder()
                .setColor('#2d2d31') // Discord's brand color
                .setDescription(`**[${groupInfo.name}](${groupUrl})**`) // Group name with clickable link
                .setThumbnail(iconUrl) // Group icon
                .addFields(
                    { name: 'Group ID:', value: `\`${groupInfo.id}\``, inline: true },
                    { name: 'Owner:', value: `[@${groupInfo.owner.username}](${ownerProfileUrl})`, inline: true } // Owner's profile link
                )
                .setImage('https://media.discordapp.net/attachments/919709999423434842/1339969824826327062/georgia_footer_1.png?ex=67b0a7a5&is=67af5625&hm=d45efee8f759eb8d3d314954a8f06063787865a6c074cb79b8393bab750053d7&=&format=webp&quality=lossless&width=3072&height=102'); // Large footer image

            // Buttons for Quick Join & Member Count
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Quick Join')
                    .setURL(groupUrl)
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setLabel(`${groupInfo.memberCount}`)
                	.setEmoji(`<:Personstar:1339979767994257410>`)
                    .setCustomId('disabled-member-count')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            await interaction.reply({ embeds: [groupEmbed], components: [buttons] });
        } catch (error) {
            console.error('Error fetching group information:', error);
            await interaction.reply({ content: '<:X_:1247716366509936772> There was an error trying to fetch group information.', ephemeral: true });
        }
    }
};
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const cooldowns = new Map();
const cooldownTime = 20 * 1000; // 20 seconds in milliseconds
const requiredRoleId = '1145560523316936734';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lookup')
        .setDescription('Looks up a Roblox user by username')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The Roblox username to look up')
                .setRequired(true)),
    async execute(interaction) {
        const { user, member } = interaction;

        if (!member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        if (cooldowns.has(user.id)) {
            const expirationTime = cooldowns.get(user.id) + cooldownTime;
            if (Date.now() < expirationTime) {
                const timeLeft = ((expirationTime - Date.now()) / 1000).toFixed(0);
                return interaction.reply({ content: `You are on cooldown! Please wait ${timeLeft} seconds before using this command again.`, ephemeral: true });
            }
        }
        cooldowns.set(user.id, Date.now());

        const username = interaction.options.getString('username');

        try {
            const response = await axios.post('https://users.roblox.com/v1/usernames/users', {
                usernames: [username],
                excludeBannedUsers: false
            });

            if (response.data.data.length === 0) {
                return interaction.reply({ content: ':no_entry_sign: User not found.', ephemeral: true });
            }

            const user = response.data.data[0];
            const userResponse = await axios.get(`https://users.roblox.com/v1/users/${user.id}`);
            const userInfo = userResponse.data;

            const profileLink = `https://www.roblox.com/users/${userInfo.id}/profile`;

            const avatarResponse = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userInfo.id}&size=420x420&format=png`);
            const avatarUrl = avatarResponse.data.data[0]?.imageUrl || 'https://www.roblox.com/favicon.ico';

            const formattedDescription = userInfo.description
                ? `\`\`\`\n${userInfo.description.replace(/`/g, "'")}\n\`\`\``
                : '_No description available._';

            const lookupEmbed = {
                color: 0x2d2d31,
                description: `# **[${userInfo.name}](${profileLink})**`,
                thumbnail: { url: avatarUrl },
                fields: [
                    { name: 'Username:', value: `\`${userInfo.name}\``, inline: true },
                    { name: 'Display Name:', value: `\`${userInfo.displayName}\``, inline: true },
                    { name: 'User ID:', value: `\`${userInfo.id}\``, inline: true },
                    { name: 'Description:', value: formattedDescription, inline: false }
                ]
            };

            await interaction.reply({ embeds: [lookupEmbed] });
        } catch (error) {
            console.error('Error fetching user information:', error);
            await interaction.reply({ content: ':warning: There was an error trying to fetch user information.', ephemeral: true });
        }
    }
};

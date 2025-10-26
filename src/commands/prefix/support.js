const { EmbedBuilder } = require('discord.js');

// Create a cooldown map
const cooldowns = new Map();

module.exports = {
    name: 'support',
    description: 'Request moderation support and notify the appropriate role.',
    async execute(message, args) {
        const roleID = '1145560523316936734';
        const requiredRoleID = '1244398079852019812';
        const avatarURL = message.author.displayAvatarURL({ format: 'png', dynamic: true, size: 32 });

        const cooldownTime = 2 * 60 * 1000; // 2 minutes in milliseconds
        const now = Date.now();
        const userId = message.author.id;

        // Check if the user has the required role
        if (!message.member.roles.cache.has(requiredRoleID)) {
            return;
        }

        // Check cooldown
        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + cooldownTime;

            if (now < expirationTime) {
                const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
                return message.reply(`Please wait ${timeLeft} more seconds before using this command again.`);
            }
        }

        // Set the cooldown
        cooldowns.set(userId, now);

        const embed = new EmbedBuilder()
            .setTitle('Staff Request')
            .setDescription(`${message.member} has requested moderation backup in-game!`)
            .setColor('#2f3136')
            .setFooter({
                text: `Requested by ${message.member.displayName} | ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour12: true })} EDT`,
                iconURL: avatarURL
            });

        try {
            await message.channel.send({ content: `<@&${roleID}>`, embeds: [embed] });
            await message.delete();
        } catch (error) {
            console.error('Error executing command:', error);
            message.reply('There was an error executing that command!');
        }
    },
};
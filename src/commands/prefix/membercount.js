const { EmbedBuilder } = require('discord.js');

// Cooldown map to track when the command can be run again
const cooldowns = new Map();

module.exports = {
    name: 'membercount',
    description: 'Displays server member count, online members, and boosts.',
    cooldown: 30, // Cooldown in seconds
    async execute(message) {
        const { guild } = message;
        const now = Date.now();
        const cooldownAmount = this.cooldown * 1000;

        // Check if the command is on cooldown
        if (cooldowns.has(message.author.id)) {
            const expirationTime = cooldowns.get(message.author.id) + cooldownAmount;
            if (now < expirationTime) {
                const unixTime = Math.floor(expirationTime / 1000);

                // Reply with cooldown message and delete it after 10 seconds
                const reply = await message.reply(`The command is currently on cooldown. You can use it again <t:${unixTime}:R>.`);
                setTimeout(() => reply.delete().catch(console.error), 10000);
                return;
            }
        }

        // Set the cooldown for the user
        cooldowns.set(message.author.id, now);
        setTimeout(() => cooldowns.delete(message.author.id), cooldownAmount);

        try {
            // Fetch all members to ensure accurate counts
            await guild.members.fetch();

            // Total member count
            const totalMembers = guild.memberCount;

            // Count online members (online, idle, dnd)
            const onlineMembers = guild.members.cache.filter(member => 
                ['online', 'idle', 'dnd'].includes(member.presence?.status)
            ).size;

            // Server boost information
            const boosts = guild.premiumSubscriptionCount || 0;
            const boostLevel = guild.premiumTier;

            // Create the embed
            const embed = new EmbedBuilder()
                .setColor('#2d2d31')
                .setAuthor({
                    name: guild.name,
                    iconURL: guild.iconURL({ dynamic: true }) || 'https://media.discordapp.net/attachments/919709999423434842/1337099272159498361/image_-_2025-02-06T113459.801.png?ex=67aa2abc&is=67a8d93c&hm=3412faa02270d2c6c19246defe5a65493568939d446cf8921d610c075546cc67&=&format=webp&quality=lossless&width=1856&height=92' // Use server's icon or fallback
                })
                .addFields(
                    { name: 'Member Count:', value: totalMembers.toString(), inline: true },
                    { name: 'Online Members:', value: onlineMembers.toString(), inline: true },
                    { name: 'Server Boosts:', value: `${boosts} (Level ${boostLevel})`, inline: true }
                )
                .setImage('https://media.discordapp.net/attachments/919709999423434842/1337099272159498361/image_-_2025-02-06T113459.801.png?ex=67aa2abc&is=67a8d93c&hm=3412faa02270d2c6c19246defe5a65493568939d446cf8921d610c075546cc67&=&format=webp&quality=lossless&width=1858&height=92'); // Use server's banner or fallback

            // Send the embed
            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error("Error fetching members:", error);
            message.reply("There was an error retrieving member data.");
        }
    },
};
const cooldowns = new Map();

module.exports = {
    name: 'ping',
    description: 'Shows bot latency and uptime',
    cooldown: 30, // Cooldown in seconds
    async execute(message) {
        const allowedRoles = ["1145560523316936734", "1173795575251095562"]; // Role IDs allowed to use commands

        const memberRoles = message.member.roles.cache.map(role => role.id);
        if (!allowedRoles.some(role => memberRoles.includes(role))) {
            return message.channel.send("<:X_:1247716366509936772> You do not have permission to use this command.");
        }

        const now = Date.now();
        const cooldownAmount = this.cooldown * 1000;

        // Check if the command is on cooldown
        if (cooldowns.has(message.author.id)) {
            const expirationTime = cooldowns.get(message.author.id) + cooldownAmount;
            if (now < expirationTime) {
                const unixTime = Math.floor(expirationTime / 1000);

                // Reply with cooldown message and delete it after 5 seconds
                const reply = await message.reply(`The command is currently on cooldown. You can use it again <t:${unixTime}:R>.`);
                setTimeout(() => reply.delete().catch(console.error), 5000);
                return;
            }
        }

        // Set the cooldown for the user
        cooldowns.set(message.author.id, now);
        setTimeout(() => cooldowns.delete(message.author.id), cooldownAmount);

        const botLatency = Date.now() - message.createdTimestamp;
        const uptime = `<t:${Math.floor((Date.now() - message.client.uptime) / 1000)}:R>`; // Fixed uptime timestamp

        return message.channel.send(`🏓 **Pong!** \`${botLatency}ms\`  
🕒 **Uptime:** ${uptime}`);
    }
};
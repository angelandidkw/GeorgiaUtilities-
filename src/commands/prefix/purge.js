const cooldowns = new Map();

module.exports = {
    name: "purge",
    description: "Deletes up to 999 messages in a channel",
    cooldown: 10,
    async execute(message, args) {
        const requiredRoleId = "1173795575251095562";

        if (!message.member.roles.cache.has(requiredRoleId)) {
            return message.reply("You don't have the required role to use this command!");
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

        let amount = parseInt(args[0]);

        if (isNaN(amount) || amount < 1 || amount > 998) {
            return message.reply("Please provide a number between 1 and 998.");
        }

        amount += 1;

        try {
            await message.channel.bulkDelete(amount, true);
            message.channel.send(`<:WhiteCheck:1267288609598214247> Purged **${amount - 1}** messages.`).then(msg => {
                setTimeout(() => msg.delete(), 2000);
            });
        } catch (err) {
            console.error(err);
            message.reply("There was an error trying to purge messages!");
        }
    }
};

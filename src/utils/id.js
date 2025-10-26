const cooldowns = new Map();

module.exports = {
  name: 'id',
  description: 'Replies with the user\'s Discord ID.',
  cooldown: 120, // Cooldown time in seconds (2 minutes)
  async execute(message) {
    try {
      if (!message.content.startsWith('!id') || message.author.bot) return;

      const now = Date.now();
      const cooldownAmount = (this.cooldown || 0) * 1000;

      if (cooldowns.has(message.author.id)) {
        const expirationTime = cooldowns.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          const reply = await message.reply(`⏳ Please wait ${timeLeft.toFixed(1)} more seconds before using this command again.`);
          setTimeout(() => reply.delete().catch(console.error), 3000); // Delete after 3 seconds
          return;
        }
      }

      cooldowns.set(message.author.id, now);

      await message.reply(`<:Configure:1324117528657657887> **${message.author}'s Discord ID is:**\n\`\`\`text\n${message.author.id}\n\`\`\``);
    } catch (error) {
      console.error('Error executing the id command:', error);
    }
  },
};

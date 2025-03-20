const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const GIVEAWAY_DB_PATH = path.join(__dirname, '../giveaway.json');

// Update the giveaway embed with the current data
async function updateEmbed(message, giveaway) {
  if (!message || !message.embeds || !message.embeds[0]) return;
  
  // Filter out manual entries if they exist in the entries array
  const realEntries = giveaway.entries.filter(entry => !entry.startsWith('manual_entry_'));
  const totalEntries = realEntries.length + (giveaway.manualCount || 0);

  const newEmbed = EmbedBuilder.from(message.embeds[0])
    .setDescription(
      `Must be in the server above before the giveaway ends.\n\n` +
      `**Ends** <t:${Math.floor(giveaway.endTime / 1000)}:R>\n` +
      `**Hosted By:** <@${giveaway.hostId}>\n` +
      `**Winners:** ${giveaway.winners}\n` +
      `**Entries:** ${totalEntries}\n` +
      `-# **Giveaway ID:** ${giveaway.giveawayId}`
    );
  
  try {
    await message.edit({ embeds: [newEmbed] });
  } catch (error) {
    console.error('Error updating embed:', error);
  }
}

module.exports = {
  name: 'entries',
  description: 'Add manual entries to a giveaway',
  usage: '!entries <giveaway_id> <amount>',
  async execute(message, args) {
    // Permission check (using the same roles as the giveaway command)
    const allowedRoles = ['1339738682038423654'];
    const allowedUsers = ['1337581518364868719', '773541293795704842'];
    
    if (
      !allowedRoles.some(roleId => message.member.roles.cache.has(roleId)) &&
      !allowedUsers.includes(message.author.id)
    ) {
      return; // Unauthorized, no response.
    }

    if (args.length !== 2) {
      return message.reply('Usage: `!entries <giveaway_id> <amount>`')
        .then(replyMsg => setTimeout(() => replyMsg.delete(), 5000));
    }

    const [giveawayId, amountStr] = args;
    const amount = parseInt(amountStr);
    
    if (isNaN(amount) || amount < 1) {
      return message.reply('Invalid amount! Use a number greater than 0')
        .then(replyMsg => setTimeout(() => replyMsg.delete(), 3000));
    }

    try {
      const giveawaysData = fs.readFileSync(GIVEAWAY_DB_PATH, 'utf8');
      const giveaways = JSON.parse(giveawaysData);
      const giveaway = Object.values(giveaways).find(g => g.giveawayId == giveawayId);

      if (!giveaway) {
        return message.reply('Giveaway not found!')
          .then(replyMsg => setTimeout(() => replyMsg.delete(), 3000));
      }

      // Increase the manual entry count
      giveaway.manualCount = (giveaway.manualCount || 0) + amount;

      // Save the updated giveaway data
      fs.writeFileSync(GIVEAWAY_DB_PATH, JSON.stringify(giveaways, null, 2));

      // Fetch the giveaway message from its channel
      const giveawayChannel = message.guild.channels.cache.get(giveaway.channelId);
      if (!giveawayChannel) {
        return message.reply('Could not find the giveaway channel.')
          .then(replyMsg => setTimeout(() => replyMsg.delete(), 3000));
      }
      const giveawayMsg = await giveawayChannel.messages.fetch(giveaway.messageId);
      
      // Update the giveaway embed to reflect the new manual entries
      await updateEmbed(giveawayMsg, giveaway);

      message.reply(`Added ${amount} entries to giveaway ID ${giveawayId}!`)
        .then(replyMsg => setTimeout(() => replyMsg.delete(), 3000));
      
    } catch (error) {
      console.error('Error modifying entries:', error);
      message.reply('Failed to update entries!')
        .then(replyMsg => setTimeout(() => replyMsg.delete(), 3000));
    }
  }
};
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = (client) => {
  client.on('guildMemberAdd', async member => {
    const channelId = '1325203590863917138'; // Your channel ID
    const channel = member.guild.channels.cache.get(channelId);

    if (channel) {
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Regulations')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.com/channels/1145425767283556532/1265080609450233867'),
          new ButtonBuilder()
            .setCustomId('member_count')
            .setLabel(`${member.guild.memberCount}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

      await channel.send({
        content: `<:GSRP:1264351681764655144> Welcome <@${member.id}> to **Georgia State Roleplay**! We are now at **${member.guild.memberCount} members**! Make sure to visit <#1325203499377758210> to verify, enjoy your stay!`,
        components: [row]
      });
    } else {
      console.error('Channel not found!');
    }
  });
};
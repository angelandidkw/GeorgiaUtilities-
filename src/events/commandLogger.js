const { EmbedBuilder, ChannelType } = require('discord.js');

function commandLogger(client) {
    const logChannelId = '1341543847846482012';

    // Log slash commands
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand()) return;

        try {
            const logChannel = await client.channels.fetch(logChannelId).catch(console.error);
            if (!logChannel?.isTextBased()) return;

            const embed = new EmbedBuilder()
                .setTitle('🔧 Slash Command Executed')
                .setColor('#4CAF50')
                .setAuthor({
                    name: `${interaction.user.tag} (${interaction.user.id})`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .addFields(
                    { name: 'Command', value: `\`/${interaction.commandName}\``, inline: true },
                    { name: 'User', value: `${interaction.user}`, inline: true },
                    { name: 'Channel', value: interaction.channel ? `${interaction.channel}` : 'Direct Message', inline: true },
                    { name: 'Guild', value: interaction.guild ? interaction.guild.name : 'DM', inline: true }
                )
                .setTimestamp();

            if (interaction.options.data.length > 0) {
                const options = interaction.options.data.map(option => 
                    `**${option.name}:** ${option.value}${option.user ? ` (${option.user.tag})` : ''}`
                ).join('\n');
                embed.addFields({ name: 'Options', value: options });
            }

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Slash Command Log Error:', error);
        }
    });

    // Log prefix commands
    client.on('messageCreate', async (message) => {
        if (!message.content.startsWith(client.config?.prefix) || message.author.bot) return;

        try {
            const logChannel = await client.channels.fetch(logChannelId).catch(console.error);
            if (!logChannel?.isTextBased()) return;

            const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const command = client.commands.get(commandName);

            // Only log valid commands
            if (!command) return;

            const embed = new EmbedBuilder()
                .setTitle('⌨️ Prefix Command Executed')
                .setColor('#2196F3')
                .setAuthor({
                    name: `${message.author.tag} (${message.author.id})`,
                    iconURL: message.author.displayAvatarURL({ dynamic: true })
                })
                .addFields(
                    { name: 'Command', value: `\`${client.config.prefix}${commandName}\``, inline: true },
                    { name: 'User', value: `${message.author}`, inline: true },
                    { name: 'Channel', value: message.channel.type === ChannelType.DM ? 'Direct Message' : `${message.channel}`, inline: true },
                    { name: 'Guild', value: message.guild ? message.guild.name : 'DM', inline: true }
                )
                .setTimestamp();

            if (args.length > 0) {
                embed.addFields({ 
                    name: 'Arguments', 
                    value: args.join(' ').slice(0, 1000) || 'No arguments provided',
                    inline: false
                });
            }

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Prefix Command Log Error:', error);
        }
    });
}

module.exports = commandLogger;
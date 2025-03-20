const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const infractionsPath = path.join(__dirname, '..', 'infractions.json');

// Constants
const infractionChannelId = '1325203715900313750';
const allowedRoleId = '1244398079852019812';
const appealChannelId = '1325203568071802891';
const logoURL = 'https://cdn.discordapp.com/attachments/1245199287210479768/1263188390149361715/image_21.png?ex=66ad19dd&is=66abc85d&hm=4bfec507d1ca99183c53ef45adf00d89d65f569539f76e8ffbdb1e6bb29fe457&';

// Initialize infractions file with a global counter if it doesn't exist
if (!fs.existsSync(infractionsPath)) {
    fs.writeFileSync(infractionsPath, JSON.stringify({ lastId: 0, infractions: [] }, null, 4));
}

// Load infractions data
let infractionData;
try {
    infractionData = JSON.parse(fs.readFileSync(infractionsPath));
    if (typeof infractionData !== 'object' || !('infractions' in infractionData) || !('lastId' in infractionData)) {
        infractionData = { lastId: 0, infractions: [] };
    }
} catch (error) {
    infractionData = { lastId: 0, infractions: [] };
}

// Save infractions data
function saveInfractions() {
    fs.writeFileSync(infractionsPath, JSON.stringify(infractionData, null, 4));
}

// Non-reusable ID generator: increments the global counter
function getNextAvailableId() {
    infractionData.lastId++;
    saveInfractions(); // Save the updated counter
    return infractionData.lastId;
}

// Expiration cleaner: remove expired infractions from infractionData.infractions
function removeExpiredInfractions() {
    const now = Date.now();
    infractionData.infractions = infractionData.infractions.filter(inf => {
        let expirationDate;
        const infDate = new Date(inf.date).getTime();
        switch (inf.type) {
            case 'Under Investigation':
            case 'Demotion':
            case 'Terminated':
                expirationDate = infDate + (3 * 7 * 24 * 60 * 60 * 1000); // 3 weeks
                break;
            default:
                expirationDate = infDate + (2 * 7 * 24 * 60 * 60 * 1000); // 2 weeks
        }
        return now < expirationDate;
    });
    saveInfractions();
}

// Run cleaner every hour
setInterval(removeExpiredInfractions, 60 * 60 * 1000);

// Expiration time formatter
function getExpirationDisplay(expirationTimestamp) {
    const now = Date.now() / 1000;
    return now > expirationTimestamp ? 
        `Expired: ${Math.floor((now - expirationTimestamp) / 86400)} day(s) ago` : 
        `<t:${expirationTimestamp}:R>`;
}

module.exports = {
data: new SlashCommandBuilder()
    .setName('infraction')
    .setDescription('Manage staff infractions')
    .setDefaultMemberPermissions('0') // Restrict visibility unless permissions are overridden
    .addSubcommand(subcmd =>
        subcmd
            .setName('view')
            .setDescription('View a user\'s infractions')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    )
    .addSubcommand(subcmd =>
        subcmd
            .setName('issue')
            .setDescription('Issue new infraction')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Infraction reason').setRequired(true))
            .addStringOption(opt =>
                opt.setName('type')
                    .setDescription('Infraction type')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Inactivity Notice', value: 'Inactivity Notice' },
                        { name: 'Notice', value: 'Notice' },
                        { name: 'Warning', value: 'Warning' },
                        { name: 'Strike', value: 'Strike' },
                        { name: 'Under Investigation', value: 'Under Investigation' },
                        { name: 'Suspended', value: 'Suspended' },
                        { name: 'Demotion', value: 'Demotion' },
                        { name: 'Terminated', value: 'Terminated' },
                        { name: 'Blacklisted', value: 'Blacklisted' }
                    ))
            .addStringOption(opt => opt.setName('notes').setDescription('Additional notes'))
    )
    .addSubcommand(subcmd =>
        subcmd
            .setName('edit')
            .setDescription('Edit existing infraction')
            .addIntegerOption(opt => opt.setName('id').setDescription('Infraction ID').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('New reason').setRequired(true))
            .addStringOption(opt =>
                opt.setName('type')
                    .setDescription('New type')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Inactivity Notice', value: 'Inactivity Notice' },
                        { name: 'Notice', value: 'Notice' },
                        { name: 'Warning', value: 'Warning' },
                        { name: 'Strike', value: 'Strike' },
                        { name: 'Under Investigation', value: 'Under Investigation' },
                        { name: 'Suspended', value: 'Suspended' },
                        { name: 'Demotion', value: 'Demotion' },
                        { name: 'Terminated', value: 'Terminated' },
                        { name: 'Blacklisted', value: 'Blacklisted' }
                    ))
            .addStringOption(opt => opt.setName('notes').setDescription('New notes'))
    )
    .addSubcommand(subcmd =>
        subcmd
            .setName('delete')
            .setDescription('Delete infraction')
            .addIntegerOption(opt => opt.setName('id').setDescription('Infraction ID').setRequired(true))
    ),
   
    async execute(interaction) {
        // Permission check
        if (!interaction.member.roles.cache.has(allowedRoleId)) {
            return interaction.reply({ content: '<:X_:1247716366509936772> Insufficient permissions', ephemeral: true });
        }

        // Common components
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Appeal Infraction')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/channels/${interaction.guildId}/${appealChannelId}`),
                new ButtonBuilder()
                    .setCustomId('info')
                    .setLabel('Sent From: Georgia State Roleplay')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

        const subcmd = interaction.options.getSubcommand();
        
        try {
            switch (subcmd) {
                case 'view': {
                    const user = interaction.options.getUser('user');
                    const userInfractions = infractionData.infractions.filter(inf => inf.userId === user.id);
                    
                    if (!userInfractions.length) {
                        return interaction.reply({ content: `No infractions found for ${user.tag}`, ephemeral: true });
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('Infraction Records')
                        .setDescription(`**Staff Member:** ${user.tag}`)
                        .setColor(0x2d2d31)
                        .setThumbnail(user.displayAvatarURL());

                    userInfractions.forEach(inf => {
                        embed.addFields(
                            { name: 'Case:', value: `#${inf.id}`, inline: true },
                            { name: 'Punishment:', value: inf.type, inline: true },
                            { name: 'Date:', value: `<t:${Math.floor(new Date(inf.date).getTime() / 1000)}:F>`, inline: true },
                            { name: 'Issued by:', value: `<@${inf.issuerId}>`, inline: true },
                            { name: 'Reason:', value: inf.reason, inline: false },
                            { name: 'Notes:', value: inf.notes || 'None', inline: false },
                            { name: 'Expiration:', value: getExpirationDisplay(inf.expiration), inline: false }
                        );
                    });

                    return interaction.reply({ embeds: [embed], ephemeral: false });
                }

                case 'issue': {
                    await interaction.deferReply({ ephemeral: true });
                    const user = interaction.options.getUser('user');
                    const reason = interaction.options.getString('reason');
                    const type = interaction.options.getString('type');
                    const notes = interaction.options.getString('notes') || 'None';

                    // Calculate expiration (in milliseconds)
                    const expirationTime = ['Under Investigation', 'Demotion', 'Terminated'].includes(type) ? 
                        3 * 7 * 24 * 60 * 60 * 1000 : // 3 weeks
                        2 * 7 * 24 * 60 * 60 * 1000;  // 2 weeks

                    const infraction = {
                        id: getNextAvailableId(),  // Use our non-reusable ID generator
                        userId: user.id,
                        reason,
                        type,
                        date: new Date().toISOString(),
                        expiration: Math.floor((Date.now() + expirationTime) / 1000),
                        issuerId: interaction.user.id,
                        notes
                    };

                    infractionData.infractions.push(infraction);
                    saveInfractions();

                    // Build embed
                    const embed = new EmbedBuilder()
                        .setTitle('Staff Punishment')
                        .setColor(0x2d2d31)
                        .setThumbnail(logoURL)
                        .addFields(
                            { name: 'Case ID', value: `#${infraction.id}`, inline: true },
                            { name: 'Type', value: type, inline: true },
                            { name: 'Issued Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: 'Staff Member', value: user.tag, inline: true },
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Notes', value: notes, inline: false },
                            { name: 'Expiration', value: getExpirationDisplay(infraction.expiration), inline: false }
                        )
                        .setFooter({ 
                            text: `Issued by: ${interaction.user.tag}`, 
                            iconURL: interaction.user.displayAvatarURL() 
                        });

                    // Send notifications
                    try {
                        await user.send({ embeds: [embed], components: [buttons] });
                    } catch (error) {
                        console.error(`DM failed for ${user.tag}:`, error);
                    }

                    const logChannel = interaction.client.channels.cache.get(infractionChannelId);
                    if (logChannel) {
                        await logChannel.send({ embeds: [embed], components: [buttons] });
                    }

                    return interaction.editReply({
                        content: `<:Checkmark:1247716322150711401> Infraction #${infraction.id} issued to ${user.tag}`,
                        embeds: [embed],
                        components: [buttons]
                    });
                }

                case 'edit': {
                    await interaction.deferReply({ ephemeral: true });
                    const id = interaction.options.getInteger('id');
                    const reason = interaction.options.getString('reason');
                    const type = interaction.options.getString('type');
                    const notes = interaction.options.getString('notes') || 'None';

                    const index = infractionData.infractions.findIndex(inf => inf.id === id);
                    if (index === -1) {
                        return interaction.editReply({ content: `<:X_:1247716366509936772> Infraction #${id} not found` });
                    }

                    // Update the infraction (note that the ID stays the same)
                    infractionData.infractions[index] = {
                        ...infractionData.infractions[index],
                        reason,
                        type,
                        notes,
                        date: new Date().toISOString()
                    };
                    saveInfractions();

                    // Build embed
                    const embed = new EmbedBuilder()
                        .setTitle('<:Checkmark:1247716322150711401> Infraction Updated')
                        .setColor(0x2d2d31)
                        .setThumbnail(logoURL)
                        .addFields(
                            { name: 'Case ID', value: `#${id}`, inline: true },
                            { name: 'New Type', value: type, inline: true },
                            { name: 'Updated Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: 'New Reason', value: reason, inline: false },
                            { name: 'New Notes', value: notes, inline: false },
                            { name: 'Expiration', value: getExpirationDisplay(infractionData.infractions[index].expiration), inline: true }
                        )
                        .setFooter({ 
                            text: `Modified by: ${interaction.user.tag}`, 
                            iconURL: interaction.user.displayAvatarURL() 
                        });

                    // Notify user
                    try {
                        const user = await interaction.client.users.fetch(infractionData.infractions[index].userId);
                        await user.send({ embeds: [embed], components: [buttons] });
                    } catch (error) {
                        console.error('Failed to notify user:', error);
                    }

                    // Log update
                    const logChannel = interaction.client.channels.cache.get(infractionChannelId);
                    if (logChannel) {
                        await logChannel.send({ embeds: [embed], components: [buttons] });
                    }

                    return interaction.editReply({
                        content: `<:Checkmark:1247716322150711401> Infraction #${id} updated`,
                        embeds: [embed],
                        components: [buttons]
                    });
                }

                case 'delete': {
                    await interaction.deferReply({ ephemeral: true });
                    const id = interaction.options.getInteger('id');
                    const index = infractionData.infractions.findIndex(inf => inf.id === id);

                    if (index === -1) {
                        return interaction.editReply({ content: `<:X_:1247716366509936772> Infraction #${id} not found` });
                    }

                    const [deleted] = infractionData.infractions.splice(index, 1);
                    saveInfractions();

                    // Build embed
                    const embed = new EmbedBuilder()
                        .setTitle('Infraction Deleted')
                        .setColor(0x2d2d31)
                        .setThumbnail(logoURL)
                        .addFields(
                            { name: 'Case ID', value: `#${id}`, inline: true },
                            { name: 'Original Type', value: deleted.type, inline: true },
                            { name: 'Original Reason', value: deleted.reason, inline: false },
                            { name: 'Deleted By', value: interaction.user.tag, inline: true }
                        )
                        .setFooter({ 
                            text: `Staff Member: ${interaction.client.users.cache.get(deleted.userId)?.tag || 'Unknown'}`, 
                            iconURL: interaction.user.displayAvatarURL() 
                        });

                    // Log deletion
                    const logChannel = interaction.client.channels.cache.get(infractionChannelId);
                    if (logChannel) {
                        await logChannel.send({ embeds: [embed] });
                    }

                    return interaction.editReply({
                        content: `<:Checkmark:1247716322150711401> Infraction #${id} deleted`,
                        embeds: [embed]
                    });
                }

                default:
                    return interaction.reply({ content: '<:X_:1247716366509936772> Unknown subcommand', ephemeral: true });
            }
        } catch (error) {
            console.error('Infraction System Error:', error);
            return interaction.reply({ 
                content: 'An error occurred while processing your request', 
                ephemeral: true 
            });
        }
    }
};
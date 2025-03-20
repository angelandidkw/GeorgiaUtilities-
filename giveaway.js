const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to giveaway database file
const GIVEAWAY_DB_PATH = path.join(__dirname, '../../giveaway.json');

// Initialize or load giveaway database
function loadGiveaways() {
    if (!fs.existsSync(GIVEAWAY_DB_PATH)) {
        fs.writeFileSync(GIVEAWAY_DB_PATH, JSON.stringify({}));
        return {};
    }
    return JSON.parse(fs.readFileSync(GIVEAWAY_DB_PATH, 'utf-8'));
}

// Save giveaways to JSON file
function saveGiveaways(giveaways) {
    fs.writeFileSync(GIVEAWAY_DB_PATH, JSON.stringify(giveaways, null, 2));
}

// Returns the next giveaway ID by scanning the current giveaways
function getNextGiveawayId() {
    const giveaways = loadGiveaways();
    const highestId = Object.values(giveaways)
        .reduce((max, giveaway) => Math.max(max, giveaway.giveawayId || 0), 0);
    return highestId + 1;
}

// Check if an entry is a manual entry
function isManualEntry(entry) {
    return typeof entry === 'string' && entry.startsWith('m_');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new giveaway')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('Prize to win')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('Duration (e.g., 1m, 5h, 2d, 1w)')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of winners')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to host in')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addIntegerOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('Giveaway ID')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll a giveaway')
                .addIntegerOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('Giveaway ID')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!hasGiveawayPermission(interaction.member)) {
            return interaction.editReply({ content: "You don't have permission to manage giveaways!" });
        }

        const subcommand = interaction.options.getSubcommand();
        const currentGiveaways = loadGiveaways();

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreate(interaction, currentGiveaways);
                    break;
                case 'end':
                    await handleEnd(interaction, currentGiveaways);
                    break;
                case 'reroll':
                    await handleReroll(interaction, currentGiveaways);
                    break;
            }
        } catch (error) {
            console.error('Error handling giveaway command:', error);
            await interaction.editReply({ 
                content: 'There was an error processing this command!' 
            });
        }
    },
    async handleButton(interaction) {
        if (!interaction.isButton() || interaction.customId !== 'enter_giveaway') return;

        try {
            // Defer the reply immediately
            await interaction.deferReply({ ephemeral: true });

            const giveaways = loadGiveaways();
            const giveaway = Object.values(giveaways).find(g => g.messageId === interaction.message.id);

            if (!giveaway) {
                return interaction.editReply({ content: 'This giveaway no longer exists!' });
            }

            if (giveaway.ended) {
                return interaction.editReply({ content: 'This giveaway has already ended!' });
            }

            if (giveaway.entries.includes(interaction.user.id)) {
                return interaction.editReply({ content: 'You have already entered this giveaway!' });
            }

            // Add user to entries
            giveaway.entries.push(interaction.user.id);
            saveGiveaways(giveaways);

            // Update the embed
            const message = interaction.message;
            await updateEmbed(message, giveaway);

            return interaction.editReply({ content: 'You have entered the giveaway!' });
        } catch (error) {
            console.error('Error handling giveaway entry:', error);
            if (!interaction.replied) {
                return interaction.editReply({ 
                    content: 'There was an error entering the giveaway!' 
                });
            }
        }
    }
};

// ----- Subcommand Handlers -----

async function handleCreate(interaction, giveaways) {
    const prize = interaction.options.getString('prize');
    const duration = interaction.options.getString('duration');
    const winners = interaction.options.getInteger('winners');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const timeMs = parseDuration(duration);
    if (timeMs === null) {
        return interaction.editReply({ 
            content: 'Invalid duration format! Use format like: 1m, 5h, 2d, 1w'
        });
    }

    const endTime = Date.now() + timeMs;
    const newGiveawayId = getNextGiveawayId();

    const embed = new EmbedBuilder()
        .setTitle(prize)
        .setDescription(
            `Must be in the server above before the giveaway ends.\n\n` +
            `**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n` +
            `**Hosted By:** ${interaction.user}\n` +
            `**Winners:** ${winners}\n` +
            `**Entries:** 0\n` +
            `-# **Giveaway ID:** ${newGiveawayId}`
        )
        .setColor('#2b2d31');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('enter_giveaway')
            .setLabel('Enter Giveaway')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('1327476886867021894')
    );

    try {
        const message = await channel.send({ embeds: [embed], components: [row] });
        
        // Use a unique key (using current timestamp) to store the giveaway
        giveaways[Date.now().toString()] = {
            messageId: message.id,
            channelId: channel.id,
            prize,
            endTime,
            winners,
            hostId: interaction.user.id,
            entries: [], // Real user IDs
            manualCount: 0, // New field for manual entries count
            ended: false,
            giveawayId: newGiveawayId
        };

        saveGiveaways(giveaways);
        await interaction.editReply({ content: `Giveaway created in ${channel}!` });

        // Start countdown interval
        const checkInterval = setInterval(async () => {
            try {
                const currentGiveaways = loadGiveaways();
                const currentGiveaway = Object.values(currentGiveaways).find(g => g.messageId === message.id);
                
                if (!currentGiveaway) {
                    clearInterval(checkInterval);
                    return;
                }

                if (Date.now() > endTime) {
                    clearInterval(checkInterval);
                    await endGiveaway(currentGiveaway.messageId, message);
                } else {
                    await updateEmbed(message, currentGiveaway);
                }
            } catch (error) {
                console.error('Error in giveaway interval:', error);
                clearInterval(checkInterval);
            }
        }, 5000);

    } catch (error) {
        console.error('Error creating giveaway:', error);
        await interaction.editReply({ 
            content: 'Failed to create giveaway! Please try again.' 
        });
    }
}

async function handleEnd(interaction, giveaways) {
    const giveawayId = interaction.options.getInteger('giveaway_id');
    const giveaway = Object.values(giveaways).find(g => g.giveawayId === giveawayId);

    if (!giveaway) {
        return interaction.editReply({ content: `Giveaway with ID ${giveawayId} not found!`, ephemeral: true });
    }
    if (giveaway.ended) {
        return interaction.editReply({ content: `Giveaway with ID ${giveawayId} has already ended!`, ephemeral: true });
    }

    try {
        const channel = await interaction.client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(giveaway.messageId);
        await endGiveaway(giveaway.messageId, message);
        await interaction.editReply({ 
            content: `Giveaway with ID: ${giveawayId} has been ended!`, 
            ephemeral: true 
        });
    } catch (error) {
        console.error('Error ending giveaway:', error);
        await interaction.editReply({ 
            content: `Failed to end giveaway with ID ${giveawayId}!`, 
            ephemeral: true 
        });
    }
}

async function handleReroll(interaction, giveaways) {
    const giveawayId = interaction.options.getInteger('giveaway_id');
    const giveaway = Object.values(giveaways).find(g => g.giveawayId === giveawayId);

    if (!giveaway) {
        return interaction.editReply({ content: `Giveaway with ID ${giveawayId} not found!`, ephemeral: true });
    }
    if (!giveaway.ended) {
        return interaction.editReply({ content: `Giveaway with ID ${giveawayId} is still running!`, ephemeral: true });
    }

    try {
        const channel = await interaction.client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(giveaway.messageId);
        
        const newWinners = await pickWinners(giveaway);
        
        const newEmbed = EmbedBuilder.from(message.embeds[0])
            .setDescription(
                `**Giveaway Ended!**\n\n` +
                `**Winner${giveaway.winners > 1 ? 's' : ''}:** ${newWinners.join(' ')}\n` +
                `**Hosted By:** <@${giveaway.hostId}>\n` +
                `**Prize:** ${giveaway.prize}\n` +
                `**Total Entries:** ${giveaway.entries.length}\n` +
                `-# **Giveaway ID:** ${giveawayId}`
            );
        
        await message.edit({ embeds: [newEmbed] });
        await message.reply(` Rerolled! New winner${giveaway.winners > 1 ? 's' : ''}: ${newWinners.join(' ')}`);
        await interaction.editReply({ 
            content: `Giveaway with ID: ${giveawayId} has been rerolled!`, 
            ephemeral: true 
        });
    } catch (error) {
        console.error('Error rerolling giveaway:', error);
        await interaction.editReply({ 
            content: `Failed to reroll giveaway with ID ${giveawayId}!`, 
            ephemeral: true 
        });
    }
}

// ----- Giveaway Logic Functions -----

async function endGiveaway(messageId, message) {
    const giveaways = loadGiveaways();
    const giveaway = Object.values(giveaways).find(g => g.messageId === messageId);
    
    if (!giveaway || giveaway.ended) return;
    
    const winners = await pickWinners(giveaway);
    giveaway.ended = true;
    
    const totalEntries = giveaway.entries.length + (giveaway.manualCount || 0);
    
    const newEmbed = EmbedBuilder.from(message.embeds[0])
        .setDescription(
            `Must be in the server above before the giveaway ends.\n\n` +
            `**Ends** <t:${Math.floor(giveaway.endTime / 1000)}:R>\n` +
            `**Hosted By:** <@${giveaway.hostId}>\n` +
            `**Winners:** ${giveaway.winners}\n` +
            `**Entries:** ${totalEntries}\n` +
            `-# **Giveaway ID:** ${giveaway.giveawayId}\n\n` +
            `**Winner${giveaway.winners > 1 ? 's' : ''}:** ${winners.join(' ')}`
        );

    const endedButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('enter_giveaway')
            .setLabel('Giveaway Ended')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('1327476886867021894')
            .setDisabled(true)
    );
    
    await message.edit({ embeds: [newEmbed], components: [endedButton] });
    // Only announce if there are real winners (those that start with <@)
    const realWinners = winners.filter(winner => winner.startsWith('<@'));
    if (realWinners.length > 0) {
        await message.reply(`<:Giveaway:1327476886867021894> Congratulations ${realWinners.join(' ')}! You won **${giveaway.prize}**!`);
    }
    saveGiveaways(giveaways);
}

async function pickWinners(giveaway) {
    // Only include real user entries
    const realEntries = giveaway.entries.filter(entry => !isManualEntry(entry));
    const winners = [];
    const slots = giveaway.winners;

    // If there are no real entries, fill all slots with "Not enough participants"
    if (realEntries.length === 0) {
        for (let i = 0; i < slots; i++) {
            winners.push('Not enough participants');
        }
        return winners;
    }

    // Randomly select winners from available real entries
    while (winners.length < slots && realEntries.length > 0) {
        const randomIndex = Math.floor(Math.random() * realEntries.length);
        winners.push(`<@${realEntries.splice(randomIndex, 1)[0]}>`);
    }

    // If not enough real entries, fill remaining slots with "Not enough participants"
    while (winners.length < slots) {
        winners.push('Not enough participants');
    }

    return winners;
}

async function updateEmbed(message, giveaway) {
    if (!message || !message.embeds || !message.embeds[0]) return;
    
    const totalEntries = giveaway.entries.length + (giveaway.manualCount || 0);

    const newEmbed = EmbedBuilder.from(message.embeds[0])
        .setDescription(
            `Must be in the server above before the giveaway ends.\n\n` +
            `**Ends** <t:${Math.floor(giveaway.endTime / 1000)}:R>\n` +
            `**Hosted By:** <@${giveaway.hostId}>\n` +
            `**Winners:** ${giveaway.winners}\n` +
            `**Entries:** ${totalEntries}\n` +
            `-# **Giveaway ID:** ${giveaway.giveawayId}`
        );
    
    await message.edit({ embeds: [newEmbed] }).catch(console.error);
}

// ----- Helper Functions -----

function hasGiveawayPermission(member) {
    const allowedRoles = ['1145426299821760613']; // Replace with your staff role IDs
    const allowedUsers = ['773541293795704842', '773541293795704842']; // Replace with your admin user IDs
    return member.roles.cache.some(r => allowedRoles.includes(r.id)) || allowedUsers.includes(member.id);
}

// Parse a duration string (e.g., "5h", "2d") into milliseconds
function parseDuration(duration) {
    const match = duration.match(/^(\d+)([mhdw])$/);
    if (!match) return null;

    const [, amount, unit] = match;
    const value = parseInt(amount);

    if (isNaN(value) || value <= 0) return null;

    const conversions = {
        'm': value * 60 * 1000,            // minutes
        'h': value * 60 * 60 * 1000,       // hours
        'd': value * 24 * 60 * 60 * 1000,  // days
        'w': value * 7 * 24 * 60 * 60 * 1000 // weeks
    };

    return conversions[unit];
}

// Format a duration string into a human-readable format
function formatDuration(duration) {
    const match = duration.match(/^(\d+)([mhdw])$/);
    if (!match) return 'Invalid duration';

    const [, amount, unit] = match;
    const value = parseInt(amount);
    
    function addManualEntry(giveawayId, userId) {
    const giveaways = loadGiveaways();
    const giveaway = Object.values(giveaways).find(g => g.giveawayId === giveawayId);

    if (!giveaway) {
        return `Giveaway with ID ${giveawayId} not found.`;
    }
    if (giveaway.ended) {
        return `Giveaway with ID ${giveawayId} has already ended.`;
    }
    if (giveaway.entries.includes(userId)) {
        return `User is already entered in the giveaway.`;
    }

    giveaway.entries.push(userId);
    saveGiveaways(giveaways);

    return `User ${userId} has been manually added to giveaway ${giveawayId}.`;
}

    const units = {
        'm': 'minute',
        'h': 'hour',
        'd': 'day',
        'w': 'week'
    };

    const unitName = units[unit];
    return `${value} ${unitName}${value !== 1 ? 's' : ''}`;
}
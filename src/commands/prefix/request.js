const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch'); // Ensure you have node-fetch installed
const { getSessionState } = require('./sessionState');

let sessionActive = true; // Set sessionActive to false when no session is running

const cooldowns = new Map(); // Store cooldowns

// Constants
const ROLE_ID = '1173794306511867905';
const TARGET_ROLE_ID = '1173795597703200799';
const COOLDOWN_TIME = 2 * 60 * 60 * 1000; // 2 hours
const EMOJIS = {
    INFO: '<:info:1175203730392633475>',
    PEOPLE: '<:people:1247726625148239954>',
    ARROW_DOWN: '<:ArrowDown:1272275534465732709>'
};
const COLORS = {
    PRIMARY: '#2d2d31',
    SUCCESS: '#3ba55c',
    ERROR: '#ed4245'
};

// Add new constants for the images
const IMAGES = {
    CORNER_LOGO: 'https://media.discordapp.net/attachments/1174868806900916304/1340710948197109791/image_21_1.png',
    BOTTOM_BANNER: 'https://media.discordapp.net/attachments/1336898385398988852/1340715852210901083/image_-_2025-02-16T110601.298.png'
};

// Add these constants at the top with other constants
const MAX_REQUESTS_PER_USER = 1;
const EXPIRATION_TIME = 3_600_000; // 1 hour in milliseconds
const activeRequests = new Map(); // Track active requests per user

// Add a function to check server status
async function isServerOnline() {
    try {
        const response = await fetch('https://users.roblox.com/v1/users/1', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return response.ok;
    } catch (error) {
        console.error('Server status check error:', error);
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ride-along')
        .setDescription('Create a request embed.')
        .addStringOption(option =>
            option.setName('roblox_username')
                .setDescription('Enter your Roblox username')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time_available')
                .setDescription('Enter the time for your request (e.g., 14:30 or 2:30 PM)')
                .setRequired(true)),
    async execute(interaction) {
        try {
            // Check if session is active
            if (!getSessionState()) {
                return interaction.reply(createErrorResponse('No session is currently active. Requests are disabled.'));
            }

            // Check if server is online
            const serverOnline = await isServerOnline();
            if (!serverOnline) {
                return interaction.reply(createErrorResponse('The server is currently offline. Please wait until it\'s back online.'));
            }

            // Role check
            if (!interaction.member.roles.cache.has(ROLE_ID)) {
                return interaction.reply(createErrorResponse('Insufficient permissions to use this command.'));
            }

            // Check active requests for this user
            if (activeRequests.has(interaction.user.id)) {
                return interaction.reply(createErrorResponse('You already have an active request. Please wait for it to be claimed or expire.'));
            }

            // Cooldown check with more informative message
            const cooldownStatus = checkCooldown(interaction.user.id);
            if (cooldownStatus.active) {
                const timeLeft = formatTime(cooldownStatus.remaining);
                return interaction.reply(createErrorResponse(`You're on cooldown. You can make another request in ${timeLeft}.`));
            }

            // Validate and process input
            const [robloxUser, chosenTime] = await Promise.all([
                fetchRobloxUser(interaction.options.getString('roblox_username')),
                validateTime(interaction.options.getString('time_available'))
            ]).catch(error => {
                console.error('Input validation error:', error);
                throw new Error('Failed to validate input. Please check your username and time format.');
            });

            if (!robloxUser) {
                return interaction.reply(createErrorResponse('Invalid Roblox username. Please verify and try again.'));
            }

            // Create and send request
            const requestEmbed = createRequestEmbed(interaction.user, robloxUser, chosenTime);
            const actionRow = createActionRow();

            const message = await interaction.reply({
                content: `<@&${TARGET_ROLE_ID}>`,
                allowedMentions: { parse: ['roles'] },
                embeds: [requestEmbed],
                components: [actionRow],
                fetchReply: true
            });

            // Track the request
            activeRequests.set(interaction.user.id, {
                messageId: message.id,
                timestamp: Date.now(),
                robloxUser,
                chosenTime
            });

            // Set up request expiration
            setTimeout(() => {
                activeRequests.delete(interaction.user.id);
            }, EXPIRATION_TIME);

            // Set up collector
            setupCollector(message, interaction.user, robloxUser, chosenTime);
            
            // Set cooldown
            cooldowns.set(interaction.user.id, Date.now());

        } catch (error) {
            console.error('Command execution error:', error);
            return interaction.reply(createErrorResponse('An error occurred while processing your request. Please try again.'));
        }
    }
};

// Helper functions
function createTimeDisplay(time24) {
    // Convert time to Unix timestamp for today
    const [hours, minutes] = time24.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    // If the time has passed for today, set it for tomorrow
    if (date < new Date()) {
        date.setDate(date.getDate() + 1);
    }
    
    const timestamp = Math.floor(date.getTime() / 1000);
    
    return {
        timestamp,
        formatted: `<t:${timestamp}:t> (<t:${timestamp}:R>)` // Shows both exact time and relative time
    };
}

function createRequestEmbed(requester, robloxUser, time) {
    const timeInfo = createTimeDisplay(time);

    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setAuthor({ 
            name: `Requested by ${requester.username}`, 
            iconURL: requester.displayAvatarURL() 
        })
        .setThumbnail(IMAGES.CORNER_LOGO)
        .addFields(
            { 
                name: `${EMOJIS.INFO} Roblox Details:`, 
                value: `**Username:** [${robloxUser.name}](https://www.roblox.com/users/${robloxUser.id}/profile)\n**ID:** \`${robloxUser.id}\``, 
                inline: true 
            },
            { 
                name: `${EMOJIS.PEOPLE} Time Available:`, 
                value: timeInfo.formatted, // Shows time in user's timezone + relative time
                inline: true 
            }
        )
        .setImage(IMAGES.BOTTOM_BANNER)
        .setFooter({ text: 'Georgia Utilities' });

    return embed;
}

function createActionRow() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('claim_button')
                .setLabel('Claim Request')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('1267288609598214247')
        );
}

async function fetchRobloxUser(username) {
    try {
        const response = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
        });

        const data = await response.json();
        return data.data?.[0] || null;
        
    } catch (error) {
        console.error('Roblox API Error:', error);
        return null;
    }
}

function setupCollector(message, requester, robloxUser, time) {
    const collector = message.createMessageComponentCollector({ 
        filter: i => i.customId === 'claim_button',
        time: EXPIRATION_TIME
    });

    collector.on('collect', async i => {
        try {
            // Validate claimer
            if (i.user.id === requester.id) {
                return i.reply(createErrorResponse('You cannot claim your own request!', true));
            }

            if (!i.member.roles.cache.has(TARGET_ROLE_ID)) {
                return i.reply(createErrorResponse('You need the required role to claim requests!', true));
            }

            // Check if request is still active
            if (!activeRequests.has(requester.id)) {
                return i.reply(createErrorResponse('This request is no longer active.', true));
            }

            // Process claim
            await handleSuccessfulClaim(i, message, requester, robloxUser, time);
            
            // Clean up
            activeRequests.delete(requester.id);
            collector.stop('claimed');

        } catch (error) {
            console.error('Claim processing error:', error);
            i.reply(createErrorResponse('Failed to process claim. Please try again.', true));
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            try {
                const expiredEmbed = EmbedBuilder.from(message.embeds[0])
                    .setColor(COLORS.ERROR)
                    .setDescription('🕒 This request has expired')
                    .setTimestamp();

                await message.edit({
                    embeds: [expiredEmbed],
                    components: []
                });

                activeRequests.delete(requester.id);
            } catch (error) {
                console.error('Error handling request expiration:', error);
            }
        }
    });
}

async function handleSuccessfulJoin(interaction, message, requester, robloxUser, time) {
    // Update original message
    const updatedEmbed = message.embeds[0]
        .setColor(COLORS.SUCCESS)
        .addFields({ name: 'Joined by', value: interaction.user.toString() })
        .setThumbnail(interaction.user.displayAvatarURL());

    await message.edit({ embeds: [updatedEmbed], components: [] });

    // Send notifications
    const joinDetails = new EmbedBuilder()
        .setTitle('Ride-Along Joined')
        .setColor(COLORS.SUCCESS)
        .addFields(
            { name: 'Requester', value: requester.toString(), inline: true },
            { name: 'Roblox User', value: `[${robloxUser.name}](https://www.roblox.com/users/${robloxUser.id}/profile)`, inline: true },
            { name: 'Scheduled Time', value: time, inline: true }
        )
        .setTimestamp();

    await Promise.all([
        interaction.user.send({ embeds: [joinDetails] }),
        requester.send({ 
            content: `🚨 Your session was joined by ${interaction.user.username}!`,
            embeds: [joinDetails.setTitle('Session Joined Notification')]
        })
    ]);

    await interaction.reply({ content: 'Successfully joined session!', ephemeral: true });
}

// Utility functions
function createErrorResponse(message, ephemeral = true) {
    if (ephemeral) {
        return { 
            content: `❌ ${message}`,
            ephemeral: true
        };
    }

    const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setAuthor({ 
            name: 'Error', 
            iconURL: IMAGES.CORNER_LOGO 
        })
        .setDescription(message)
        .setThumbnail(IMAGES.CORNER_LOGO)
        .setImage(IMAGES.BOTTOM_BANNER)
        .setTimestamp();

    return { embeds: [errorEmbed] };
}

function checkCooldown(userId) {
    const now = Date.now();
    const expiration = cooldowns.get(userId) + COOLDOWN_TIME;
    return { active: now < expiration, remaining: expiration - now };
}

function formatTime(ms) {
    const minutes = Math.ceil(ms / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

function generateRequestId() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function handleMessageEditError(error) {
    if (error.code === 10008) { // Message no longer exists
        console.log('Unable to edit message: The message was deleted.');
    } else {
        console.error('Error editing message:', error);
    }
}

// Function to fetch Roblox user information
async function fetchRobloxUserInfo(username) {
    const API_ENDPOINT = `https://users.roblox.com/v1/usernames/users`;
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usernames: [username],
                excludeBannedUsers: true
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Check if user data exists in the response
        if (data.data && data.data.length > 0) {
            return data.data[0]; // Return the first valid user
        } else {
            console.error(`Roblox Username not found: ${username}`);
            return null; // Return null if the username wasn't found
        }
    } catch (error) {
        console.error(`Error fetching Roblox user info for ${username}:`, error);
        return null; // Return null if any error occurs
    }
}

// Add this new validation function
function validateTime(timeInput) {
    const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
    const match = timeInput.match(timeRegex);
    
    if (!match) throw new Error('Invalid time format. Use HH:MM or HH:MM AM/PM');

    let [_, hours, minutes = '00', period] = match;
    hours = parseInt(hours);
    minutes = parseInt(minutes);

    // Convert to 24-hour format
    if (period?.toLowerCase() === 'pm' && hours < 12) hours += 12;
    if (period?.toLowerCase() === 'am' && hours === 12) hours = 0;

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Invalid time values. Hours must be 0-23 and minutes 0-59');
    }

    // Format as HH:MM in 24-hour format
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Update handleSuccessfulClaim function
async function handleSuccessfulClaim(interaction, message, requester, robloxUser, time) {
    const timeInfo = createTimeDisplay(time);

    const updatedEmbed = EmbedBuilder.from(message.embeds[0])
        .setColor(COLORS.SUCCESS)
        .addFields({ 
            name: 'Claimed By:', 
            value: interaction.user.toString()
        })
        .setThumbnail(IMAGES.CORNER_LOGO);

    await message.edit({ embeds: [updatedEmbed], components: [] });

    const claimDetails = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setAuthor({ 
            name: 'Ride-Along Claimed', 
            iconURL: IMAGES.CORNER_LOGO 
        })
        .setThumbnail(IMAGES.CORNER_LOGO)
        .addFields(
            { 
                name: 'Requester:', 
                value: requester.toString(),
                inline: true 
            },
            { 
                name: 'Claimed By:', 
                value: interaction.user.toString(),
                inline: true 
            },
            { name: '\u200B', value: '\u200B', inline: true },
            { 
                name: 'Roblox User:', 
                value: `**Username:** [${robloxUser.name}](https://www.roblox.com/users/${robloxUser.id}/profile)\n**ID:** \`${robloxUser.id}\``, 
                inline: true 
            },
            { 
                name: 'Scheduled Time:', 
                value: timeInfo.formatted, // Shows time in user's timezone + relative time
                inline: true 
            }
        )
        .setImage(IMAGES.BOTTOM_BANNER)
        .setFooter({ text: 'Georgia Utilities' });

    // Send notifications with updated embeds
    await Promise.all([
        interaction.user.send({ 
            embeds: [claimDetails]
        }),
        requester.send({ 
            embeds: [claimDetails.setAuthor({ 
                name: 'Request Claimed Notification', 
                iconURL: IMAGES.CORNER_LOGO 
            })]
        })
    ]);

    await interaction.reply({ 
        content: 'Successfully claimed request!', 
        ephemeral: true 
    });
}
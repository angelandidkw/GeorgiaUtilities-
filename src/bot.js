const {
    Client,
    GatewayIntentBits,
    Collection,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    ChannelType
} = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const config = require('./data/config/config.json');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
});

client.commands = new Collection();
client.slashCommands = new Collection();
client.cooldowns = new Map();

// Load regular (prefix) commands
const prefixCommandsDir = path.join(__dirname, 'commands', 'prefix');
const commandFiles = fs.readdirSync(prefixCommandsDir).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(path.join(prefixCommandsDir, file));
    if (command && command.name && typeof command.execute === 'function') {
        client.commands.set(command.name, command);
        console.log(`Loaded command: ${command.name}`);
    }
}

const handleCommands = require('./handlers/handleCommands');
handleCommands(client);

const handleModalSubmit = require('./handlers/handlePermission');

// Add welcome event handler
const welcomeEvent = require('./events/welcome');
welcomeEvent(client);

// Load blacklist from JSON file
let blacklist = [];
try {
    const BLACKLIST_PATH = path.join(__dirname, 'data', 'json', 'blacklist.json');
    if (!fs.existsSync(BLACKLIST_PATH)) {
        // Create default blacklist file if it doesn't exist
        const defaultBlacklist = { blacklisted: [] };
        fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(defaultBlacklist, null, 4));
        blacklist = defaultBlacklist.blacklisted;
    } else {
        const data = fs.readFileSync(BLACKLIST_PATH, 'utf8');
        const parsedData = JSON.parse(data);
        blacklist = parsedData.blacklisted || []; // Ensure blacklisted array exists
    }
} catch (err) {
    console.error('Error reading blacklist.json:', err);
    blacklist = []; // Ensure blacklist is an array even if there's an error
}

function isBlacklisted(userId) {
    return Array.isArray(blacklist) && blacklist.includes(userId);
}

const voiceChannelId = '1325203506436771910'; // Replace with your channel ID
const guildId = '1145425767283556532'; // Replace with your guild ID

// Function to join the voice channel automatically
async function joinVoiceChannelAutomatically() {
    try {
        const guild = await client.guilds.fetch(guildId);
        const channel = guild.channels.cache.get(voiceChannelId);

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            console.error('Voice channel not found or is not a voice channel.');
            return;
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log('Bot has successfully connected to the voice channel!');
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
            } catch {
                console.log('Reconnecting to the voice channel...');
                connection.destroy();
                joinVoiceChannelAutomatically();
            }
        });
    } catch (error) {
        console.error('Error joining voice channel:', error);
    }
}

// Initialize config first
client.config = config;

// Then initialize command logger
const commandLogger = require('./events/commandLogger');
commandLogger(client);

client.once('ready', async () => {
    console.log('Bot is online and ready!');
    await joinVoiceChannelAutomatically();
    
    try {
        const guild = await client.guilds.fetch(guildId);
        const memberCount = guild.memberCount;
        await client.user.setPresence({
            activities: [{ name: `Watching over ${memberCount} in Georgia State Roleplay.` }],
            status: 'online',
        });
        console.log(`Presence set: Watching over ${memberCount} members.`);
    } catch (error) {
        console.error('Error fetching guild or setting presence:', error);
    }
});

// Add this function for cooldown checking
function isOnCooldown(userId) {
    if (client.cooldowns.has(userId)) {
        const cooldownTime = client.cooldowns.get(userId);
        if (Date.now() < cooldownTime) {
            return true;
        }
    }
    return false;
}

// Add this function for setting cooldown
function setCooldown(userId) {
    client.cooldowns.set(userId, Date.now() + 5000); // 5 seconds cooldown
}

client.on('messageCreate', async message => {
    const prefix = config.prefix;
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    // Check for cooldown
    if (isOnCooldown(message.author.id)) {
        return message.reply('Please wait 5 seconds between commands.')
            .then(msg => setTimeout(() => msg.delete(), 3000));
    }

    // Set cooldown
    setCooldown(message.author.id);

    // Debug logging
    console.log(`Received command: ${message.content}`);

    if (isBlacklisted(message.author.id)) {
        return message.reply('You are blacklisted from using this bot.')
            .then(sentMessage => setTimeout(() => sentMessage.delete(), 1000));
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Debug logging
    console.log(`Looking for command: ${commandName}`);

    const command = client.commands.get(commandName);
    if (!command) {
        console.log(`Command not found: ${commandName}`);
        return;
    }

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error('Error executing command:', error);
        message.reply('There was an error executing that command!');
    }
});

client.on('interactionCreate', async interaction => {
    if (isBlacklisted(interaction.user.id)) {
        return interaction.reply({ content: 'You are blacklisted from using this bot.', ephemeral: true });
    }

    // Add cooldown check for commands
    if (interaction.isChatInputCommand()) {
        if (isOnCooldown(interaction.user.id)) {
            return interaction.reply({ content: 'Please wait 5 seconds between commands.', ephemeral: true });
        }
        setCooldown(interaction.user.id);
        
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Error executing command:', error);
            const errorMessage = 'There was an error executing this command!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    } else if (interaction.isButton()) {
        // Add this section to handle giveaway buttons
        if (interaction.customId === 'enter_giveaway') {
            const giveawayCommand = require('./commands/slash/giveaway.js');
            try {
                await giveawayCommand.handleButton(interaction);
            } catch (error) {
                console.error('Error handling giveaway button:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ There was an error entering the giveaway!', 
                        ephemeral: true 
                    });
                }
            }
            return;
        }

        if (interaction.customId === 'ban_appeal') {
            const modal = new ModalBuilder()
                .setCustomId('ban_appeal_form')
                .setTitle('Ban Appeal')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('roblox_username')
                            .setLabel('YOUR ROBLOX USERNAME')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setPlaceholder('Enter your Roblox username here...')
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('ban_reason')
                            .setLabel('WHY WERE YOU BANNED?')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                            .setPlaceholder('Begin Typing Here...')
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('appeal_reason')
                            .setLabel('WHY SHOULD YOU BE UNBANNED?')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                            .setPlaceholder('Begin Typing Here...')
                            .setMaxLength(750)
                    )
                );

            await interaction.showModal(modal);
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'ban_appeal_form') {
            const username = interaction.fields.getTextInputValue('roblox_username');
            const banReason = interaction.fields.getTextInputValue('ban_reason');
            const appealReason = interaction.fields.getTextInputValue('appeal_reason');

            const appealEmbed = new EmbedBuilder()
                .setTitle('New Ban Appeal')
                .setColor('#FFA500')
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .addFields(
                    { name: 'Discord User', value: `<@${interaction.user.id}>` },
                    { name: 'Roblox Username', value: username },
                    { name: 'Ban Reason', value: banReason },
                    { name: 'Appeal Reason', value: appealReason },
                    { name: 'Status', value: '⏳ Pending Review' }
                )
                .setTimestamp()
                .setFooter({ text: 'Ban Appeal System' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_appeal_${interaction.user.id}`)
                    .setLabel('Accept')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`deny_appeal_${interaction.user.id}`)
                    .setLabel('Deny')
                    .setStyle(ButtonStyle.Danger)
            );

            const appealsChannel = interaction.guild.channels.cache.get(process.env.APPEALS_CHANNEL_ID);
            if (appealsChannel) {
                await appealsChannel.send({ embeds: [appealEmbed], components: [row] });
            }

            await interaction.reply({ content: 'Your appeal has been submitted.', ephemeral: true });
        }
    }

    try {
        await handleModalSubmit.execute(interaction);
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'There was an error handling this interaction.', ephemeral: true });
        }
    }
});

// Error handling
client.on('error', error => {
    console.error('Client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login with token
const token = process.env.BOT_TOKEN || process.env.TOKEN;
if (!token) {
    console.error('No token provided in environment variables!');
    process.exit(1);
}

client.login(token);
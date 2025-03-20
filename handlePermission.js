const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const cooldowns = new Map(); // Initialize a cooldown map

module.exports = {
    async execute(interaction) {
        try {
            if (interaction.isButton()) {
                await this.handleButtonInteraction(interaction);
            } else if (interaction.isModalSubmit()) {
                await this.handleModalSubmit(interaction);
            }
        } catch (error) {
            console.error('Error executing interaction:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
            }
        }
    },

    async handleButtonInteraction(interaction) {
        try {
            const [action, targetUserId] = interaction.customId.split('_'); // Extract action and targetUserId from customId

            if (!action || !targetUserId) {
                console.error('Invalid customId:', interaction.customId);
                return;
            }

            if (action === 'accept' || action === 'deny') {
                const modal = new ModalBuilder()
                    .setCustomId(`add_note_modal_${action}`)
                    .setTitle('Add a Note')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('note')
                                .setLabel('Add a note (optional)')
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(false)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('requester_id')
                                .setLabel('ID of the Requesting User (prefilled for you)')
                                .setStyle(TextInputStyle.Short)
                                .setValue(targetUserId) // Prefill with the requester's ID
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'An error occurred while handling the button interaction.', ephemeral: true });
            }
        }
    },

    async handleModalSubmit(interaction) {
        try {
            if (interaction.customId === 'permission_request_modal') {
                const userId = interaction.user.id;
    
                // Cooldown logic
                const cooldown = 2 * 60 * 1000; // 2 minutes in milliseconds
                const now = Date.now();
                const timestamps = cooldowns.get(userId) || { lastInteraction: 0 };
    
                if (now - timestamps.lastInteraction < cooldown) {
                    const timeLeft = ((cooldown - (now - timestamps.lastInteraction)) / 1000).toFixed(0);
                    await interaction.reply({ content: `Please wait ${timeLeft} more second(s) before submitting the form again.`, ephemeral: true });
                    return;
                }
    
                // Update the last interaction time
                timestamps.lastInteraction = now;
                cooldowns.set(userId, timestamps);
    
                const robloxUsername = interaction.fields.getTextInputValue('roblox_username');
                const duration = interaction.fields.getTextInputValue('duration');
                const roleplayRequest = interaction.fields.getTextInputValue('roleplay_request');
                const location = interaction.fields.getTextInputValue('location'); // Get the location value
                const channelId = '1325203653048406056'; // Replace with your actual channel ID
    
                const embed = new EmbedBuilder()
                    .setColor('2d2d31')
                    .setAuthor({
                        name: interaction.user.username,
                        iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true })
                    })
                    .setTitle('Permission Request')
                    .setThumbnail('https://cdn.discordapp.com/icons/1145425767283556532/b947aca545a7b23d0079c20b1fd01c29.png?size=512')
                    .addFields(
                        { name: 'Roblox Username', value: robloxUsername, inline: true },
                        { name: 'Duration', value: duration, inline: true },
                        { name: 'Roleplay Request', value: roleplayRequest }
                    )
                    .setTimestamp();
    
                // Add location field only if it was provided
                if (location) {
                    embed.addFields({ name: 'Location', value: location, inline: true });
                }
    
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`accept_${interaction.user.id}`)
                            .setLabel('Accept')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`deny_${interaction.user.id}`)
                            .setLabel('Deny')
                            .setStyle(ButtonStyle.Danger)
                    );
    
                const channel = await interaction.client.channels.fetch(channelId);
                const message = await channel.send({
                    content: '<@&1176348250261966919>', // Ping the role
                    embeds: [embed],
                    components: [row]
                });
    
                // Store the request details with the message ID
                this.requests = this.requests || {};
                this.requests[interaction.user.id] = {
                    robloxUsername,
                    duration,
                    roleplayRequest,
                    location, // Store the location as well
                    messageId: message.id
                };
    
                if (!interaction.replied) {
                    await interaction.reply({ content: 'Your request has been sent!', ephemeral: true });
                }
            } else if (interaction.customId.startsWith('add_note_modal_')) {
                const note = interaction.fields.getTextInputValue('note');
                const requesterUserId = interaction.fields.getTextInputValue('requester_id');
                const userRequest = this.requests[requesterUserId];
                const action = interaction.customId.split('_').pop(); // Extract the action from customId
    
                if (userRequest) {
                    const user = await interaction.client.users.fetch(requesterUserId);
                    const responseMessage = action === 'accept'
                        ? `Your permission request has been accepted for **${userRequest.roleplayRequest}**.` 
                        : `Your permission request has been denied for **${userRequest.roleplayRequest}**`;
    
                    // Send the note with the requester's Discord ID included
                    if (note) {
                        await user.send(`${responseMessage}\n\n**Note:** ${note}`);
                    } else {
                        await user.send(`${responseMessage}`);
                    }
    
                    const channel = await interaction.client.channels.fetch('1270938935476092938'); // Replace with your actual channel ID
    
                    try {
                        // Fetch the specific message by ID
                        const message = await channel.messages.fetch(userRequest.messageId);
    
                        // Check if the message object is valid
                        if (message && typeof message.edit === 'function') {
                            const updatedEmbed = new EmbedBuilder()
                                .setColor('2d2d31')
                                .setAuthor({
                                    name: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true })
                                })
                                .setTitle('Permission Request Decision')
                                .setThumbnail('https://cdn.discordapp.com/icons/1145425767283556532/b947aca545a7b23d0079c20b1fd01c29.png?size=512')
                                .setDescription(
                                    action === 'accept' 
                                    ? `It has been **accepted** for **${userRequest.roleplayRequest}** by **${interaction.user.username}**\nRoblox Username: **${userRequest.robloxUsername}**\nDuration: **${userRequest.duration}**${userRequest.location ? `\nLocation: **${userRequest.location}**` : ''}${note ? `\n\n**Note:** ${note}` : ''}`
                                    : `It has been **denied** for **${userRequest.roleplayRequest}** by **${interaction.user.username}**\nRoblox Username: **${userRequest.robloxUsername}**\nDuration: **${userRequest.duration}**${userRequest.location ? `\nLocation: **${userRequest.location}**` : ''}${note ? `\n\n**Note:** ${note}` : ''}`
                                )
                                .setTimestamp();

                            await message.edit({ embeds: [updatedEmbed], components: [] });
                        } else {
                            console.error('Invalid message object or edit method not available:', message);
                        }
    
                        if (!interaction.replied) {
                            await interaction.reply({ content: 'The decision has been recorded.', ephemeral: true });
                        }
                    } catch (fetchError) {
                        console.error('Error fetching the message:', fetchError);
                    }
    
                    // Clear the request after handling
                    delete this.requests[requesterUserId];
                } else {
                    console.error('Request not found for user:', requesterUserId);
                    await interaction.reply({ content: 'Could not find the original request.', ephemeral: true });
                }
            }
        } catch (error) {
            console.error('Error handling modal submit:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
            }
        }
    }
};
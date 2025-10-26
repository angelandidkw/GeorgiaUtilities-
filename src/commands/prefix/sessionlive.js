const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { setSessionState, getSessionState } = require('../slashcommands/command/sessionState');

module.exports = {
    name: 'sessionlive',
    description: 'Shows session information and status',
    async execute(message, args) {
        // Define the role ID (or name) required to use this command
        const requiredRole = '1244109093892001802'; // Replace with your role ID or name

        // Check if the user has the required role
        if (!message.member.roles.cache.has(requiredRole)) {
            // If the user does not have the required role, send a message and exit
            return message.reply('You do not have the required role to use this command.');
        }

        try {
            const imageembed = new EmbedBuilder()
                .setColor('2d2d31')
                .setImage('https://media.discordapp.net/attachments/919709999423434842/1264350706471796847/GSRP_SESSIONS.png?ex=67790f9a&is=6777be1a&hm=fe5f98fee4c48a9c977f75504ce88ced3b74747a7043a8cef4e900f7d54bce80&format=webp&quality=lossless&width=2958&height=1202&');

            const embed = new EmbedBuilder()
                .setColor('2d2d31')
                .setTitle('**<:GSRP:1264351681764655144>  Session Information**')
                .setDescription('<:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570><:whiteline:1209289945470996570>\n\n<:GSRP:1264351681764655144> Interested in participating in our immersive & realistic roleplays? This is the place for you! Here at Georgia State Roleplay we try to host sessions daily for our players to create a unmatched roleplay experience. Below all the necessary information to participate in our sessions will be provided.\n\n<:Calender:1324878491224772712> **Session Schedule**\n**Weekend**  sessions are normally held around <t:1731171600:t>  - <t:1731178800:t>\n**Weekday** sessions are normally held around <t:1716580800:t> - <t:1716586200:t>\n\n<:Arrow:1174787121916162121> Times listed above are subject to change, dependent on staff and community availability.\n<:Arrow:1174787121916162121> The **Fulton County Sheriff\'s Office** team in-game is **discord** locked, meaning you must be in the discord and verified to join and roleplay on the team.\n<:Arrow:1174787121916162121> If you need in-game assistance please run the `!mod` command in-game.')
                .setImage('https://media.discordapp.net/attachments/919709999423434842/1266089757126037534/image.png?ex=6778cbb8&is=67777a38&hm=08b96a8683bbba1dee38aa262b3c12be32abe3e566dfb7d4351e6dd39774066f&format=webp&quality=lossless&width=3072&height=296&');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('session_status')
                        .setLabel(getSessionState() ? 'Session Active' : 'Session Offline')
                        .setStyle(getSessionState() ? ButtonStyle.Success : ButtonStyle.Danger)
                        .setDisabled(true)
                );

            const sentMessage = await message.channel.send({
                embeds: [imageembed, embed],
                components: [row]
            });

            // Send DM to command user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('2d2d31')
                    .setTitle('Session Live Setup')
                    .setDescription('The session live information has been successfully set up in the channel.')

                await message.author.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.error('Failed to send Direct Message:', error);
            }

            // Set up an interval to update the button status
            const updateStatus = setInterval(async () => {
                const updatedRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('session_status')
                            .setLabel(getSessionState() ? 'Session Active' : 'Session Offline')
                            .setStyle(getSessionState() ? ButtonStyle.Success : ButtonStyle.Danger)
                            .setDisabled(true)
                    );

                if (sentMessage.editable) {
                    await sentMessage.edit({
                        embeds: [imageembed, embed],
                        components: [updatedRow]
                    });
                }
            }, 5000); 

            // Store the interval ID in a global variable so it's not cleared
            if (!global.sessionIntervals) {
                global.sessionIntervals = [];
            }
            global.sessionIntervals.push(updateStatus);

        } catch (error) {
            console.error('Error in sessionlive command:', error);
            await message.reply('There was an error showing the session information.');
        }
    },
};
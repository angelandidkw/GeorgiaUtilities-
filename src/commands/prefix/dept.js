const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('application')
        .setDescription('Check the application status for a department')
        .addStringOption(option =>
            option.setName('department')
                .setDescription('The department to check')
                .setRequired(true)
                .addChoices(
                    { name: 'Fulton County Sheriffs Office', value: 'FSCO' },
                    { name: 'Atlanta Fire Department', value: 'AFD' },
                    { name: 'Georgia State Patrol', value: 'GSP' }, // Changed value to "GSP"
                    { name: 'Atlanta Police Department', value: 'APD' }
                ))
        .addStringOption(option =>
            option.setName('status')
                .setDescription('The application status')
                .setRequired(true)
                .addChoices(
                    { name: 'Accepted', value: 'accepted' },
                    { name: 'Denied', value: 'denied' }
                ))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check the application status for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('notes')
                .setDescription('Additional notes')
                .setRequired(false)),

    async execute(interaction) {
        const requiredRoleID = '1245485208493621318'; // Replace with the actual role ID
        if (!interaction.member.roles.cache.has(requiredRoleID)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true,
            });
        }

        const department = interaction.options.getString('department');
        const status = interaction.options.getString('status');
        const targetUser = interaction.options.getUser('user');
        const notes = interaction.options.getString('notes');
        const applicationViewer = interaction.user.id;

        const targetChannelId = '1325203588133421167'; // Replace with the correct channel ID
        const targetChannel = interaction.guild.channels.cache.get(targetChannelId);

        if (!targetChannel) {
            return interaction.reply({
                content: 'Could not find the target channel.',
                ephemeral: true,
            });
        }

        const rolesToAdd = {
            FSCO: ['1246498844594802800', '1245485251413676123'],
            AFD: ['1246498874521157644', '1245485251413676123'],
            GSP: ['1246498779612581969', '1245485251413676123'],
            APD: ['1246498818934181981', '1245485251413676123'],
        };

        const thumbnails = {
            FSCO: 'https://media.discordapp.net/attachments/919709999423434842/1248053170777751562/fcso.png',
            AFD: 'https://media.discordapp.net/attachments/919709999423434842/1248728530100027565/2SO6mvka51OAAAAAElFTkSuQmCC.png',
            GSP: 'https://media.discordapp.net/attachments/919709999423434842/1247714830501150730/N5AAAAABJRU5ErkJggg.png',
            APD: 'https://media.discordapp.net/attachments/1246319992488853524/1300585836089184286/apd.png',
        };

        const images = {
            accepted: {
                FSCO: 'https://media.discordapp.net/attachments/919709999423434842/1248729045428863048/-_-_2024-06-06T194058.984.png',
                AFD: 'https://media.discordapp.net/attachments/919709999423434842/1248729047018639360/-_-_2024-06-07T160240.861.png',
                GSP: 'https://media.discordapp.net/attachments/919709999423434842/1248409264461058218/-_-_2024-06-06T185226.323.png',
                APD: 'https://media.discordapp.net/attachments/1246319992488853524/1300585127948062782/apdbanner_6.png',
            },
            denied: {
                FSCO: 'https://media.discordapp.net/attachments/919709999423434842/1248729045764411484/-_-_2024-06-06T194122.573.png',
                AFD: 'https://media.discordapp.net/attachments/919709999423434842/1248729047379218663/-_-_2024-06-07T160310.759.png',
                GSP: 'https://media.discordapp.net/attachments/919709999423434842/1248410491043188786/-_-_2024-06-06T185723.913.png', // Changed key from "Georgia State Patrol" to "GSP"
                APD: 'https://media.discordapp.net/attachments/1246319992488853524/1300585156209541211/apdbanner_7.png',
            },
        };

        // Mapping for full department names for display purposes
        const departmentNames = {
            FSCO: 'Fulton County Sheriffs Office',
            AFD: 'Atlanta Fire Department',
            GSP: 'Georgia State Patrol', // "GSP" will display as "Georgia State Patrol"
            APD: 'Atlanta Police Department'
        };

        const departmentDisplayName = departmentNames[department] || department;

        const embed = new EmbedBuilder()
		.setTitle(`${departmentDisplayName}`)
            .setDescription(
                `> On behalf of the ${departmentDisplayName} administration team, we would like to inform you of being **${status}** ${
                    status === 'accepted' ? 'into' : 'from'
                } the department! ${
                    status === 'accepted'
                        ? 'For more information, head over to the department server.'
                        : 'Feel free to re-apply!'
                }\n<:Application:1244373131657875497> **Application Viewer:** <@${applicationViewer}>${
                    notes ? `\n<:SpeechBubble:1177680381986742302> **Notes:** ${notes}` : ''
                }`
            )
            .setThumbnail(thumbnails[department])
            .setImage(images[status][department])
            .setColor('#2B2D31');

        if (status === 'accepted' && rolesToAdd[department]) {
            try {
                const member = await interaction.guild.members.fetch(targetUser.id);
                await member.roles.add(rolesToAdd[department]);
            } catch (error) {
                console.error('Failed to add roles:', error);
                return interaction.reply({
                    content: 'Failed to assign roles to the user.',
                    ephemeral: true,
                });
            }
        }

        try {
            await targetChannel.send({
                content: `${targetUser}`,
                embeds: [embed],
            });
            await interaction.reply({
                content: 'Application status has been sent.',
                ephemeral: true,
            });
        } catch (error) {
            console.error('Failed to send application status:', error);
            await interaction.reply({
                content: 'An error occurred while sending the application status.',
                ephemeral: true,
            });
        }
    },
};
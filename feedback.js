const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const feedbackFile = 'feedback.json';
const feedbackChannelId = '1325203717494145035';
const starEmoji = '<:Star:1339718514981867664>';
const starOutlineEmoji = '<:StarOutline:1339718512909746328>';
const embedColor = 0x2d2d31;
const largeImageURL = "https://media.discordapp.net/attachments/919709999423434842/1339752662509424730/footer_4.png?ex=67afdd66&is=67ae8be6&hm=f792a024ff89fadb215edb1e8b6dfa165cd005c25866058bcead45a60ea8179c&=&format=webp&quality=lossless&width=2856&height=142";
const thumbnailImageURL = "https://media.discordapp.net/attachments/919709999423434842/1339752743904219206/image_21_1.png?ex=67afdd79&is=67ae8bf9&hm=29385c2854ff553b04bdd9bd55477e8d6b5f2550c60cb0fa91f7752e4b45f916&=&format=webp&quality=lossless&width=1214&height=1214";
const cooldowns = new Map();
const cooldownTime = 2 * 60 * 1000; // 2 minutes in milliseconds

if (!fs.existsSync(feedbackFile)) fs.writeFileSync(feedbackFile, JSON.stringify({}));

module.exports = {
    name: 'feedback',
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Staff feedback system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('submit')
                .setDescription('Submit feedback for a staff member')
                .addUserOption(option =>
                    option.setName('staff')
                        .setDescription('The staff member to give feedback to')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('rating')
                        .setDescription('Rating from 1-5')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(5))
                .addStringOption(option =>
                    option.setName('feedback')
                        .setDescription('Your feedback message')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View feedback statistics for a staff member')
                .addUserOption(option =>
                    option.setName('staff')
                        .setDescription('The staff member to view feedback for')
                        .setRequired(true))),
    async execute(interaction) {
        const { options, user, member } = interaction;
        const feedbackData = JSON.parse(fs.readFileSync(feedbackFile));
        
        if (interaction.options.getSubcommand() === 'submit') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                if (cooldowns.has(user.id)) {
                    const expirationTime = cooldowns.get(user.id) + cooldownTime;
                    if (Date.now() < expirationTime) {
                        const timeLeft = ((expirationTime - Date.now()) / 1000).toFixed(0);
                        return interaction.reply({ content: `You are on cooldown! Please wait ${timeLeft} seconds before submitting another feedback.`, ephemeral: true });
                    }
                }
                cooldowns.set(user.id, Date.now());
            }
            
            const staffMember = options.getUser('staff');
            const rating = options.getInteger('rating');
            const feedbackText = options.getString('feedback');
            
            if (!feedbackData[staffMember.id]) {
                feedbackData[staffMember.id] = { ratings: [], feedback: [] };
            }
            
            feedbackData[staffMember.id].ratings.push(rating);
            feedbackData[staffMember.id].feedback.push({ user: user.id, text: feedbackText, timestamp: Date.now() });
            
            fs.writeFileSync(feedbackFile, JSON.stringify(feedbackData, null, 2));
            
            const stars = starEmoji.repeat(rating) + starOutlineEmoji.repeat(5 - rating);
            
            const feedbackEmbed = {
                author: {
                    name: user.tag,
                    icon_url: user.displayAvatarURL()
                },
                title: 'Staff Feedback',
                fields: [
                    { name: 'Staff Member:', value: `<@${staffMember.id}>`, inline: true },
                    { name: 'Rating:', value: stars, inline: true },
                    { name: 'Feedback:', value: feedbackText }
                ],
                color: embedColor,
                image: { url: largeImageURL },
                thumbnail: { url: thumbnailImageURL },
                timestamp: new Date()
            };
            
            const feedbackChannel = await interaction.guild.channels.cache.get(feedbackChannelId);
            if (feedbackChannel) feedbackChannel.send({ embeds: [feedbackEmbed] });
            
            await interaction.reply({ content: `Feedback submitted for ${staffMember.tag}!`, ephemeral: true });
        } else if (interaction.options.getSubcommand() === 'view') {
            const requiredRoleId = '1244398079852019812';
            if (!member.roles.cache.has(requiredRoleId)) {
                return interaction.reply({ content: 'You do not have permission to view feedback statistics.', ephemeral: true });
            }
            
            const staffMember = options.getUser('staff');
            
            if (!feedbackData[staffMember.id]) {
                return interaction.reply({ content: `No feedback found for ${staffMember.tag}.`, ephemeral: true });
            }
            
            const ratings = feedbackData[staffMember.id].ratings;
            const feedbackList = feedbackData[staffMember.id].feedback;
            
            const lowestRating = Math.min(...ratings);
            const highestRating = Math.max(...ratings);
            const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
            const feedbackCount = feedbackList.length;
            const firstFeedback = `<t:${Math.floor(feedbackList[0].timestamp / 1000)}:f>`;
            const lastFeedback = `<t:${Math.floor(feedbackList[feedbackList.length - 1].timestamp / 1000)}:f>`;
            
            await interaction.reply({
                embeds: [{
                    author: {
                        name: `${staffMember.tag}'s Staff Feedback`,
                        icon_url: staffMember.displayAvatarURL()
                    },
                    fields: [
                        { name: 'Rating Statistics:', value: `\n• **Lowest Rating:** ${lowestRating}\n• **Highest Rating:** ${highestRating}\n• **Average Rating:** ${avgRating}` },
                        { name: 'Feedback Statistics:', value: `\n• **Feedback Given:** ${feedbackCount}\n• **First Feedback:** ${firstFeedback}\n• **Last Feedback:** ${lastFeedback}` },
                    ],
                    color: embedColor,
                    image: { url: largeImageURL },
                    thumbnail: { url: thumbnailImageURL },
                    timestamp: new Date()
                }],
                ephemeral: true
            });
        }
    }
};
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resources')
        .setDescription('Displays server resources.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Restrict visibility to administrators only
        .setDMPermission(false), // Disable the command in DMs (optional),

    async execute(interaction) {
        // First Embed (Empty with image)
        const headerEmbed = new EmbedBuilder()
            .setColor('#2d2d31')
            .setImage('https://media.discordapp.net/attachments/919709999423434842/1339991243115069490/image_-_2025-02-14T110640.687.png?ex=67b0bb98&is=67af6a18&hm=1e8e5304c901eb11f7527e208d5adf9689ea354af799a5ac55199f02b5445340&=&format=webp&quality=lossless&width=1100&height=366');

        // Second Embed (Main content)
        const mainEmbed = new EmbedBuilder()
            .setTitle('Server Resources')
            .setDescription('<:Arrow:1174787121916162121> Welcome to the **Georgia State Roleplay** resources page. Notable server pages and resources can all be found here, if you need additional information in regards of the resources here please review <#1325203552485769280>')
            .setImage('https://media.discordapp.net/attachments/919709999423434842/1339989885154758808/fcsofooter_1.png?ex=67b0ba54&is=67af68d4&hm=a5401695f10dca884c29fa727ae066d5cb2be02e7498b3ab19fefd0cf9df83ef&=&format=webp&quality=lossless&width=2856&height=142')
            .addFields(
                {
                    name: '<:Links:1209555560677122160> **Server Channels:**',
                    value: `<#1265080609450233867>\n<#1325203568071802891>\n<#1325225630719148183>\n<#1325225684515164300>\n<#1325203586874867784>`,
                    inline: true,
                },
                {
                    name: '<:Links:1209555560677122160> Server Links:',
                    value: `<:Roblox:1175208998623002694> [Roblox Group](https://www.roblox.com/groups/34360233/PRC-Georgia-State-Roleplay#!/about)\n<:Application:1244373131657875497> [Staff Application](https://forms.gle/AL58foTAoxiGBqke7)\n<:Melonly:1255243158023966730> [Melonly Server Directory](https://servers.melonly.xyz/georgia-state-roleplay-31)\n<:Application:1175208995682799616> [Game Moderation History](https://melonly.xyz/logs/7211186006823800832)\n<:Folder:1175210200978964531> [Server Policies](https://georgia-state-roleplay-3.gitbook.io/georgia-state-roleplay-server-policies)`,
                    inline: true,
                }
            )
            .setColor('#2b2d31');

        // Send the embeds as a reply
        await interaction.reply({ embeds: [headerEmbed, mainEmbed], ephemeral: true });
    },
};
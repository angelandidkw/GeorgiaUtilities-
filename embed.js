const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

const requiredRoleId = "1244398079852019812"; // Role ID restriction

module.exports = {
    data: new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Creates a custom embed")
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
        .addStringOption(option =>
            option.setName("author")
                .setDescription("Author of the embed")
                .setRequired(false))
        .addStringOption(option =>
            option.setName("author_icon")
                .setDescription("Author icon URL")
                .setRequired(false))
        .addStringOption(option =>
            option.setName("title")
                .setDescription("Title of the embed")
                .setRequired(false))
        .addStringOption(option =>
            option.setName("description")
                .setDescription("Description of the embed")
                .setRequired(false))
        .addStringOption(option =>
            option.setName("color")
                .setDescription("Color of the embed (Hex format, e.g., #ff0000)")
                .setRequired(false))
        .addStringOption(option =>
            option.setName("fields")
                .setDescription("Fields for the embed (Use JSON format: [{\"name\":\"Field1\",\"value\":\"Value1\",\"inline\":true}])")
                .setRequired(false))
        .addStringOption(option =>
            option.setName("image")
                .setDescription("Image URL for the embed")
                .setRequired(false))
        .addStringOption(option =>
            option.setName("footer")
                .setDescription("Footer text for the embed")
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName("hidden")
                .setDescription("Whether the command usage message should be hidden")
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({ content: "❌ You do not have permission to use this command.", ephemeral: true });
        }

        const hidden = interaction.options.getBoolean("hidden") || false;
        const author = interaction.options.getString("author") || "";
        const authorIcon = interaction.options.getString("author_icon") || "";
        const title = interaction.options.getString("title") || "";
        const description = interaction.options.getString("description") || "";
        let color = interaction.options.getString("color") || "";
        const fields = interaction.options.getString("fields") || "[]";
        const image = interaction.options.getString("image") || "";
        const footer = interaction.options.getString("footer") || "";

        let parsedFields;
        try {
            parsedFields = JSON.parse(fields);
            if (!Array.isArray(parsedFields)) throw new Error();
        } catch (error) {
            return interaction.reply({ content: "❌ Invalid JSON format for fields!", ephemeral: true });
        }

        // Validate hex color
        if (color && !/^#?[0-9A-Fa-f]{6}$/.test(color)) {
            return interaction.reply({ content: "❌ Invalid color format! Use hex codes (e.g., #ff0000).", ephemeral: true });
        }
        if (color.startsWith("#")) color = color.replace("#", ""); // Remove "#" if included

        const embed = new EmbedBuilder()
            .setTitle(title || null)
            .setDescription(description || null)
            .setColor(parseInt(color, 16) || null);

        if (author) embed.setAuthor({ name: author, iconURL: authorIcon || null });
        if (footer) embed.setFooter({ text: footer });
        if (image) embed.setImage(image);
        if (parsedFields.length > 0) {
            parsedFields.forEach(field => {
                if (field.name && field.value) {
                    embed.addFields({ name: field.name, value: field.value, inline: field.inline || false });
                }
            });
        }

        // Send the embed to the channel
        await interaction.channel.send({ embeds: [embed] });

        // Send the success message and delete it after 5 seconds
        const successMessage = await interaction.reply({ content: "✅ Embed created successfully!", ephemeral: hidden });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 2000);
    }
};
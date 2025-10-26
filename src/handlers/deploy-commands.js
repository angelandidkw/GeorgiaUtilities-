const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function deploySlashCommands() {
  const token = process.env.BOT_TOKEN || process.env.TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId || !guildId) {
    console.error('Missing BOT_TOKEN/CLIENT_ID/GUILD_ID environment variables.');
    return;
  }

  const commands = [];
  const slashDir = path.join(__dirname, '..', 'commands', 'slash');

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.js')) {
        const command = require(full);
        if (command && command.data && typeof command.execute === 'function') {
          commands.push(command.data.toJSON());
          console.log(`Prepared slash command: ${command.data.name}`);
        }
      }
    }
  };

  if (fs.existsSync(slashDir)) {
    walk(slashDir);
  }

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error while registering commands:', error);
  }
}

module.exports = deploySlashCommands;

if (require.main === module) {
  deploySlashCommands();
}
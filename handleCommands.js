const fs = require('fs');
const path = require('path');
const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
require('dotenv').config();

module.exports = async (client) => {
  const commands = [];
  
  // Load slash commands from directories
  const loadCommands = async (dir) => {
    const files = await fs.promises.readdir(path.join(__dirname, dir));
    
    for (const file of files) {
      const stat = await fs.promises.lstat(path.join(__dirname, dir, file));
      if (stat.isDirectory()) {
        await loadCommands(path.join(dir, file));
      } else if (file.endsWith('.js')) {
        const command = require(path.join(__dirname, dir, file));
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          commands.push(command.data.toJSON());
          console.log(`Loaded command: ${command.data.name}`);
        }
      }
    }
  };

  try {
    console.log('Started refreshing application (/) commands.');
    
    // Load commands from all relevant directories
    await loadCommands('slashcommands/command');
    await loadCommands('slashcommands/infraction-system');
    
    // Register commands with Discord API
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN || process.env.TOKEN);
    
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error loading commands:', error);
  }
};
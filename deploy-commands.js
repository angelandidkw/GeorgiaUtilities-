const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

module.exports = (client) => {
  client.handleCommands = async (commandFolders, basePath) => {
    client.commandArray = [];

    for (const folder of commandFolders) {
      const commandFiles = fs.readdirSync(`${basePath}/${folder}`).filter(file => file.endsWith('.js'));
      for (const file of commandFiles) {
        const command = require(`../${folder}/${file}`);
        if (command.data && command.data.name) {
          client.slashCommands.set(command.data.name, command);
          client.commandArray.push(command.data.toJSON());
        } else {
          console.warn(`The command at ../${folder}/${file} is missing a required "data.name" property.`);
        }
      }
    }

    // Register commands with Discord
    const rest = new REST({ version: '10' }).setToken(token);

    try {
      console.log('Started refreshing application (/) commands.');

      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: client.commandArray },
      );

      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('Error while registering commands:', error);
    }
  };

  client.handleEvents = async (eventFiles, basePath) => {
    for (const file of eventFiles) {
      const event = require(`${basePath}/${file}`);
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    }
  };

  // Ensure to call the command handling function
  const loadCommandsFromDirectory = async (directory) => {
    const commandFiles = fs.readdirSync(directory, { withFileTypes: true });
      for (const file of commandFiles) {
      if (file.isDirectory()) {
        await loadCommandsFromDirectory(path.join(directory, file.name)); // Recursively load commands from subdirectories
      } else if (file.name.endsWith('.js')) {
        const command = require(path.join(directory, file.name));
        if (command && command.name) {
          client.commands.set(command.name, command);
          console.log(`Command loaded: ${command.name}`); // Debug log
        } else {
          console.warn(`The command at ${path.join(directory, file.name)} is missing a required "name" property.`);
        }
      }
    }
  };

  client.handleCommands = async (commandDirs, basePath) => {
    for (const dir of commandDirs) {
      const commandsPath = path.join(basePath, dir);
      await loadCommandsFromDirectory(commandsPath); // Recursively load commands
    }
  };

  // Call the function with multiple directories
  (async () => {
    await client.handleCommands(['commands'], __dirname);
  })();

  // Add this line with your other command requires

  // Make sure to add giveRoleCommand to your commands array when deploying
};
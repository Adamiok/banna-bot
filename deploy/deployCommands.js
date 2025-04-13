"use strict";

// Hack to ensure resolve path is from src/ directory, as project files expect that
const originalRequire = require.main.require.bind(require.main);
require.main.require = (moduleName) => {
    const modifiedModuleName = moduleName.startsWith("./") ? `./../src/${moduleName.slice(2)}` : moduleName;
    
    return originalRequire(modifiedModuleName)
};

// Required definitions from index.js
global.projectRoot = `${__dirname}/../`;

require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const commands = [];
const foldersPath = path.join(__dirname, "../src/commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if (!("data" in command && "execute" in command)) {
            console.error(`[ERROR] The command at ${filePath} is missing a required "data" or "execute" property.`);
            continue;
        }
        
        commands.push(command.data.toJSON());
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// and deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`Successfully refreshed ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();

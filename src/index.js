"use strict";

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { ActivityType, Client, GatewayIntentBits, Collection } = require('discord.js');

global.projectRoot = `${__dirname}/../`;
const client = new Client( {intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers], presence: {activities: [{name: "impersonators", type: ActivityType.Watching}], status: "online"}} );
client.starting = true;


// Load commands
client.commands = new Collection();
const foldersPath = path.join(__dirname, "commands");
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
        
        client.commands.set(command.data.name, command);
    }
}


// Load events
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (!("name" in event && "execute" in event)) { // event.once is optional
        console.error(`[ERROR] The event at ${filePath} is missing a required "name" or "execute" property.`);
        continue;
    }
    
    let proxy = (...args) => !client.starting ? event.execute(...args) : undefined;
    if (event.allowWhenStarting) {
        proxy = (...args) => event.execute(...args);
    }
    
    if (event.once) {
        client.once(event.name, proxy);
    } else {
        client.on(event.name, proxy);
    }
}


client.login(process.env.DISCORD_TOKEN);

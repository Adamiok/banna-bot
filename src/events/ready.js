"use strict";

const config = require.main.require("./core/config/configManager.js");
const avatarCache = require.main.require("./core/cache/protectedUserAvatarCache.js");
const impersonationHandler = require.main.require("./core/impersonation/handler.js");

const { Events } = require("discord.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    allowWhenStarting: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        
        config.verifyIntegrity(client);
        await avatarCache.build(client);
        
        console.log("Started listener for events");
        client.starting = false;
        
        await impersonationHandler.checkAllGuildsAndActionViolations(client);
        
        console.log("Bot sucesfully started!");
    },
};

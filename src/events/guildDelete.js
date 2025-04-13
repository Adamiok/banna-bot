"use strict";

const config = require.main.require("./core/config/configManager.js");

const { Events } = require("discord.js")

module.exports = {
    name: Events.GuildDelete,
    async execute(guild) {
        if (!guild.available) {
            // Discord outage
            return;
        }
        
        config.removeGuildEntries(guild.id);
    }
}

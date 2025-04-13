"use strict";

const config = require.main.require("./core/config/configManager.js");

const { Events } = require("discord.js")

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        config.addGuildConfig(guild.id);
    }
}

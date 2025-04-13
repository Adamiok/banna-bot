"use strict";

const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Checks if the bot is responding"),
    async execute(interaction) {
        await interaction.reply( {content: "Pong! :ping_pong:", flags: MessageFlags.Ephemeral} )
    },
};

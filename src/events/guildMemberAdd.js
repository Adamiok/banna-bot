"use strict"

const impersonationHandler = require.main.require("./core/impersonation/handler.js");

const { Events } = require("discord.js");

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // Check for violations
        impersonationHandler.checkAndActionViolations(member);
    },
}

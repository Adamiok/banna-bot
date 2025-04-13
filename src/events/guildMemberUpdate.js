"use strict";

const configManager = require.main.require("./core/config/configManager.js");
const avatarCache = require.main.require("./core/cache/protectedUserAvatarCache.js");
const impersonationHandler = require.main.require("./core/impersonation/handler.js");

const { Events } = require("discord.js");

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        const protectedUserIds = configManager.getProtectedUsers(newMember.guild.id);
        
        const usernameChange = oldMember.nickname !== newMember.nickname || oldMember.user.displayName !== newMember.user.displayName || oldMember.user.username !== newMember.user.username;
        const avatarChange = (oldMember.avatar ?? oldMember.user.avatar) !== (newMember.avatar ?? newMember.user.avatar);
        
        // Check for protected cache update
        if (protectedUserIds.includes(newMember.id) && avatarChange) {
            avatarCache.add(newMember.user);
        }
        
        // Check for violations
        if (usernameChange || avatarChange) {
            impersonationHandler.checkAndActionViolations(newMember);
        }
    },
}

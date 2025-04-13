"use strict";

const detection = require.main.require("./core/impersonation/detection.js");
const punishment = require.main.require("./core/impersonation/punishment.js");
const configManager = require.main.require("./core/config/configManager.js");

const checkAndActionViolationsBothRequired = async (guildMember, usernameDetection, avatarDetection) => {
    if (!(usernameDetection.type !== detection.ViolationType.NONE && avatarDetection.type !== detection.ViolationType.NONE)) return;
    
    // Take the "softer" of the two values
    const softerThreshold = [usernameDetection.threshold, avatarDetection.threshold].includes(detection.ViolationThreshold.HARD) ? detection.ViolationThreshold.HARD : detection.ViolationThreshold.SOFT;
    if (softerThreshold === detection.ViolationThreshold.SOFT) {
        await punishment.kick(guildMember, usernameDetection.type);
    } else {
        await punishment.ban(guildMember, usernameDetection.type === detection.ViolationType.USERNAME);
    }
            
    return;
}

const checkAndActionViolationsOneOrMore = async (guildMember, usernameDetection, avatarDetection) => {
    // We purposely check in this order to avoid sending multiple DMs
    
    // Bans
    if (usernameDetection.threshold === detection.ViolationThreshold.HARD) {
        await punishment.ban(guildMember, true);
        return;
    }
    
    if (avatarDetection.threshold === detection.ViolationThreshold.HARD) {
        await punishment.ban(guildMember, false);
        return;
    }
    
    // Kicks
    if (usernameDetection.type === detection.ViolationType.USERNAME && usernameDetection.threshold === detection.ViolationThreshold.SOFT) {
        await punishment.kick(guildMember, usernameDetection.type);
        return;
    }
    
    if (usernameDetection.type === detection.ViolationType.GLOBAL_NAME) {
        await punishment.kick(guildMember, usernameDetection.type);
        return;
    }
        
    if (avatarDetection.type === detection.ViolationType.AVATAR && avatarDetection.threshold === detection.ViolationThreshold.SOFT) {
        await punishment.kick(guildMember, avatarDetection.type);
        return;
    }
    
    // Nickname change
    if (usernameDetection.type === detection.ViolationType.NICKNAME) {
        await punishment.changeNickname(guildMember);
        return;
    }
}

module.exports = {
    async checkAndActionViolations(guildMember) {
        if (guildMember.id === guildMember.client.user.id) {
            // It is us
            return;
        }
        
        if (guildMember.user.bot) return;
        
        const config = configManager.getConfig(guildMember.guild.id);
        if (!config.enabled) return;
        
        const protectedUserIds = configManager.getProtectedUsers(guildMember.guild.id);
        if (protectedUserIds.includes(guildMember.id)) {
            // User is protected by the bot themselves, so all violations would be triggered
            return;
        }
        
        const usernameDetection = await detection.checkUsername(guildMember.guild, guildMember.nickname, guildMember.user.displayName, guildMember.user.username);
        const avatarUrl = await guildMember.avatarURL( {extension: "png", size: 256} ) ?? guildMember.user.avatarURL( {extension: "png", size: 256} );
        const avatarDetection = avatarUrl !== null ? await detection.checkAvatar(guildMember.guild, avatarUrl) : {type: detection.ViolationType.NONE, threshold: null};
        
        if (config.requireBoth) {
            await checkAndActionViolationsBothRequired(guildMember, usernameDetection, avatarDetection);
            return;
        }
        
        await checkAndActionViolationsOneOrMore(guildMember, usernameDetection, avatarDetection);
    },
    async checkAllAndActionViolations(guild) {
        try {
            await guild.members.fetch().then((collection) => collection.map((member) => this.checkAndActionViolations(member))).then((memberChecks) => Promise.all(memberChecks));
        } catch (error) {
            console.error(`Failed to detect violations for guild ${guild.id}, with error: `, error);
        }
    },
    async checkAllGuildsAndActionViolations(client) {
        console.log("Checking for violations in all guilds");
        
        const guildChecks = client.guilds.cache.values().map((guild) => this.checkAllAndActionViolations(guild));
        await Promise.all(guildChecks);
    },
}

"use strict";

const db = require.main.require("./core/config/database.js")();

const addGuildConfig = (guildId) => {
    db.prepare("INSERT INTO config VALUES (?, 0, 3, 1, 99.6, 99.97, 1)").run(guildId);
}

const removeGuildEntries = (guildId) => {
    db.prepare("DELETE FROM config WHERE guildId=?").run(guildId);
    db.prepare("DELETE FROM protected_users WHERE guildId=?").run(guildId);
}

const repairMissingServers = (client) => {
    console.log("Checking if bot joined new guilds while offline...");
    
    const configuredGuildIds = db.prepare("SELECT guildId FROM config").all().map((item) => item.guildId);
    const botGuildIds = client.guilds.cache.map((item) => item.id);
    
    const addedGuildIds = botGuildIds.filter((item) => !configuredGuildIds.includes(item));
    const removedGuildIds = configuredGuildIds.filter((item) => !botGuildIds.includes(item));
    
    for (const guildId of addedGuildIds) {
        console.log(`Bot joined ${guildId}, adding config entries`);
        addGuildConfig(guildId);
    }
    
    for (const guildId of removedGuildIds) {
        console.log(`Bot left ${guildId}, removing config entries`);
        removeGuildEntries(guildId);
    }
}

module.exports = {
    verifyIntegrity(client) {
        repairMissingServers(client);
    },
    addGuildConfig,
    removeGuildEntries,
    getConfig(guildId) {
        return db.prepare("SELECT enabled,usernameSoftThreshold,usernameHardThreshold,avatarSoftThreshold,avatarHardThreshold,requireBoth FROM config WHERE guildId=?").get(guildId);
    },
    getEnabled(guildId) {
        return db.prepare("SELECT enabled FROM config WHERE guildId=?").get(guildId).enabled === 1;
    },
    setEnabled(guildId, enabled) {
        return db.prepare("UPDATE config SET enabled=? WHERE guildId=?").run(enabled ? 1 : 0, guildId).changes > 0;
    },
    getUsernameThresholds(guildId) {
        return db.prepare("SELECT usernameSoftThreshold,usernameHardThreshold FROM config WHERE guildId=?").get(guildId);
    },
    setUsernameThresholds(guildId, soft, hard) {
        return db.prepare("UPDATE config SET usernameSoftThreshold=?,usernameHardThreshold=? WHERE guildId=?").run(soft, hard, guildId).changes > 0;
    },
    getAvatarThresholds(guildId) {
        return db.prepare("SELECT avatarSoftThreshold,avatarHardThreshold FROM config WHERE guildId=?").get(guildId);
    },
    setAvatarThresholds(guildId, soft, hard) {
        return db.prepare("UPDATE config SET avatarSoftThreshold=?,avatarHardThreshold=? WHERE guildId=?").run(soft, hard, guildId).changes > 0;
    },
    getRequireBoth(guildId) {
        return db.prepare("SELECT requireBoth FROM config WHERE guildId=?").get(guildId).requireBoth === 1;
    },
    setRequireBoth(guildId, requireBoth) {
        return db.prepare("UPDATE config SET requireBoth=? WHERE guildId=?").run(requireBoth ? 1 : 0, guildId).changes > 0;
    },
    getProtectedUsers(guildId) {
        return db.prepare("SELECT userId FROM protected_users WHERE guildId=?").all(guildId).map((entry) => entry.userId);
    },
    getAllProtectedUsers() {
        return db.prepare("SELECT userId FROM protected_users").all().map((entry) => entry.userId);
    },
    addProtectedUser(guildId, userId) {
        return db.prepare("INSERT INTO protected_users SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM protected_users WHERE guildId=? AND userId=? LIMIT 1)").run(guildId, userId, guildId, userId).changes > 0;
    },
    deleteProtectedUser(guildId, userId) {
        return db.prepare("DELETE FROM protected_users WHERE guildId=? AND userId=?").run(guildId, userId).changes > 0;
    },
}

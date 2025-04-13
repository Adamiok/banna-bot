"use strict";

const config = require.main.require("./core/config/configManager.js");
const impersonationHandler = require.main.require("./core/impersonation/handler.js");

const { InteractionContextType, SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("config")
        .setDescription("Manage configuration of the bot in this server")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("enabled")
                .setDescription("Manage the bot's automatic functionality")
                .addBooleanOption((option) =>
                    option
                        .setName("set")
                        .setDescription("Enable/disable the bot's automatic functionality")
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName("thresholds")
                .setDescription("Manage detection thresholds")
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("username")
                        .setDescription("Manage the username detection thresholds")
                        .addIntegerOption((option) =>
                            option
                                .setName("kick")
                                .setDescription("Set the change or kick threshold for similar usernames, in levenshtein distance")
                                .setMinValue(0)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("ban")
                                .setDescription("Set the ban threshold for similar usernames, in levenshtein distance")
                                .setMinValue(0)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("avatar")
                        .setDescription("Manage the avatar detection thresholds")
                        .addIntegerOption((option) =>
                            option
                                .setName("kick")
                                .setDescription("Set the kick threshold for similar avatars, in percentage")
                                .setMinValue(0)
                                .setMaxValue(100)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("ban")
                                .setDescription("Set the ban threshold for similar avatars, in percentage")
                                .setMinValue(0)
                                .setMaxValue(100)
                        )
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("both-required")
                .setDescription("Require both a username and avatar detection to punish members")
                .addBooleanOption((option) =>
                    option
                        .setName("set")
                        .setDescription("Whether to require both a username and avatar detection to punish members")
                )
        )
        .setDefaultMemberPermissions(0) // Admin-only
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        switch (interaction.options.getSubcommandGroup()) {
            case null:
                switchNullSubcommandGroup(interaction);
                break;
            case "thresholds":
                switchThresholdsSubcommandGroup(interaction);
                break;
            default:
                throw RangeError(`Received unknown group "${interaction.options.getSubcommandGroup()}" for "config" command`);
        }
    },
}

const switchNullSubcommandGroup = (interaction) => {
    switch (interaction.options.getSubcommand()) {
        case "enabled":
            handleEnabled(interaction);
            break;
        case "both-required":
            handleRequireBoth(interaction);
            break;
        default:
            throw RangeError(`Received unknown subcommand "${interaction.options.getSubcommand()}" for "config" command`);
    }
}

const switchThresholdsSubcommandGroup = (interaction) => {
    switch (interaction.options.getSubcommand()) {
        case "username":
            handleUsernameThresholds(interaction);
            break;
        case "avatar":
            handleAvatarThresholds(interaction);
            break;
        default:
            throw RangeError(`Received unknown subcommand "${interaction.options.getSubcommand()}" for "config" command with group "${interaction.option.getSubcommandGroup()}"`);
    }
}

const handleEnabled = (interaction) => {
    const newStatus = interaction.options.getBoolean("set");
    
    if (newStatus === null) {
        const enabled = config.getEnabled(interaction.guild.id);
        interaction.reply( {content: `Automatic detection is currently **${enabled ? "enabled" : "disabled"}**!`, flags: MessageFlags.Ephemeral} );
    } else {
        const result = config.setEnabled(interaction.guild.id, newStatus);
        
        interaction.reply( {content: `Automatic detection is now **${newStatus ? "enabled" : "disabled"}**`, flags: MessageFlags.Ephemeral} );
        
        if (newStatus && result) {
            impersonationHandler.checkAllAndActionViolations(interaction.guild);
        }
    }
}

const handleUsernameThresholds = (interaction) => {
    const thresholds = config.getUsernameThresholds(interaction.guild.id);
    const softThreshold = interaction.options.getInteger("kick");
    const hardThreshold = interaction.options.getInteger("ban");
    
    if (softThreshold === null && hardThreshold === null) {
        interaction.reply( {content: `### Username Threshold\nWarn: **${thresholds.usernameSoftThreshold}**\nBan: **${thresholds.usernameHardThreshold}**`, flags: MessageFlags.Ephemeral} );
        return;
    }
    
    if (softThreshold !== null && hardThreshold !== null) {
        // Optimization by using a single db call
        config.setUsernameThresholds(interaction.guild.id, softThreshold, hardThreshold);
        interaction.reply( {content: "Set thresholds!", flags: MessageFlags.Ephemeral} );
        return;
    }
    
    if (softThreshold !== null) {
        config.setUsernameThresholds(interaction.guild.id, softThreshold, thresholds.usernameHardThreshold);
    }
    
    if (hardThreshold !== null) {
        config.setUsernameThresholds(interaction.guild.id, thresholds.usernameSoftThreshold, hardThreshold);
    }
    
    interaction.reply( {content: "Set threshold!", flags: MessageFlags.Ephemeral} );
}

const handleAvatarThresholds = (interaction) => {
    const thresholds = config.getAvatarThresholds(interaction.guild.id);
    const softThreshold = interaction.options.getInteger("kick");
    const hardThreshold = interaction.options.getInteger("ban");
    
    if (softThreshold === null && hardThreshold === null) {
        interaction.reply( {content: `### Avatar Threshold\nKick: **${thresholds.avatarSoftThreshold}**\nBan: **${thresholds.avatarHardThreshold}**`, flags: MessageFlags.Ephemeral} );
        return;
    }
    
    if (softThreshold !== null && hardThreshold !== null) {
        // Optimization by using a single db call
        config.setAvatarThresholds(interaction.guild.id, softThreshold, hardThreshold);
        interaction.reply( {content: "Set thresholds!", flags: MessageFlags.Ephemeral} );
        return;
    }
    
    if (softThreshold !== null) {
        config.setAvatarThresholds(interaction.guild.id, softThreshold, thresholds.avatarHardThreshold);
    }
    
    if (hardThreshold !== null) {
        config.setAvatarThresholds(interaction.guild.id, thresholds.avatarSoftThreshold, hardThreshold);
    }
    
    interaction.reply( {content: "Set threshold!", flags: MessageFlags.Ephemeral} );
}

const handleRequireBoth = (interaction) => {
    const newStatus = interaction.options.getBoolean("set");
    
    if (newStatus === null) {
        const bothRequired = config.getRequireBoth(interaction.guild.id);
        interaction.reply( {content: `Require both detections for executing actions is currently **${bothRequired ? "required" : "not required"}**!`, flags: MessageFlags.Ephemeral} );
    } else {
        const result = config.setRequireBoth(interaction.guild.id, newStatus);
        interaction.reply( {content: `Require both detections for executing actions is now **${newStatus ? "required" : "not required"}**!`, flags: MessageFlags.Ephemeral} );
        
        if (!newStatus && result) {
            impersonationHandler.checkAllAndActionViolations(interaction.guild);
        }
    }
}

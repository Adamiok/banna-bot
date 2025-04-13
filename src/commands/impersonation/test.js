"use strict";

const config = require.main.require("./core/config/configManager.js");
const detection = require.main.require("./core/impersonation/detection.js");

const { InteractionContextType, SlashCommandBuilder, MessageFlags, bold } = require("discord.js");

const violationTypeToDescription = {
    [detection.ViolationType.NONE]: "✅ No Violation",
    [detection.ViolationType.NICKNAME]: "⚠️ Nickname Violation",
    [detection.ViolationType.GLOBAL_NAME]: "⚠️ Global Name Violation",
    [detection.ViolationType.USERNAME]: "⚠️ Username Violation",
    [detection.ViolationType.AVATAR]: "⚠️ Avatar Violation",
}

const violationThresholdToDescription = {
    [null]: "",
    [detection.ViolationThreshold.EXACT]: "",
    [detection.ViolationThreshold.SOFT]: " (soft)",
    [detection.ViolationThreshold.HARD]: " (hard)",
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("test")
        .setDescription("Checks if a member violates the configured protections, **without** taking any action")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("all")
                .setDescription("Check all members in the server")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("member")
                .setDescription("Test a member")
                .addUserOption((option) =>
                    option
                        .setName("member")
                        .setDescription("The member to test")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("custom")
                .setDescription("Test a custom member data")
                .addStringOption((option) =>
                    option
                        .setName("username")
                        .setDescription("The potential username of the member to test")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("nickname")
                        .setDescription("The potential nickname of the member to test")
                )
                .addStringOption((option) =>
                    option
                        .setName("display-name")
                        .setDescription("The potential global name of the member to test")
                )
                .addAttachmentOption((option) =>
                    option
                        .setName("avatar")
                        .setDescription("The potential avatar of the member to test")
                )
        )
        .setDefaultMemberPermissions(0) // Admin-only
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        await interaction.deferReply({flags: MessageFlags.Ephemeral});
        
        switch (interaction.options.getSubcommand()) {
            case "all":
                await handleAll(interaction);
                break;
            case "member":
                await handleMember(interaction);
                break;
            case "custom":
                await handleCustom(interaction);
                break;
            default:
                throw RangeError(`Received unknown subcommand "${interaction.options.getSubcommand()}" for "test" command`);
        }
    }
}

const runDetectionsAndReturnStatusMessage = async (guild, isBot, userIdOrNull, nicknameOrNull, displayName, username, avatarUrlOrNull) => {
    const isTestMemberProtected = userIdOrNull !== null ? config.getProtectedUsers(guild.id).includes(userIdOrNull) : false;
    
    const usernameDetection = await detection.checkUsername(guild, nicknameOrNull, displayName, username);
    const avatarDetection = avatarUrlOrNull !== null ? await detection.checkAvatar(guild, avatarUrlOrNull) : {type: detection.ViolationType.NONE, threshold: null};
    
    return `## Detections\n${isTestMemberProtected ? `${bold("User is protected, so they will be ignored by automatic detection!")}\n` : ""}${isBot ? `${bold("User is bot, so they will be ignored by automatic detection!")}\n` : ""}${bold("Username:")} ${violationTypeToDescription[usernameDetection.type]}${violationThresholdToDescription[usernameDetection.threshold]}\n${bold("Avatar:")} ${violationTypeToDescription[avatarDetection.type]}${violationThresholdToDescription[avatarDetection.threshold]}`;
}

const handleAll = async (interaction) => {
    const protectedMembers = config.getProtectedUsers(interaction.guild.id);
    const usernameViolationMembers = [];
    const avatarViolationMembers = [];
    
    for (const member of await interaction.guild.members.fetch().then((collection) => collection.values())) {
        if (protectedMembers.includes(member.id)) continue;
        
        const usernameDetection = await detection.checkUsername(interaction.guild, member.nickname, member.user.displayName, member.user.username);
        const avatarUrl = await member.avatarURL( {extension: "png", size: 256} ) ?? member.user.avatarURL( {extension: "png", size: 256} );
        const avatarDetection = avatarUrl !== null ? await detection.checkAvatar(interaction.guild, avatarUrl) : {type: detection.ViolationType.NONE, threshold: null};
        
        if (usernameDetection.type !== detection.ViolationType.NONE) {
            usernameViolationMembers.push(member);
        }
        if (avatarDetection.type !== detection.ViolationType.NONE) {
            avatarViolationMembers.push(member);
        }
    }
    
    const testCommand = await interaction.client.application.commands.fetch().then((commands) => commands.findKey((cmd) => cmd.name === "test"));
    interaction.followUp( {content: `## All Detections\nThe following users will be detected when enabled, use </test member:${testCommand}> to see more info.\n${bold("Username Detections: ")}${usernameViolationMembers.length !== 0 ? usernameViolationMembers.join(" ") : "No detections"}\n${bold("Avatar Detections: ")}${avatarViolationMembers.length !== 0 ? avatarViolationMembers.join(" ") : "No detections"}`, flags: MessageFlags.Ephemeral} );
}

const handleMember = async (interaction) => {
    const testMember = interaction.options.getMember("member");
    if (testMember === null) {
        interaction.followUp( {content: "This user is not in this server!", flags: MessageFlags.Ephemeral} );
        return;
    }
    
    const avatarUrl = await testMember.avatarURL( {extension: "png", size: 256} ) ?? testMember.user.avatarURL( {extension: "png", size: 256} );
    const result = await runDetectionsAndReturnStatusMessage(testMember.guild, testMember.user.bot, testMember.id, testMember.nickname, testMember.user.displayName, testMember.user.username, avatarUrl);
    
    interaction.followUp( {content: result, flags: MessageFlags.Ephemeral} );
}

const handleCustom = async (interaction) => {
    const username = interaction.options.getString("username");
    const nickname = interaction.options.getString("nickname");
    const displayName = interaction.options.getString("display-name") ?? username; // Emulate behaviour as in detection.js
    const avatar = interaction.options.getAttachment("avatar");
    
    if (avatar !== null) {
        // We cannot fully trust this check to avoid malicious files
        if (!["image/png", "image/gif"].includes(avatar.contentType)) {
            interaction.followUp( {content: "Avatar must be a PNG or GIF!", flags: MessageFlags.Ephemeral} );
            return;
        }
    }
    
    const result = await runDetectionsAndReturnStatusMessage(interaction.guild, false, null, nickname, displayName, username, avatar !== null ? avatar.proxyURL : null);
    interaction.followUp( {content: result, flags: MessageFlags.Ephemeral} );
}

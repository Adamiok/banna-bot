"use strict";

const config = require.main.require("./core/config/configManager.js");
const avatarCache = require.main.require("./core/cache/protectedUserAvatarCache.js");

const { InteractionContextType, SlashCommandBuilder, MessageFlags, userMention } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("protect")
        .setDescription("Manage protected members")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("Show all protected members")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Protect a member from getting impersonated")
                .addUserOption((option) =>
                    option
                        .setName("member")
                        .setDescription("The member to protect")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Stop protecting a member")
                .addUserOption((option) =>
                    option
                        .setName("member")
                        .setDescription("The member to stop protecting")
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(0) // Admin-only
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        switch (interaction.options.getSubcommand()) {
            case "list":
                handleList(interaction);
                break;
            case "add":
                handleAdd(interaction);
                break;
            case "remove":
                handleRemove(interaction);
                break;
            default:
                throw RangeError(`Received unknown subcommand "${interaction.options.getSubcommand()}" for "protect" command`);
        }
    },
}

const handleList = (interaction) => {
    const protectedUserIds = config.getProtectedUsers(interaction.guild.id);
    const message = protectedUserIds.length !== 0 ? `### Protected Members\n${protectedUserIds.map((id) => userMention(id)).join("\n")}` : "There are no protected members!";
    
    interaction.reply( {content: message, flags: MessageFlags.Ephemeral} )
}

const handleAdd = (interaction) => {
    const member = interaction.options.getMember("member");
    if (member === null) {
        interaction.reply( {content: "This user is not in this server!", flags: MessageFlags.Ephemeral} );
    }
    
    const startedProtecting = config.addProtectedUser(interaction.guild.id, member.user.id);
    
    if (startedProtecting) {
        avatarCache.add(member.user);
    }
    
    const message = startedProtecting ? `Protected ${member}!` : `${member} is already protected!`;
    interaction.reply( {content: message, flags: MessageFlags.Ephemeral} );
}

const handleRemove = (interaction) => {
    const member = interaction.options.getMember("member");
    if (member === null) {
        interaction.reply( {content: "This user is not in this server!", flags: MessageFlags.Ephemeral} );
    }
    
    const stoppedProtecting = config.deleteProtectedUser(interaction.guild.id, member.user.id);
    
    if (stoppedProtecting) {
        avatarCache.delete(member.user);
    }
    
    const message = stoppedProtecting ? `Stopped protecting ${member}!` : `${member} is already not protected!`;
    interaction.reply( {content: message, flags: MessageFlags.Ephemeral} );
}

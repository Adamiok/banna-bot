"use strict";

const { ViolationType } = require.main.require("./core/impersonation/detection.js");

const { ChannelType, EmbedBuilder, PermissionFlagsBits, bold, inlineCode, hyperlink } = require("discord.js")

const typeToDescription = {
    [ViolationType.NICKANME]: "nickname",
    [ViolationType.GLOBAL_NAME]: "display name",
    [ViolationType.USERNAME]: "username",
    [ViolationType.AVATAR]: "avatar",
}

const createInviteLink = async (guild) => {
    try {
        if (guild.vanityURLCode !== null) {
            return `https://discord.gg/${guild.vanityURLCode}`;
        }
    
        // Try to get a channel and create an invite from it
        if (guild.rulesChannel !== null && guild.rulesChannel.permissionsFor(guild.members.me).has(PermissionFlagsBits.CreateInstantInvite)) {
            const invite = await guild.invites.create(guild.rulesChannel, {unique: true, maxUses: 1, maxAge: /* 1 week */ 60 * 60 * 24 * 7, reason: "Banna - Rejoin option for kicked user"} );
            return invite.url;
        }
    
        const channels = await guild.channels.fetch();
        for (const potentialChannel of channels.values()) {
            if (![ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildStageVoice, ChannelType.GuildText].includes(potentialChannel.type)) continue;
            if (!potentialChannel.permissionsFor(guild.members.me).has(PermissionFlagsBits.CreateInstantInvite)) continue;
            
            const invite = await guild.invites.create(potentialChannel, {unique: true, maxUses: 1, maxAge: /* 1 week */ 60 * 60 * 24 * 7, reason: "Banna - Rejoin option for kicked user"} );
            return invite.url;
        }
    
        // If we are here, we don't have permission to create a link in any channel
        // So, let's try to steal an existing invite
        if (guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const existingInvites = await guild.invites.fetch();
    
            if (existingInvites.size > 0) {
                return existingInvites.first().url;
            }
        }
    } catch (error) {
        console.error(`Failed to create invite for ${guild.id}, with error: `, error);
    }
    
    // No invite :(
    return null;
}

module.exports = {
    async changeNickname(guildMember) {
        const currentNickname = guildMember.nickname !== null ? guildMember.nickname : guildMember.user.displayName;
        
        if (!guildMember.manageable) {
            // We don't have permission
            return false;
        }
        
        try {
            const newNickname = `[IMPERSONATOR] ${currentNickname}`.substring(0, 32);
            
            if (guildMember.nickname !== newNickname) {
                await guildMember.setNickname(newNickname);
            }
        } catch (error) {
            throw new Error(`Failed to set username for ${guildMember.user.id}`, {cause: error});
        }
        
        try {
            const dm = await guildMember.createDM(true);
            const embed = new EmbedBuilder()
                .setColor(0xffff00)
                .setTitle("Nickname Changed")
                .setDescription(`Hello ${guildMember.user.displayName},\n\nI unfortunately had to change your nickname in the server ${bold(hyperlink(guildMember.guild.name, `https://discord.com/channels/${guildMember.guild.id}/`))} as it was ${bold("too similar to the username of an admin or moderator")}!${guildMember.permissions.has(PermissionFlagsBits.ChangeNickname) ? `\n\nYou can change it to another nickname using ${inlineCode("/nick newNickname")}` : ""}`)
                .setThumbnail(guildMember.guild.iconURL())
                .setFooter( {text: "Impersonator Detector", iconURL: guildMember.client.user.displayAvatarURL()} );
            
            await dm.send( {embeds: [embed]} );
        } catch (error) {
            console.log(`Failed sending DM to member ${guildMember.user.id}, with error:`, error);
        }
        
        return true;
    },
    async kick(guildMember, violationType) {
        if (!guildMember.kickable) {
            // We don't have permission
            return false;
        }
        
        try {
            const dm = await guildMember.createDM(true);
            const joinUrl = await createInviteLink(guildMember.guild);
            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle("Automod Kick")
                .setDescription(`Hello ${guildMember.user.displayName},\n\nI unfortunately had to kick you from the server ${bold(guildMember.guild.name)} as your ${typeToDescription[violationType]} is ${bold(`too similar to the ${typeToDescription[violationType]} of an admin or moderator`)}!\n\n${joinUrl !== null ? `After you change your ${typeToDescription[violationType]}, you can rejoin ${hyperlink("using this link", joinUrl)}.` : `I failed to generate an invite url for you, please contact a moderator if you wish to rejoin, after you change your ${typeToDescription[violationType]}!`}`)
                .setThumbnail(guildMember.guild.iconURL())
                .setFooter( {text: "Impersonator Detector", iconURL: guildMember.client.user.displayAvatarURL()} );
            
            await dm.send( {embeds: [embed]} );
        } catch (error) {
            console.log(`Failed sending DM to member ${guildMember.user.id}, with error:`, error);
        }
        
        try {
            await guildMember.kick("Banna - Automatic Detection: Impersonator");
        } catch (error) {
            throw new Error(`Failed to kick ${guildMember.user.id}`, {cause: error});
        }
        
        return true;
    },
    async ban(guildMember, usernameKick) {
        if (!guildMember.bannable) {
            // We don't have permission
            return false;
        }
        
        try {
            const dm = await guildMember.createDM(true);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Automod Ban")
                .setDescription(`Hello ${guildMember.user.displayName},\n\nYou are banned from ${bold(guildMember.guild.name)} as your ${usernameKick ? "username" : "avatar"} is ${bold(`too similar to the ${usernameKick ? "username" : "avatar"} of an admin or moderator`)}!`)
                .setThumbnail(guildMember.guild.iconURL())
                .setFooter( {text: "Impersonator Detection", iconURL: guildMember.client.user.displayAvatarURL()} );
            
            await dm.send( {embeds: [embed]} );
        } catch (error) {
            console.log(`Failed sending DM to member ${guildMember.user.id}, with error:`, error);
        }
        
        try {
            await guildMember.ban({ deleteMessageSeconds: /* 1 day */ 60 * 60 * 24 , reason: "Banna - Automatic Detection: Impersonator" })
        } catch (error) {
            throw new Error(`Failed to ban ${guildMember.user.id}`, {cause: error});
        }
        
        return true;
    },
}

"use strict";

const config = require.main.require("./core/config/configManager.js")

const fs = require("fs");
const { distance:levenshtein } = require("fastest-levenshtein");
const sharp = require("sharp");
const GIF = require("sharp-gif2")
const { default:pngPixelmatch } = require("pixelmatch");

const checkThresholdsOfTwoPngs = async (sharpImg1, sharpImg2, thresholds) => {
    const metadataImg1 = await sharpImg1.metadata();
    const metadataImg2 = await sharpImg2.metadata();
    
    const minWidth = Math.min(metadataImg1.width, metadataImg2.width);
    const minHeight = Math.min(metadataImg1.height, metadataImg2.height);
    const bufferImg1 = await sharpImg1.resize( {width: minWidth, height: minHeight, fit: sharp.fit.fill} ).raw().toBuffer();
    const bufferImg2 = await sharpImg2.resize( {width: minWidth, height: minHeight, fit: sharp.fit.fill} ).raw().toBuffer();
    
    const similarPixels = pngPixelmatch(bufferImg1, bufferImg2, null, minWidth, minHeight, {threshold: 0.1});
    const difference = 100 - similarPixels * 100 / (minWidth * minHeight);
            
    if (difference >= thresholds.avatarHardThreshold) {
        return {type: module.exports.ViolationType.AVATAR, threshold: module.exports.ViolationThreshold.HARD};
    }
            
    if (difference >= thresholds.avatarSoftThreshold) {
        return {type: module.exports.ViolationType.AVATAR, threshold: module.exports.ViolationThreshold.SOFT};
    }
    
    return {type: module.exports.ViolationType.NONE, threshold: null};
}

const checkAvatarPng = async (avatarByteArray, protectedAvatarsPng, protectedAvatarsGif, thresholds) => {
    let response = {type: module.exports.ViolationType.NONE, threshold: null};
    const avatar = await new sharp(avatarByteArray, {autoOrient: true} );
    
    for (const protectedAvatar of protectedAvatarsPng) {
        response = await checkThresholdsOfTwoPngs(avatar, protectedAvatar, thresholds);
                
        if (response.threshold === module.exports.ViolationThreshold.HARD) {
            // Optimization for early return
            return response;
        }
    }
            
    for (const protectedAvatarGif of protectedAvatarsGif) {
        for (const frame of protectedAvatarGif) {
            response = await checkThresholdsOfTwoPngs(avatar, frame, thresholds);
                    
            if (response.threshold === module.exports.ViolationThreshold.HARD) {
                // Optimization for early return
                return response;
            }
        }
    }
    
    return response;
}

const checkAvatarGif = async (avatarByteArray, protectedAvatarsPng, protectedAvatarsGif, thresholds) => {
    let response = {type: module.exports.ViolationType.NONE, threshold: null};
    const avatar = await GIF.readGif(new sharp(avatarByteArray, {autoOrient: true, animated: true})).toFrames();
    
    for (const protectedAvatar of protectedAvatarsPng) {
        for (const frame of avatar) {
            response = await checkThresholdsOfTwoPngs(frame, protectedAvatar, thresholds);
                    
            if (response.threshold === module.exports.ViolationThreshold.HARD) {
                // Optimization for early return
                return response;
            }
        }
    }
            
    for (const protectedAvatarGif of protectedAvatarsGif) {
        for (const protectedFrame of protectedAvatarGif) {
            for (const avatarFrame of avatar) {
                response = await checkThresholdsOfTwoPngs(avatarFrame, protectedFrame, thresholds);
                    
                if (response.threshold === this.ViolationThreshold.HARD) {
                    // Optimization for early return
                    return response;
                }
            }
        }
    }
    
    return response;
}

module.exports = {
    ViolationType: {
        NONE: 0,
        NICKNAME: 1,
        GLOBAL_NAME: 2,
        USERNAME: 3,
        AVATAR: 4,
    },
    ViolationThreshold: {
        EXACT: 0,
        SOFT: 1,
        HARD: 2,
    },
    async checkUsername(guild, nicknameOrNull, displayName, username) {
        const protectedGuildMembers = await guild.members.fetch( {user:config.getProtectedUsers(guild.id)} );
        const nickname = nicknameOrNull ?? displayName;
        
        const protectedUsernames = protectedGuildMembers.map((guildMember) => guildMember.user.username);
        const thresholds = config.getUsernameThresholds(guild.id);
        for (const protectedUsername of protectedUsernames) {
            const distance = levenshtein(username, protectedUsername);
            
            if (distance <= thresholds.usernameHardThreshold) {
                return {type: this.ViolationType.USERNAME, threshold: this.ViolationThreshold.HARD};
            }
            
            if (distance <= thresholds.usernameSoftThreshold) {
                return {type: this.ViolationType.USERNAME, threshold: this.ViolationThreshold.SOFT};
            }
        }
        
        const protectedDisplayNames = protectedGuildMembers.map((guildMember) => guildMember.user.displayName);
        if (protectedDisplayNames.includes(displayName)) {
            return {type: this.ViolationType.GLOBAL_NAME, threshold: this.ViolationThreshold.EXACT};
        }
        
        const protectedNicknames = protectedGuildMembers.map((guildMember) => guildMember.nickname ?? guildMember.user.displayName);
        if (protectedNicknames.includes(nickname)) {
            return {type: this.ViolationType.NICKNAME, threshold: this.ViolationThreshold.EXACT};
        }
        
        return {type: this.ViolationType.NONE, threshold: null};
    },
    async checkAvatar(guild, avatarUrl) {
        const protectedUserIds = config.getProtectedUsers(guild.id);
        const thresholds = config.getAvatarThresholds(guild.id);
        
        const protectedAvatarsPng = await protectedUserIds.filter((id) => fs.existsSync(`${projectRoot}/run/cache/avatars/${id}.png`)).map((id) => new sharp(`${projectRoot}/run/cache/avatars/${id}.png`, {autoOrient: true} ));
        const protectedAvatarsGif = await protectedUserIds.filter((id) => fs.existsSync(`${projectRoot}/run/cache/avatars/${id}.gif`)).map((id) => new sharp(`${projectRoot}/run/cache/avatars/${id}.gif`, {autoOrient: true, animated: true} ).then((img) => GIF.readGif(img).toFrames()));
        
        const avatarByteArray = await fetch(avatarUrl).then((response) => response.bytes());
        const avatarUrlRaw = avatarUrl.split("?")[0];
        if (avatarUrlRaw.endsWith(".png")) {
            return await checkAvatarPng(avatarByteArray, protectedAvatarsPng, protectedAvatarsGif, thresholds);
        } else if (avatarUrlRaw.endsWith(".gif")) {
            return await checkAvatarGif(avatarByteArray, protectedAvatarsPng, protectedAvatarsGif, thresholds)
        } else {
            throw RangeError(`Unknown/unsupported image type in url: ${avatarUrl}`);
        }
    }
}

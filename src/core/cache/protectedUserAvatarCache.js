"use strict";

const configManager = require.main.require("./core/config/configManager.js");

const fs = require("fs");
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const path = require("path");

const AVATAR_CACHE_PATH = `${projectRoot}/run/cache/avatars/`;

const downloadFile = async (url, filePath) => {
    const res = await fetch(url);
    if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
    }
    
    const fileStream = fs.createWriteStream(filePath, { mode: 0o640, flags: "w" });
    await finished(Readable.fromWeb(res.body).pipe(fileStream));
};

const downloadAvatar = async (url, filePathNoExtension) => {
    const urlRaw = url.split("?")[0];
    if (urlRaw.endsWith(".png")) {
        await downloadFile(url, `${filePathNoExtension}.png`);
    } else if (urlRaw.endsWith(".gif")) {
        // Animated avatars only
        await downloadFile(url, `${filePathNoExtension}.gif`);
    } else {
        throw RangeError(`Unknown file extension for avatar url: ${url}`)
    }
}

module.exports = {
    async build(client) {
        console.log("Building avatar cache, this may take a while...")
        
        fs.rmSync(AVATAR_CACHE_PATH, { recursive: true, force: true });
        
        const protectedUserIds = configManager.getAllProtectedUsers();
        const protectedUserPromises = protectedUserIds.map((id) => client.users.fetch(id));
        const protectedUsers = await Promise.all(protectedUserPromises);
        
        for (const protectedUser of protectedUsers) {
            await downloadAvatar(protectedUser.displayAvatarURL( {extension: "png", size: 256} ),`${AVATAR_CACHE_PATH}/${protectedUser.id}`);
        }
        
        console.log("Avatar cache build");
    },
    async add(user) {
        const url = user.displayAvatarURL( {extension: "png", size: 256} );
        await downloadAvatar(url, `${AVATAR_CACHE_PATH}/${user.id}`);
    },
    delete(user) {
        fs.rmSync(`${AVATAR_CACHE_PATH}/${user.id}.png`, { force: true });
        fs.rmSync(`${AVATAR_CACHE_PATH}/${user.id}.gif`, { force: true });
    },
}

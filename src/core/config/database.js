"use strict";

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH = `${projectRoot}/run/db/test.db`

const initTables = (db) => {
    db.prepare("CREATE TABLE IF NOT EXISTS config (guildId VARCHAR(20) PRIMARY KEY NOT NULL, enabled INT NOT NULL, usernameSoftThreshold INT NOT NULL, usernameHardThreshold INT NOT NULL, avatarSoftThreshold INT NOT NULL, avatarHardThreshold INT NOT NULL, requireBoth INT NOT NULL)").run();
    db.prepare("CREATE TABLE IF NOT EXISTS protected_users (guildId VARCHAR(20) NOT NULL, userId VARCHAR(20) NOT NULL)").run();
}

const createDb = () => {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    process.on("exit", () => db.close());
    
    initTables(db);
    
    return db;
}

const db = createDb();
module.exports = () => db;

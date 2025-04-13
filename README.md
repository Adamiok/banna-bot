# Banna Bot

Protects your discord server from impersonators of moderators and admins. Detection threshold fully configurable.

## Setup

1. Create an application on the [discord developer portal](https://discord.com/developers/applications/)
2. Copy the `Client ID` from the OAuth2 application page
3. Add a bot to the applications, accepting the warning
4. Reset the `Token`, and copy it
5. Enable the `Server Members Intent` under `Privileged Gateway Intents`
6. Go to OAuth2 page and create a URL with the scope `bot` and `applications.commands`, with the following bot permissions: `Kick Members`, `Ban Members`, `Create Instant Invite` and `Manage Nicknames`. Use the generated URL to add the bot to your server
7. Clone the repo: `git clone https://github.com/Adamiok/banna-bot.git`
8. Place the `Client ID` and `Token` into a `.env` file with the same format as `.env.example`
9. Run: `npm install`
10. Deploy commands to discord using `node run deploy`
11. Start the bot using `node .`

## Configuration

All configuration for the bot is done using discord slash commands in your server. All commands have a description attached you can view in discord, however some are also explained below.

### Available Slash Commands

`/config enabled` - Turn on/off automatic detection and kick/ban of users who exceed the thresholds. Recommended to set to `true` only after you have run the test command (see below)

`/config thresholds {type}` - Configure the detection thresholds for username/avatar, nicknames and display names are only detected when an exact match is found as they are not unique

`/protect {action}` - Configure which members are protected from being impersonated

`/test all` - Check if any member currently in the server exceeds the detection threshold. **Is recommended to be ran before enabling automatic detection**, can take a while to execute depending on your server size

`/test custom` - Check if a member with these properties would be detected

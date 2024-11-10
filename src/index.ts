import {Client, GatewayIntentBits, Collection, PresenceUpdateStatus, Partials, Role, Guild,} from "discord.js";
import CG from './config';
import { getType } from "./functions";
import { PrismaClient } from '@prisma/client';
import { createLandingChannel } from "./utils/createLandingChannel";
import { VerifiedRoleName, UnverifiedRoleName } from './constants/roles';
const { Guilds, MessageContent, GuildMessages, GuildMembers, GuildVoiceStates } = GatewayIntentBits
const client = new Client({
    presence:{
        activities: [
            {
                name: CG.PRESENCE.text,
                type: getType(CG.PRESENCE.type),
            }
        ],
        status: PresenceUpdateStatus.Online,
    },
    intents:[
        Guilds,
        MessageContent,
        GuildMessages,
        GuildMembers,
        GuildVoiceStates
    ],
    partials: [Partials.User, Partials.Message, Partials.Reaction],
    allowedMentions: { repliedUser: false}
})
import { Command, SlashCommand } from "./types";
import { config } from "dotenv";
import { readdirSync } from "fs";
import { join } from "path";
config()

const prisma = new PrismaClient();

client.slashCommands = new Collection<string, SlashCommand>()
client.commands = new Collection<string, Command>()
client.cooldowns = new Collection<string, number>()

const handlersDir = join(__dirname, "./handlers")
readdirSync(handlersDir).forEach(handler => {
    require(`${handlersDir}/${handler}`)(client)
})

// Attempt to create the landing channel upon bot startup
client.on('ready', async () => {
    const guilds = client.guilds.cache.values();

    for (const guild of guilds) {
        const landingChannel = await createLandingChannel(guild);
        await createVerifiedRole(guild);
        await createUnverifiedRole(guild);
        if (landingChannel) {
            await landingChannel.send("Welcome to the server!");
        }
    }

});

client.login(process.env.TOKEN)

async function createVerifiedRole(guild: Guild) {
    const existingRole = guild.roles.cache.find(
        (role: Role) => role.name === VerifiedRoleName
    );
    if (!existingRole) {
        await guild.roles.create({
            name: VerifiedRoleName,
            color: '#00FF00',
            permissions: ['ViewChannel', 'SendMessages'],
        });
    }
}

async function createUnverifiedRole(guild: Guild) {
    const existingRole = guild.roles.cache.find(
        (role: Role) => role.name === UnverifiedRoleName
    );
    if (!existingRole) {
        await guild.roles.create({
            name: UnverifiedRoleName,
            color: '#FF0000',
            permissions: ['ViewChannel'],
        });
    }
}
/*
╔═════════════════════════════════════════════════════╗
║    || - ||   Developed by NoBody#9666   || - ||     ║
║    ----------| discord.gg/FMbXwGPJGm |---------     ║
╚═════════════════════════════════════════════════════╝
*/
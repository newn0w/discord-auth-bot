import {Role, Guild, TextChannel} from 'discord.js';
import { VerifiedRoleName } from "../constants/roles";

export async function createRole(guild: Guild, roleName: string): Promise<Role> {
    try {
        return await guild.roles.create({
            name: roleName,
            color: 'Random',
        });
    } catch (error) {
        console.error(`Error creating role: ${roleName}`, error);
        throw error;
    }
}

export async function createVerifiedRole(guild: Guild) {
    let verifiedRole = guild.roles.cache.find(
        (role: Role) => role.name === VerifiedRoleName
    );

    if (!verifiedRole) {
        verifiedRole = await guild.roles.create({
            name: VerifiedRoleName,
            color: '#00FF00',
            permissions: ['ViewChannel', 'SendMessages'],
        });
    }

    // Deny view access to landing channel
    const landingChannel = guild.channels.cache.find(
        channel => channel.name === 'verify-here'
    ) as TextChannel;
    if (landingChannel) {
        await landingChannel.permissionOverwrites.edit(verifiedRole.id, {
            ViewChannel: false,
        });
    }
}
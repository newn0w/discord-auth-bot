import { Role, Guild } from 'discord.js';

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
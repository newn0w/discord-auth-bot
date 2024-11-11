import {Guild, TextChannel, PermissionsBitField, ChannelType} from "discord.js";

const LANDING_CHANNEL_NAME = "verify-here";

export const createLandingChannel = async (guild: Guild): Promise<TextChannel | null> => {
// Check if the channel already exists
    const existingChannel = guild.channels.cache.find(
        (channel) => channel.name === LANDING_CHANNEL_NAME
    );

    if (existingChannel) {
        return null;
    }

    if (!guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        console.error("Bot does not have sufficient permissions!");
        return null;
    }

// If the channel does not exist, create a new one
    try {
        const newChannel = await guild.channels.create({
            name: LANDING_CHANNEL_NAME,
            type: ChannelType.GuildText,
            topic: 'Please verify your email to gain access.',
            reason: 'Creating landing channel for email verification',
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionsBitField.Flags.ViewChannel], // TODO: Give access to "verified" role
                },
            ],
        });

        return newChannel
    } catch (error) {
        console.error('Error creating the landing channel:', error);
        return null;
    }
};
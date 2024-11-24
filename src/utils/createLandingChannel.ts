import {Guild, TextChannel, PermissionsBitField, ChannelType, Message} from "discord.js";

const LANDING_CHANNEL_NAME = "verify-here";

export const createLandingChannel = async (guild: Guild): Promise<TextChannel | null> => {
    if (!guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        console.error("Bot does not have sufficient permissions!");
        return null;
    }

    // Check if the channel already exists
    const existingChannel = guild.channels.cache.find(
        (channel) => channel.name === LANDING_CHANNEL_NAME
    );

    if (!existingChannel || existingChannel.type !== ChannelType.GuildText) {
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
                        deny: [PermissionsBitField.Flags.SendMessages]
                    },
                ],
            }) as TextChannel;

            return newChannel;
        } catch (error) {
            console.error('Error creating the landing channel:', error);
            return null;
        }
    }

    // If channel already exists, clear any pre-existing messages and return the existing channel
    const existingMessages = await existingChannel.messages.fetch({ limit: 100 });
    // await existingChannel.bulkDelete(existingMessages); TODO: Ask Dave if this msgs will never be >2wks old
    for (const message of existingMessages.values()) {
        message.delete();
    }
    return existingChannel;
};
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageOptions, TextChannel} from 'discord.js';

export const createLandingMessage = async (landingChannel: TextChannel) => {
    const verifyEmail = new ButtonBuilder()
        .setCustomId('verify-email')
        .setLabel('Verify Email')
        .setStyle(ButtonStyle.Primary);

    const verifyCode = new ButtonBuilder()
        .setCustomId('verify-code')
        .setLabel('Verify Code')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(verifyEmail, verifyCode);

    await landingChannel.send({
        content: 'Welcome to the server!',
        components: [row],
    });

}
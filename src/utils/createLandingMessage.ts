import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    TextChannel,
    ComponentType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Interaction,
} from 'discord.js';
import { verifyEmail, verifyCode } from "./userVerification";

export const createLandingMessage = async (landingChannel: TextChannel) => {
    const verifyEmailButton = new ButtonBuilder()
        .setCustomId('verify-email')
        .setLabel('Verify Email')
        .setStyle(ButtonStyle.Primary);

    const verifyCodeButton = new ButtonBuilder()
        .setCustomId('verify-code')
        .setLabel('Verify Code')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(verifyEmailButton, verifyCodeButton);

    const landingMessage = await landingChannel.send({
        content: 'Welcome to the server!',
        components: [row],
    });

    const buttonCollector = landingMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 0,
    });

    buttonCollector.on('collect', async (interaction) => {
        if (interaction.customId === 'verify-email') {
            const emailInputModal = new ModalBuilder()
                .setCustomId('email_modal')
                .setTitle('Please input your email.');

            const emailTextInput = new TextInputBuilder()
                .setCustomId('email_input')
                .setLabel('Email:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Input your email here...')
                .setRequired(true);

            const modalRow = new ActionRowBuilder()
                .addComponents(emailTextInput) as ActionRowBuilder<TextInputBuilder>;

            emailInputModal.addComponents(modalRow);
            await interaction.showModal(emailInputModal);

            try {
                // Collect the modal submission
                const filter = (i: Interaction) =>
                    i.isModalSubmit() && i.customId === 'email_modal' && i.user.id === interaction.user.id;

                const modalSubmission = await interaction.awaitModalSubmit({
                    time: 300000, // 5 minute timeout
                    filter
                });

                modalSubmission.deferReply({ ephemeral: true });

                await verifyEmail(modalSubmission, interaction);
            } catch (error) {
                if (error.message.includes('time')) {
                    console.log(`Modal timed out for user ${interaction.user.id}`);
                    interaction.followUp({ content: 'This request has timed out. Please try again!', ephemeral: true });
                } else {
                    console.log(error);
                    interaction.followUp({
                        content: 'An unexpected error has occurred, please try again.',
                        ephemeral: true
                    });
                }
            }
        } 
        else if (interaction.customId === 'verify-code') {
            const codeInputModal = new ModalBuilder()
                .setCustomId('code_modal')
                .setTitle('Please input your verification code.');

            const codeTextInput = new TextInputBuilder()
                .setCustomId('code_input')
                .setLabel('Code:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Input your verification code here...')
                .setRequired(true);

            const modalRow = new ActionRowBuilder()
                .addComponents(codeTextInput) as ActionRowBuilder<TextInputBuilder>;

            codeInputModal.addComponents(modalRow);
            await interaction.showModal(codeInputModal);

            // Collect the modal submission
            const filter = (i: Interaction) =>
                i.isModalSubmit() && i.customId === 'code_modal' && i.user.id === interaction.user.id;

            try {
                const modalSubmission = await interaction.awaitModalSubmit({
                    time: 300000, // 5 minute timeout
                    filter
                });

                modalSubmission.deferReply({ ephemeral: true });

                await verifyCode(modalSubmission, interaction);
        } catch (error) {
                if (error.message.includes('time')) {
                    console.log(`Modal timed out for user ${interaction.user.id}`);
                    interaction.followUp({
                        content: 'This request has timed out. Please try again!',
                        ephemeral: true
                    });
                } else {
                    console.log(error);
                    interaction.followUp({
                        content: 'An unexpected error has occurred. Please try again!',
                        ephemeral: true
                    });
                }
            }
        }
        else {
            throw new Error('bruh... createLandingMessage how did u even get here');
        }
        
    });

}
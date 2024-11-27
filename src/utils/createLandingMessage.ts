import { 
    ActionRowBuilder,
    ButtonBuilder, 
    ButtonStyle,  
    TextChannel, 
    ComponentType, 
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalActionRowComponentBuilder,
    APIActionRowComponent,
    APIActionRowComponentTypes,
    Interaction
} from 'discord.js';

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

                    // Collect the modal submission

            const filter = (i: Interaction) =>
                i.isModalSubmit() && i.customId === 'email_modal' && i.user.id === interaction.user.id;

            const modalSubmission = await interaction.awaitModalSubmit({
                time: 60000,
                filter
            });

            const email = modalSubmission.fields.getTextInputValue('email_input');
            console.log(email);
            interaction.channel?.send(email);
        } 
        else if (interaction.customId === 'verify-code') {

        } 
        else {
            throw new Error('bruh... createLandingMessage how did u even get here');
        }
        
    });

}
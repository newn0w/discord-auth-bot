import {SlashCommand} from "../types";
import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    GuildMember,
    Interaction,
    ModalActionRowComponentBuilder,
    ModalBuilder,
    SlashCommandBuilder,
    TextChannel,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";


const AnnounceCommand: SlashCommand = {
    enable: true,
    command: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Make an announcement'),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const interactionMember = interaction.member as GuildMember;
        if (!interactionMember.permissions.has('Administrator')) {
            await interaction.reply({ content: 'Insufficient permissions!', ephemeral: true });
            return;
        }

        const announcementModal = new ModalBuilder()
            .setCustomId('announcement_modal')
            .setTitle('Announcement');

        const announcementMessageInput = new TextInputBuilder()
            .setCustomId('announcement_message_input')
            .setLabel('Announcement Message:')
            .setStyle(TextInputStyle.Paragraph);

        const announcementActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
            .addComponents(announcementMessageInput);

        announcementModal.addComponents(announcementActionRow);
        await interaction.showModal(announcementModal);

        // Collect the modal submission
        const filter = (i: Interaction) =>
            i.isModalSubmit() && i.customId === 'announcement_modal' && i.user.id === interaction.user.id;

        try {
            const announcementModalSubmission = await interaction.awaitModalSubmit({
               time: 300000, // 5 minute timeout
               filter
            });

            const announcementMessage = announcementModalSubmission.fields.getTextInputValue(
                'announcement_message_input'
            );

            const currentChannel = interaction?.channel as TextChannel;
            if (!currentChannel) return;

            await currentChannel.send(announcementMessage);
            await announcementModalSubmission.reply({ content: 'Announcement made!', ephemeral: true });
            await announcementModalSubmission.deleteReply();
        } catch (error) {
            if (error.message.includes('time')) {
                console.log(`Modal timed out for user ${interaction.user.id}`);
                await interaction.followUp({content: 'This request has timed out. Please try again!', ephemeral: true});
                return;
            }
            console.log('Error making an announcement:', error);
        }
    },
    cooldown: 10,
    botPermissions: []
}

export default AnnounceCommand;
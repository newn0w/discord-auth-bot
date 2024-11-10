import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { SlashCommand } from '../types';
import { sendVerificationEmail } from "../services/mailerService";

const VerifyCommand: SlashCommand = {
    enable: true,
    command: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your email')
        .addStringOption(option => option
            .setName('email')
            .setDescription('Your email address')
            .setRequired(true)
        ),
        execute: async (interaction: CommandInteraction) => {
            const email = interaction.options.get('email')?.value as string;

            // Email regex validation
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                await interaction.reply({ content: 'Invalid email format', ephemeral: true });
                return;
            }

            await sendVerificationEmail(email);
            await interaction.reply({ content: 'Email sent!', ephemeral: true });
        },
        cooldown: 10,
        botPermissions: ['SendMessages'],
    };

export default VerifyCommand;
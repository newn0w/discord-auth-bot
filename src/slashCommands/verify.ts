import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { SlashCommand } from '../types';
import { sendVerificationEmail, generateVerificationCode } from "../services/mailerService";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient;

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

            // Email format validation regex
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                // Invalid email format, respond with error message
                await interaction.reply({ content: 'Invalid email format', ephemeral: true });
                return;
            }

            const verificationCode = generateVerificationCode();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5-minute verification code expiration
            const existingUser = await prisma.user.findUnique(
                { where: { discordId: interaction.user.id } }
            );

            // Update or create user database entry
            if (existingUser) {
                // Update existing user database entry with new verification details
                await prisma.user.update({
                    where: { discordId: interaction.user.id },
                    data: {
                        email,
                        verificationCode,
                        codeExpiresAt: expiresAt
                    }
                });
            } else {
                // Create new user database entry
                await prisma.user.create({
                    data: {
                        discordId: interaction.user.id,
                        email,
                        verificationCode,
                        codeExpiresAt: expiresAt
                    }
                });
            }

            // Send verification email to user
            await sendVerificationEmail(email, verificationCode);
            await interaction.reply({ content: 'Email sent!', ephemeral: true });
        },
        cooldown: 10,
        botPermissions: ['SendMessages'],
    };

export default VerifyCommand;
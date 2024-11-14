import {
    SlashCommandBuilder,
    CommandInteraction,
    ChatInputCommandInteraction,
    Role,
    GuildMemberRoleManager, InteractionReplyOptions, GuildMember
} from 'discord.js';
import { SlashCommand } from '../types';
import { sendVerificationEmail, generateVerificationCode } from "../services/mailerService";
import { PrismaClient } from '@prisma/client';
import { VerifiedRoleName } from "../constants/roles";
import { loadSpreadsheet } from "../utils/loadSpreadsheet"
import {GoogleSpreadsheetRow} from "google-spreadsheet";

const prisma = new PrismaClient;
const sheetId: string = process.env.SHEET_ID!;

const VerifyCommand: SlashCommand = {
    enable: true,
    command: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your email')
        .addSubcommand(subcommand => subcommand
            .setName('email')
            .setDescription('Provide your email address')
            .addStringOption(option => option
                .setName('email')
                .setDescription('Your email address')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('code')
            .setDescription('Verify with code')
            .addStringOption(option => option
                .setName('code')
                .setDescription('Verification code')
                .setRequired(true)
            )
        ),
        execute: async (interaction: ChatInputCommandInteraction) => {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'email') {
                await interaction.deferReply({ ephemeral: true });

                const email = interaction.options.getString('email', true);

                // Email format validation regex
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                if (!emailRegex.test(email)) {
                    // Invalid email format, respond with error message
                    await interaction.editReply({ content: 'Invalid email format!' });
                    return;
                }

                const doc = await loadSpreadsheet(sheetId);
                const sheet = doc.sheetsByIndex[0];
                const rows = await sheet.getRows();
                const emailTable: { [key: string]: GoogleSpreadsheetRow<Record<string, any>> } = {};
                rows.forEach(e => {
                    const key: string = e.get('Email');
                    emailTable[key] = e;
                });
                if (!(email in emailTable)) {
                    await interaction.editReply({ content: 'Email not found!' });
                    return;
                }

                const verificationCode = generateVerificationCode();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24-hour verification code expiration
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
                await interaction.editReply({ content: 'Email sent!' });
            } else if (subcommand === 'code') {
                await interaction.deferReply({ ephemeral: true });

                const code = interaction.options.getString('code', true);
                const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
                const userEmail = user?.email ?? '';
                const expirationDate = user?.codeExpiresAt ? new Date(user.codeExpiresAt) : new Date(0);

                // Begin getting user data from spreadsheet
                const doc = await loadSpreadsheet(sheetId);
                const sheet = doc.sheetsByIndex[0];
                const rows = await sheet.getRows();
                const emailTable: { [key: string]: GoogleSpreadsheetRow<Record<string, any>> } = {};
                rows.forEach(e => {
                    const key: string = e.get('Email');
                    emailTable[key] = e;
                });
                if (!(userEmail in emailTable)) {
                    await interaction.editReply({ content: 'Email not found!' });
                    return;
                }
                const emailRow = emailTable[userEmail];
                const nickname = `${emailRow.get('First Name')} ${emailRow.get('Last Name')}`;


                if (!user || user.verificationCode !== code || expirationDate < new Date()) {
                    // Invalid code, respond with error message
                    await interaction.editReply({ content: 'Invalid or expired code!' });
                    return;
                }

                // Update user verification status
                await prisma.user.update({
                    where: { discordId: interaction.user.id },
                    data: { verified: true }
                });

                // Assign verified role
                const guild = interaction.guild;
                const member = interaction.member;

                if (!guild || !member) {
                    await interaction.editReply({ content: 'Guild not found' });
                    return;
                }

                const verifiedRole = interaction.guild.roles.cache.find(
                    (role: Role) => role.name === VerifiedRoleName
                );

                if (!verifiedRole) {
                    await interaction.editReply({ content: 'Roles not configured' });
                    return;
                }

                const roleManager = member.roles as GuildMemberRoleManager;
                await roleManager.add(verifiedRole);

                // Update nickname
                const guildMember = member as GuildMember;
                let finalReplyText = 'Verified successfully!';
                await guildMember.setNickname(nickname).catch(() => finalReplyText = 'Verified successfully! Unable to edit nickname.');

                await interaction.editReply({ content: finalReplyText });
            }
        },
        cooldown: 10,
        botPermissions: ['SendMessages'],
    };

export default VerifyCommand;
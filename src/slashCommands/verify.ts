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


const prisma = new PrismaClient;

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
                const email = interaction.options.getString('email', true);

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
            } else if (subcommand === 'code') {
                await interaction.deferReply();

                const code = interaction.options.getString('code', true);
                const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
                const expirationDate = user?.codeExpiresAt ? new Date(user.codeExpiresAt) : new Date(0);

                if (!user || user.verificationCode !== code || expirationDate < new Date()) {
                    // Invalid code, respond with error message
                    await interaction.editReply({ content: 'Invalid or expired code!', ephemeral: true } as InteractionReplyOptions);
                    return;
                }

                // Update user verification status
                await prisma.user.update({
                    where: { discordId: interaction.user.id },
                    data: { verified: true }
                });

                // Retrieve user's nickname from the database
                // const nickname = user.nickname; // TODO: Add to schema

                // Assign verified role
                const guild = interaction.guild;
                const member = interaction.member;

                if (!guild || !member) {
                    await interaction.editReply({ content: 'Guild not found', ephemeral: true } as InteractionReplyOptions);
                    return;
                }

                const verifiedRole = interaction.guild.roles.cache.find(
                    (role: Role) => role.name === VerifiedRoleName
                );

                if (!verifiedRole) {
                    await interaction.editReply({ content: 'Roles not configured', ephemeral: true } as InteractionReplyOptions);
                    return;
                }

                const roleManager = member.roles as GuildMemberRoleManager;
                await roleManager.add(verifiedRole);

                // Update nickname
                const guildMember = member as GuildMember;
                // await guildMember.setNickname(nickname); // TODO: Uncomment once spreadsheet integration is added

                await interaction.editReply({ content: 'Verified successfully!', ephemeral: true } as InteractionReplyOptions);

                // TODO: Add spreadsheet integration to set user nicknames
            }
        },
        cooldown: 10,
        botPermissions: ['SendMessages'],
    };

export default VerifyCommand;
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
    Interaction, Role, GuildMemberRoleManager, GuildMember
} from 'discord.js';
import {loadSpreadsheet} from "./loadSpreadsheet";
import {PrismaClient} from "@prisma/client";
import {GoogleSpreadsheetRow} from "google-spreadsheet";
import {generateVerificationCode, sendVerificationEmail} from "../services/mailerService";
import spreadsheetHeaders from "../constants/spreadsheetHeaders.json";
import {VerifiedRoleName} from "../constants/roles";
import {createRole} from "./createRole";

const prisma = new PrismaClient;
const sheetId: string = process.env.SHEET_ID!;

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
            console.log(`verify email ${email} submitted.`)

            // Email format validation regex
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                // Invalid email format, respond with error message
                console.log(`email ${email} was found to have invalid formatting`)
                await modalSubmission.reply({ content: 'Invalid email format!', ephemeral: true });
                return;
            }

            const doc = await loadSpreadsheet(sheetId);
            const sheet = doc.sheetsByIndex[0];
            const rows = await sheet.getRows();
            console.log(`spreadsheet loaded`);
            const emailTable: { [key: string]: GoogleSpreadsheetRow<Record<string, any>> } = {};
            rows.forEach(e => {
                const key: string = e.get('Email');
                emailTable[key] = e;
            });
            if (!(email in emailTable)) {
                console.log(`email ${email} not found in email table`);
                await modalSubmission.reply({ content: 'Email not found!', ephemeral: true });
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
            await modalSubmission.reply({ content: 'Email sent!', ephemeral: true });
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

            const modalSubmission = await interaction.awaitModalSubmit({
                time: 60000,
                filter
            });

            const code = modalSubmission.fields.getTextInputValue('code_input');
            console.log(`verification code: ${code} submitted.`)

            const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
            const userEmail = user?.email ?? '';
            const expirationDate = user?.codeExpiresAt ? new Date(user.codeExpiresAt) : new Date(0);

            // Begin getting user data from spreadsheet
            const doc = await loadSpreadsheet(sheetId);
            const sheet = doc.sheetsByIndex[0];
            const rows = await sheet.getRows();
            const headers = sheet.headerValues;
            const roleHeaders = headers.filter(header => !(header in spreadsheetHeaders));
            const emailTable: { [key: string]: GoogleSpreadsheetRow<Record<string, any>> } = {};
            rows.forEach(e => {
                const key: string = e.get('Email');
                emailTable[key] = e;
            });
            if (!(userEmail in emailTable)) {
                console.log(emailTable);
                await modalSubmission.reply({ content: 'Email not found!', ephemeral: true });
                return;
            }
            const emailRow = emailTable[userEmail];
            const nickname = `${emailRow.get('First Name')} ${emailRow.get('Last Name')}`;

            if (!user || user.verificationCode !== code || expirationDate < new Date()) {
                // Invalid code, respond with error message
                await modalSubmission.reply({ content: 'Invalid or expired code!', ephemeral: true });
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
                await modalSubmission.reply({ content: 'Guild not found', ephemeral: true });
                return;
            }

            const verifiedRole = interaction.guild.roles.cache.find(
                (role: Role) => role.name === VerifiedRoleName
            );

            if (!verifiedRole) {
                await modalSubmission.reply({ content: 'Roles not configured', ephemeral: true });
                return;
            }

            let finalReplyText = 'Verified successfully!';
            console.log(`attempting to assign verified role to user..`);
            const roleManager = member.roles as GuildMemberRoleManager;
            await roleManager.add(verifiedRole)
                .catch(() => finalReplyText += ' Unable to assign role.');
            console.log(`role added successfully`)

            // Assign roles based on new spreadsheet headers
            for (const header of roleHeaders) {
                const headerValue = emailRow.get(header);
                if (headerValue) {
                    const roleName = header;
                    const role = interaction.guild?.roles.cache.find(role => role.name === roleName);
                    console.log(`Attempting to assign ${roleName} role to user..`);
                    if (!role) {
                        const newRole = await createRole(interaction.guild!, roleName)
                        roleManager.add(newRole)
                            .catch(error => console.error(`Error creating role: ${roleName}`, error));
                        console.log(`Role ${roleName} added successfully`);

                    } else {
                        await roleManager.add(role)
                            .catch(error => console.error(`Error assigning role: ${roleName}`, error));
                        console.log(`Role ${roleName} added successfully`);
                    }
                }
            }

            // Update nickname
            const guildMember = member as GuildMember;

            await guildMember.setNickname(nickname)
                .catch(() => finalReplyText += ' Unable to edit nickname.');

            console.log(finalReplyText);
            await modalSubmission.reply({ content: finalReplyText, ephemeral: true });
        } 
        else {
            throw new Error('bruh... createLandingMessage how did u even get here');
        }
        
    });

}
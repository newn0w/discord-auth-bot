import { PrismaClient } from "@prisma/client";
import {
    ButtonInteraction,
    GuildMember,
    GuildMemberRoleManager,
    ModalSubmitInteraction,
    Role
} from "discord.js";
import { loadSpreadsheet } from "./loadSpreadsheet";
import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { generateVerificationCode, sendVerificationEmail } from "../services/mailerService";
import spreadsheetHeaders from "../constants/spreadsheetHeaders.json";
import { VerifiedRoleName } from "../constants/roles";
import { createRole } from "./createRole";

const prisma = new PrismaClient;
const sheetId: string = process.env.SHEET_ID!;

export const verifyEmail = async (modalSubmission: ModalSubmitInteraction, interaction: ButtonInteraction) => {
    try {
        const email = modalSubmission.fields.getTextInputValue('email_input').toLowerCase();
        console.log(`verify email ${email} submitted.`)

        // Email format validation regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            // Invalid email format, respond with error message
            console.log(`email ${email} was found to have invalid formatting`)
            await modalSubmission.followUp({content: 'Invalid email format!', ephemeral: true});
            return;
        }

        const doc = await loadSpreadsheet(sheetId);
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();
        console.log(`spreadsheet loaded`);
        const emailTable: { [key: string]: GoogleSpreadsheetRow<Record<string, any>> } = {};
        rows.forEach(e => {
            const key: string = e.get('Email').toLowerCase();
            emailTable[key] = e;
        });
        if (!(email in emailTable)) {
            console.log(`email ${email} not found in email table`);
            await modalSubmission.followUp({content: 'Email not found!', ephemeral: true});
            return;
        }

        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24-hour verification code expiration
        const existingUser = await prisma.user.findUnique(
            {where: {discordId: interaction.user.id}}
        );

        // Update or create user database entry
        if (existingUser) {
            // Update existing user database entry with new verification details
            await prisma.user.update({
                where: {discordId: interaction.user.id},
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
        await modalSubmission.followUp({content: 'Email sent!', ephemeral: true});
    } catch (error) {
        console.error('Error during email verification:', error);
        await interaction.followUp({
            content: 'An error occurred during email verification. Please try again!',
            ephemeral: true
        });
    }
}

export const verifyCode = async (modalSubmission: ModalSubmitInteraction, interaction: ButtonInteraction) => {
    try {
        const code = modalSubmission.fields.getTextInputValue('code_input');
        console.log(`verification code: ${code} submitted.`)

        const user = await prisma.user.findUnique({where: {discordId: interaction.user.id}});
        const userEmail = user?.email ?? '';
        const expirationDate = user?.codeExpiresAt ? new Date(user.codeExpiresAt) : new Date(0);

        // Begin getting user data and header data from spreadsheet
        const doc = await loadSpreadsheet(sheetId);
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();
        const headers = sheet.headerValues;
        const roleHeaders = headers.filter(header => !(header in spreadsheetHeaders));
        const emailTable: { [key: string]: GoogleSpreadsheetRow<Record<string, any>> } = {};
        rows.forEach(e => {
            const key: string = e.get('Email').toLowerCase();
            emailTable[key] = e;
        });
        if (!(userEmail in emailTable)) {
            console.log(emailTable);
            await modalSubmission.followUp({content: 'Email not found!', ephemeral: true});
            return;
        }
        const emailRow = emailTable[userEmail];
        const nickname = `${emailRow.get('First Name')} ${emailRow.get('Last Name')}`;

        if (!user || user.verificationCode !== code || expirationDate < new Date()) {
            // Invalid code, respond with error message
            await modalSubmission.followUp({content: 'Invalid or expired code!', ephemeral: true});
            return;
        }

        // Update user verification status
        await prisma.user.update({
            where: {discordId: interaction.user.id},
            data: {verified: true}
        });

        // Assign verified role
        const guild = interaction.guild;
        const member = interaction.member;

        if (!guild || !member) {
            await modalSubmission.followUp({content: 'Guild not found', ephemeral: true});
            return;
        }

        const verifiedRole = interaction.guild.roles.cache.find(
            (role: Role) => role.name === VerifiedRoleName
        );

        if (!verifiedRole) {
            await modalSubmission.followUp({content: 'Roles not configured', ephemeral: true});
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
        await modalSubmission.followUp({content: finalReplyText, ephemeral: true});
    } catch (error) {
        console.error('Error during code verification:', error);
        await interaction.followUp({
            content: 'An error occurred during code verification. Please try again!',
            ephemeral: true
        });
    }
}
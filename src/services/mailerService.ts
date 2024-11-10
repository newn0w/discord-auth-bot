import nodemailer from 'nodemailer';

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!emailUser || !emailPass) {
    throw new Error('Email credentials are not set in environment variables!');
}

// TODO: May need to add transporter verification
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: emailUser,
        pass: emailPass,
    },
});

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
    try {
        const mailOptions = {
            from: emailUser,
            to: email,
            subject: 'Your Verification Code',
            text: `Your verification code is: ${code}`,
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
}

export function generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 15);
}
# Discord Email Verification Bot

A TypeScript Discord bot that verifies user emails against a private employee spreadsheet as well as sending a verification code to their email and updates their Discord username accordingly.

## Environment Variables

Before beginning installation and setup, you must change the `.env.example` filename to `.env` and fill:
```.env
# BOT TOKEN
TOKEN=YOUR_BOT_TOKEN_HERE

# WebHook For join & leave servers (optional)
joinLeaveWebhook=YOUR_WEBHOOK_URL_HERE

# GLOBAL PREFIX
PREFIX=!

# BOT ID
CLIENT_ID=YOUR_BOT_ID_HERE

# MONGO URL (optional)
MONGO_URI=

# NAME OF YOUR DATABASE (optional)
MONGO_DATABASE_NAME=

# Prisma DATABASE_URL
# This is used by Prisma to connect to your database.
DATABASE_URL="file:./database/bot.db"

# Email Settings (required for sending verification emails)
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password

# Service Account Settings
SERVICE_ACCOUNT_EMAIL=your_service_account@example.com
SERVICE_ACCOUNT_KEY=your_service_account_key
```

## Installation and Setup:
**1.** Clone the repository:
```bash
git clone https://github.com/[your-username]/discord-auth-bot.git
```
**2.** Install dependencies:
```bash
npm install
```
**3.** Generate Prisma client:
```bash
npx prisma generate
```
**4.** Run database migrations:
```bash
npx prisma migrate deploy
```
**5.** Compile the TypeScript:
```bash
npx tsc
```
**6.** Start the bot:
```bash
npm start
```
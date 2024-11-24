import {Client, TextChannel} from "discord.js";
import { BotEvent } from "../types";
import { color } from "../functions";
import { createLandingChannel } from "../utils/createLandingChannel";
import { createVerifiedRole } from "../utils/createRole";
import { createLandingMessage } from "../utils/createLandingMessage";

const event: BotEvent = {
  enable: true,
  name: "ready",
  once: true,
  execute: async (client: Client) => {
    console.log(color('mainColor', `[🤖] Logged in as ${color('secColor', `${client.user?.tag}(${client.user?.id})`)}`));

    const guilds = client.guilds.cache.values();

    // Initialize landing channel and create landing message
    for (const guild of guilds) {
      try {
        const landingChannel = await createLandingChannel(guild);
        await createVerifiedRole(guild);
        if (landingChannel) {
          await createLandingMessage(landingChannel)
        }
      } catch (error) {
        console.error(`Error initializing landing channel for ${guild.id}:`, error);
      }
    }
  },
};

export default event;

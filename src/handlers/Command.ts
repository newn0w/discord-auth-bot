import { Client, Routes, SlashCommandBuilder } from "discord.js";
import { REST } from "@discordjs/rest";
import { readdirSync } from "fs";
import { join } from "path";
import { color } from "../functions";
import { Command, SlashCommand } from "../types";

module.exports = (client: Client) => {
  const slashCommands: SlashCommandBuilder[] = [];
  const commands: Command[] = [];

  let slashCommandsDir = join(__dirname, "../slashCommands");

  readdirSync(slashCommandsDir).forEach((file) => {
    if (!file.endsWith(".js")) return;
    let command: SlashCommand = require(`${slashCommandsDir}/${file}`).default;
    if (!command.enable) return;
    slashCommands.push(command.command);
    client.slashCommands.set(command.command.name, command);
  });

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  rest
    .put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: slashCommands.map((command) => command.toJSON()),
    })
    .then((data: any) => {
      console.log(
        color(
          'mainColor',
          `[✅] Successfully Loaded ${color(
            'secColor',
            data.length
          )} SlashCommand(s)`
        )
      );
      console.log(
        color(
          'mainColor',
          `[✅] Successfully Loaded ${color(
            'secColor',
            commands.length
          )} Command(s)`
        )
      );
    })
    .catch((e: any) => {
      console.log(e);
    });
};
import { SlashCommandBuilder } from "discord.js";
import { Command } from "../models/Command.js";

const command = new SlashCommandBuilder().setName("remove").
setDescription("Removes select card(s) from the inventory").
toJSON();

const commandHandler = (interaction) => {
  interaction.reply("This will take a moment!");

  

};

export const remove = new Command("remove", command, commandHandler);

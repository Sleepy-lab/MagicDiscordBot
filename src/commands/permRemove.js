import { SlashCommandBuilder } from "discord.js";
import { Command } from "../models/Command.js";
import { getDatabase, ref, remove } from "firebase/database";

const command = new SlashCommandBuilder().setName("permremove")
.setDescription("Permanently removes a selected card from the inventory")
.addStringOption(option => 
    option.setName("cardname")
    .setDescription("The name of the card to permanently remove")
    .setRequired(true))
.toJSON();

const commandHandler = async (interaction) => {
  const cardName = interaction.options.getString("cardname").trim().toLowerCase();
  const db = getDatabase();

  try {
    const cardRef = ref(db, `cards/stock/${cardName}`);
    await remove(cardRef); 

    await interaction.reply(`"${cardName}" has been permanently removed from the inventory.`);
  } catch (error) {
    console.error(error);
    await interaction.reply("Failed to permanently remove the card from the inventory.");
  }
};

export const permRemove = new Command("permremove", command, commandHandler);

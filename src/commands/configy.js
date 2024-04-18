import { SlashCommandBuilder } from "discord.js";
import { Command } from "../models/Command.js";
import { getDatabase, ref, update } from "firebase/database";

const command = new SlashCommandBuilder().setName("configy")
.setDescription("Updates bot config settings")
.addChannelOption(option =>
    option.setName("pulled_list_channel")
    .setDescription("The channel where pulled lists will be posted"))
.toJSON();

const commandHandler = async (interaction) => {
    const channel = interaction.options.getChannel("pulled_list_channel");
    if (!channel) {
        await interaction.reply({ content: "You must specify a channel.", ephemeral: true });
        return;
    }
    const db = getDatabase(); 
    const configRef = ref(db, 'config/settings'); 

    try {
        await update(configRef, { pulledListChannelId: channel.id });
        await interaction.reply({ content: `Configuration updated. Pulled lists will be posted in ${channel.name}`, ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: "Failed to update configuration.", ephemeral: true });
    }
};

export const configy = new Command("configy", command, commandHandler);

import { SlashCommandBuilder } from "discord.js";
import { Command } from "../models/Command.js";
import fs from 'fs';

const command = new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Reloads a command.")
    .addStringOption((option) =>
        option
            .setName('command')
            .setDescription('The command to reload.')
            .setRequired(true)
    )
    .toJSON();

const commandHandler = async (interaction) => {
    const commandName = interaction.options.getString('command', true).toLowerCase();

    try {
        if (fs.existsSync(`./commands/${commandName}.js`)) {
            delete require.cache[require.resolve(`../commands/${commandName}.js`)];

            if (interaction.client.commands.has(commandName)) {
                interaction.client.commands.delete(commandName);
            }

            const newCommand = require(`../commands/${commandName}.js`);
            interaction.client.commands.set(newCommand.data.name, newCommand);

            await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
        } else {
            await interaction.reply(`There is no command with name \`${commandName}\`!`);
        }
    } catch (error) {
        console.error(error);
        await interaction.reply(`There was an error while reloading a command \`${commandName}\`:\n\`${error.message}\``);
    }
};

export const reload = new Command("reload", command, commandHandler);

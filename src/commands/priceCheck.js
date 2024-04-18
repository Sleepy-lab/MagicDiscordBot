import { SlashCommandBuilder } from "discord.js";
import { Command } from "../models/Command.js";

const command = new SlashCommandBuilder()
    .setName("price")
    .addStringOption(option =>
        option
            .setName("cards")
            .setDescription("Enter the names of the cards, separated by commas.")
            .setRequired(true))
    .setDescription("Checks the price(s) of the cards in the list.")
    .toJSON();

const commandHandler = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const cardNames = interaction.options.getString("cards").split(",").map(name => name.trim());
    const totalCards = cardNames.length;
    const delayPerCard = 20;
    let totalPrice = 0;

    const priceMessages = [];

    for (let i = 0; i < totalCards; i++) {
        if (i > 0) await new Promise(resolve => setTimeout(resolve, delayPerCard));
        const name = cardNames[i];
        const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
        const cardData = await response.json();
        
        if (cardData.prices && cardData.prices.usd) {
            const price = parseFloat(cardData.prices.usd);
            totalPrice += price;
            priceMessages.push(`${name}: $${price.toFixed(2)}`);
        } else {
            priceMessages.push(`${name}: Price not available`);
        }
    }

    priceMessages.push(`\nTotal Price: $${totalPrice.toFixed(2)}`);

    await interaction.followUp({ content: priceMessages.join("\n"), ephemeral: true });
};

export const priceCheck = new Command("price", command, commandHandler);

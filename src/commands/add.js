import { SlashCommandBuilder } from "discord.js";
import { Command } from "../models/Command.js";
import { getDatabase, ref, update, child, get, set } from "firebase/database";

const command = new SlashCommandBuilder().setName("add")
    .setDescription("Adds card(s) to the inventory")
    .addStringOption(option => 
        option.setName("cards")
            .setDescription("Enter cards in the format '1x Cardname, 2x AnotherCard, ...'")
            .setRequired(true))
    .toJSON();

const commandHandler = async (interaction) => {
    const cardsInput = interaction.options.getString("cards").trim();
    const cardList = cardsInput.split(',').map(card => card.trim());

    const cards = cardList.map(card => {
        const match = card.match(/(\d+)x\s*(.+)/);
        if (match) {
            const quantity = parseInt(match[1], 10);
            const name = match[2].toLowerCase();
            return { name, quantity };
        }
        return null; // Invalid format, skip this card
    }).filter(Boolean); // Remove null entries

    if (cards.length === 0) {
        await interaction.reply({ content: "Invalid card format. Use '1x Cardname, 2x AnotherCard, ...'", ephemeral: true });
        return;
    }

    const db = getDatabase();

    try {
        for (const card of cards) {
            const stockRef = ref(db, `cards/stock/${card.name}`);
            const stockSnapshot = await get(stockRef);
            
            if (stockSnapshot.exists()) {
                const currentQuantity = stockSnapshot.val().quantity;
                await update(stockRef, { quantity: currentQuantity + card.quantity });
            } else {
                await set(stockRef, { name: card.name, quantity: card.quantity });
            }
        }

        await interaction.reply({ content: `Cards have been added to the inventory.`, ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: "Failed to add the cards to the inventory.", ephemeral: true });
    }
};

export const add = new Command("add", command, commandHandler);

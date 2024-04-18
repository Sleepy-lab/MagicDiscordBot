import { SlashCommandBuilder } from "discord.js";
import { Command } from "../models/Command.js";
import { getDatabase, ref, get, update } from "firebase/database";

const claimedUsers = new Set();

const command = new SlashCommandBuilder()
    .setName("pull")
    .addStringOption((option) =>
        option
            .setName('card_list')
            .setRequired(true)
            .setDescription('The list of cards to pull. Format: "3x CardNameA, 2x CardNameB"')
    )
    .setDescription("Pulls a set list of cards from the stock!")
    .toJSON();

const commandHandler = async (interaction) => {
    if (!interaction.isCommand()) return;

    await interaction.deferReply({ ephemeral: true });

    const cardListString = interaction.options.getString('card_list');
    const cardMap = parseCardList(cardListString);

    const db = getDatabase();
    const stockRef = ref(db, 'cards/stock');
    const stockSnapshot = await get(stockRef);
    const stock = stockSnapshot.exists() ? stockSnapshot.val() : {};

    const configRef = ref(db, 'config/settings');

    try {
        const configSnapshot = await get(configRef);
        const config = configSnapshot.exists() ? configSnapshot.val() : {};

        if (!config.pulledListChannelId) {
            await interaction.followUp({ content: 'Pulled list channel not configured.', ephemeral: true });
            return;
        }

        const pulledListChannel = interaction.client.channels.cache.get(config.pulledListChannelId);

        if (!pulledListChannel) {
            await interaction.followUp({ content: 'Pulled list channel not found.', ephemeral: true });
            return;
        }

        let inStockMessage = '';
        let totalPrice = 0;
        let allInStock = true;

        for (const [name, quantity] of cardMap) {
            const lowercaseName = name.toLowerCase();

            if (stock[lowercaseName]) {
                if (stock[lowercaseName].quantity >= quantity) {
                    const cardPrice = await getCardPrice(name);
                    const cardColorIdentity = await getCardColorIdentity(name);
                    inStockMessage += `${quantity}x ${name} (${cardPrice}) - Color Identity: ${cardColorIdentity}\n`;
                    totalPrice += parseFloat(cardPrice.replace('$', ''));
                } else if (stock[lowercaseName].quantity === 0) {
                    allInStock = false;
                    inStockMessage += `${name} is not in stock.\n`;
                } else {
                    allInStock = false;
                    inStockMessage += `${name} is in stock (${stock[lowercaseName].quantity} in stock), but there is insufficient quantity (${quantity} needed).\n`;
                }
            } else {
                allInStock = false;
                inStockMessage += `${name} is not in stock.\n`;
            }
        }

        if (allInStock) {
            inStockMessage += `\nTotal Price: $${totalPrice.toFixed(2)}`;

            const userMention = `<@${interaction.user.id}>`;

            const replyMessage = await interaction.followUp({
                content: `Pulled cards from ${userMention}'s list:\n` + inStockMessage + '\nDo you want to proceed with pulling these cards?',
                components: [{
                    type: 1,
                    components: [
                        {
                            type: 2,
                            label: 'Yes, pull the cards',
                            style: 1,
                            customId: 'confirm_pull'
                        },
                        {
                            type: 2,
                            label: 'Cancel',
                            style: 4,
                            customId: 'cancel_pull'
                        }
                    ]
                }]
            });

            const claimFilter = (i) => i.customId === 'claim' && i.user.id === interaction.user.id;
            const claimCollector = pulledListChannel.createMessageComponentCollector({ filter: claimFilter });

            const filter = (i) => (i.customId === 'confirm_pull' || i.customId === 'cancel_pull') && i.user.id === interaction.user.id;
            const collector = replyMessage.createMessageComponentCollector({ filter, time: 15000 });

            let confirmed = false;

            collector.on('collect', async (i) => {
                if (i.customId === 'confirm_pull') {
                    await i.deferUpdate();
                    confirmed = true;
                    try {
                        const updates = {};
                        for (const [name, quantity] of cardMap) {
                            updates[`cards/stock/${name.toLowerCase()}/quantity`] = stock[name.toLowerCase()].quantity - quantity;
                        }
                        await update(ref(db), updates);

                        pulledListChannel.send({
                            content: `Pulled cards from ${userMention}'s list:`,
                            embeds: [{
                                title: 'Pulled Cards',
                                description: inStockMessage,
                                color: 0x00ff00, // Green
                            }],
                            components: [{
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        label: 'Claim',
                                        style: 1,
                                        customId: 'claim'
                                    }
                                ]
                            }]
                        });

                        await interaction.followUp({ content: 'The cards have been pulled from the database.', ephemeral: true });
                    } catch (error) {
                        console.error(error);
                        await interaction.followUp('There was an error pulling the cards from the database.');
                    }
                    collector.stop();
                } else if (i.customId === 'cancel_pull') {
                    await i.update({ content: 'Card pull cancelled.', components: [], ephemeral: true });
                    collector.stop();
                }
            });
            claimCollector.on('collect', async (i) => {
                await i.deferUpdate();
                if (i.customId === 'claim') {
                    claimedUsers.add(interaction.user.id);
                    const claimedUser = interaction.client.users.cache.get(interaction.user.id);
                    const ownerUser = interaction.user;
                    if (claimedUser && ownerUser) {
                        const claimMessage = `<@${ownerUser.id}>'s list was pulled by <@${claimedUser.id}>`;
                        await pulledListChannel.messages.fetch({ limit: 1 }).then(messages => {
                            const lastMessage = messages.first();
                            lastMessage.edit(claimMessage);
                        });
                        claimedUser.send(`Your card list has been pulled and is ready for you at the store.`);
                    }
                }
            });
        } else {
            if (inStockMessage === '') {
                inStockMessage = 'No requested cards are in stock!';
            }
            await interaction.followUp(inStockMessage);
        }
    } catch (error) {
        console.error(error);
        await interaction.followUp({ content: "Failed to fetch configuration or update.", ephemeral: true });
    }
};

async function getCardPrice(cardName) {
    try {
        const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
        const cardData = await response.json();
        if (cardData.prices && cardData.prices.usd) {
            return `$${parseFloat(cardData.prices.usd).toFixed(2)}`;
        } else {
            return 'Price not available';
        }
    } catch (error) {
        console.error(error);
        return 'Price not available';
    }
}

async function getCardColorIdentity(cardName) {
    try {
        const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
        const cardData = await response.json();
        if (cardData.color_identity) {
            return cardData.color_identity.join(', ');
        } else {
            return 'Color identity not available';
        }
    } catch (error) {
        console.error(error);
        return 'Color identity not available';
    }
}

function parseCardList(cardListString) {
    const cardMap = new Map();
    const cardListArray = cardListString.split(',');

    for (let card of cardListArray) {
        card = card.trim();
        const [quantityPart, ...nameParts] = card.split('x');
        const quantity = parseInt(quantityPart.trim(), 10);
        const name = nameParts.join('x').trim();
        cardMap.set(name, quantity);
    }

    return cardMap;
}

export const pull = new Command("pull", command, commandHandler);

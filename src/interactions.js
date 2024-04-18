import { commands } from "./commands/commands.js";

export const handleInteractionCreate = (interaction) => {
  if(!interaction.isChatInputCommand()) return;
  if (!interaction.isCommand()) return;

  commands[interaction.commandName].handle(interaction);
};

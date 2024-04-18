import { add } from "./add.js";
import { configy } from "./configy.js";
import { permRemove } from "./permRemove.js";
import { priceCheck } from "./priceCheck.js";
import { pull } from "./pull.js";
import { reload } from "./reload.js";
import { remove } from "./remove.js";

export const commands = {
  [priceCheck.name]: priceCheck,
  [pull.name]: pull,
  [add.name]: add,
  [permRemove.name]: permRemove,
  [remove.name]: remove,
  [configy.name]: configy,
  [reload.name]: reload
};

export const commandList = Object.values(commands).map((command) => command.getCommand());

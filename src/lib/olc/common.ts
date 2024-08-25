import { cSystem } from "../colours";
import { Command } from "../CommandHandler";

export const toggleBuilder: Command = {
  name: "##builder",
  execute(g) {
    const player = g.player;

    if (player.tags.has("builder")) {
      player.tags.delete("builder");
      g.ui.line("You are no longer a builder.", cSystem);
    } else {
      player.tags.add("builder");
      g.ui.line("You are now a builder.", cSystem);
    }
  },
};

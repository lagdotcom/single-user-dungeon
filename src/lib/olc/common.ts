import { Command } from "../CommandHandler";

export const toggleBuilder: Command = {
  name: "##builder",
  execute(g) {
    const player = g.player;

    if (player.tags.has("builder")) {
      player.tags.delete("builder");
      g.ui.text("You are no longer a builder.");
    } else {
      player.tags.add("builder");
      g.ui.text("You are now a builder.");
    }
  },
};

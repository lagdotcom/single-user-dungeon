import { Command } from "./CommandHandler";

export const unknown: Command = {
  name: "[unknown]",
  execute(g, command?: string) {
    if (!command) return;

    g.ui.text(`Unknown command: ${command}`);
  },
};

export const look: Command = {
  name: "look",
  execute(g) {
    const room = g.room(g.player.room);

    if (g.player.tags.has("builder")) g.ui.text(`[ROOM #${room.id}]`);

    g.ui.text(room.name);
    if (room.description) g.ui.text(room.description);
  },
};

export const go: Command = {
  name: "go",
  execute(g, dir: string) {
    const room = g.room(g.player.room);

    const exit = room.exits.get(dir.toLocaleLowerCase());
    if (!exit) return g.ui.text(`There's no "${dir}" exit.`);

    if (exit.tags.has("closed")) {
      const desc = exit.desc ?? "the door";

      if (exit.tags.has("locked") && exit.key) {
        if (g.player.inventory.has(exit.key)) {
          const [, key] = g.itemAndTemplate(exit.key);

          exit.tags.delete("locked");
          g.act(g.player.id, `$n unlock$s ${desc} with ${key.short}`);

          if (exit.link) {
            const opposite = g.room(exit.room).exits.get(exit.link);
            if (opposite) opposite.tags.delete("locked");
          }
        } else return g.ui.text("You don't have the key.");
      }

      exit.tags.delete("closed");
      g.act(g.player.id, `$n open$s ${desc}`);

      if (exit.link) {
        const opposite = g.room(exit.room).exits.get(exit.link);
        if (opposite) {
          opposite.tags.delete("closed");
          g.act(g.player.id, `${desc} swings open.`, exit.room);
        }
      }
    }

    g.moveMob(g.player.id, exit.room, "$n arrive$s.", "$n leav$e.");

    // TODO autoclose door behind?
  },
};

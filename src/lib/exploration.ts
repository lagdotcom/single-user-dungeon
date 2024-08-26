import {
  cEditor,
  cError,
  cRoomDescription,
  cRoomMobs,
  cRoomName,
  cSystem,
} from "./colours";
import { Command } from "./CommandHandler";

export const unknown: Command = {
  name: "",
  execute(g, command?: string) {
    if (!command) return;

    g.ui.line(`Unknown command: ${command}`, cError);
  },
};

export const look: Command = {
  name: "look",
  execute(g) {
    if (!g.player.room) return g.ui.line("You are not anywhere.", cError);
    const room = g.room(g.player.room);

    if (g.player.tags.has("builder")) g.ui.line(`[${room.id}]`, cEditor);

    g.ui.line(room.name, cRoomName);
    if (room.description) g.ui.line(room.description, cRoomDescription);

    for (const mobID of room.mobs) {
      if (mobID === g.player.id) continue;

      const [, mt] = g.mobAndTemplate(mobID);
      g.ui.line(mt.short, cRoomMobs);
    }
  },
};

export const go: Command = {
  name: "go",
  execute(g, dir: string) {
    if (!g.player.room) return g.ui.line("You are not anywhere.", cError);
    const room = g.room(g.player.room);

    const exit = room.exits.get(dir.toLocaleLowerCase());
    if (!exit) return g.ui.line(`There's no "${dir}" exit.`, cError);

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
        } else return g.ui.line("You don't have the key.", cError);
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

    g.saveWorld();
    g.moveMob(g.player.id, exit.room, "$n arrive$s.", "$n leav$e.");

    // TODO autoclose door behind?
  },
};

export const save: Command = {
  name: "save",
  execute(g) {
    g.savePlayer();
    g.ui.line("OK.", cSystem);
  },
};

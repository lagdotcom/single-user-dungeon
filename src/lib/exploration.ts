import Engine from "../types/Engine";

export function unknownCommand(g: Engine, command?: string) {
  if (!command) return;

  g.ui.text(`Unknown command: ${command}`);
}

export function look(g: Engine) {
  const room = g.room(g.player.room);

  g.ui.text(room.name);
  if (room.description) g.ui.text(room.description);
}

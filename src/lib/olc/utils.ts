import Engine from "../../types/Engine";
import { RoomID } from "../../types/flavours";
import Room from "../../types/Room";
import { cEditor, cError } from "../colours";
import { Command } from "../CommandHandler";

export function makeRoom(g: Engine, roomID: RoomID): Room | undefined {
  const existing = g.world.rooms.get(roomID);
  if (existing) {
    g.ui.line("Room ID already exists.", cError);
    return;
  }

  const room: Room = {
    id: roomID,
    name: "Untitled Room",
    exits: new Map(),
    items: new Set(),
    mobs: new Set(),
  };
  g.world.rooms.set(roomID, room);

  return room;
}

const oppositeExits: Record<string, string> = {
  west: "east",
  east: "west",
  north: "south",
  south: "north",
};

export function makeLinkedExits(dir: string, room: Room, other: Room) {
  const opposite = oppositeExits[dir];
  room.exits.set(dir, { room: other.id, tags: new Set(), link: opposite });

  if (opposite)
    other.exits.set(opposite, {
      room: room.id,
      tags: new Set(),
      link: dir,
    });
}

export const doneEditing: Command = {
  name: "done",
  execute(g) {
    g.ui.line("Exiting editing mode.", cEditor);
    g.popInputHandler();
  },
};

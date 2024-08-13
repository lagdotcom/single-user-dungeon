import { RoomID } from "../../types/flavours";
import alias from "../alias";
import CommandHandler, { Command } from "../CommandHandler";
import { go, unknown } from "../exploration";
import { doneEditing, makeLinkedExits, makeRoom } from "./utils";

const makeRoomExit: Command = {
  name: "rexit",
  execute(g, dir?: string, type?: string, newID?: string) {
    if (!dir)
      return g.ui.text(
        "Syntax: <dir> dig|link|room <id>\n        <dir> delete",
      );
    if (!type) return go.execute(g, dir);

    const roomID = g.player.room;
    const room = g.room(roomID);
    const exit = room.exits.get(dir);
    if (exit) {
      if (type === "delete") {
        room.exits.delete(dir);
        if (exit.link) g.room(exit.room).exits.delete(exit.link);

        return g.ui.text("OK.");
      }

      return g.ui.text("Exit already exists.");
    }

    switch (type) {
      case "delete":
        return g.ui.text("Exit does not exist.");

      case "dig": {
        const otherID = parseInt(newID ?? "@");
        if (isNaN(otherID)) return g.ui.text("Invalid room ID.");

        const other = makeRoom(g, otherID);
        if (!other) return;

        makeLinkedExits(dir, room, other);
        g.ui.text("OK.");
        return g.moveMob(g.player.id, otherID);
      }

      case "link": {
        const otherID = parseInt(newID ?? "@");
        if (isNaN(otherID)) return g.ui.text("Invalid room ID.");

        const other = g.world.rooms.get(otherID);
        if (!other) return g.ui.text("Room id does not exist.");

        makeLinkedExits(dir, room, other);
        g.ui.text("OK.");
        return g.moveMob(g.player.id, otherID);
      }

      case "room": {
        const otherID = parseInt(newID ?? "@");
        if (isNaN(otherID)) return g.ui.text("Invalid room ID.");

        const other = g.world.rooms.get(otherID);
        if (!other) return g.ui.text("Room id does not exist.");

        room.exits.set(dir, { room: otherID, tags: new Set() });

        g.ui.text("OK.");
        return g.moveMob(g.player.id, otherID);
      }

      default:
        return g.ui.text(`Invalid rexit verb: ${type}`);
    }
  },
};

const create: Command = {
  name: "create",
  execute(g, id?: string) {
    const roomID = parseInt(id ?? "@");
    if (isNaN(roomID)) return g.ui.text("Invalid room id.");

    if (!makeRoom(g, roomID)) return;

    g.ui.text("OK.");
    return g.moveMob(g.player.id, roomID);
  },
};

export const roomEditMode = new CommandHandler(unknown, [
  doneEditing,

  create,

  makeRoomExit,
  alias("n", makeRoomExit.name, "north"),
  alias("north", makeRoomExit.name, "north"),
  alias("e", makeRoomExit.name, "east"),
  alias("east", makeRoomExit.name, "east"),
  alias("s", makeRoomExit.name, "south"),
  alias("south", makeRoomExit.name, "south"),
  alias("w", makeRoomExit.name, "west"),
  alias("west", makeRoomExit.name, "west"),
]);

export const roomEditor: Command = {
  name: "redit",
  execute(g, arg?: string, id?: string) {
    if (!g.player.tags.has("builder"))
      return g.ui.text("You are not a builder.");

    let roomID: RoomID = NaN;

    if (id) {
      roomID = parseInt(id);
      if (isNaN(roomID)) return g.ui.text("Invalid room id.");

      if (arg === "create") {
        if (!makeRoom(g, roomID)) return;
      } else if (arg === "edit") {
        const existing = g.world.rooms.get(roomID);
        if (!existing) return g.ui.text("Room id does not exist.");
      } else return g.ui.text(`Unknown redit verb: ${arg}`);
    } else roomID = g.player.room;

    g.ui.text(`Entering room edit mode - room #${roomID}.`);
    g.moveMob(g.player.id, roomID);
    g.pushInputHandler(roomEditMode.handleInput);
  },
};

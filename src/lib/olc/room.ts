import { RoomID } from "../../types/flavours";
import alias from "../alias";
import { cEditor, cError, cSystem } from "../colours";
import CommandHandler, { Command } from "../CommandHandler";
import EditorContext from "../EditorContext";
import { go, look, unknown } from "../exploration";
import { doneEditing, makeLinkedExits, makeRoom } from "./utils";

const makeRoomExit: Command = {
  name: "rexit",
  execute(g, dir?: string, type?: string, newID?: string) {
    if (!dir)
      return g.ui.line(
        "Syntax: <dir> dig|link|room <id>\n        <dir> delete",
        cSystem,
      );
    if (!type) return go.execute(g, dir);

    if (!g.player.room) return g.ui.line("You are not anywhere.", cError);
    const roomID = g.player.room;
    const room = g.room(roomID);
    const exit = room.exits.get(dir);
    if (exit) {
      if (type === "delete") {
        room.exits.delete(dir);
        if (exit.link) g.room(exit.room).exits.delete(exit.link);

        g.saveWorld();
        return g.ui.line("OK.", cEditor);
      }

      return g.ui.line("Exit already exists.", cError);
    }

    switch (type) {
      case "delete":
        return g.ui.line("Exit does not exist.", cError);

      case "dig": {
        if (!newID) return g.ui.line("Invalid room ID.", cError);

        const other = makeRoom(g, newID);
        if (!other) return;

        makeLinkedExits(dir, room, other);
        g.saveWorld();
        g.ui.line("OK.", cEditor);
        return g.moveMob(g.player.id, newID);
      }

      case "link": {
        if (!newID) return g.ui.line("Invalid room ID.", cError);

        const other = g.world.rooms.get(newID);
        if (!other) return g.ui.line("Room ID does not exist.", cError);

        makeLinkedExits(dir, room, other);
        g.saveWorld();
        g.ui.line("OK.", cEditor);
        return g.moveMob(g.player.id, newID);
      }

      case "room": {
        if (!newID) return g.ui.line("Invalid room ID.", cError);

        const other = g.world.rooms.get(newID);
        if (!other) return g.ui.line("Room ID does not exist.", cError);

        room.exits.set(dir, { room: newID, tags: new Set() });

        g.saveWorld();
        g.ui.line("OK.", cEditor);
        return g.moveMob(g.player.id, newID);
      }

      default:
        return g.ui.line(`Invalid rexit verb: ${type}`, cError);
    }
  },
};

const nameRoom: Command = {
  name: "name",
  doNotParse: true,
  execute(g, ...args: string[]) {
    const name = args.join(" ").trim();
    if (!name) return g.ui.line("Syntax: name <new room name>", cError);

    if (!g.player.room) return g.ui.line("You are not anywhere.", cError);
    const room = g.room(g.player.room);
    room.name = name;

    g.saveWorld();
    return look.execute(g);
  },
};

const describeRoom: Command = {
  name: "describe",
  execute(g) {
    if (!g.player.room) return g.ui.line("You are not anywhere.", cError);
    const room = g.room(g.player.room);
    new EditorContext(g, room.description ?? "", (value) => {
      if (value) {
        room.description = value;
        g.ui.line("Description set.", cEditor);
      } else {
        delete room.description;
        g.ui.line("Description cleared.", cEditor);
      }

      g.saveWorld();
      return look.execute(g);
    });
  },
};

const create: Command = {
  name: "create",
  execute(g, id?: string) {
    if (!id) return g.ui.line("Invalid room ID.", cError);

    if (!makeRoom(g, id)) return;

    g.ui.line("OK.", cEditor);
    return g.moveMob(g.player.id, id);
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

  nameRoom,
  describeRoom,
]);

export const roomEditor: Command = {
  name: "redit",
  execute(g, arg?: string, id?: string) {
    if (!g.player.tags.has("builder"))
      return g.ui.line("You are not a builder.", cError);

    let roomID: RoomID | undefined;

    if (id) {
      roomID = id;
      if (!id) return g.ui.line("Invalid room ID.", cError);

      if (arg === "create") {
        if (!makeRoom(g, roomID)) return;
      } else if (arg === "edit") {
        const existing = g.world.rooms.get(roomID);
        if (!existing) return g.ui.line("Room ID does not exist.", cError);
      } else return g.ui.line(`Unknown redit verb: ${arg}`, cError);
    } else roomID = g.player.room;

    if (!roomID)
      return g.ui.line(`No room ID given and not in a room.`, cError);

    g.ui.line(`Entering room edit mode.`, cEditor);
    g.moveMob(g.player.id, roomID);
    g.pushInputHandler(roomEditMode.handleInput);
  },
};

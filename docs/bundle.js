"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/lib/alias.ts
  function alias(name, ...rewrite) {
    return {
      name,
      execute(g, ...args) {
        g.interpret(...rewrite, ...args);
      }
    };
  }

  // src/lib/CommandHandler.ts
  function cmdSplit(s) {
    const parts = [];
    let current = "";
    let quote = "";
    for (const c of s) {
      if (quote) {
        if (c === quote) {
          quote = "";
          parts.push(current);
          current = "";
        } else current += c;
        continue;
      }
      if (c === " ") {
        if (current) {
          parts.push(current);
          current = "";
        }
      } else if (c === '"' || c === "'") {
        if (current) {
          parts.push(current);
          current = "";
        }
        quote = c;
      } else current += c;
    }
    if (current) parts.push(current);
    return parts;
  }
  var CommandHandler = class {
    constructor(unhandled, commands) {
      this.unhandled = unhandled;
      __publicField(this, "commands");
      __publicField(this, "handleInput", (value, g) => {
        const parts = cmdSplit(value.trim());
        if (parts.length > 0) {
          const [first, ...rest] = parts;
          const cmd = this.commands.get(first.toLocaleLowerCase());
          if (cmd) return cmd.execute(g, ...rest);
        }
        return this.unhandled.execute(g, ...parts);
      });
      this.commands = new Map(commands.map((c) => [c.name, c]));
    }
  };

  // src/lib/exploration.ts
  var unknown = {
    name: "[unknown]",
    execute(g, command) {
      if (!command) return;
      g.ui.text(`Unknown command: ${command}`);
    }
  };
  var look = {
    name: "look",
    execute(g) {
      const room = g.room(g.player.room);
      if (g.player.tags.has("builder")) g.ui.text(`[ROOM #${room.id}]`);
      g.ui.text(room.name);
      if (room.description) g.ui.text(room.description);
    }
  };
  var go = {
    name: "go",
    execute(g, dir) {
      var _a;
      const room = g.room(g.player.room);
      const exit = room.exits.get(dir.toLocaleLowerCase());
      if (!exit) return g.ui.text(`There's no "${dir}" exit.`);
      if (exit.tags.has("closed")) {
        const desc = (_a = exit.desc) != null ? _a : "the door";
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
    }
  };

  // src/lib/olc/common.ts
  var toggleBuilder = {
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
    }
  };

  // src/lib/olc/utils.ts
  function makeRoom(g, roomID) {
    const existing = g.world.rooms.get(roomID);
    if (existing) {
      g.ui.text("Room id already exists.");
      return;
    }
    const room = {
      id: roomID,
      name: "Untitled Room",
      exits: /* @__PURE__ */ new Map(),
      items: /* @__PURE__ */ new Set(),
      mobs: /* @__PURE__ */ new Set()
    };
    g.world.rooms.set(roomID, room);
    return room;
  }
  var oppositeExits = {
    west: "east",
    east: "west",
    north: "south",
    south: "north"
  };
  function makeLinkedExits(dir, room, other) {
    const opposite = oppositeExits[dir];
    room.exits.set(dir, { room: other.id, tags: /* @__PURE__ */ new Set(), link: opposite });
    if (opposite)
      other.exits.set(opposite, {
        room: room.id,
        tags: /* @__PURE__ */ new Set(),
        link: dir
      });
  }
  var doneEditing = {
    name: "done",
    execute(g) {
      g.ui.text("Exiting editing mode.");
      g.popInputHandler();
    }
  };

  // src/lib/olc/room.ts
  var makeRoomExit = {
    name: "rexit",
    execute(g, dir, type, newID) {
      if (!dir)
        return g.ui.text(
          "Syntax: <dir> dig|link|room <id>\n        <dir> delete"
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
          const otherID = parseInt(newID != null ? newID : "@");
          if (isNaN(otherID)) return g.ui.text("Invalid room ID.");
          const other = makeRoom(g, otherID);
          if (!other) return;
          makeLinkedExits(dir, room, other);
          g.ui.text("OK.");
          return g.moveMob(g.player.id, otherID);
        }
        case "link": {
          const otherID = parseInt(newID != null ? newID : "@");
          if (isNaN(otherID)) return g.ui.text("Invalid room ID.");
          const other = g.world.rooms.get(otherID);
          if (!other) return g.ui.text("Room id does not exist.");
          makeLinkedExits(dir, room, other);
          g.ui.text("OK.");
          return g.moveMob(g.player.id, otherID);
        }
        case "room": {
          const otherID = parseInt(newID != null ? newID : "@");
          if (isNaN(otherID)) return g.ui.text("Invalid room ID.");
          const other = g.world.rooms.get(otherID);
          if (!other) return g.ui.text("Room id does not exist.");
          room.exits.set(dir, { room: otherID, tags: /* @__PURE__ */ new Set() });
          g.ui.text("OK.");
          return g.moveMob(g.player.id, otherID);
        }
        default:
          return g.ui.text(`Invalid rexit verb: ${type}`);
      }
    }
  };
  var create = {
    name: "create",
    execute(g, id) {
      const roomID = parseInt(id != null ? id : "@");
      if (isNaN(roomID)) return g.ui.text("Invalid room id.");
      if (!makeRoom(g, roomID)) return;
      g.ui.text("OK.");
      return g.moveMob(g.player.id, roomID);
    }
  };
  var roomEditMode = new CommandHandler(unknown, [
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
    alias("west", makeRoomExit.name, "west")
  ]);
  var roomEditor = {
    name: "redit",
    execute(g, arg, id) {
      if (!g.player.tags.has("builder"))
        return g.ui.text("You are not a builder.");
      let roomID = NaN;
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
    }
  };

  // src/lib/SUDEngine.ts
  var SUDEngine = class {
    constructor(world, ui, playerTemplateID, startingRoomID) {
      this.world = world;
      this.ui = ui;
      this.playerTemplateID = playerTemplateID;
      this.startingRoomID = startingRoomID;
      __publicField(this, "player");
      __publicField(this, "inputStack");
      ui.addInputListener((input) => this.inputHandler(input, this));
      this.player = {
        id: 1,
        template: playerTemplateID,
        equipment: /* @__PURE__ */ new Map(),
        inventory: /* @__PURE__ */ new Set(),
        tags: /* @__PURE__ */ new Set(["player"]),
        room: NaN
      };
      this.inputStack = [this.motd()];
    }
    get inputHandler() {
      return this.inputStack[this.inputStack.length - 1];
    }
    pushInputHandler(handler) {
      this.inputStack.push(handler);
    }
    popInputHandler() {
      return this.inputStack.pop();
    }
    mob(id) {
      const mob = this.world.mobs.get(id);
      if (!mob) throw new Error(`Invalid mob ID: ${id}`);
      return mob;
    }
    mobTemplate(id) {
      const mt = this.world.mobTemplates.get(id);
      if (!mt) throw new Error(`Invalid mob template ID: ${id}`);
      return mt;
    }
    mobAndTemplate(id) {
      const mob = this.mob(id);
      return [mob, this.mobTemplate(mob.template)];
    }
    item(id) {
      const item = this.world.items.get(id);
      if (!item) throw new Error(`Invalid item ID: ${id}`);
      return item;
    }
    itemTemplate(id) {
      const it = this.world.itemTemplates.get(id);
      if (!it) throw new Error(`Invalid item template ID: ${id}`);
      return it;
    }
    itemAndTemplate(id) {
      const item = this.item(id);
      return [item, this.itemTemplate(item.template)];
    }
    room(id) {
      const room = this.world.rooms.get(id);
      if (!room) throw new Error(`Invalid room ID: ${id}`);
      return room;
    }
    moveMob(mobID, roomID, arriveMessage, leaveMessage) {
      const mob = this.mob(mobID);
      const oldRoom = this.world.rooms.get(mob.room);
      if (oldRoom) {
        mob.room = NaN;
        oldRoom.mobs.delete(mobID);
        if (leaveMessage) this.act(mobID, leaveMessage);
      }
      if (arriveMessage) this.act(mobID, arriveMessage, roomID);
      const newRoom = this.room(roomID);
      newRoom.mobs.add(mobID);
      mob.room = roomID;
      look.execute(this);
    }
    act(selfID, message, overrideRoomID) {
      var _a, _b;
      const [self, st] = this.mobAndTemplate(selfID);
      const roomID = overrideRoomID != null ? overrideRoomID : self.room;
      if (!roomID) return;
      const room = this.room(roomID);
      for (const mobID of room.mobs) {
        const isSelf = mobID === selfID;
        const [mob, mt] = this.mobAndTemplate(mobID);
        const n = isSelf ? "you" : (_a = self.name) != null ? _a : st.short;
        const s = isSelf ? "" : "s";
        const t = (_b = mob.name) != null ? _b : mt.short;
        const e = isSelf ? "" : "es";
        const formatted = this.format(message, { n, s, t, e });
        if (mob.tags.has("player")) this.ui.text(formatted);
      }
    }
    format(message, replacements) {
      var _a;
      for (const [v, r] of Object.entries(replacements)) {
        const p = new RegExp(`\\$${v}`, "g");
        message = message.replace(p, r);
      }
      message = message[0].toLocaleUpperCase() + message.slice(1);
      if (!"!.?".includes((_a = message.at(-1)) != null ? _a : "")) message += ".";
      return message;
    }
    motd() {
      this.ui.text(`---------------
      Welcome to SUD!
      ---------------

      Type your name:`);
      return (value) => {
        const { player, startingRoomID, ui, world } = this;
        if (value.length < 2) {
          ui.text("Try something longer.");
          return;
        }
        player.name = value.trim();
        ui.text(`Good to meet you, ${player.name}.`);
        world.mobs.set(player.id, player);
        this.popInputHandler();
        this.pushInputHandler(mainCommandHandler.handleInput);
        this.moveMob(player.id, startingRoomID, "$n log$s in");
      };
    }
    interpret(...args) {
      this.inputHandler(args.join(" "), this);
    }
  };
  var mainCommandHandler = new CommandHandler(unknown, [
    toggleBuilder,
    roomEditor,
    look,
    alias("l", look.name),
    go,
    alias("n", go.name, "north"),
    alias("north", go.name, "north"),
    alias("e", go.name, "east"),
    alias("east", go.name, "east"),
    alias("s", go.name, "south"),
    alias("south", go.name, "south"),
    alias("w", go.name, "west"),
    alias("west", go.name, "west")
  ]);

  // src/lib/UI.ts
  var UI = class _UI {
    constructor(display, input) {
      this.display = display;
      this.input = input;
      __publicField(this, "inputListeners");
      this.inputListeners = /* @__PURE__ */ new Set();
      this.input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.onInputLine();
      });
    }
    static find() {
      const display = document.getElementById("display");
      if (!display) throw new Error("Missing #display");
      const input = document.getElementById("input");
      if (!input) throw new Error("Missing #input");
      if (input.tagName !== "INPUT") throw new Error("#input is not an input");
      return new _UI(display, input);
    }
    text(s) {
      const div = document.createElement("div");
      div.innerText = s;
      this.display.appendChild(div);
      setTimeout(() => {
        this.display.scrollTop = this.display.scrollHeight;
      }, 0);
    }
    onInputLine() {
      const value = this.input.value;
      this.input.value = "";
      this.text("> " + value + "\n");
      for (const listener of this.inputListeners) listener(value);
    }
    addInputListener(listener) {
      this.inputListeners.add(listener);
    }
    removeInputListener(listener) {
      return this.inputListeners.delete(listener);
    }
  };

  // src/main.ts
  function main() {
    const ui = UI.find();
    window.ui = ui;
    const pcTemplate = {
      id: 1,
      name: "player",
      short: "a player",
      slots: /* @__PURE__ */ new Set()
    };
    const voidRoom = {
      id: 1,
      name: "The Void",
      description: "All around you is a shapeless void.",
      exits: /* @__PURE__ */ new Map(),
      items: /* @__PURE__ */ new Set(),
      mobs: /* @__PURE__ */ new Set()
    };
    const world = {
      itemTemplates: /* @__PURE__ */ new Map(),
      items: /* @__PURE__ */ new Map(),
      mobTemplates: /* @__PURE__ */ new Map([[pcTemplate.id, pcTemplate]]),
      mobs: /* @__PURE__ */ new Map(),
      rooms: /* @__PURE__ */ new Map([[voidRoom.id, voidRoom]])
    };
    const g = new SUDEngine(world, ui, pcTemplate.id, voidRoom.id);
    window.g = g;
  }
  window.addEventListener("load", main);
})();

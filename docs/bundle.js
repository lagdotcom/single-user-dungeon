"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/lib/serialization.ts
  var WorldKey = "sud-world";
  var getSaveKey = (name) => `sud-save-${name}`;
  function isSerializedSet(obj) {
    return !!obj && typeof obj === "object" && "__" in obj && obj.__ === "set";
  }
  function isSerializedMap(obj) {
    return !!obj && typeof obj === "object" && "__" in obj && obj.__ === "map";
  }
  function serialize(obj) {
    if (typeof obj === "function") throw new Error("cannot serialize Function");
    if (typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(serialize);
    if (obj instanceof Set)
      return { __: "set", values: Array.from(obj, serialize) };
    if (obj instanceof Map)
      return { __: "map", values: Array.from(obj, serialize) };
    return Object.fromEntries(Object.entries(obj).map(serialize));
  }
  function deserialize(ser) {
    if (typeof ser !== "object") return ser;
    if (Array.isArray(ser)) return ser.map(deserialize);
    if (isSerializedSet(ser)) return new Set(ser.values.map(deserialize));
    if (isSerializedMap(ser)) return new Map(ser.values.map(deserialize));
    return Object.fromEntries(Object.entries(ser).map(deserialize));
  }
  function deserializeFromStorage(key) {
    const item = localStorage.getItem(key);
    if (item !== null) return deserialize(JSON.parse(item));
  }
  function serializeToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(serialize(value)));
  }

  // src/lib/alias.ts
  function alias(name, ...rewrite) {
    return {
      name,
      execute(g, ...args) {
        g.interpret(...rewrite, ...args);
      }
    };
  }

  // src/lib/colours.ts
  var cSystem = "system";
  var cEditor = "olc";
  var cError = "error";
  var cAction = "action";
  var cRoomName = "room-name";
  var cRoomDescription = "room-description";
  var cRoomMobs = "room-mobs";

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
          if (cmd) return this.runCommand(g, cmd, value, rest);
        }
        return this.runCommand(g, this.unhandled, value, parts);
      });
      this.commands = new Map(commands.map((c) => [c.name, c]));
    }
    runCommand(g, cmd, value, parts) {
      if (cmd.doNotParse) {
        const line = cmd.name ? value.slice(cmd.name.length + 1) : value;
        return cmd.execute(g, line);
      } else return cmd.execute(g, ...parts);
    }
  };

  // src/lib/exploration.ts
  var unknown = {
    name: "",
    execute(g, command) {
      if (!command) return;
      g.ui.line(`Unknown command: ${command}`, cError);
    }
  };
  var look = {
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
    }
  };
  var go = {
    name: "go",
    execute(g, dir) {
      var _a;
      if (!g.player.room) return g.ui.line("You are not anywhere.", cError);
      const room = g.room(g.player.room);
      const exit = room.exits.get(dir.toLocaleLowerCase());
      if (!exit) return g.ui.line(`There's no "${dir}" exit.`, cError);
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
    }
  };
  var save = {
    name: "save",
    execute(g) {
      g.savePlayer();
      g.ui.line("OK.", cSystem);
    }
  };

  // src/lib/olc/common.ts
  var toggleBuilder = {
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
    }
  };

  // src/lib/numberedList.ts
  function numberedList(items) {
    const nl = Math.floor(Math.log10(items.length)) + 1;
    let value = "";
    let index = 0;
    for (const item of items) {
      index++;
      let is = index.toString();
      while (is.length < nl) is = " " + is;
      value += `${is}. ${item}
`;
    }
    return value;
  }

  // src/lib/EditorContext.ts
  var EDITOR_HELP = `Editor Mode:
    .h    show help
    .s    display text so far
    .c    clear text
    .d #  delete line #
    .q    quit

Any other text adds to the current text.`;
  var EditorContext = class {
    constructor(g, value, onFinish) {
      this.onFinish = onFinish;
      __publicField(this, "lines");
      g.pushInputHandler(
        new CommandHandler(this.line, [
          this.help,
          this.show,
          this.clear,
          this.delete,
          this.quit
        ]).handleInput
      );
      g.ui.line('Entering editor mode. ".h" for help', cEditor);
      this.lines = value ? value.split("\n") : [];
    }
    get line() {
      return {
        name: "",
        doNotParse: true,
        execute: (g, line) => {
          this.lines.push(line);
          g.ui.line("Added line to text.", cEditor);
        }
      };
    }
    get help() {
      return {
        name: ".h",
        execute: (g) => {
          g.ui.line(EDITOR_HELP);
        }
      };
    }
    get show() {
      return {
        name: ".s",
        execute: (g) => {
          if (this.lines.length) g.ui.text(numberedList(this.lines));
          else g.ui.line("(text is currently empty)", cEditor);
        }
      };
    }
    get clear() {
      return {
        name: ".c",
        execute: (g) => {
          this.lines = [];
          g.ui.line("OK.", cEditor);
        }
      };
    }
    get delete() {
      return {
        name: ".d",
        execute: (g, arg) => {
          const line = parseInt(arg != null ? arg : "@");
          if (isNaN(line) || line < 1 || line > this.lines.length)
            return g.ui.line("Invalid line number.", cError);
          this.lines = this.lines.filter((v, i) => i !== line - 1);
          g.ui.line("OK.", cEditor);
        }
      };
    }
    get quit() {
      return {
        name: ".q",
        execute: (g) => {
          g.popInputHandler();
          this.onFinish(this.lines.join("\n"));
        }
      };
    }
  };

  // src/lib/olc/utils.ts
  function makeRoom(g, roomID) {
    const existing = g.world.rooms.get(roomID);
    if (existing) {
      g.ui.line("Room ID already exists.", cError);
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
      g.ui.line("Exiting editing mode.", cEditor);
      g.popInputHandler();
    }
  };

  // src/lib/olc/room.ts
  var makeRoomExit = {
    name: "rexit",
    execute(g, dir, type, newID) {
      if (!dir)
        return g.ui.line(
          "Syntax: <dir> dig|link|room <id>\n        <dir> delete",
          cSystem
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
          room.exits.set(dir, { room: newID, tags: /* @__PURE__ */ new Set() });
          g.saveWorld();
          g.ui.line("OK.", cEditor);
          return g.moveMob(g.player.id, newID);
        }
        default:
          return g.ui.line(`Invalid rexit verb: ${type}`, cError);
      }
    }
  };
  var nameRoom = {
    name: "name",
    doNotParse: true,
    execute(g, ...args) {
      const name = args.join(" ").trim();
      if (!name) return g.ui.line("Syntax: name <new room name>", cError);
      if (!g.player.room) return g.ui.line("You are not anywhere.", cError);
      const room = g.room(g.player.room);
      room.name = name;
      g.saveWorld();
      return look.execute(g);
    }
  };
  var describeRoom = {
    name: "describe",
    execute(g) {
      var _a;
      if (!g.player.room) return g.ui.line("You are not anywhere.", cError);
      const room = g.room(g.player.room);
      new EditorContext(g, (_a = room.description) != null ? _a : "", (value) => {
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
    }
  };
  var create = {
    name: "create",
    execute(g, id) {
      if (!id) return g.ui.line("Invalid room ID.", cError);
      if (!makeRoom(g, id)) return;
      g.ui.line("OK.", cEditor);
      return g.moveMob(g.player.id, id);
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
    alias("west", makeRoomExit.name, "west"),
    nameRoom,
    describeRoom
  ]);
  var roomEditor = {
    name: "redit",
    execute(g, arg, id) {
      if (!g.player.tags.has("builder"))
        return g.ui.line("You are not a builder.", cError);
      let roomID;
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
    }
  };

  // src/lib/SUDEngine.ts
  var MOTDBanner = `---------------
Welcome to SUD!
---------------

Type your name:`;
  var SUDEngine = class {
    constructor(world, ui, playerTemplateID, startingRoomID) {
      this.world = world;
      this.ui = ui;
      this.playerTemplateID = playerTemplateID;
      this.startingRoomID = startingRoomID;
      __publicField(this, "player");
      __publicField(this, "inputStack");
      ui.addInputListener((input) => {
        this.ui.beginOutput();
        this.inputHandler(input, this);
        this.ui.endOutput();
      });
      this.player = {
        id: "player",
        template: playerTemplateID,
        equipment: /* @__PURE__ */ new Map(),
        inventory: /* @__PURE__ */ new Set(),
        tags: /* @__PURE__ */ new Set(["player"])
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
      const oldRoom = mob.room && this.world.rooms.get(mob.room);
      if (oldRoom) {
        delete mob.room;
        oldRoom.mobs.delete(mobID);
        if (leaveMessage) this.act(mobID, leaveMessage);
      }
      if (arriveMessage) this.act(mobID, arriveMessage, roomID);
      const newRoom = this.room(roomID);
      newRoom.mobs.add(mobID);
      mob.room = roomID;
      look.execute(this);
    }
    act(selfID, message, overrideRoomID, colour = cAction) {
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
        if (mob.tags.has("player")) this.ui.line(formatted, colour);
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
      this.ui.line(MOTDBanner, cSystem);
      return (value) => {
        const { player, ui } = this;
        player.name = value.trim();
        if (player.name.length < 2) {
          ui.line("Try something longer.", cError);
          return;
        }
        this.popInputHandler();
        this.pushInputHandler(mainCommandHandler.handleInput);
        this.loadPlayer(player.name);
      };
    }
    loadPlayer(name) {
      var _a;
      const key = getSaveKey(name);
      const save2 = deserializeFromStorage(key);
      const roomID = (_a = save2 == null ? void 0 : save2.room) != null ? _a : this.startingRoomID;
      const greeting = save2 ? "Welcome back" : "Good to meet you";
      this.player.id = `player-${name}`;
      this.player.room = roomID;
      if (save2) this.player.tags = save2.tags;
      this.ui.line(
        `${greeting}, ${name}. You are now entering SUD... enjoy your stay!
`
      );
      this.world.mobs.set(this.player.id, this.player);
      if (roomID) this.moveMob(this.player.id, roomID, `$n log$s in`);
    }
    interpret(...args) {
      this.inputHandler(args.join(" "), this);
    }
    savePlayer() {
      var _a;
      const key = getSaveKey((_a = this.player.name) != null ? _a : "@");
      serializeToStorage(key, {
        room: this.player.room,
        tags: this.player.tags
      });
    }
    saveWorld() {
      const roomID = this.player.room;
      if (roomID) this.room(roomID).mobs.delete(this.player.id);
      serializeToStorage(WorldKey, {
        world: this.world,
        pcTemplateID: this.playerTemplateID,
        startingRoomID: this.startingRoomID
      });
      if (roomID) this.room(roomID).mobs.add(this.player.id);
    }
  };
  var mainCommandHandler = new CommandHandler(unknown, [
    toggleBuilder,
    roomEditor,
    save,
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
      __publicField(this, "element");
      __publicField(this, "inputListeners");
      __publicField(this, "scrolling");
      this.inputListeners = /* @__PURE__ */ new Set();
      this.element = display;
      this.scrolling = 0;
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
    text(s, colour) {
      const span = document.createElement("span");
      span.innerText = s;
      if (colour) span.style.color = `var(--${colour})`;
      this.element.appendChild(span);
    }
    line(s, colour) {
      return this.text(s + "\n", colour);
    }
    textBlock(s, colour) {
      this.beginOutput();
      this.line(s, colour);
      this.endOutput();
    }
    onInputLine() {
      const value = this.input.value;
      this.input.value = "";
      this.textBlock("> " + value);
      for (const listener of this.inputListeners) listener(value);
    }
    addInputListener(listener) {
      this.inputListeners.add(listener);
    }
    removeInputListener(listener) {
      return this.inputListeners.delete(listener);
    }
    beginOutput() {
      this.element = document.createElement("div");
      this.display.appendChild(this.element);
    }
    endOutput() {
      if (!this.element.children.length) {
        this.display.removeChild(this.element);
        return;
      }
      if (!this.scrolling)
        this.scrolling = setTimeout(() => {
          this.display.scrollTop = this.display.scrollHeight;
          this.scrolling = 0;
        }, 0);
    }
  };

  // src/main.ts
  function getDefaultWorld() {
    const pcTemplate = {
      id: ":player",
      name: "player",
      short: "a player",
      slots: /* @__PURE__ */ new Set()
    };
    const voidRoom = {
      id: "void:room",
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
    return { world, pcTemplateID: pcTemplate.id, startingRoomID: voidRoom.id };
  }
  function main() {
    var _a;
    const ui = UI.find();
    window.ui = ui;
    const { world, pcTemplateID, startingRoomID } = (_a = deserializeFromStorage(WorldKey)) != null ? _a : getDefaultWorld();
    const g = new SUDEngine(world, ui, pcTemplateID, startingRoomID);
    window.g = g;
  }
  window.addEventListener("load", main);
})();

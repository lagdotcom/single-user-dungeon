"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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
  function unknownCommand(g, command) {
    if (!command) return;
    g.ui.text(`Unknown command: ${command}`);
  }
  function look(g) {
    const room = g.room(g.player.room);
    g.ui.text(room.name);
    if (room.description) g.ui.text(room.description);
  }

  // src/lib/olc.ts
  function toggleBuilder(g) {
    const player = g.player;
    if (player.tags.has("builder")) {
      player.tags.delete("builder");
      g.ui.text("You are no longer a builder.");
    } else {
      player.tags.add("builder");
      g.ui.text("You are now a builder.");
    }
  }

  // src/lib/SUDEngine.ts
  var SUDEngine = class {
    constructor(world, ui, playerTemplateID, startingRoomID) {
      this.world = world;
      this.ui = ui;
      this.playerTemplateID = playerTemplateID;
      this.startingRoomID = startingRoomID;
      __publicField(this, "player");
      __publicField(this, "inputHandler");
      ui.addInputListener((input) => this.inputHandler(input, this));
      this.player = {
        id: 1,
        template: playerTemplateID,
        equipment: /* @__PURE__ */ new Map(),
        inventory: /* @__PURE__ */ new Set(),
        tags: /* @__PURE__ */ new Set(["player"]),
        room: NaN
      };
      this.inputHandler = this.motd();
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
        const formatted = this.format(message, { n, s, t });
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
        this.moveMob(player.id, startingRoomID, "$n log$s in");
        this.inputHandler = mainCommandHandler.handleInput;
        look(this);
      };
    }
  };
  var mainCommandHandler = new CommandHandler(
    { name: "[unknown]", execute: unknownCommand },
    [
      { name: "look", execute: look },
      { name: "##builder", execute: toggleBuilder }
    ]
  );

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

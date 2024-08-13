import Engine from "../types/Engine";
import {
  ItemID,
  ItemTemplateID,
  MobID,
  MobTemplateID,
  RoomID,
} from "../types/flavours";
import Item from "../types/Item";
import ItemTemplate from "../types/ItemTemplate";
import Mob from "../types/Mob";
import MobTemplate from "../types/MobTemplate";
import World from "../types/World";
import alias from "./alias";
import CommandHandler from "./CommandHandler";
import { go, look, unknown } from "./exploration";
import { toggleBuilder } from "./old/common";
import { roomEditor } from "./old/room";
import UI from "./UI";

export type InputHandler = (input: string, e: Engine) => void;

export default class SUDEngine implements Engine {
  player: Mob;
  inputStack: InputHandler[];

  constructor(
    public world: World,
    public ui: UI,
    public playerTemplateID: MobTemplateID,
    public startingRoomID: RoomID,
  ) {
    ui.addInputListener((input) => this.inputHandler(input, this));

    this.player = {
      id: 1,
      template: playerTemplateID,
      equipment: new Map(),
      inventory: new Set(),
      tags: new Set(["player"]),
      room: NaN,
    };

    this.inputStack = [this.motd()];
  }

  get inputHandler() {
    return this.inputStack[this.inputStack.length - 1];
  }

  pushInputHandler(handler: InputHandler) {
    this.inputStack.push(handler);
  }

  popInputHandler() {
    return this.inputStack.pop();
  }

  mob(id: MobID) {
    const mob = this.world.mobs.get(id);
    if (!mob) throw new Error(`Invalid mob ID: ${id}`);

    return mob;
  }

  mobTemplate(id: MobTemplateID) {
    const mt = this.world.mobTemplates.get(id);
    if (!mt) throw new Error(`Invalid mob template ID: ${id}`);

    return mt;
  }

  mobAndTemplate(id: MobID): [Mob, MobTemplate] {
    const mob = this.mob(id);
    return [mob, this.mobTemplate(mob.template)];
  }

  item(id: ItemID): Item {
    const item = this.world.items.get(id);
    if (!item) throw new Error(`Invalid item ID: ${id}`);

    return item;
  }

  itemTemplate(id: ItemTemplateID) {
    const it = this.world.itemTemplates.get(id);
    if (!it) throw new Error(`Invalid item template ID: ${id}`);

    return it;
  }

  itemAndTemplate(id: ItemID): [Item, ItemTemplate] {
    const item = this.item(id);
    return [item, this.itemTemplate(item.template)];
  }

  room(id: RoomID) {
    const room = this.world.rooms.get(id);
    if (!room) throw new Error(`Invalid room ID: ${id}`);

    return room;
  }

  moveMob(
    mobID: MobID,
    roomID: RoomID,
    arriveMessage?: string,
    leaveMessage?: string,
  ) {
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

  act(selfID: MobID, message: string, overrideRoomID?: RoomID) {
    const [self, st] = this.mobAndTemplate(selfID);
    const roomID = overrideRoomID ?? self.room;
    if (!roomID) return;

    const room = this.room(roomID);
    for (const mobID of room.mobs) {
      const isSelf = mobID === selfID;
      const [mob, mt] = this.mobAndTemplate(mobID);

      const n = isSelf ? "you" : (self.name ?? st.short);
      const s = isSelf ? "" : "s";
      const t = mob.name ?? mt.short;
      const e = isSelf ? "" : "es";

      const formatted = this.format(message, { n, s, t, e });

      if (mob.tags.has("player")) this.ui.text(formatted);
      // TODO else allow scripts to react
    }
  }

  format(message: string, replacements: Record<string, string>) {
    for (const [v, r] of Object.entries(replacements)) {
      const p = new RegExp(`\\$${v}`, "g");
      message = message.replace(p, r);
    }

    message = message[0].toLocaleUpperCase() + message.slice(1);
    if (!"!.?".includes(message.at(-1) ?? "")) message += ".";

    return message;
  }

  motd(): InputHandler {
    this.ui.text(`---------------
      Welcome to SUD!
      ---------------

      Type your name:`);

    return (value: string) => {
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

  interpret(...args: string[]): void {
    this.inputHandler(args.join(" "), this);
  }
}

const mainCommandHandler = new CommandHandler(unknown, [
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
  alias("west", go.name, "west"),
]);

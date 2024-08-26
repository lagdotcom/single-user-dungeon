import { InputHandler } from "../lib/SUDEngine";
import UI from "../lib/UI";
import {
  ItemID,
  ItemTemplateID,
  MobID,
  MobTemplateID,
  RoomID,
} from "./flavours";
import Item from "./Item";
import ItemTemplate from "./ItemTemplate";
import Mob from "./Mob";
import MobTemplate from "./MobTemplate";
import Room from "./Room";
import World from "./World";

export default interface Engine {
  player: Mob;
  startingRoomID: RoomID;
  ui: UI;
  world: World;

  pushInputHandler(handler: InputHandler): void;
  popInputHandler(): void;
  interpret(...args: string[]): void;

  mob(id: MobID): Mob;
  mobTemplate(id: MobTemplateID): MobTemplate;
  mobAndTemplate(id: MobID): [Mob, MobTemplate];

  item(id: ItemID): Item;
  itemTemplate(id: ItemTemplateID): ItemTemplate;
  itemAndTemplate(id: ItemID): [Item, ItemTemplate];

  room(id: RoomID): Room;

  act(selfID: MobID, message: string, overrideRoomID?: RoomID): void;
  moveMob(
    mobID: MobID,
    roomID: RoomID,
    arriveMessage?: string,
    leaveMessage?: string,
  ): void;

  savePlayer(): void;
  saveWorld(): void;
}

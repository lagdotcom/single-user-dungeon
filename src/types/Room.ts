import { ItemID, MobID, RoomID } from "./flavours";

export default interface Room {
  id: RoomID;
  name: string;
  description?: string;
  exits: Map<string, RoomID>;
  mobs: Set<MobID>;
  items: Set<ItemID>;
}

import { ItemID, MobID, MobTemplateID, RoomID } from "./flavours";
import MobTag from "./MobTag";

export default interface Mob {
  id: MobID;
  room?: RoomID;
  template: MobTemplateID;
  equipment: Map<string, ItemID>;
  inventory: Set<ItemID>;
  tags: Set<MobTag>;
  name?: string;
}

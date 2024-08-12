import { ItemID, ItemTemplateID, RoomID } from "./flavours";

export default interface Item {
  id: ItemID;
  template: ItemTemplateID;
  room?: RoomID;
}

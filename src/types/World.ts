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

export default interface World {
  items: Map<ItemID, Item>;
  itemTemplates: Map<ItemTemplateID, ItemTemplate>;
  mobs: Map<MobID, Mob>;
  mobTemplates: Map<MobTemplateID, MobTemplate>;
  rooms: Map<RoomID, Room>;
}

import { ItemID, MobID, RoomID } from "./flavours";

export const ExitTags = ["door", "closed", "locked"] as const;
export type ExitTag = (typeof ExitTags)[number];

export interface Exit {
  room: RoomID;
  name?: string;
  desc?: string;
  link?: string;
  key?: ItemID;
  tags: Set<ExitTag>;
}

export default interface Room {
  id: RoomID;
  name: string;
  description?: string;
  exits: Map<string, Exit>;
  mobs: Set<MobID>;
  items: Set<ItemID>;
}

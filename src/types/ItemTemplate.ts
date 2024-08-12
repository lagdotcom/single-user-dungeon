import { ItemTemplateID } from "./flavours";

export default interface ItemTemplate {
  id: ItemTemplateID;
  name: string;
  short: string;
  long?: string;
  slot?: string;
}

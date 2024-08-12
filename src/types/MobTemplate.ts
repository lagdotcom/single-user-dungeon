import { MobTemplateID } from "./flavours";

export default interface MobTemplate {
  id: MobTemplateID;
  name: string;
  short: string;
  long?: string;
  slots: Set<string>;
}

// https://spin.atomicobject.com/typescript-flexible-nominal-typing/
interface Flavouring<FlavourT> {
  _type?: FlavourT;
}
type Flavour<T, FlavourT> = T & Flavouring<FlavourT>;

export type ItemID = Flavour<number, "ItemID">;
export type ItemTemplateID = Flavour<number, "ItemTemplateID">;
export type MobID = Flavour<number, "MobID">;
export type MobTemplateID = Flavour<number, "MobTemplateID">;
export type RoomID = Flavour<number, "RoomID">;

export type Colour = Flavour<string, "Colour">;

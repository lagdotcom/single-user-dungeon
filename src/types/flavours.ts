// https://spin.atomicobject.com/typescript-flexible-nominal-typing/
interface Flavouring<FlavourT> {
  _type?: FlavourT;
}
type Flavour<T, FlavourT> = T & Flavouring<FlavourT>;

export type Colour = Flavour<string, "Colour">;
export type ItemID = Flavour<string, "ItemID">;
export type ItemTemplateID = Flavour<string, "ItemTemplateID">;
export type MobID = Flavour<string, "MobID">;
export type MobTemplateID = Flavour<string, "MobTemplateID">;
export type RoomID = Flavour<string, "RoomID">;
export type StorageKey = Flavour<string, "StorageKey">;

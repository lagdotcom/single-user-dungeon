import { StorageKey } from "../types/flavours";

export const WorldKey: StorageKey = "sud-world";

export const getSaveKey = (name: string): StorageKey => `sud-save-${name}`;

interface SerializedSet<T> {
  __: "set";
  values: Serialized<T>[];
}

function isSerializedSet<T = unknown>(obj: unknown): obj is SerializedSet<T> {
  return !!obj && typeof obj === "object" && "__" in obj && obj.__ === "set";
}

interface SerializedMap<K extends string | number | symbol, V> {
  __: "map";
  values: [K, Serialized<V>][];
}

function isSerializedMap<K extends string | number | symbol, V = unknown>(
  obj: unknown,
): obj is SerializedMap<K, V> {
  return !!obj && typeof obj === "object" && "__" in obj && obj.__ === "map";
}

type SerializedObject<T extends object> = { [K in keyof T]: Serialized<T[K]> };

export type Serialized<T> =
  T extends Set<infer V>
    ? SerializedSet<V>
    : T extends Map<infer K extends string | number | symbol, infer V>
      ? SerializedMap<K, V>
      : T extends (infer V)[]
        ? V[]
        : T extends object
          ? SerializedObject<T>
          : T;

export function serialize<T>(obj: T): Serialized<T> {
  if (typeof obj === "function") throw new Error("cannot serialize Function");
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) return obj.map(serialize);
  if (obj instanceof Set)
    return { __: "set", values: Array.from(obj, serialize) };
  if (obj instanceof Map)
    return { __: "map", values: Array.from(obj, serialize) };

  return Object.fromEntries(Object.entries(obj).map(serialize));
}

export function deserialize<T>(ser: Serialized<T>): T {
  if (typeof ser !== "object") return ser;

  if (Array.isArray(ser)) return ser.map(deserialize);

  if (isSerializedSet(ser)) return new Set(ser.values.map(deserialize));
  if (isSerializedMap(ser)) return new Map(ser.values.map(deserialize));

  return Object.fromEntries(Object.entries(ser).map(deserialize));
}

export function deserializeFromStorage<T>(key: StorageKey) {
  const item = localStorage.getItem(key);
  if (item !== null) return deserialize<T>(JSON.parse(item));
}

export function serializeToStorage<T>(key: StorageKey, value: T) {
  localStorage.setItem(key, JSON.stringify(serialize(value)));
}

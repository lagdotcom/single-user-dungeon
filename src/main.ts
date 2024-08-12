import SUDEngine from "./lib/SUDEngine";
import UI from "./lib/UI";
import MobTemplate from "./types/MobTemplate";
import Room from "./types/Room";
import World from "./types/World";

function main() {
  const ui = UI.find();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ui = ui;

  const pcTemplate: MobTemplate = {
    id: 1,
    name: "player",
    short: "a player",
    slots: new Set(),
  };

  const voidRoom: Room = {
    id: 1,
    name: "The Void",
    description: "All around you is a shapeless void.",
    exits: new Map(),
    items: new Set(),
    mobs: new Set(),
  };

  const world: World = {
    itemTemplates: new Map(),
    items: new Map(),
    mobTemplates: new Map([[pcTemplate.id, pcTemplate]]),
    mobs: new Map(),
    rooms: new Map([[voidRoom.id, voidRoom]]),
  };

  const g = new SUDEngine(world, ui, pcTemplate.id, voidRoom.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).g = g;
}

window.addEventListener("load", main);

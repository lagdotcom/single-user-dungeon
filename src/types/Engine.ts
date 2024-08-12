import UI from "../lib/UI";
import { MobID, RoomID } from "./flavours";
import Mob from "./Mob";
import Room from "./Room";
import World from "./World";

export default interface Engine {
  player: Mob;
  startingRoomID: RoomID;
  ui: UI;
  world: World;

  mob(id: MobID): Mob;
  room(id: RoomID): Room;
}

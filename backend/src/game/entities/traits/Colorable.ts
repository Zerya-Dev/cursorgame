import { COLOR_STATIONS, circleOverlapsRect } from "@shared";
import type { ServerEntity, Trait } from "../Entity.js";

export class Colorable implements Trait {
  finish(entity: ServerEntity) {
    const schema = entity.schema;
    for (const station of COLOR_STATIONS) {
      if (circleOverlapsRect(schema.x, schema.y, schema.radius, station)) {
        schema.color = station.color;
        return;
      }
    }
  }
}

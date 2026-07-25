import type { Entity } from "../../rooms/schema/MainRoomState.js";
import type { World } from "../World.js";

export type TraitPhase = "begin" | "interact" | "move" | "finish";

export interface Trait {
  begin?(entity: ServerEntity, world: World, dt: number): void;
  interact?(entity: ServerEntity, world: World, dt: number): void;
  move?(entity: ServerEntity, world: World, dt: number): void;
  finish?(entity: ServerEntity, world: World, dt: number): void;
}

type TraitClass<T extends Trait> = new (...args: never[]) => T;

export class ServerEntity {
  private traits = new Map<Function, Trait>();

  constructor(readonly schema: Entity) {}

  add(trait: Trait): this {
    this.traits.set(trait.constructor, trait);
    return this;
  }

  get<T extends Trait>(cls: TraitClass<T>): T | undefined {
    return this.traits.get(cls) as T | undefined;
  }

  has<T extends Trait>(cls: TraitClass<T>): boolean {
    return this.traits.has(cls);
  }

  run(phase: TraitPhase, world: World, dt: number) {
    for (const trait of this.traits.values()) {
      trait[phase]?.(this, world, dt);
    }
  }
}

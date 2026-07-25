import type { PlateCountRule, PlateFilter, PressurePlate } from "./level.js";

export interface PlateOccupant {
  /** "player" or an ENTITY_KINDS key */
  entityKind: string;
  color: string;
}

export function occupantMatchesFilter(occupant: PlateOccupant, filter?: PlateFilter): boolean {
  if (!filter) return true;
  if (filter.entityKind && occupant.entityKind !== filter.entityKind) return false;
  if (filter.color && occupant.color.toLowerCase() !== filter.color.toLowerCase()) return false;
  return true;
}

// Looks up how many matching occupants sit on another plate, by id.
// needed for the 50/50 split
export type OtherPlateCount = (plateId: string) => number;

const noOtherPlates: OtherPlateCount = () => 0;

export function countSatisfiesRule(
  count: number,
  rule: PlateCountRule | undefined,
  totalPlayers: number,
  otherCount: OtherPlateCount = noOtherPlates,
): boolean {
  if (!rule) return count >= 1;
  switch (rule.mode) {
    case "atLeast":
      return count >= rule.value;
    case "exact":
      return count === rule.value;
    case "even":
      return count > 0 && count % 2 === 0;
    case "allPlayers":
      return totalPlayers > 0 && count === totalPlayers;
    case "balance": {
      const other = otherCount(rule.withPlateId);
      const combined = count + other;
      const diff = Math.abs(count - other);
      return totalPlayers > 0 && combined === totalPlayers && diff <= (rule.maxDifference ?? 1);
    }
  }
}

export function evaluatePlate(
  occupants: PlateOccupant[],
  plate: PressurePlate,
  totalPlayers = 0,
  otherCount: OtherPlateCount = noOtherPlates,
): boolean {
  const matching = occupants.filter((occupant) => occupantMatchesFilter(occupant, plate.filter));
  return countSatisfiesRule(matching.length, plate.count, totalPlayers, otherCount);
}

export function plateCountLabel(rule?: PlateCountRule): string {
  if (!rule) return "1+";
  switch (rule.mode) {
    case "atLeast":
      return `${rule.value}+`;
    case "exact":
      return `x${rule.value}`;
    case "even":
      return "even";
    case "allPlayers":
      return "all";
    case "balance":
      return "50/50";
  }
}

export interface PlateRequirementLabel {
  text: string;
  swatch?: string;
}

export function describePlateRequirement(plate: PressurePlate): PlateRequirementLabel {
  const noun = plate.filter?.entityKind ?? "any";
  return { text: `${plateCountLabel(plate.count)} x ${noun}`, swatch: plate.filter?.color };
}

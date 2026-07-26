/**
 * Ink-on-paper palette for the Kenney Scribble Dungeons look.
 *
 * The pack is black linework on transparency, drawn for a light background, so
 * everything here assumes paper underneath. Note that Phaser's setTint
 * multiplies: tinting a pack sprite does nothing (black x colour = black).
 * Colour is expressed with shapes drawn *under* the ink instead.
 */

/** page colour — everything sits on this */
export const PAPER = 0xf4efe3;
export const PAPER_CSS = "#f4efe3";

/** the pen */
export const INK = 0x1a1a1a;
export const INK_CSS = "#1a1a1a";

export const INK_SOFT = 0x6b6459;
export const INK_SOFT_CSS = "#6b6459";

export const ACCENT_ACTIVE = 0x5bbf6a;
export const ACCENT_ACTIVE_CSS = "#5bbf6a";

export const ACCENT_IDLE = 0xd9a441;
export const ACCENT_IDLE_CSS = "#d9a441";

export const ACCENT_GOAL = 0xf2c14e;
export const ACCENT_GOAL_CSS = "#f2c14e";

export const ACCENT_DANGER = 0xc4553f;
export const ACCENT_DANGER_CSS = "#c4553f";

export const ACCENT_SPARK = 0x4fc3f7;
export const ACCENT_SPARK_CSS = "#4fc3f7";

export const FONT_HAND = '"Patrick Hand", "Comic Sans MS", cursive';

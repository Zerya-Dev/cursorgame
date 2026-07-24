import Phaser from "phaser";

/**
 * Standalone scene: you control an in-game cursor with your mouse. The cursor
 * eases toward the pointer each frame (so movement feels weighty) and leaves a
 * short fading trail behind it. No network / server involved.
 */
export class GameScene extends Phaser.Scene {
  private cursor!: Phaser.GameObjects.Arc;
  private target = new Phaser.Math.Vector2();
  private trail: Phaser.GameObjects.Arc[] = [];

  // How quickly the cursor catches up to the pointer (0 = never, 1 = instant).
  private readonly followSpeed = 0.18;

  constructor() {
    super("GameScene");
  }

  create() {
    const { width, height } = this.scale;

    // Hide the OS cursor so only the in-game one is visible.
    this.input.setDefaultCursor("none");

    // Start centered.
    this.target.set(width / 2, height / 2);
    this.cursor = this.add.circle(width / 2, height / 2, 12, 0x4ade80);
    this.cursor.setStrokeStyle(3, 0xffffff);
    this.cursor.setDepth(10);

    this.add
      .text(12, 12, "Move your mouse — you control the cursor", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#8888aa",
      })
      .setDepth(1000);

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.target.set(pointer.x, pointer.y);
    });
  }

  update() {
    // Ease the cursor toward the pointer target.
    this.cursor.x += (this.target.x - this.cursor.x) * this.followSpeed;
    this.cursor.y += (this.target.y - this.cursor.y) * this.followSpeed;

    this.spawnTrailDot(this.cursor.x, this.cursor.y);
    this.fadeTrail();
  }

  private spawnTrailDot(x: number, y: number) {
    const dot = this.add.circle(x, y, 8, 0x4ade80, 0.5);
    dot.setDepth(5);
    this.trail.push(dot);
  }

  private fadeTrail() {
    for (const dot of this.trail) {
      dot.setScale(dot.scale * 0.88);
      dot.setAlpha(dot.alpha * 0.85);
    }
    // Retire fully-faded dots.
    this.trail = this.trail.filter((dot) => {
      if (dot.alpha < 0.02) {
        dot.destroy();
        return false;
      }
      return true;
    });
  }
}

// --------- PRE-RENDER ARROW IMAGE (runs once) ----------
function createArrowImage() {
    const off = document.createElement("canvas");
    off.width = 40;
    off.height = 20;
    const ctx = off.getContext("2d");

    ctx.save();
    ctx.translate(20, 10);

    // ----- SHAFT -----
    ctx.fillStyle = "#8B4513"; // brown
    ctx.beginPath();
    ctx.moveTo(-5, -1.75);
    ctx.lineTo(8, -1.75);
    ctx.lineTo(8, 1.75);
    ctx.lineTo(-5, 1.75);
    ctx.closePath();
    ctx.fill();

    // ----- TIP -----
    ctx.fillStyle = "#CCCCCC"; // steel
    ctx.beginPath();
    ctx.moveTo(8, -3);
    ctx.lineTo(14, 0);
    ctx.lineTo(8, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    return off;
}

const ARROW_IMAGE = createArrowImage();
// ------------------------------------------------------


export default class Bullet {

    constructor(x, y, target, speed = 3) {
        this.init(x, y, target, speed);
    }

    // --------- SUPPORTS BULLET POOL ----------
    init(x, y, target, speed = 3) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.speed = speed;
        this.damage = 1;
        this.active = true;

        this.maxLifetime = 2500; // 2.5s
        this.lived = 0;

        this.angle = 0;
    }

    update(deltaTime) {
        if (!this.active) return;

        this.lived += deltaTime;
        if (this.lived >= this.maxLifetime) {
            this.active = false;
            return;
        }

        if (!this.target || this.target.health <= 0) {
            this.active = false;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        this.angle = Math.atan2(dy, dx);

        if (dist < this.speed) {
            this.target.health -= this.damage;
            this.active = false;
            return;
        }

        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Pre-rendered arrow: insane performance boost
        ctx.drawImage(ARROW_IMAGE, -20, -10);

        ctx.restore();
    }
}

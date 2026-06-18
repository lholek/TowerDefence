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

export default class Bullet {

    constructor(x, y, target, speed = 3) {
        this.init(x, y, target, speed);
    }

    // --------- SUPPORTS BULLET POOL ----------
    init(x, y, target, speed = 3, game) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.speed = speed;
        this.game = game;
        this.damage = 1;
        this.active = true;

        this.maxLifetime = 4000; // 4s
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

        // 1. Get current tile coordinates of the bullet
        const tilePos = this.game.map.getTileFromCoords(this.x, this.y);
        
        // 2. Check if that tile is a Mountain 'M'
        const tileType = this.game.map.getTileStatus(tilePos.col, tilePos.row);
        if (tileType === 'M') {
            this.active = false;
            return;
        }
        if (tileType === 'SND[CACTUS-1]' || tileType === 'SND[CACTUS-2]' || tileType === 'SND[CACTUS-3]' || tileType === 'SND[CACTUS-4]') {
            this.active = false;
            return;
        }
        if (tileType === 'SND[PALM-1]' || tileType === 'SND[PALM-2]' || tileType === 'SND[PALM-3]' || tileType === 'SND[PALM-4]') {
            this.active = false;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        this.angle = Math.atan2(dy, dx);

        let realSpeed = this.speed * (deltaTime / (1000/144))
        if (dist < realSpeed) {
            if (this.game && this.game.stats) {
                if (this.target.health < this.damage){
                    this.game.stats.damageDealt += this.target.health;
                } else {
                    this.game.stats.damageDealt += this.damage;
                }
            }
            this.target.health -= this.damage;
            this.active = false;
            return;
        }

        this.x += (dx / dist) * realSpeed;
        this.y += (dy / dist) * realSpeed;
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

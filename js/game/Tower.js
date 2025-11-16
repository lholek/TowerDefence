import Bullet from './Bullet.js';

// Tower size multiplier - change this to make all towers bigger/smaller
const TOWER_SIZE = 0.5;

export default class Tower {
    constructor(game, map, col, row, type = {}) {
        this.game = game; // <-- ADD THIS
        this.map = map;
        this.col = col;
        this.row = row;

        // Store tile position for reference
        const pos = this.map.tileToWorld(col, row);
        this.x = pos.x;
        this.y = pos.y;

        // Properties
        this.range = type.range || 150;
        this.fireRate = type.fireRate || 1200;
        this.damage = type.damage || 1;
        this.color = type.color || 'blue';
        this.bulletSpeed = type.speed || 3;
        this.sellPrice = type.sellPrice || 1;
        

        this.lastShot = 0;
        this.bullets = [];

        this.preRenderedImage = this._preRenderTower(this.map.tileSize);
    }

    // --- NEW: clone method ---
    clone(col, row) {
        return new Tower(this.game, this.map, col, row, {
            range: this.range,
            fireRate: this.fireRate,
            damage: this.damage,
            color: this.color,
            speed: this.bulletSpeed,
            sellPrice: this.sellPrice
        });
    }

    // NEW METHOD
    _preRenderTower(tileSize) {
        const size = Math.round(tileSize * TOWER_SIZE);
        const half = size / 2;

        // Create an off-screen canvas
        const offCanvas = document.createElement("canvas");
        // Make canvas larger to avoid clipping shadows or flags
        const canvasSize = tileSize * 2;
        offCanvas.width = canvasSize;
        offCanvas.height = canvasSize;
        const ctx = offCanvas.getContext("2d");

        // Center the drawing in the off-screen canvas
        // We use the same 'cy' offset as your original render
        const cx = canvasSize / 2;
        const cy = canvasSize / 2 + 14;

        // --- PASTE ALL YOUR STATIC DRAWING CODE FROM render() HERE ---
        // (Ensure 'roundRect' is now a global helper)

        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(cx + 4, cy + half * 0.6, half * 0.95, half * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();

        // base
        const baseW = size * 1.08;
        const baseH = size * 0.32;
        const baseX = cx - baseW / 2;
        const baseY = cy - baseH * 0.3;
        const baseGrad = ctx.createLinearGradient(baseX, baseY, baseX, baseY + baseH);
        baseGrad.addColorStop(0, '#7a7a7a');
        baseGrad.addColorStop(1, '#525252');
        ctx.fillStyle = baseGrad;
        roundRect(ctx, baseX, baseY, baseW, baseH, 6, true, true);

        // main body
        const bodyW = size * 0.9;
        const bodyH = size * 1.18;
        const bodyX = cx - bodyW / 2;
        const bodyY = baseY - bodyH + 8;
        const bodyGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
        bodyGrad.addColorStop(0, '#60666e');
        bodyGrad.addColorStop(1, '#4f5459');
        ctx.fillStyle = bodyGrad;
        roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 5, true, true);

        // brick pattern
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        const rowH = Math.max(6, Math.round(bodyH / 7));
        for (let r = 0; r < Math.floor(bodyH / rowH); r++) {
            const y = bodyY + r * rowH;
            const offset = (r % 2) ? rowH * 0.5 : 0;
            for (let x = bodyX - offset; x < bodyX + bodyW; x += rowH * 1.4) {
                ctx.fillRect(x + 2, y + 2, rowH * 1.2, rowH - 4);
            }
        }

        // door
        const doorW = size * 0.24;
        const doorH = size * 0.42;
        const doorX = cx - doorW / 2;
        const doorY = bodyY + bodyH * 0.45;
        ctx.fillStyle = '#6b4423';
        roundRect(ctx, doorX, doorY, doorW, doorH, 3, true, true);
        ctx.strokeStyle = '#3d2817';
        ctx.lineWidth = 1;
        ctx.stroke();

        // battlements
        const battW = bodyW + 10;
        const battH = size * 0.14;
        const battX = cx - battW / 2;
        const battY = bodyY - battH + 2;
        ctx.fillStyle = '#5a5a5a';
        for (let i = 0; i < 5; i++) {
            const bw = battW / 5;
            const x = battX + i * bw;
            roundRect(ctx, x + 2, battY, bw - 4, battH, 2, true, true);
        }

        // flag pole
        const poleX = cx + battW * 0.3;
        const poleTopY = battY - battH * 2.2;
        ctx.strokeStyle = '#222';
        ctx.lineWidth = Math.max(1, Math.round(size * 0.03));
        ctx.beginPath();
        ctx.moveTo(poleX, battY);
        ctx.lineTo(poleX, poleTopY);
        ctx.stroke();

        // flag
        const flagW = battW * 0.72;
        const flagH = battH * 6.0;
        const fx = poleX + 2;
        const fy = poleTopY + 4;
        ctx.fillStyle = this.color || '#b22222';
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + flagW * 0.85, fy + flagH * 0.35);
        ctx.lineTo(fx + flagW * 0.45, fy + flagH * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        return offCanvas;
    }

    update(deltaTime, enemies) {

        // --- 1) DO NOT recompute world pos every frame ---
        // Towers are static. Compute once in constructor.
        // (Remove your existing tileToWorld call here completely)

        this.lastShot += deltaTime;

        // --- 2) Only check targets when tower CAN shoot ---
        if (this.lastShot < this.fireRate) {
            // Still update bullets
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const b = this.bullets[i];
                b.update(deltaTime);
                if (!b.active) {
                    this.game.returnBullet(b); // Return to pool
                    this.bullets.splice(i, 1);
                }
            }
            return;
        }

        // --- 3) SHOOTING: pick closest enemy using squared distance ---
        let best = null;
        let bestDistSq = this.range * this.range;

        // Fast loop, NO sqrt.
        const tx = this.x;
        const ty = this.y;

        for (const enemy of enemies) {
            // Skip dead enemies fast
            if (enemy.health <= 0) continue;

            const dx = enemy.x - tx;
            const dy = enemy.y - ty;
            const d2 = dx * dx + dy * dy;

            if (d2 < bestDistSq) {
                bestDistSq = d2;
                best = enemy;
            }
        }

        // --- 4) Shoot ---
        if (best) {
            const bullet = this.game.getBullet(); // Get from pool
            bullet.init(tx, ty, best, this.bulletSpeed); // Re-initialize it
            bullet.damage = this.damage;
            this.bullets.push(bullet);

            this.lastShot = 0; // reset cooldown
        }

        // --- 5) Update bullets ---
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(deltaTime);

            if (!b.active) {
                this.bullets.splice(i, 1);
            }
        }
    }

    render(ctx, map) {
        const gameMap = map || this.map;
        if (!gameMap) return;

        // --- 1. Draw the pre-rendered tower image ---
        const drawSize = this.map.tileSize * 2; // Matches the off-canvas size
        const drawX = this.x - drawSize / 2;
        const drawY = this.y - drawSize / 2;

        ctx.drawImage(this.preRenderedImage, drawX, drawY);

        // --- 2. Draw DYNAMIC parts (selection range, health) ---
        // (We copy this from your old render method)
        const size = Math.round(gameMap.tileSize * TOWER_SIZE);
        const half = size / 2;
        const cx = this.x; // Use the tower's actual world position
        const cy = this.y + 14;

        // selection range
        if (this.isSelected) {
            ctx.globalAlpha = 0.14;
            ctx.fillStyle = '#ffd27a';
            ctx.beginPath();
            ctx.arc(cx, cy, this.range || Math.round(size * 1.2), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = 'rgba(255,200,120,0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, half + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // health bar
        if (this.health != null) {
            const bw = size * 1.0;
            const bh = 5;
            const bx = cx - bw / 2;
            const by = cy + half + 6;
            ctx.fillStyle = '#222';
            roundRect(ctx, bx, by, bw, bh, 2, true, false); // Uses global roundRect
            const pct = Math.max(0, Math.min(1, this.health / (this.maxHealth || 100)));
            ctx.fillStyle = `hsl(${pct * 120}, 70%, 45%)`;
            roundRect(ctx, bx + 1, by + 1, (bw - 2) * pct, bh - 2, 2, true, false); // Uses global roundRect
        }
    }
}

function roundRect(c, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    c.beginPath();
    c.moveTo(x + r.tl, y);
    c.lineTo(x + w - r.tr, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    c.lineTo(x + w, y + h - r.br);
    c.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    c.lineTo(x + r.bl, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    c.lineTo(x, y + r.tl);
    c.quadraticCurveTo(x, y, x + r.tl, y);
    c.closePath();
    if (fill) c.fill();
    if (stroke) c.stroke();
} 
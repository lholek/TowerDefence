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

        const offCanvas = document.createElement("canvas");
        const canvasSize = tileSize * 2.5; 
        offCanvas.width = canvasSize;
        offCanvas.height = canvasSize;
        const ctx = offCanvas.getContext("2d");

        const cx = canvasSize / 2.5;
        const cy = canvasSize / 2; 

        // 3. BASE POSITION 
        const baseW = size * 1.0;
        const baseH = size * 0.32;
        const baseX = cx - baseW / 2;
        const baseY = cy - baseH * 0.3;

        // --- DRAWING ---

        // Deep Ground Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, baseW * 0.5, baseH * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Base Gradient
        const baseGrad = ctx.createLinearGradient(baseX, baseY, baseX, baseY + baseH);
        baseGrad.addColorStop(0, '#7a7a7a');
        baseGrad.addColorStop(1, '#444');
        ctx.fillStyle = baseGrad;
        roundRect(ctx, baseX, baseY, baseW, baseH, 6, true, true);

        // 4. MAIN BODY
        const bodyW = size * 0.9;
        const bodyH = size * 1.4; 
        const bodyX = cx - bodyW / 2;
        const bodyY = baseY - bodyH + 8; 

        // 3D Cylinder Lighting
        const bodyGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX + bodyW, bodyY);
        bodyGrad.addColorStop(0, '#5a6069'); 
        bodyGrad.addColorStop(0.2, '#7a818a'); 
        bodyGrad.addColorStop(0.8, '#3d4145'); 
        bodyGrad.addColorStop(1, '#2a2d30'); 
        ctx.fillStyle = bodyGrad;
        roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 5, true, true);

        // 5. BRICK PATTERN
        ctx.save();
        roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 5, false, false);
        ctx.clip();
        const rowH = Math.max(6, Math.round(bodyH / 8));
        for (let r = 0; r < Math.floor(bodyH / rowH); r++) {
            const y = bodyY + r * rowH;
            const isOffset = (r % 2 === 0);
            const brickW = rowH * 1.5;
            for (let x = bodyX - (isOffset ? brickW/2 : 0); x < bodyX + bodyW; x += brickW) {
                ctx.fillStyle = `rgba(0,0,0,${0.12 + Math.random() * 0.08})`;
                ctx.fillRect(x + 1, y + 1, brickW - 2, rowH - 2);
                ctx.fillStyle = 'rgba(255,255,255,0.03)';
                ctx.fillRect(x + 1, y + 1, brickW - 2, 1);
            }
        }

        // --- NEW: VERTICAL "CARPET" BANNER ---
        // This hangs from the top and uses the tower's color
        const bannerW = bodyW * 0.25;
        const bannerH = bodyH * 0.45;
        const bannerX = bodyX + (bodyW * 0.08); // Left-ish side
        const bannerY = bodyY; 

        ctx.fillStyle = this.color || '#b22222';
        ctx.beginPath();
        ctx.moveTo(bannerX, bannerY);
        ctx.lineTo(bannerX + bannerW, bannerY);
        ctx.lineTo(bannerX + bannerW, bannerY + bannerH);
        ctx.lineTo(bannerX + bannerW / 2, bannerY + bannerH + 8); // V-shape bottom
        ctx.lineTo(bannerX, bannerY + bannerH);
        ctx.closePath();
        ctx.fill();
        // Shadow under banner to make it pop
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(bannerX, bannerY, 2, bannerH);

        ctx.restore();

        // 6. GLOWING WINDOW
        const winW = size * 0.2;
        const winH = size * 0.28;
        const winX = cx - winW / 2;
        const winY = bodyY + bodyH * 0.25; 

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#d9d193';
        ctx.fillStyle = '#bfb782';
        roundRect(ctx, winX, winY, winW, winH, 4, true, false);
        ctx.shadowBlur = 0;

        // --- NEW: SMALL WOODEN DOOR (No knob) ---
        const doorW = size * 0.22;
        const doorH = size * 0.35;
        const doorX = cx - doorW / 2 ;
        const doorY = (bodyY + bodyH) - doorH - 2 + 2;

        // Brown Wood color
        ctx.fillStyle = '#5d3a1a'; 
        roundRect(ctx, doorX, doorY, doorW, doorH, 2, true, true);
        // Plank lines for texture
        ctx.strokeStyle = '#3e2712';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(doorX + doorW/2, doorY);
        ctx.lineTo(doorX + doorW/2, doorY + doorH);
        ctx.stroke();

        // 7. BATTLEMETS 
        const battW = bodyW + 8;
        const battH = size * 0.16;
        const battX = cx - battW / 2;
        const battY = bodyY - battH + 2;
        for (let i = 0; i < 4; i++) {
            const bw = battW / 4;
            const bx = battX + i * bw;
            const bGrad = ctx.createLinearGradient(bx, battY, bx, battY + battH);
            bGrad.addColorStop(0, '#666');
            bGrad.addColorStop(1, '#333');
            ctx.fillStyle = bGrad;
            roundRect(ctx, bx + 1, battY, bw - 2, battH, 2, true, true);
        }

        // 8. FLAG POLE & WAVE FLAG
        const poleX = cx + (bodyW * 0.4); 
        const poleTopY = bodyY - (size * 0.35); 
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(poleX, bodyY);
        ctx.lineTo(poleX, poleTopY);
        ctx.stroke();

        const flagW = size * 0.5;
        const flagH = size * 0.25;
        ctx.fillStyle = this.color || '#b22222';
        ctx.beginPath();
        ctx.moveTo(poleX, poleTopY);
        ctx.bezierCurveTo(poleX + flagW*0.4, poleTopY - 5, poleX + flagW*0.6, poleTopY + 5, poleX + flagW, poleTopY);
        ctx.lineTo(poleX + flagW * 0.85, poleTopY + flagH/2);
        ctx.lineTo(poleX + flagW, poleTopY + flagH);
        ctx.bezierCurveTo(poleX + flagW*0.6, poleTopY + flagH + 5, poleX + flagW*0.4, poleTopY + flagH - 5, poleX, poleTopY + flagH);
        ctx.fill();

        return offCanvas;
    }
    
    update(deltaTime, enemies) {
        this.lastShot += deltaTime;

        // --- 1) CHECK FOR TOWERS FURY BUFF ---
        const fury = this.game.abilityManager.abilities.find(a => a.id === 'towers_fury');
        const isFurious = fury && fury.isActive();

        // Calculate dynamic stats based on buff status
        const currentFireRate = isFurious ? this.fireRate * (fury.modifiers.fireRate_mul || 0.75) : this.fireRate;
        const currentBulletSpeed = isFurious ? this.bulletSpeed * (fury.modifiers.speed_mul || 1.25) : this.bulletSpeed;
        const currentDamage = isFurious ? this.damage * (fury.modifiers.damage_mul || 1.25) : this.damage;

        // Update existing bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(deltaTime);
            if (!b.active) {
                this.game.returnBullet(b);
                this.bullets.splice(i, 1);
            }
        }

        // --- 2) Only shoot if cooldown (adjusted by buff) is ready ---
        if (this.lastShot < currentFireRate) return;

        // Target picking
        let best = null;
        let bestDistSq = this.range * this.range;
        const tx = this.x;
        const ty = this.y;

        for (const enemy of enemies) {
            if (enemy.health <= 0) continue;
            const dx = enemy.x - tx;
            const dy = enemy.y - ty;
            const d2 = dx * dx + dy * dy;

            if (d2 < bestDistSq) {
                bestDistSq = d2;
                best = enemy;
            }
        }

        // --- 3) Shoot with Buffed Stats ---
        if (best) {
            const bullet = this.game.getBullet();
            // Use currentBulletSpeed and currentDamage calculated above
            bullet.init(tx, ty, best, currentBulletSpeed, this.game); 
            bullet.damage = currentDamage; 
            
            this.bullets.push(bullet);
            this.lastShot = 0;
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

        // --- 1.5 TOWERS FURY VISUALS (Wind/Haste Effect) ---
        // --- 1.5 TOWERS FURY VISUALS (Wind/Haste Effect) ---
        const fury = this.game.abilityManager.abilities.find(a => a.id === 'towers_fury');
        if (fury && fury.isActive()) {
            ctx.save();
            ctx.translate(this.x, this.y + 10); // Center on tower base
            
            const time = Date.now() * 0.004; 
            
            // 1. Upward Speed Particles
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const ox = Math.sin(time + i) * 20;
                const oy = ((time * 60 + i * 30) % 50) - 25;
                ctx.beginPath();
                ctx.moveTo(ox, -oy);
                ctx.lineTo(ox, -oy - 8);
                ctx.stroke();
            }
            ctx.restore();
        }

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
import Bullet from './Bullet.js';

// Tower size multiplier - change this to make all towers bigger/smaller
const TOWER_SIZE = 0.5;

export default class Tower {
    constructor(game, map, col, row, type = {}) {
        this.game = game;
        this.map = map;
        this.col = col;
        this.row = row;

        // Store tile position for reference
        const pos = this.map.tileToWorld(col, row);
        this.x = pos.x;
        this.y = pos.y;

        // Properties
        this.name = type.name || 'Tower';
        this.range = type.range || 150;
        this.fireRate = type.fireRate || 1200;
        this.damage = type.damage || 1;
        this.color = type.color || 'blue';
        this.bulletSpeed = type.speed || 3;
        this.sellPrice = type.sellPrice || 1;
        

        this.lastShot = 0;
        this.bullets = [];

        this.graphicsSettings = JSON.parse(localStorage.getItem('graphicsSettings')) || {};
        const towerQuality = this.graphicsSettings.towers || 'low';
        if (towerQuality === 'low') {
            this.preRenderedImage = this._preRenderTowerLow(this.map.tileSize);
        } else {
            this.preRenderedImage = this._preRenderTowerHigh(this.map.tileSize);
        }
    }

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

    _preRenderTowerHigh(tileSize) {
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

    _preRenderTowerLow(tileSize) {
        const size = Math.round(tileSize * TOWER_SIZE);
        const offCanvas = document.createElement("canvas");
        const canvasSize = tileSize * 2.5; 
        offCanvas.width = canvasSize;
        offCanvas.height = canvasSize;
        const ctx = offCanvas.getContext("2d");

        // Keep these identical to High version so it stays centered
        const cx = canvasSize / 2.5;
        const cy = canvasSize / 2; 

        // 1. BASE
        const baseW = size * 1.0;
        const baseH = size * 0.32;
        const baseX = cx - baseW / 2;
        const baseY = cy - baseH * 0.3;
        ctx.fillStyle = '#444'; // Flat color instead of gradient
        roundRect(ctx, baseX, baseY, baseW, baseH, 6, true, true);

        // 2. MAIN BODY
        const bodyW = size * 0.9;
        const bodyH = size * 1.4; 
        const bodyX = cx - bodyW / 2;
        const bodyY = baseY - bodyH + 8; 
        ctx.fillStyle = '#5a6069'; // Flat color instead of 3D gradient
        roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 5, true, true);

        // 4. BANNER
        const bannerW = bodyW * 0.25;
        const bannerH = bodyH * 0.45;
        ctx.fillStyle = this.color || '#b22222';
        ctx.fillRect(bodyX + (bodyW * 0.08), bodyY, bannerW, bannerH); // Simple rect banner

        // 5. WINDOW (No shadowBlur/Glow)
        const winW = size * 0.2;
        const winH = size * 0.28;
        ctx.fillStyle = '#bfb782';
        roundRect(ctx, cx - winW / 2, bodyY + bodyH * 0.25, winW, winH, 4, true, false);

        // 6. SIMPLE DOOR (No plank lines)
        const doorW = size * 0.22;
        const doorH = size * 0.35;
        ctx.fillStyle = '#5d3a1a'; 
        roundRect(ctx, cx - doorW / 2, (bodyY + bodyH) - doorH, doorW, doorH, 2, true, false);

        // 7. ROOF BATTLEMENTS (Single bar instead of loop)
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - (bodyW + 8) / 2, bodyY - (size * 0.16) + 2, bodyW + 8, size * 0.16);

        // 8. FLAG (Simple triangle instead of bezier curves)
        const poleX = cx + (bodyW * 0.4); 
        const poleTopY = bodyY - (size * 0.35); 
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(poleX, bodyY);
        ctx.lineTo(poleX, poleTopY);
        ctx.stroke();

        ctx.fillStyle = this.color || '#b22222';
        ctx.beginPath();
        ctx.moveTo(poleX, poleTopY);
        ctx.lineTo(poleX + size * 0.4, poleTopY + size * 0.12);
        ctx.lineTo(poleX, poleTopY + size * 0.25);
        ctx.fill();

        return offCanvas;
    }
    
    update(deltaTime, enemies) {
    this.lastShot += deltaTime;

    // --- 1) CALCULATE STACKING BUFFS FROM ALL ACTIVE FURIES ---
    let damageMul = 1;
    let speedMul = 1;
    let fireRateMul = 1;

    // We loop through all abilities to see which "towers_fury" are active
    this.game.abilityManager.abilities.forEach(ability => {
        // We use .includes so it catches 'towers_fury_1', 'towers_fury_2', etc.
        if (ability.id.includes('towers_fury') && ability.isActive()) {
            damageMul *= (ability.modifiers.damage_mul || 1);
            speedMul *= (ability.modifiers.speed_mul || 1);
            fireRateMul *= (ability.modifiers.fireRate_mul || 1);
        }
    });

    // Calculate dynamic stats based on all active multipliers
    const currentFireRate = this.fireRate * fireRateMul;
    const currentBulletSpeed = this.bulletSpeed * speedMul;
    const currentDamage = this.damage * damageMul;

    // Update existing bullets owned by this tower
    for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        b.update(deltaTime);
        if (!b.active) {
            this.game.returnBullet(b);
            this.bullets.splice(i, 1);
        }
    }

    // --- 2) Check cooldown (adjusted by stacked buffs) ---
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

        // Check distance FIRST (optimization)
        if (d2 < bestDistSq) {
            // Check Line of Sight SECOND (heavier calculation)
            // Only perform if this enemy is actually a better candidate distance-wise
            if (this.checkLineOfSight(enemy.x, enemy.y)) {
                bestDistSq = d2;
                best = enemy;
            }
        }
    }

    // --- 3) Create Bullet with Buffed Stats ---
    if (best) {
        const bullet = this.game.getBullet();
        // Initialize the bullet with the calculated boosted speed
        bullet.init(tx, ty, best, currentBulletSpeed, this.game); 
        // Assign the calculated boosted damage
        bullet.damage = currentDamage; 
        
        this.bullets.push(bullet);
        this.lastShot = 0;
    }
}

    render(ctx, map) {
    const gameMap = map || this.map;
    if (!gameMap) return;

    // --- 1. Draw the pre-rendered tower image ---
    const drawSize = this.map.tileSize * 2; 
    const drawX = this.x - drawSize / 2;
    const drawY = this.y - drawSize / 2;

    ctx.drawImage(this.preRenderedImage, drawX, drawY);

    // --- 1.5 TOWERS FURY VISUALS (Stacked Effect) ---
    // Count how many furies are active to adjust visual intensity
    let activeFuryCount = 0;
    
    this.game.abilityManager.abilities.forEach((ability, index) => {
        if (ability.id.includes('towers_fury') && ability.isActive()) {
            activeFuryCount++;
            
            ctx.save();
            // Slightly offset each fury's particles so they don't perfectly overlap
            ctx.translate(this.x, this.y + 10); 
            
            const time = Date.now() * 0.004; 
            
            // Visuals: Upward Speed Particles
            // Change color slightly if it's the second active fury
            ctx.strokeStyle = activeFuryCount > 1 ? 'rgba(255, 100, 100, 0.6)' : 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < 3; i++) {
                // index * 10 ensures different furies have different particle paths
                const ox = Math.sin(time + i + index * 10) * 20;
                const oy = ((time * 60 + i * 30 + index * 20) % 50) - 25;
                ctx.beginPath();
                ctx.moveTo(ox, -oy);
                ctx.lineTo(ox, -oy - 8);
                ctx.stroke();
            }
            ctx.restore();
        }
    });

    // --- 2. Draw DYNAMIC parts (selection range, health) ---
    const size = Math.round(gameMap.tileSize * TOWER_SIZE);
    const half = size / 2;
    const cx = this.x; 
    const cy = this.y + 14;

    // Selection range
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

    // Health bar
    if (this.health != null) {
        const bw = size * 1.0;
        const bh = 5;
        const bx = cx - bw / 2;
        const by = cy + half + 6;
        ctx.fillStyle = '#222';
        if (typeof roundRect === 'function') {
            roundRect(ctx, bx, by, bw, bh, 2, true, false);
            const pct = Math.max(0, Math.min(1, this.health / (this.maxHealth || 100)));
            ctx.fillStyle = `hsl(${pct * 120}, 70%, 45%)`;
            roundRect(ctx, bx + 1, by + 1, (bw - 2) * pct, bh - 2, 2, true, false);
        } else {
            ctx.fillRect(bx, by, bw, bh);
        }
    }
}

// In Tower.js -> Add method inside the class

checkLineOfSight(ex, ey) {
    // Bresenham-like check or Step check
    const startX = this.x;
    const startY = this.y;
    const dx = ex - startX;
    const dy = ey - startY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // How many checks? Check every half-tile size to ensure we don't skip a mountain
    const tileSize = this.map.tileSize;
    const steps = Math.ceil(dist / (tileSize / 2)); 

    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const checkX = startX + dx * t;
        const checkY = startY + dy * t;

        // Convert world coord to tile
        const tile = this.map.getTileFromCoords(checkX, checkY);
        const type = this.map.getTileStatus(tile.col, tile.row);

        if (type === 'M') {
            return false; // Vision blocked
        }
    }
    return true; // Clear line of sight
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
export default class Enemy {
    constructor(map, path, offsetX = 0, offsetY = 0, speed = 1, health = 10, coinReward = 1) {
      this.map = map;
      this.path = path;
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      this.speed = speed;
      this.maxHealth = health;
      this.health = health;
      this.coinReward = coinReward;
      this.currentIndex = 0;

      // starting pos: use first path node
      const startTile = path[0];
      const pos = this.map.tileToWorld(startTile.col, startTile.row);
      this.x = pos.x + offsetX;
      this.y = pos.y + offsetY;

      this.size = 30;
    }

  update(deltaTime) {
    if (this.currentIndex >= this.path.length - 1) return;
    const next = this.path[this.currentIndex + 1];
    const targetPos = this.map.tileToWorld(next.col, next.row);
    const targetX = targetPos.x + this.offsetX;
    const targetY = targetPos.y + this.offsetY;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    // --- TURNING LOGIC: Save the direction ---
    if (Math.abs(dx) > 0.1) { 
        this.movingLeft = dx < 0; 
    }

    const moveAmount = this.speed * (deltaTime / (1000 / 144));
    if (dist < moveAmount) {
        this.x = targetX;
        this.y = targetY;
        this.currentIndex++;
    } else {
        this.x += (dx / dist) * moveAmount;
        this.y += (dy / dist) * moveAmount;
    }
  }

  _preRenderEnemy(size) {
    const canvas = document.createElement("canvas");
    // Extra wide to accommodate the charging sword and shield
    canvas.width = size * 4;
    canvas.height = size * 4;
    const ctx = canvas.getContext("2d");
    
    const cx = canvas.width / 2;
    const cy = canvas.height - (size * 0.8);

    // --- 1. THE BIG CHEST (Heavy Plate) ---
    const bodyW = size * 1.3; // Increased width for "Big Chest"
    const bodyH = size * 1.1;
    const bodyX = cx - bodyW / 2;
    const bodyY = cy - bodyH;
    
    const armorGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX + bodyW, bodyY);
    armorGrad.addColorStop(0, '#1a1a1a'); 
    armorGrad.addColorStop(0.3, '#404040'); // Metallic ridge
    armorGrad.addColorStop(1, '#050505');
    
    ctx.fillStyle = armorGrad;
    // Layered Chest Plate (rounded but bulky)
    roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 12, true, true);
    
    // Armor Detail: Center line and pectoral ridges
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bodyX + bodyW*0.2, bodyY + 10, bodyW*0.6, bodyH*0.4);

    // --- 2. THE RECTANGLE HELMET (Great Helm) ---
    const helmW = size * 0.8;
    const helmH = size * 0.9;
    const helmX = cx - helmW / 2;
    const helmY = bodyY - helmH + 4; // Tucked into chest
    
    ctx.fillStyle = armorGrad;
    roundRect(ctx, helmX, helmY, helmW, helmH, 4, true, true);
    
    // Eye Slits (Rectangle Medieval Style)
    ctx.fillStyle = '#000';
    ctx.fillRect(helmX + 6, helmY + helmH * 0.3, helmW/3, 4); // Left eye
    ctx.fillRect(helmX + helmW - 6 - helmW/3, helmY + helmH * 0.3, helmW/3, 4); // Right eye
    // Breathing holes (dots)
    for(let i=0; i<3; i++) {
        for(let j=0; j<2; j++) {
            ctx.fillRect(helmX + 10 + (i*6), helmY + helmH*0.6 + (j*6), 2, 2);
        }
    }

    // --- 3. HANDS & ARMS ---
    ctx.fillStyle = '#262626';
    // Right Hand (Sword arm)
    ctx.beginPath();
    ctx.arc(bodyX + bodyW + 4, bodyY + bodyH * 0.3, 8, 0, Math.PI * 2); 
    ctx.fill();
    // Left Hand (Shield arm - raised)
    ctx.beginPath();
    ctx.arc(bodyX - 4, bodyY + bodyH * 0.2, 8, 0, Math.PI * 2);
    ctx.fill();

    // --- 4. THE SHIELD (Held Higher) ---
    const shieldW = size * 0.8;
    const shieldH = size * 1.3;
    const shieldX = bodyX - shieldW + 10;
    const shieldY = bodyY - 10; // Positioned higher
    
    ctx.fillStyle = '#3e2723'; // Dark Wood
    roundRect(ctx, shieldX, shieldY, shieldW, shieldH, 5, true, true);
    // Metal Trim
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 3;
    ctx.stroke();

    // --- 5. THE CHARGING SWORD (Held High & Right) ---
    ctx.save();
    ctx.translate(bodyX + bodyW + 4, bodyY + bodyH * 0.3);
    ctx.rotate(-Math.PI / 8); // Angled forward/up
    
    // Broadsword Blade
    const swordL = size * 1.6;
    ctx.fillStyle = '#525252';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(swordL, -5); // Pointy tip
    ctx.lineTo(0, 15);
    ctx.closePath();
    ctx.fill();
    // Shine
    ctx.fillStyle = '#a3a3a3';
    ctx.fillRect(5, 2, swordL - 10, 2);
    
    // Hilt
    ctx.fillStyle = '#171717';
    ctx.fillRect(-5, -5, 10, 25);
    ctx.restore();

    // --- 6. SHORT STURDY LEGS ---
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(cx - 15, cy - 2, 10, 12);
    ctx.fillRect(cx + 5, cy - 2, 10, 12);

    return canvas;
  }

  render(ctx) {
    const time = Date.now() * 0.015;
    const bob = Math.sin(time * 2.5) * 4;  
    const shift = Math.sin(time) * 4;      
    const lean = 0.08; 

    // 1. GROUND SHADOW
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x + shift, this.y + this.size/4, this.size * 0.9, this.size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!this.cachedCanvas) this.cachedCanvas = this._preRenderEnemy(this.size);
    
    ctx.save();
    
    // Move to the enemy position
    ctx.translate(this.x + shift, this.y + bob);

    // 2. THE FLIP (Fixed: using this.movingLeft from update)
    if (this.movingLeft) {
        ctx.scale(-1, 1);
    }

    // Size adjustment (0.80)
    ctx.scale(0.80, 0.80); 

    // 3. THE LEAN
    ctx.transform(1, 0, -lean, 1, 0, 0); 
    
    ctx.drawImage(
        this.cachedCanvas, 
        -this.size * 2, 
        -this.size * 3.2, 
        this.size * 4, 
        this.size * 4
    );
    
    ctx.restore();

    // 4. HEALTH BAR
    const hbW = this.size;
    const pct = Math.max(0, this.health / this.maxHealth);
    const hby = this.y - this.size * 2.4;
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x - hbW/2, hby, hbW, 4);
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : '#ef4444';
    ctx.fillRect(this.x - hbW/2, hby, hbW * pct, 4);
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
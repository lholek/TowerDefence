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

    const startTile = path[0];
    const pos = this.map.tileToWorld(startTile.col, startTile.row);
    this.x = pos.x + offsetX;
    this.y = pos.y + offsetY;

    this.size = 30;
    this.movingLeft = false;

    // 50/50 šance na typ nepřítele
    const rand = Math.random();
    if (rand < 0.33) {
        this.type = 'GOLEM';
    } else if (rand < 0.66) {
        this.type = 'EYE';
    } else {
        this.type = 'FIRE_SPIDER';
    }
    
    // Generování grafiky do cache
    this.cachedCanvas = this._preRenderEnemy(this.size);
  }

  update(deltaTime) {
    if (this.currentIndex >= this.path.length - 1) return;
    const next = this.path[this.currentIndex + 1];
    const targetPos = this.map.tileToWorld(next.col, next.row);
    const targetX = targetPos.x + this.offsetX;
    const targetY = targetPos.y + this.offsetY;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (Math.abs(dx) > 0.1) this.movingLeft = dx < 0;

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

  // Pomocná funkce pro kreslení zaoblených obdélníků
  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  _preRenderEnemy(size) {
    if (this.type === 'GOLEM') return this._drawInfernalGolemCanvas(size);
    if (this.type === 'EYE') return this._drawInfernalEye(size);
    if (this.type === 'FIRE_SPIDER') return this._drawFireSpider(size); // New
  }

  _drawInfernalGolemCanvas(tileSize) {
    const size = tileSize * 1.3;
    const canvas = document.createElement("canvas");
    canvas.width = tileSize * 6;
    canvas.height = tileSize * 7;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    // Posunuto níž - cy je teď blíž spodku
    const cy = canvas.height * 0.8; 

    const obsidian = '#0a0a0a'; 
    const lavaRed = '#dc2626';  
    const lavaYellow = '#fbbf24';

    // Pomocná funkce pro balvanovitý tvar
    const drawBoulder = (x, y, w, h, glow = false) => {
        if (glow) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = lavaRed;
        }
        ctx.fillStyle = obsidian;
        ctx.strokeStyle = lavaRed;
        ctx.lineWidth = 2;
        
        // Nepravidelný osmiúhelník (balvan)
        ctx.beginPath();
        ctx.moveTo(x + w*0.2, y);
        ctx.lineTo(x + w*0.8, y);
        ctx.lineTo(x + w, y + h*0.3);
        ctx.lineTo(x + w*0.9, y + h*0.9);
        ctx.lineTo(x + w*0.5, y + h);
        ctx.lineTo(x + w*0.1, y + h*0.9);
        ctx.lineTo(x, y + h*0.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Vnitřní žluté žilky (detail)
        ctx.strokeStyle = lavaYellow;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + w*0.3, y + h*0.3);
        ctx.lineTo(x + w*0.5, y + h*0.5);
        ctx.stroke();
    };

    // --- NOHY (Masivní podpěry) ---
    drawBoulder(cx - size * 0.7, cy - size * 0.5, size * 0.5, size * 0.6); // Levá
    drawBoulder(cx + size * 0.2, cy - size * 0.5, size * 0.5, size * 0.6); // Pravá

    // --- TRUP (Velký centrální balvan) ---
    drawBoulder(cx - size * 0.8, cy - size * 1.6, size * 1.6, size * 1.3, true);

    // --- RAMENA ---
    drawBoulder(cx - size * 1.4, cy - size * 1.7, size * 0.7, size * 0.7);
    drawBoulder(cx + size * 0.7, cy - size * 1.7, size * 0.7, size * 0.7);

    // --- HLAVA (Malý, zapuštěný balvan) ---
    drawBoulder(cx - size * 0.3, cy - size * 2.1, size * 0.6, size * 0.5);
    ctx.fillStyle = lavaYellow;
    ctx.fillRect(cx - size * 0.2, cy - size * 1.9, size * 0.4, 3); // Oko

    // --- RUCE ---
    drawBoulder(cx + size * 0.9, cy - size * 1.1, size * 0.6, size * 0.9); // Pěst
    // Čepel (Levá)
    ctx.fillStyle = obsidian;
    ctx.beginPath();
    ctx.moveTo(cx - size * 1.1, cy - size * 1.0);
    ctx.lineTo(cx - size * 1.5, cy + size * 0.2);
    ctx.lineTo(cx - size * 0.7, cy - size * 0.2);
    ctx.fill();
    ctx.strokeStyle = lavaRed;
    ctx.stroke();

    return canvas;
  }

  _drawInfernalEye(tileSize) {
    const size = tileSize * 0.6;
    const canvas = document.createElement("canvas");
    canvas.width = tileSize * 3;
    canvas.height = tileSize * 4; // Vyšší, abychom ho mohli dát níž
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.7; // Posunuto níž na plátně

    const deepRed = '#7f1d1d';
    const brightRed = '#ef4444';
    const intenseYellow = '#fbbf24';

    // Žhnoucí aura
    ctx.shadowBlur = 20;
    ctx.shadowColor = brightRed;

    // Dokonale kulaté bělmo (přechod)
    const eyeGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size);
    eyeGrad.addColorStop(0, intenseYellow);
    eyeGrad.addColorStop(0.5, brightRed);
    eyeGrad.addColorStop(1, deepRed);

    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();

    // Zornice
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.2, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Odlesk
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(cx - size * 0.3, cy - size * 0.3, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }
  
  _drawFireSpider(tileSize) {
    const size = tileSize * 0.8;
    const canvas = document.createElement("canvas");
    canvas.width = tileSize * 4;
    canvas.height = tileSize * 4;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.7;

    const charcoal = '#1a1a1a';
    const lavaOrange = '#7f1d1d';
    const lavaYellow = '#fbbf24';

    // Glow Effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = lavaOrange;

    // --- LEGS (8 legs) ---
    ctx.strokeStyle = charcoal;
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        // Jointed leg look
        const midX = cx + Math.cos(angle) * size;
        const midY = cy + Math.sin(angle) * size - 10;
        const endX = cx + Math.cos(angle) * (size * 1.5);
        const endY = cy + Math.sin(angle) * (size * 1.5);
        
        ctx.lineTo(midX, midY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Hot tips on legs
        ctx.fillStyle = lavaOrange;
        ctx.fillRect(endX - 2, endY - 2, 4, 4);
    }

    // --- BODY (Abdomen) ---
    ctx.fillStyle = charcoal;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.7, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = lavaOrange;
    ctx.stroke();

    // --- LAVA VEINS ON BACK ---
    ctx.shadowBlur = 0;
    ctx.strokeStyle = lavaYellow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.3, cy);
    ctx.lineTo(cx + size * 0.3, cy);
    ctx.moveTo(cx, cy - size * 0.2);
    ctx.lineTo(cx, cy + size * 0.2);
    ctx.stroke();

    // --- EYES (Multiple small glowing dots) ---
    ctx.fillStyle = lavaYellow;
    const eyeOffsets = [[-5, -8], [5, -8], [-10, -4], [10, -4]];
    eyeOffsets.forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, 2, 0, Math.PI * 2);
        ctx.fill();
    });

    return canvas;
  }

  _drawHealthBar(ctx) {
    const hbW = this.size;
    const pct = Math.max(0, this.health / this.maxHealth);
    const hby = this.y - this.size * 2.6;
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x - hbW/2, hby, hbW, 4);
    ctx.fillStyle = pct > 0.5 ? '#a855f7' : '#ef4444';
    ctx.fillRect(this.x - hbW/2, hby, hbW * pct, 4);
  }

  render(ctx) {
    const time = Date.now() * 0.015;
    ctx.save();

    // Jen velmi jemné, pomalé vznášení celého těla
    let bob = Math.sin(time * 0.4) * 5; 

    ctx.translate(this.x, this.y + bob);
    if (this.movingLeft) ctx.scale(-1, 1);
    
    // Zmenšení pro měřítko tvých věží
    ctx.scale(0.65, 0.65); 

    if (this.cachedCanvas) {
        ctx.drawImage(this.cachedCanvas, -this.size * 2, -this.size * 4, this.size * 4, this.size * 5);
    }
    
    ctx.restore();
    this._drawHealthBar(ctx);
  }
}
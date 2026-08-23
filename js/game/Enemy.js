export default class Enemy {
  constructor(map, path, offsetX = 0, offsetY = 0, speed = 1, health = 10, coinReward = 1, type='basic', damage = 1, skin = null) {
    this.map = map;
    this.path = path;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.speed = speed;
    this.maxHealth = health;
    this.health = health;
    this.coinReward = coinReward;
    this.currentIndex = 0;
    this.type = type;
    this.damage = damage;

    const startTile = path[0];
    const pos = this.map.tileToWorld(startTile.col, startTile.row);
    this.x = pos.x + offsetX;
    this.y = pos.y + offsetY;

    this.size = 30;
    this.movingLeft = false;

    // Visual skin: use the level-editor's explicit choice if set (GOLEM/EYE),
    // otherwise fall back to a 50/50 random pick like before.
    if (skin === 'GOLEM' || skin === 'EYE') {
        this.type = skin;
    } else {
        const rand = Math.random();
        this.type = rand < 0.5 ? 'GOLEM' : 'EYE';
    }

    // Getting quailty from local storage
    const settings = JSON.parse(localStorage.getItem('graphicsSettings')) || {};
    this.quality = settings.enemies || 'low';

    // Generování grafiky do cache
    this.cachedBody = this._preRenderEnemy(this.size);
    this.cachedIndicator = this._preRenderIndicatorCache();
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
    const isLow = this.quality === 'low';
    let canvas;
    if (this.type === 'GOLEM') {
        canvas = isLow ? this._drawInfernalGolemLow(size) : this._drawInfernalGolemHigh(size);
    } else if (this.type === 'EYE') {
        canvas = isLow ? this._drawInfernalEyeLow(size) : this._drawInfernalEyeHigh(size);
    } else {
        canvas = this._drawInfernalEyeLow(size);
    }
    const ctx = canvas.getContext("2d");

    return canvas;
  }

  _drawInfernalGolemHigh(tileSize) {
    const size = tileSize * 3;
    const canvas = document.createElement("canvas");
    canvas.width = tileSize * 16; 
    canvas.height = tileSize * 16;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.85; 

    const obsidian = '#0a0a0a'; 
    const lavaRed = '#dc2626';  
    const lavaYellow = '#fbbf24';

    const drawOrganicBoulder = (x, y, w, h, hasHeart = false) => {
        ctx.save();
        // 1. Create a jagged, non-blocky path
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y); 
        ctx.lineTo(x + w * 0.85, y + h * 0.1);
        ctx.lineTo(x + w, y + h * 0.5);
        ctx.lineTo(x + w * 0.9, y + h * 0.9);
        ctx.lineTo(x + w * 0.5, y + h);
        ctx.lineTo(x + w * 0.1, y + h * 0.8);
        ctx.lineTo(x - w * 0.05, y + h * 0.3);
        ctx.closePath();

        // 2. Material Depth
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'black';
        ctx.fillStyle = obsidian;
        ctx.fill();

        // 3. Rim Lighting (The AAA Polish)
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. Jagged Cracks
        ctx.shadowBlur = 8;
        ctx.shadowColor = lavaRed;
        ctx.strokeStyle = lavaRed;
        ctx.lineWidth = 2;
        ctx.beginPath();

        // Custom X-Crack logic for chest or random for limbs
        if (hasHeart) {
            ctx.moveTo(x + w*0.2, y + h*0.2); ctx.lineTo(x + w*0.8, y + h*0.8);
            ctx.moveTo(x + w*0.8, y + h*0.2); ctx.lineTo(x + w*0.2, y + h*0.8);
        } else {
            ctx.moveTo(x + w*0.2, y + h*0.3); ctx.lineTo(x + w*0.5, y + h*0.5); ctx.lineTo(x + w*0.3, y + h*0.8);
        }
        ctx.stroke();

        // 5. Centered Lava Core
        if (hasHeart) {
            ctx.globalCompositeOperation = 'lighter';
            const heartX = x + w/2;
            const heartY = y + h/2;
            
            // 1. INCREASED GLOW RADIUS (w/5.5 -> w/3.5)
            // This spreads the light further across the X-cracks
            const glow = ctx.createRadialGradient(heartX, heartY, 1, heartX, heartY, w/8);
            glow.addColorStop(0, '#fff');
            glow.addColorStop(0.4, lavaYellow); // Sharper transition for a bigger feel
            glow.addColorStop(1, 'transparent');
            
            ctx.fillStyle = glow;
            ctx.beginPath();
            // 2. INCREASED FILL ARC
            ctx.arc(heartX, heartY, w/3.5, 0, Math.PI*2);
            ctx.fill();
            
            // 3. ENLARGED DIAMOND CORE (10 -> 16 height)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(heartX, heartY - 9); // Top
            ctx.lineTo(heartX + 10, heartY); // Right
            ctx.lineTo(heartX, heartY + 16); // Bottom
            ctx.lineTo(heartX - 10, heartY); // Left
            ctx.closePath();
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
    };

    // Render Order
    drawOrganicBoulder(cx - size * 0.6, cy - size * 0.3, size * 0.5, size * 0.4); // Legs
    drawOrganicBoulder(cx + size * 0.1, cy - size * 0.3, size * 0.5, size * 0.4);
    drawOrganicBoulder(cx - size * 1.3, cy - size * 1.8, size * 2.6, size * 1.6, true); // Torso (Heart + X Cracks)
    drawOrganicBoulder(cx - size * 0.45, cy - size * 2.4, size * 0.9, size * 0.7); // Head

    // Fiery Eyes
    ctx.shadowBlur = 20; ctx.shadowColor = lavaYellow;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.2, cy - size * 2.1, 8, 4, 0.2, 0, Math.PI*2);
    ctx.ellipse(cx + size * 0.2, cy - size * 2.1, 8, 4, -0.2, 0, Math.PI*2);
    ctx.fill();

    // Hands
    drawOrganicBoulder(cx - size * 1.7, cy - size * 1.2, size * 0.8, size * 0.9);
    const hX = cx + size * 0.6, hY = cy - size * 1.2;
    drawOrganicBoulder(hX, hY, size * 0.9, size * 1.0); // Right Grip

    // Fire Sword (Wide & Leaning)
    ctx.save();
    ctx.translate(hX + size * 0.45, hY + size * 0.45);
    ctx.rotate(0.4);
    const sGrad = ctx.createLinearGradient(0, 0, 0, -size * 2.8);
    sGrad.addColorStop(0, lavaYellow); sGrad.addColorStop(0.4, lavaRed); sGrad.addColorStop(1, 'transparent');
    ctx.shadowBlur = 35; ctx.shadowColor = lavaRed;
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.moveTo(-size * 0.35, 0); 
    ctx.bezierCurveTo(-size * 0.35, -size * 1.5, -size * 0.1, -size * 2.8, 0, -size * 3.0);
    ctx.bezierCurveTo(size * 0.1, -size * 2.8, size * 0.35, -size * 1.5, size * 0.35, 0);
    ctx.fill();
    ctx.restore();

    return canvas;
  }

  _drawInfernalGolemLow(tileSize) {
    const size = tileSize * 1.8; // Increased size (+20% from 1.5)
    const canvas = document.createElement("canvas");
    canvas.width = tileSize * 10;
    canvas.height = tileSize * 10;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.85;

    const black = '#0a0a0a'; 
    const fireYellow = '#fbbf24'; // Unified Yellow theme

    // Helper for legs with rounded bottoms
    const drawHeavyLeg = (x, y, w, h) => {
        ctx.fillStyle = black;
        ctx.beginPath();
        ctx.moveTo(x, y); // Flat top connector to body
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h - 10);
        ctx.arcTo(x + w, y + h, x, y + h, 15); // Rounded bottom corner
        ctx.arcTo(x, y + h, x, y + h - 10, 15); // Rounded bottom corner
        ctx.lineTo(x, y);
        ctx.fill();
    };

    // 1. BIGGER LEGS (Heavy stance, rounded bottoms)
    drawHeavyLeg(cx - size * 0.7, cy - size * 0.4, size * 0.5, size * 0.45); 
    drawHeavyLeg(cx + size * 0.2, cy - size * 0.4, size * 0.5, size * 0.45);

    // 2. MASSIVE BODY
    ctx.fillStyle = black;
    ctx.beginPath();
    ctx.roundRect(cx - size * 0.9, cy - size * 1.6, size * 1.8, size * 1.3, 10);
    ctx.fill();

    // 3. X-CRACK + YELLOW HEARTH
    ctx.strokeStyle = fireYellow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.5, cy - size * 1.3); ctx.lineTo(cx + size * 0.5, cy - size * 0.6);
    ctx.moveTo(cx + size * 0.5, cy - size * 1.3); ctx.lineTo(cx - size * 0.5, cy - size * 0.6);
    ctx.stroke();

    // Yellow Core
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = fireYellow;
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.95, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. HEAD & YELLOW EYES
    ctx.fillStyle = black;
    ctx.beginPath();
    ctx.roundRect(cx - size * 0.45, cy - size * 2.1, size * 0.9, size * 0.6, 8);
    ctx.fill();
    
    ctx.fillStyle = fireYellow;
    ctx.fillRect(cx - size * 0.25, cy - size * 1.9, 5, 4);
    ctx.fillRect(cx + size * 0.1, cy - size * 1.9, 5, 4);

    // 5. SMALLER, WIDE YELLOW SWORD
    const handX = cx + size * 0.8;
    const handY = cy - size * 1.2;
    
    ctx.fillStyle = black; // Hand
    ctx.fillRect(handX, handY, size * 0.35, size * 0.35);

    ctx.save();
    ctx.translate(handX + 5, handY + 10);
    ctx.rotate(0.25);

    ctx.fillStyle = fireYellow;
    // Wide Crossguard
    ctx.fillRect(-size * 0.4, 0, size * 0.8, size * 0.2);
    // Short, Fat Blade
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, 0);
    ctx.lineTo(0, -size * 1.8); // Much shorter than before
    ctx.lineTo(size * 0.3, 0);
    ctx.fill();
    ctx.restore();

    return canvas;
  }

  _drawInfernalEyeHigh(tileSize) {
    const size = tileSize * 0.6;
    const canvas = document.createElement("canvas");
    canvas.width = tileSize * 3;
    canvas.height = tileSize * 4;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.7;

    const deepRed = '#7f1d1d';
    const brightRed = '#ef4444';
    const intenseYellow = '#fbbf24';

    // 1. Exterior Glow (Expensive)
    ctx.shadowBlur = 25;
    ctx.shadowColor = brightRed;

    // 2. Multi-stop Gradient for iris
    const eyeGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size);
    eyeGrad.addColorStop(0, '#ffffff'); // White core
    eyeGrad.addColorStop(0.2, intenseYellow);
    eyeGrad.addColorStop(0.6, brightRed);
    eyeGrad.addColorStop(1, deepRed);

    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // Turn off shadow for details

    // 3. Add Veins (New Detail)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * (size * 0.5), cy + Math.sin(angle) * (size * 0.5));
        ctx.lineTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
        ctx.stroke();
    }

    // 4. Slit Pupil
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.15, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Inner Pupil Glow
    ctx.fillStyle = intenseYellow;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.05, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 6. Highlights
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx - size * 0.3, cy - size * 0.4, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }

  _drawInfernalEyeLow(tileSize) {
    const size = tileSize * 0.6;
    const canvas = document.createElement("canvas");
    canvas.width = tileSize * 3;
    canvas.height = tileSize * 4;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.7;

    // 1. Simple Flat Circle (No Shadow, No Gradient)
    ctx.fillStyle = '#ef4444'; // Bright Red
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();

    // 2. Simple Border instead of glow
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Simple Pupil
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.2, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }

  _drawHealthBar(ctx) {
    const hbW = this.size * 1.1; // Mírně širší než samotný nepřítel
    const hbH = 6;               // Výška baru (původně 4)
    const pct = Math.max(0, this.health / this.maxHealth);
    
    // Pozice barva nad nepřítelem
    const hbx = this.x - hbW / 2;
    const hby = this.y - this.size * 1.8; // Trochu výše, aby to dejchalo

    // 1. Pozadí (Background / Border)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Poloprůhledná černá vypadá lépe
    ctx.fillRect(hbx, hby, hbW, hbH);

    // 2. Samotný život (Fill)
    // Používám #22c55e (sytá zelená) vs #ef4444 (červená)
    ctx.fillStyle = pct > 0.5 ? '#e3d914' : '#b91c1c';
    ctx.fillRect(hbx, hby, hbW * pct, hbH);
    
    // 3. Volitelný detail: Jemný vnitřní lesk (aby to nebylo ploché)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(hbx, hby, hbW * pct, hbH / 2);
  }

  _drawDamageIndicator(ctx, x = 0, y = 0, size = 30, isPre = false, type = "GOLEM", quality = "low") {
    if (this.damage == 1){return;}
    let indicatorSize = 1;
    let indicatorPostionX = 10;
    let indicatorPostionY = 10;

    if (quality == "low") {
      // size low
      if (type === 'GOLEM') indicatorSize = 0.3;
      else if (type === 'EYE') indicatorSize = 0.3;

      // position low
      if (type === 'GOLEM') { indicatorPostionX = -75; indicatorPostionY = -75; }
      else if (type === 'EYE') { indicatorPostionX = -75; indicatorPostionY = -70; }
    } else {
      // size high
      if (type === 'GOLEM') indicatorSize = 0.3;
      else if (type === 'EYE') indicatorSize = 0.3;

      // position high
      if (type === 'GOLEM') { indicatorPostionX = -85; indicatorPostionY = -70; }
      else if (type === 'EYE') { indicatorPostionX = -85; indicatorPostionY = -70; }
    }

    const time = Date.now();
    const bob = Math.sin(time / 300) * 10;

    ctx.save();

    if (isPre) {
        ctx.translate(x + indicatorPostionX, y + indicatorPostionY);
        ctx.scale(indicatorSize, indicatorSize);   // <‑‑ FIXED
    } else {
        ctx.translate(this.x, this.y - this.size * 3.5 + bob);
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = '#ffffff';

    ctx.fillStyle = '#facc15';      // Výrazná žlutá (vypadá skvěle s černým obrysem)
    ctx.font = 'bold 80px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 10;
    
    // damge text
    const absValDmg = Math.abs(this.damage);

    // 2. Podmínku postavíme nad touto absolutní hodnotou
    const damageText = absValDmg >= 100
        ? { base: "99", sup: "+" }
        : { base: String(absValDmg), sup: "" };

    // hlavní text
    ctx.strokeText(damageText.base, 0, 0);
    ctx.fillText(damageText.base, 0, 0);

    // horní index
    if (damageText.sup) {
        ctx.font = 'bold 50px "Segoe UI", Arial'; // menší font pro superscript
        const offsetX = ctx.measureText(damageText.base).width + 5;
        const offsetY = -35;
    
        ctx.strokeText(damageText.sup, offsetX, offsetY);
        ctx.fillText(damageText.sup, offsetX, offsetY);
    }

    // ⚔️ / ❤️ ikona
    ctx.font = '80px Arial';
    // Původní výpočet šířky w
    const w = ctx.measureText(damageText.base).width + (damageText.sup ? 25 : 0);
    
    // Absolutní hodnota pro určení počtu cifer (aby -5 i 5 mělo stejnou mezeru)
    const absVal = Math.abs(this.damage);
    if (this.damage >= 1) {
        // KLADNÝ DAMAGE (Meč)
        if (absVal < 10) {
            ctx.fillText("⚔️", w + 40, 0);
        } else {
            ctx.fillText("⚔️", w + 10, 0);
        }
    } else if (this.damage <= 0) {
        // ZÁPORNÝ DAMAGE / HEAL (Srdce)
        // Používáme tvou logiku: pod -10 (např. -5) mezera 40, jinak 10
    
        if (absVal > -10) { 
            ctx.fillText("❤️", w + 40, 0);
        } else {
            ctx.fillText("❤️", w + 10, 0);
        }
    }
    // damge text

    ctx.restore();
  }

  _preRenderIndicatorCache() {
    //if (this.damage <= 1) return null;

    const canvas = document.createElement("canvas");
    // 300x200 bohatě stačí pro text s mečem
    canvas.width = 200; 
    canvas.height = 100;
    const ctx = canvas.getContext("2d");

    // Vykreslíme indikátor na střed (150, 100)
    // isPre nastavíme na true, aby se použily tvoje specifické offsety pro Golema/Eye
    this._drawDamageIndicator(ctx, 100, 100, 30, true, this.type, this.quality);

    return canvas;
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

    if (this.cachedBody) {
        ctx.drawImage(this.cachedBody, -this.size * 2, -this.size * 4, this.size * 4, this.size * 5);
    }
    
    ctx.restore();
    if (this.cachedIndicator) {
        ctx.save();
        // Pozicujeme indikátor nad nepřítele - NEZÁVISLE na scale těla
        // (bob * 0.5) zajistí, že se indikátor hýbe s ním, ale jemněji
        ctx.translate(this.x, this.y - this.size * 2 + (bob * 0.5));
        
        // Vykreslíme předpřipravený indikátor (vycentrovaný)
        // Měřítko 0.5 je tu proto, že v cache máš 80px font, což je hodně velké
        ctx.scale(1, 1); 
        ctx.drawImage(this.cachedIndicator, 20, 0); 
        ctx.restore();
    }

    this._drawHealthBar(ctx);
  }
}
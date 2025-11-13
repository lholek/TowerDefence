import Bullet from './Bullet.js';

export default class Tower {
    constructor(map, col, row, type = {}) {
        this.map = map;
        const pos = this.map.tileToWorld(col, row);
        this.x = pos.x;
        this.y = pos.y;
        this.col = col;
        this.row = row;

        // vlastnosti toweru (můžeme přebírat z JSON)
        this.range = type.range || 150;
        this.fireRate = type.fireRate || 1200;
        this.damage = type.damage || 1;
        this.color = type.color || 'blue';
        this.bulletSpeed = type.speed || 3;
        this.sellPrice = type.sellPrice || 1;

        this.lastShot = 0;
        this.bullets = [];
    }
    
    update(deltaTime, enemies) {
        // recompute current world position from map each update so zoom/pan/resize keep it correct
        if (this.map && typeof this.map.tileToWorld === 'function') {
          const pos = this.map.tileToWorld(this.col, this.row);
          this.x = pos.x;
          this.y = pos.y;
        }

        this.lastShot += deltaTime;

        if (this.lastShot >= this.fireRate) {
            let target = null;
            let minDist = Infinity;

            for (const enemy of enemies) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= this.range && dist < minDist) {
                    minDist = dist;
                    target = enemy;
                }
            }

            if (target) {
                // spawn bullet at current computed world pos (not stale constructor pos)
                const b = new Bullet(this.x, this.y, target, this.bulletSpeed);
                b.damage = this.damage;
                this.bullets.push(b);
                this.lastShot = 0;
            }
        }

        // update bullets (pass ms delta)
        this.bullets.forEach(b => b.update(deltaTime));
        this.bullets = this.bullets.filter(b => b.active);
    }

  render(ctx, map) {
    // Determine drawing mode and compute screen/world positions reliably
    const hasTileToScreen = map && typeof map.tileToScreen === 'function';
    const hasWorldToScreen = map && typeof map.worldToScreen === 'function';
    const hasApplyTransform = map && typeof map.applyCameraTransform === 'function';
    const useTransform = hasApplyTransform && !hasTileToScreen && !hasWorldToScreen;

    // compute positions
    let worldPos = null;
    let screenPos = null;
    if (hasTileToScreen) {
      screenPos = map.tileToScreen(this.col, this.row);
      if (typeof map.tileToWorld === 'function') worldPos = map.tileToWorld(this.col, this.row);
    } else {
      if (typeof map?.tileToWorld === 'function') worldPos = map.tileToWorld(this.col, this.row);
      else worldPos = { x: this.x || 0, y: this.y || 0 };
      if (hasWorldToScreen) screenPos = map.worldToScreen(worldPos.x, worldPos.y);
      else if (!useTransform) screenPos = worldPos;
    }

    // fixed tower size (no zoom scaling - stays same size on tile)
    const tileSize = map?.tileSize || map?.tileWidth || 32;
    const size = this.size || Math.round(tileSize * 1.1); // fixed size, no zoom
    const half = size / 2;

    // If using transform mode, apply camera transform
    if (useTransform) ctx.save(), map.applyCameraTransform(ctx);
    else ctx.save();

    // resolved draw center
    const cx = useTransform ? worldPos.x : screenPos.x;
    const cy = useTransform ? worldPos.y : screenPos.y;

    // 1) shadow (soft)
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + half * 0.6, half * 0.95, half * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // base (stone foundation)
    const baseW = size * 1.08;
    const baseH = size * 0.32;
    const baseX = cx - baseW / 2;
    const baseY = cy - baseH * 0.3;
    const baseGrad = ctx.createLinearGradient(baseX, baseY, baseX, baseY + baseH);
    baseGrad.addColorStop(0, '#7a7a7a');
    baseGrad.addColorStop(1, '#525252');
    ctx.fillStyle = baseGrad;
    roundRect(ctx, baseX, baseY, baseW, baseH, 6, true, true);

    // main body (brick tower #60666e)
    const bodyW = size * 0.9;
    const bodyH = size * 1.18;
    const bodyX = cx - bodyW / 2;
    const bodyY = baseY - bodyH + 8;
    const brickTop = '#60666e';
    const brickBase = '#4f5459';
    const bodyGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
    bodyGrad.addColorStop(0, brickTop);
    bodyGrad.addColorStop(1, brickBase);
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

    // battlements (smaller, cleaner)
    const battW = bodyW + 10;
    const battH = size * 0.14;
    const battX = cx - battW / 2;
    const battY = bodyY - battH + 2;
    const cren = 5;
    ctx.fillStyle = '#5a5a5a';
    for (let i = 0; i < cren; i++) {
      const bw = battW / cren;
      const x = battX + i * bw;
      roundRect(ctx, x + 2, battY, bw - 4, battH, 2, true, true);
    }

    // flag pole (taller but thinner)
    const poleX = cx + battW * 0.3;
    const poleTopY = battY - battH * 1.8;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(1, Math.round(size * 0.03));
    ctx.beginPath();
    ctx.moveTo(poleX, battY);
    ctx.lineTo(poleX, poleTopY);
    ctx.stroke();

    // smaller triangular pennant (tower color, better proportioned)
    const flagW = battW * 0.35; // smaller
    const flagH = battH * 2.2; // shorter
    const fx = poleX + 2;
    const fy = poleTopY + 2;
    ctx.fillStyle = this.color || '#b22222';
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + flagW * 0.85, fy + flagH * 0.35);
    ctx.lineTo(fx + flagW * 0.4, fy + flagH * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // selection range
    if (this.isSelected) {
      ctx.beginPath();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = '#ffd27a';
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
      roundRect(ctx, bx, by, bw, bh, 2, true, false);
      const pct = Math.max(0, Math.min(1, this.health / (this.maxHealth || 100)));
      ctx.fillStyle = `hsl(${pct * 120}, 70%, 45%)`;
      roundRect(ctx, bx + 1, by + 1, (bw - 2) * pct, bh - 2, 2, true, false);
    }

    // render bullets
    if (this.bullets && this.bullets.length) {
      for (const b of this.bullets) {
        if (typeof b.render === 'function') {
          try { b.render(ctx, map); } catch (e) { }
        } else {
          if (!useTransform && hasWorldToScreen) {
            const s = map.worldToScreen(b.x, b.y);
            ctx.fillStyle = '#ffd';
            ctx.beginPath();
            ctx.arc(s.x, s.y, Math.max(2, size * 0.05), 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = '#ffd';
            ctx.beginPath();
            ctx.arc(b.x, b.y, Math.max(2, size * 0.05), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // restore
    if (useTransform && typeof map.resetTransform === 'function') {
      map.resetTransform(ctx);
      ctx.restore();
    } else {
      ctx.restore();
    }

    // helper
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
  }
}

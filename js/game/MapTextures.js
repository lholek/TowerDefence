// js/game/MapTextures.js
/*
X - Grass
SND - Sand
SNW - Snow
ICE - Ice (impassable, non-buildable, shootable)
LAVA - Lava (impassable, non-buildable, shootable)
O - Road
O[SNW] - Snowy Road
O[SND] - Sandy Road
S* - Start (S1, S2...) [Portal]
E* - End (E1, E2...) [Tree]
W - Water (impassable, non-buildable, shootable)
M - Mountain (impassable, non-buildable, non-shootable)
- - Air(impassable, non-buildable, shootable)
Pre-Beta IV:
SND[Cactus-1..4] - cant build towers, blocks arrows
SND[Bone-1..3]   - cant build towers, doesnt block arrows
SND[Palm-1..2]   - cant build towers, blocks arrows
"TODO: SND[Cactus] - cant build towers, blocks arrows",
"TODO: SND[Palm] - cant build towers, blocks arrows",
"TODO: SND[Bone] - cant build towers, doesnt block arrows",
"TODO: X[Tree] - cant build towers, blocks arrows",
"TODO: SNW[Tree] - cant build towers, blocks arrows",
"TODO: SND[Palm] - cant build towers, blocks arrows",
*/
/*
_preRenderSnowLow
Tile: SNW
Graphics: Low
*/
function _preRenderSnowLow(tileSize) {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = tileSize;
    offCanvas.height = tileSize;
    const ctx = offCanvas.getContext("2d");

    // 1. ZÁKLAD – necháváme
    ctx.fillStyle = '#b8c9d9';
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 2. TEXTURA – méně bodů, žádná bílá
    for (let i = 0; i < 120; i++) {
        const x = Math.random() * tileSize;
        const y = Math.random() * tileSize;

        ctx.fillStyle = Math.random() > 0.6
            ? 'rgba(200, 215, 230, 0.25)'
            : 'rgba(70, 100, 130, 0.20)';

        ctx.fillRect(x, y, 1, 1);
    }

    // 3A. STÍN – pravý dolní roh (původní, ale jemnější)
    const shadowBR = ctx.createRadialGradient(
        tileSize, tileSize, 0,
        tileSize, tileSize, tileSize
    );
    shadowBR.addColorStop(0, 'rgba(0, 40, 80, 0.10)');
    shadowBR.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shadowBR;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 3B. STÍN – nový levý horní roh (jemný, aby nepálil)
    const shadowTL = ctx.createRadialGradient(
        0, 0, 0,
        0, 0, tileSize * 0.9
    );
    shadowTL.addColorStop(0, 'rgba(0, 30, 60, 0.08)');
    shadowTL.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shadowTL;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 4. KRYSTALY – méně, žádná čistá bílá
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * tileSize;
        const y = Math.random() * tileSize;

        ctx.fillStyle = 'rgba(230, 240, 255, 0.7)';
        ctx.fillRect(x, y, 1, 1);

        if (Math.random() > 0.8) {
            ctx.fillStyle = 'rgba(0, 100, 255, 0.15)';
            ctx.fillRect(x - 1, y, 3, 1);
            ctx.fillRect(x, y - 1, 1, 3);
        }
    }

    // 5. HRANA – jemnější
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, tileSize, tileSize);

    return offCanvas;
}

/*
_preRenderSnowHigh
Tile: SNW
Graphics: High
*/
function  _preRenderSnowHigh(tileSize) {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = tileSize;
    offCanvas.height = tileSize;
    const ctx = offCanvas.getContext("2d");

    // 1. ZÁKLAD: Mnohem tmavší "matná" modro-šedá
    // V HDR bude tato barva vypadat jako "normální bílá", 
    // což nám umožní vykreslit vločky ještě světleji.
    ctx.fillStyle = '#b8c9d9'; 
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 2. TEXTURA POVRCHU (Vysoký kontrast)
    for (let i = 0; i < 350; i++) {
        const x = Math.random() * tileSize;
        const y = Math.random() * tileSize;
        
        // Používáme výraznější tmavé body pro simulaci stínů mezi zrnky
        ctx.fillStyle = Math.random() > 0.6 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(60, 90, 120, 0.3)';
        ctx.fillRect(x, y, 1.2, 1.2);
    }

    // 3. HLUBOKÉ STÍNY (Závěje)
    // Přidáme tmavší gradienty, které HDR nerozpije
    const shadowGrad = ctx.createRadialGradient(tileSize, tileSize, 0, tileSize, tileSize, tileSize);
    shadowGrad.addColorStop(0, 'rgba(0, 40, 80, 0.15)');
    shadowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 4. HDR-READY KRYSTALY
    // Místo velkých ploch použijeme mikroskopické, ale velmi kontrastní body
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * tileSize;
        const y = Math.random() * tileSize;
        
        // Ostrý bílý bod (v HDR bude svítit)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 1);
        
        // Temně modrý "halo" efekt kolem krystalu (vytvoří umělý kontrast)
        if (Math.random() > 0.8) {
            ctx.fillStyle = 'rgba(0, 100, 255, 0.4)';
            ctx.fillRect(x - 1, y, 3, 1);
            ctx.fillRect(x, y - 1, 1, 3);
        }
    }

    // 5. ZVÝRAZNĚNÉ HRANY
    // V HDR splývají dlaždice dohromady, proto přidáme tmavou linku na spodek
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, tileSize, tileSize);

    return offCanvas;
}

/*
_preRenderSandLow
Tile: SND
Graphics: Low
*/
function  _preRenderSandLow(tileSize) {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = tileSize;
    offCanvas.height = tileSize;
    const ctx = offCanvas.getContext("2d");

    // 1. Jednoduchý základ – tlumená písková
    ctx.fillStyle = '#d8c27a'; // méně sytá, méně pěkná
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 2. Velmi řídká textura – jen pár zrnek
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * tileSize;
        const y = Math.random() * tileSize;

        const opacity = 0.05 + Math.random() * 0.08;
        ctx.fillStyle = Math.random() > 0.7
            ? `rgba(140, 110, 60, ${opacity})`
            : `rgba(255, 255, 255, ${opacity * 0.4})`;

        ctx.fillRect(x, y, 1.2, 1.2);
    }

    // 3. Žádné duny – jen velmi slabý náznak
    const dune = ctx.createLinearGradient(0, 0, tileSize, tileSize);
    dune.addColorStop(0, 'rgba(0,0,0,0)');
    dune.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = dune;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 4. Žádné AO, žádné hrany – opravdu low quality
    return offCanvas;
}

/*
_preRenderSandHigh
Tile: SND
Graphics: High
*/
function _preRenderSandHigh(tileSize) {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = tileSize;
    offCanvas.height = tileSize;
    const ctx = offCanvas.getContext("2d");

    // 1. Základní barva - bohatší žlutohnědá
    ctx.fillStyle = '#eecd7d';
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 2. Textura zrnek (vysoká hustota)
    for (let i = 0; i < 400; i++) {
        const x = Math.random() * tileSize;
        const y = Math.random() * tileSize;
        const opacity = Math.random() * 0.2;
        // Náhodně tmavší hnědá nebo světlejší žlutá zrnka
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(139, 69, 19, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(x, y, 1.2, 1.2);
    }

    // 3. Efekt větrných dun (více vrstev gradientů)
    const dune = ctx.createLinearGradient(0, 0, tileSize, tileSize * 0.5);
    dune.addColorStop(0, 'rgba(0,0,0,0)');
    dune.addColorStop(0.3, 'rgba(180, 130, 40, 0.15)'); // Stín duny
    dune.addColorStop(0.5, 'rgba(255, 240, 150, 0.2)'); // Vrcholek duny (osvětlený)
    dune.addColorStop(0.7, 'rgba(0,0,0,0)');
    ctx.fillStyle = dune;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 4. Teplý okraj (Ambient Occlusion)
    // Horní/Levý okraj zesvětlíme (světlo), Dolní/Pravý ztmavíme (stín)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, tileSize, tileSize);
    
    ctx.strokeStyle = 'rgba(120, 80, 20, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.stroke();

    return offCanvas;
}

/*
_drawBurnedGround
Tile: S*
Graphics: High
*/
function _drawBurnedGround(ctx, x, y) {
    const ts = this.tileSize;
    const s0 = ((x / ts) | 0) * 1234 ^ ((y / ts) | 0) * 5678;
    let si = 1;
    const rng = this.editorMode
        ? () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1
        : () => Math.random();

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ts, ts);
    ctx.clip();
    ctx.translate(x, y);

    // 1. BASE: Deep Scorched Red with Grain
    ctx.fillStyle = "#3b0704";
    ctx.fillRect(0, 0, ts, ts);

    // Add subtle noise/charcoal texture
    ctx.globalAlpha = 0.2;
    for(let i=0; i<15; i++) {
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(rng()*ts, rng()*ts, rng()*15, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 2. MOLTEN CRACKS: Multi-pass stroke for "Glow"
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff3300";
    ctx.strokeStyle = "#ff7700";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        let curX = rng() * ts;
        let curY = rng() * ts;
        ctx.moveTo(curX, curY);
        for(let j = 0; j < 4; j++) {
            curX += (rng() - 0.5) * 35;
            curY += (rng() - 0.5) * 35;
            ctx.lineTo(curX, curY);
        }
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 3. AMBIENT HEAT: Multi-stage Gradient
    const heat = ctx.createRadialGradient(ts/2, ts/2, 5, ts/2, ts/2, ts);
    heat.addColorStop(0, "rgba(255, 69, 0, 0.4)");
    heat.addColorStop(0.4, "rgba(139, 0, 0, 0.2)");
    heat.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    ctx.fillStyle = heat;
    ctx.fillRect(0, 0, ts, ts);

    // 4. FLOATING EMBERS: Glowing particles
    for (let i = 0; i < 15; i++) {
        const size = rng() * 2.5;
        ctx.fillStyle = rng() > 0.5 ? "#ffcc00" : "#ff4400";
        ctx.globalAlpha = rng();
        ctx.beginPath();
        ctx.arc(rng()*ts, rng()*ts, size, 0, Math.PI*2);
        ctx.fill();
    }

    ctx.restore();
}

/*
_drawBurnedGroundLow
Tile: S*
Graphics: Low
*/
function _drawBurnedGroundLow(ctx, x, y) {
    const ts = this.tileSize;
    const s0 = ((x / ts) | 0) * 1234 ^ ((y / ts) | 0) * 5678;
    let si = 1;
    const rng = this.editorMode
        ? () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1
        : () => Math.random();

    // 0. Pozadí – jednolitá hnědá (#422006)
    ctx.fillStyle = "#422006";
    ctx.fillRect(x, y, ts, ts);

    // 1. Jemný spálený flek (tmavý uprostřed, mizí do hnědé)
    const grad = ctx.createRadialGradient(
        x + ts/2, y + ts/2, ts * 0.1,
        x + ts/2, y + ts/2, ts * 0.55
    );
    grad.addColorStop(0, "rgba(20,20,20,0.9)");
    grad.addColorStop(0.6, "rgba(0,0,0,0.35)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, ts, ts);

    // 2. Jemné saze – malé, nenápadné
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (let i = 0; i < 10; i++) {
        const px = x + rng() * ts;
        const py = y + rng() * ts;
        const r = rng() * 1.5;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

/*
_drawHolyGround
Tile: E*
Graphics: High
*/
function _drawHolyGround(ctx, x, y) {
    const ts = this.tileSize;
    const s0 = ((x / ts) | 0) * 1234 ^ ((y / ts) | 0) * 5678;
    let si = 1;
    const rng = this.editorMode
        ? () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1
        : () => Math.random();

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ts, ts);
    ctx.clip();
    ctx.translate(x, y);

    // 1. BASE: Rich Earthy Mahogany (provides depth)
    ctx.fillStyle = "#2d1a05";
    ctx.fillRect(0, 0, ts, ts);

    const leafColors = ["#eab308", "#ca8a04", "#854d0e"];

    // 2. LEAF CARPET: 260 Leaves with Depth
    for (let i = 0; i < 260; i++) {
        const lx = rng() * ts;
        const ly = rng() * ts;
        const rot = rng() * Math.PI;
        const color = leafColors[Math.floor(rng() * leafColors.length)];

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);

        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 2;
        ctx.shadowOffsetY = 1;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5 + rng()*3, 2 + rng()*2, 0, 0, Math.PI * 2);
        ctx.fill();

        if (i % 10 === 0) {
            ctx.fillStyle = "#fef08a";
            ctx.fillRect(-2, -1, 2, 1);
        }

        ctx.restore();
    }

    // 3. DIVINE BLOOM: Soft radiant "God-light"
    ctx.globalCompositeOperation = "screen";
    const bloom = ctx.createRadialGradient(ts/2, ts/2, 0, ts/2, ts/2, ts * 0.9);
    bloom.addColorStop(0, "rgba(254, 240, 138, 0.4)");
    bloom.addColorStop(0.5, "rgba(234, 179, 8, 0.1)");
    bloom.addColorStop(1, "transparent");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, ts, ts);

    // 4. HOLY MOTE PARTICLES: Magic sparkles
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < 8; i++) {
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = rng() * 0.6;
        const px = rng() * ts;
        const py = rng() * ts;
        ctx.fillRect(px, py, 1.5, 1.5);
        ctx.fillRect(px - 1, py + 1, 3.5, 0.5);
    }

    ctx.restore();
}

/*
_drawHolyGroundLow
Tile: E*
Graphics: Low
*/
function _drawHolyGroundLow(ctx, x, y) {
    const ts = this.tileSize;
    const s0 = ((x / ts) | 0) * 1234 ^ ((y / ts) | 0) * 5678;
    let si = 1;
    const rng = this.editorMode
        ? () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1
        : () => Math.random();

    // 0. Pozadí – jemná zlatohnědá
    ctx.fillStyle = "#5a3a0a";
    ctx.fillRect(x, y, ts, ts);

    // 1. Jemný "svatý" flek uprostřed
    const grad = ctx.createRadialGradient(
        x + ts/2, y + ts/2, ts * 0.1,
        x + ts/2, y + ts/2, ts * 0.55
    );
    grad.addColorStop(0, "rgba(255, 230, 120, 0.45)");
    grad.addColorStop(0.5, "rgba(255, 200, 80, 0.15)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, ts, ts);

    // 2. Pár jemných "světelných teček"
    ctx.fillStyle = "rgba(255,255,200,0.6)";
    for (let i = 0; i < 6; i++) {
        const px = x + rng() * ts;
        const py = y + rng() * ts;
        ctx.beginPath();
        ctx.arc(px, py, rng() * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

/*
_drawNaturalFlower
Tile: X
Graphics: High
*/
function _drawNaturalFlower(ctx, color) {
      // 1. Organic Ground Shadow (Soft and slightly offset)
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(0.8, 0.8, 2.8, 2.2, Math.PI/4, 0, Math.PI * 2);
      ctx.fill();

      // 2. Petal Layers
      for(let k = 0; k < 5; k++) {
          ctx.save();
          ctx.rotate((Math.PI * 2) / 5 * k);

          // A. Petal Gradient (Darker at the base, brighter at the tip)
          const pGrad = ctx.createRadialGradient(0, 0, 0, 2, 0, 3);
          pGrad.addColorStop(0, this._adjustColor(color, -20)); // Deep center
          pGrad.addColorStop(1, color); // Bright edge

          ctx.fillStyle = pGrad;
          ctx.beginPath();
          // Use an irregular ellipse for more natural look
          ctx.ellipse(1.8, 0, 2.0, 1.4, 0.1, 0, Math.PI * 2);
          ctx.fill();

          // B. Subtle Petal Vein (Small highlight line)
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(0.5, 0);
          ctx.lineTo(2.5, 0);
          ctx.stroke();

          ctx.restore();
      }

      // 3. 3D Flower Center (Pollen Core)
      // Dark base for depth
      ctx.fillStyle = "#854d0e";
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Bright Pollen dots
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(-0.3, -0.3, 1.1, 0, Math.PI * 2); // Slightly offset for light source
      ctx.fill();

      // Tiny detail dots
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(0.2, 0.2, 0.6, 0.6);
      ctx.fillRect(-0.5, 0.4, 0.5, 0.5);
    }

/*
_adjustColor
Tile: X
*/
function _adjustColor(hex, amt) {
        let usePound = false;
        if (hex[0] == "#") { hex = hex.slice(1); usePound = true; }
        let num = parseInt(hex, 16);
        let r = (num >> 16) + amt;
        let g = (num >> 8 & 0x00FF) + amt;
        let b = (num & 0x0000FF) + amt;
        r = Math.max(Math.min(255, r), 0);
        g = Math.max(Math.min(255, g), 0);
        b = Math.max(Math.min(255, b), 0);
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }

/*
_drawMarker
Tile: E*, S* (Editor)
*/
function _drawMarker(ctx, x, y, color, label, subtext = "") {
      const size = this.tileSize * 0.6;
      ctx.save();
      ctx.translate(x, y);

      // 1. Outer Glow/Shadow
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;

      // 2. Stone Plate (3D look)
      ctx.fillStyle = "#334155"; // Dark stone base
      this.roundRect(ctx, -size/2, -size/2, size, size, 8, true, false);

      // 3. Colored Inset
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      this.roundRect(ctx, -size/2 + 4, -size/2 + 4, size - 8, size - 8, 4, true, false);
      ctx.globalAlpha = 1.0;

      // 4. Text Labels
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = `bold ${this.tileSize * 0.18}px Arial`;
      ctx.fillText(label, 0, 5);

      if (subtext) {
          ctx.font = `${this.tileSize * 0.12}px Arial`;
          ctx.fillText(subtext, 0, 18);
      }

      ctx.restore();
    }

/*
_drawAAAStone
Tile: O
*/
function _drawAAAStone(ctx, x, y, size, rotation, color, variation) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        const w = size;
        const h = size * 0.8;

        // 1. SHADOW (Grounds the stone)
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        this.roundRect(ctx, -w/2 + 2, -h/2 + 2, w, h, 4, true);

        // 2. STONE
        ctx.fillStyle = color;
        this.roundRect(ctx, -w/2, -h/2, w, h, 4, true);

        // 3. AAA SHARP HIGHLIGHT (The "Pro" Look)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-w/2 + 4, -h/2 + 1);
        ctx.lineTo(w/2 - 4, -h/2 + 1);
        ctx.stroke();

        ctx.restore();
    }

/*
_drawMagicPortal
Tile: S*
*/
function _drawMagicPortal(ctx, x, y, performanceTime) {
        const time = (typeof performanceTime === 'number' && isFinite(performanceTime))
                     ? performanceTime
                     : performance.now();

        // NOVÉ PEKELNÉ BARVY
        const fireLight = "#fef08a";
        const fireMid = "#ef4444";
        const fireDark = "#7f1d1d";
        const obsidianBlack = "#0a0a0a";

        ctx.save();
        ctx.translate(x, y);

        // --- 1. VRSTVA: ŽHNOUCÍ RADIÁLNÍ ZÁŘE ---
        const pulse = Math.sin(time / 400) * 10;
        const baseGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 60 + pulse);
        baseGlow.addColorStop(0, "rgba(127, 29, 29, 0.5)"); // fireDark s opacitou
        baseGlow.addColorStop(0.7, "rgba(239, 68, 68, 0.2)"); // fireMid s opacitou
        baseGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = baseGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 70 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // --- 2. VRSTVA: ROTUJÍCÍ OBSIDIÁNOVÉ KAMENY ---
        const stoneCount = 8;
        for (let i = 0; i < stoneCount; i++) {
            ctx.save();
            const angle = (time / 3000) + (i * (Math.PI * 2 / stoneCount));
            const float = Math.sin((time / 600) + i) * 4;
            ctx.rotate(angle);

            // Stín
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(38 + float, 2, 12, 12);

            // Kámen (Obsidián)
            ctx.fillStyle = obsidianBlack;
            ctx.fillRect(35 + float, -5, 10, 10);

            // Žhnoucí runa (Oheň)
            const runeOpacity = 0.5 + Math.sin((time / 200) + i) * 0.5;
            ctx.globalAlpha = runeOpacity;
            ctx.shadowBlur = 15;
            ctx.shadowColor = fireMid;
            ctx.fillStyle = fireLight;
            ctx.fillRect(38 + float, -2, 4, 4);
            ctx.restore();
        }

        // --- 3. VRSTVA: OHNIVÝ VÍR ---
        ctx.save();
        ctx.rotate(-time / 800);
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.rotate((Math.PI * 2) / 3);
            const grad = ctx.createLinearGradient(10, 0, 30, 0);
            grad.addColorStop(0, fireLight);
            grad.addColorStop(1, "transparent");
            ctx.strokeStyle = grad;
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.arc(0, 0, 18 + (i * 2), 0, Math.PI * 0.8);
            ctx.stroke();
        }
        ctx.restore();

        // --- 4. VRSTVA: ŽHAVÉ JISKRY ---
        for (let i = 0; i < 8; i++) {
            const seed = i * 1.5;
            const pTime = (time * 0.05 + seed * 100) % 100;
            const opacity = 1 - (pTime / 100);
            const distance = (pTime / 100) * 50;
            const pAngle = seed + (time / 2000);

            const px = Math.cos(pAngle) * distance;
            const py = Math.sin(pAngle) * distance - (pTime * 0.2);

            ctx.globalAlpha = opacity;
            ctx.fillStyle = fireLight;
            ctx.shadowBlur = 8;
            ctx.shadowColor = fireMid;
            ctx.beginPath();
            ctx.arc(px, py, 2.5 * opacity, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- 5. VRSTVA: JÁDRO (Brána do pekel) ---
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        coreGrad.addColorStop(0, "#000000");
        coreGrad.addColorStop(0.6, fireDark);
        coreGrad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

/*
_drawMagicPortalHigh
Tile: S*
Graphics: High
*/
function _drawMagicPortalHigh(ctx, x, y, time) {
    const obsidian = "#050505",
          bloodRed = "#7a0000",
          brightRed = "#ff0000",
          fireOrange = "#f97316",
          lightningYellow = "#fef08a",
          sparkWhite = "#ffffff";

    // --- NEW: UNIQUE SEED PER PORTAL ---
    // We use the X and Y coordinates to create a unique number for THIS portal
    const portalSeed = Math.abs(Math.sin(x * 12.9898 + y * 78.233));

    ctx.save();
    ctx.translate(x, y);

    // Use the seed to offset the pulse so they don't all "breathe" at the same time
    const pulse = Math.sin((time / 250) + (portalSeed * 10));

    // --- 1. THE DARK SINGULARITY (Core) ---
    ctx.save();
    const coreSize = 22 + (pulse * 2);
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
    coreGrad.addColorStop(0, "#63130a");
    coreGrad.addColorStop(0.7, obsidian);
    coreGrad.addColorStop(1, "transparent");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreSize + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- 2. FLOATING ORANGE SEGMENTS (3 Parts) ---
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = fireOrange;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = fireOrange;
    // Rotate slightly different per portal
    const segmentRotation = (time / 1000) + (portalSeed * Math.PI);
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(segmentRotation + (i * Math.PI * 2 / 3));
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 0.33);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();

    // --- 3. THE MID VORTEX (Whipping Red Fire) ---
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate(((time / 150) * (1 + i * 0.1)) + portalSeed);
        const radius = 32 + (i * 3.5);
        const fireGrad = ctx.createLinearGradient(radius, -15, radius, 15);
        fireGrad.addColorStop(0, "transparent");
        fireGrad.addColorStop(0.5, i > 3 ? brightRed : bloodRed);
        fireGrad.addColorStop(1, "transparent");
        ctx.strokeStyle = fireGrad;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 0.5);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();

    // --- 4. THE OUTER CIRCLE (White Sparks & Runes) ---
    ctx.save();
    for (let i = 0; i < 15; i++) {
        const angle = (i * Math.PI * 2) / 15 + (time * 0.0008) + portalSeed;
        const r = 48 + (Math.sin(time / 400 + i) * 3);
        ctx.globalAlpha = 0.4 + (Math.sin(time / 300 + i) * 0.4);
        ctx.fillStyle = sparkWhite;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // --- 5. YELLOW LIGHTNING (Unsynced via X/Y) ---
    const strikeInterval = 1500;
    const strikeDuration = 200;
    const stoneCount = 10;

    // Use portalSeed to offset the strike timing
    const localPortalTime = time + (portalSeed * 5000);

    if (localPortalTime % strikeInterval < strikeDuration) {
        ctx.save();
        ctx.strokeStyle = lightningYellow;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = fireOrange;
        ctx.globalCompositeOperation = "lighter";

        // Strike cycle ID
        const strikeID = Math.floor(localPortalTime / strikeInterval);

        // Pick a rock index based on the Strike ID AND the Portal Seed
        const rockPseudoRand = Math.abs(Math.sin(strikeID + portalSeed * 100));
        const rockIndex = Math.floor(rockPseudoRand * stoneCount);

        const rockAngle = (-time / 2500) + (rockIndex * (Math.PI * 2 / stoneCount));
        const rockOrbit = 60 + (Math.sin(time / 800 + rockIndex) * 4);

        const targetX = Math.cos(rockAngle) * rockOrbit;
        const targetY = Math.sin(rockAngle) * rockOrbit;

        ctx.beginPath();
        ctx.moveTo(0, 0);

        const segments = 2;
        for (let s = 1; s <= segments; s++) {
            let nextX = (targetX / segments) * s;
            let nextY = (targetY / segments) * s;
            if (s < segments) {
                nextX += (Math.random() - 0.5) * 15;
                nextY += (Math.random() - 0.5) * 15;
            }
            ctx.lineTo(nextX, nextY);
        }

        ctx.globalAlpha = Math.random() > 0.2 ? 1.0 : 0.4;
        ctx.stroke();
        // Add impact glow at the rock position
        ctx.fillStyle = lightningYellow;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // --- 6. OBSIDIAN ROCKS ---
    for (let i = 0; i < stoneCount; i++) {
        ctx.save();
        const angle = (-time / 2500) + (i * (Math.PI * 2 / stoneCount));
        const orbit = 60 + (Math.sin(time / 800 + i) * 4);
        ctx.translate(Math.cos(angle) * orbit, Math.sin(angle) * orbit);
        ctx.rotate(angle + time / 600);
        ctx.fillStyle = obsidian;
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#000";
        ctx.beginPath();
        ctx.moveTo(-4, -2);
        ctx.lineTo(1, -7);
        ctx.lineTo(6, 1);
        ctx.lineTo(-1, 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = bloodRed;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

/*
_drawMagicPortalLow
Tile: S*
Graphics: Low
*/
function _drawMagicPortalLow(ctx, x, y, time) {
    const fireLight = "#fef08a", fireMid = "#ef4444", obsidian = "#0a0a0a";
    ctx.save();
    ctx.translate(x, y);

    // 1. Simple Pulse
    const pulse = Math.sin(time / 400) * 5;
    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.beginPath(); ctx.arc(0, 0, 45 + pulse, 0, Math.PI * 2); ctx.fill();

    // 2. Simplified Stones (Only 4, no shadowBlur)
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((time / 3000) + (i * Math.PI / 2));
        ctx.fillStyle = obsidian;
        ctx.fillRect(35, -5, 10, 10);
        ctx.fillStyle = fireLight;
        ctx.fillRect(38, -2, 4, 4); // Static rune
        ctx.restore();
    }

    // 3. Bright Core
    ctx.fillStyle = fireMid;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fireLight;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

/*
_preRenderTreeLow
Tile: E*
Graphics: Low
*/
function _preRenderTreeLow(tileSize) {
    const ts = tileSize;
    const canvasSize = Math.round(ts * 2.8);
    const offCanvas = document.createElement("canvas");
    offCanvas.width = ts * 2.5;
    offCanvas.height = canvasSize;
    const ctx = offCanvas.getContext("2d");

    const cx = offCanvas.width / 2;
    const cy = canvasSize * 0.85;

    // 1. SIMPLE SHADOW
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.beginPath();
    ctx.arc(cx, cy, ts * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 2. SIMPLE TRUNK (Straight lines)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx - 5, cy - ts * 1.2);
    ctx.lineTo(cx + 5, cy - ts * 1.2);
    ctx.lineTo(cx + 8, cy);
    ctx.fill();

    // 3. LEAF CLUSTERS — slight random tint and size so each session looks unique.
    //    In editor mode the constructor's LCG makes these calls deterministic.
    const colorPalettes = [
        ["#eab308", "#ca8a04"],
        ["#f59e0b", "#d97706"],
        ["#84cc16", "#65a30d"],
        ["#f97316", "#ea580c"],
    ];
    const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
    const sizeVariance = 0.85 + Math.random() * 0.3; // 85%–115% of base radius

    const leafClusters = [
        { x: cx, y: cy - ts * 1.4, r: ts * 0.5 * sizeVariance },
        { x: cx - ts * 0.35, y: cy - ts * 1.1, r: ts * 0.4 * sizeVariance },
        { x: cx + ts * 0.35, y: cy - ts * 1.1, r: ts * 0.4 * sizeVariance }
    ];

    leafClusters.forEach((cluster, i) => {
        ctx.fillStyle = palette[i % palette.length];
        ctx.beginPath();
        ctx.arc(cluster.x, cluster.y, cluster.r, 0, Math.PI * 2);
        ctx.fill();
    });

    return offCanvas;
  }

/*
_preRenderTreeHigh
Tile: E*
Graphics: High
*/
function _preRenderTreeHigh(tileSize) {
    const ts = tileSize;
    const canvasSize = Math.round(ts * 3.0);
    const offCanvas = document.createElement("canvas");
    offCanvas.width = ts * 2.5;
    offCanvas.height = canvasSize;
    const ctx = offCanvas.getContext("2d");

    const cx = offCanvas.width / 2;
    const cy = canvasSize * 0.88;

    // --- 1. DEEP GROUND SHADOW ---
    const shadowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 0.8);
    shadowGrad.addColorStop(0, "rgba(0,0,0,0.45)");
    shadowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, ts * 0.8, ts * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- 2. MAIN TRUNK BODY ---
    const trunkGrad = ctx.createLinearGradient(cx - 20, 0, cx + 20, 0);
    trunkGrad.addColorStop(0, "#cbd5e1");
    trunkGrad.addColorStop(0.3, "#ffffff");
    trunkGrad.addColorStop(1, "#94a3b8");
    ctx.fillStyle = trunkGrad;

    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    // Left side & Mid Branch
    ctx.quadraticCurveTo(cx - 5, cy - ts * 0.5, cx - 8, cy - ts * 0.7);
    ctx.lineTo(cx - 22, cy - ts * 0.8);
    ctx.lineTo(cx - 18, cy - ts * 0.85);
    ctx.quadraticCurveTo(cx - 8, cy - ts * 0.75, cx - 8, cy - ts * 1.1);
    // Top Branching
    ctx.lineTo(cx - 28, cy - ts * 1.45);
    ctx.lineTo(cx - 22, cy - ts * 1.55);
    ctx.quadraticCurveTo(cx, cy - ts * 1.2, cx + 22, cy - ts * 1.55);
    ctx.lineTo(cx + 28, cy - ts * 1.45);
    // Right side back down
    ctx.quadraticCurveTo(cx + 5, cy - ts * 0.8, cx + 10, cy);
    ctx.fill();

    // --- 3. IMPRESSIVE GNARLED ROOTS (3D Overlay) ---
    const drawGnarledRoot = (xOff, yOff, targetX, targetY, thick) => {
        ctx.save();
        const rGrad = ctx.createLinearGradient(cx + xOff, 0, targetX, 0);
        rGrad.addColorStop(0, "#ffffff");
        rGrad.addColorStop(1, "#64748b");
        ctx.fillStyle = rGrad;

        ctx.beginPath();
        ctx.moveTo(cx + xOff - thick, cy + yOff);
        // Create an organic "S" curve for the root
        ctx.bezierCurveTo(
            cx + xOff + (targetX - cx) * 0.5, cy + yOff + 10,
            targetX - (targetX - cx) * 0.2, cy + targetY - 5,
            targetX, cy + targetY
        );
        ctx.lineTo(targetX + thick * 0.5, cy + targetY);
        ctx.bezierCurveTo(
            targetX - (targetX - cx) * 0.2, cy + targetY,
            cx + xOff + (targetX - cx) * 0.5 + thick, cy + yOff + 10,
            cx + xOff + thick, cy + yOff
        );
        ctx.fill();
        ctx.restore();
    };

    // Draw roots that look like they wrap around and pull the tree down
    drawGnarledRoot(-8, -15, cx - 35, 8, 7);  // Heavy Left Root
    drawGnarledRoot(6, -12, cx + 32, 10, 6);  // Heavy Right Root
    drawGnarledRoot(-2, -8, cx - 5, 12, 8);   // Front Center Root
    drawGnarledRoot(3, -20, cx + 15, 6, 4);   // Smaller Side Root

    // Bark Texture (birch knots)
    ctx.fillStyle = "#1e293b";
    for(let i = 0; i < 22; i++) {
        const yPos = cy - (i * ts * 0.08) - 5;
        const xOff = Math.sin(i * 2.5) * 4;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(cx + xOff - 5, yPos, 9, 1.3);
    }
    ctx.globalAlpha = 1.0;

    // --- 4. DENSE LEAF CLUSTERS ---
    const leafClusters = [
        { x: cx, y: cy - ts * 1.5, r: ts * 0.5 },
        { x: cx - ts * 0.45, y: cy - ts * 1.35, r: ts * 0.4 },
        { x: cx + ts * 0.45, y: cy - ts * 1.35, r: ts * 0.4 },
        { x: cx - ts * 0.5, y: cy - ts * 0.85, r: ts * 0.3 },
        { x: cx + ts * 0.2, y: cy - ts * 1.05, r: ts * 0.3 }
    ];

    leafClusters.forEach(cluster => {
        for (let i = 0; i < 90; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.pow(Math.random(), 0.6) * cluster.r;
            const lx = cluster.x + Math.cos(angle) * dist;
            const ly = cluster.y + Math.sin(angle) * dist;
            const leafSize = 2.5 + Math.random() * 4.5;
            const colors = ["#fbbf24", "#f59e0b", "#d97706", "#78350f", "#fef08a"];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(Math.random() * Math.PI);
            ctx.beginPath();
            ctx.ellipse(0, 0, leafSize, leafSize * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    });

    return offCanvas;
}

/*
_drawLifeTree
Tile: E*
*/
function _drawLifeTree(ctx, x, y, currentLifes) {
    if (!this.cachedTree) return;
    if (currentLifes <= 0) {
        ctx.fillStyle = "#1a1a1a"; // Mrtvý kmen
        ctx.fillRect(x - 6, y - this.tileSize * 0.5, 12, this.tileSize * 0.6);
        return;
    }

    // Centrování na patu stromu
    const drawX = ~~(x - this.cachedTree.width / 2);
    const drawY = ~~(y - this.cachedTree.height * 0.85);

    ctx.drawImage(this.cachedTree, drawX, drawY);
  }

/*
_drawRootBase
Tile: E*
*/
function _drawRootBase(ctx, cx, cy) {
    const ts = this.tileSize;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 5;
    ctx.shadowColor = "rgba(0,0,0,0.3)";

    // Vykreslíme 4-5 náběhů kořenů do hvězdice
    for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((Math.PI * 2 / 5) * i + 0.5);

        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.quadraticCurveTo(0, ts * 0.4, 15, ts * 0.45); // Kořen se rozlézá do dálky
        ctx.lineTo(5, ts * 0.45);
        ctx.quadraticCurveTo(0, ts * 0.2, 5, 0);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
  }

/*
_preRenderMountainSet
Tile: M
*/
function _preRenderMountainSet(ts) {
    if (this.editorMode) {
      return [this._preRenderMountainParts(ts, 1.0)];
    }

    const variations = [];
    for (let i = 0; i < 5; i++) {

        // --- EDIT THESE NUMBERS ---
        const minHeight = 0.8; // 80% of original size
        const maxHeight = 1.3; // 130% of original size

        const hMult = minHeight + (Math.random() * (maxHeight - minHeight));

        variations.push(this._preRenderMountainParts(ts, hMult));
    }
    return variations;
  }

/*
_preRenderMountainParts
Tile: M
*/
function _preRenderMountainParts(ts, hMult = 1.0) {
    const h = ts * 1.6;
    const createPart = () => {
        const canvas = document.createElement("canvas");
        canvas.width = ts;
        canvas.height = h;
        return { canvas, ctx: canvas.getContext("2d") };
    };

    const parts = { main: createPart(), left: createPart(), right: createPart(), bg: createPart() };

    // Apply the multiplier to the mountain heights
    const mainH = (h * 0.85) * hMult;
    const connectH = (h * 0.55) * 1.0;

    // Use your drawFixedPeak method to draw into the canvases
    this.drawFixedPeak(parts.main.ctx, ts * 0.5, h, 0, ts, mainH, true);
    this.drawFixedPeak(parts.left.ctx, 0, h, -ts * 0.5, ts * 0.5, connectH, false);
    this.drawFixedPeak(parts.right.ctx, ts, h, ts * 0.5, ts * 1.5, connectH, false);

    // Draw the Fog/Mist background part
    const fogGrad = parts.bg.ctx.createLinearGradient(0, h - ts * 1.2, 0, h);
    fogGrad.addColorStop(0, "rgba(255, 255, 255, 0)"); // Transparent top
    fogGrad.addColorStop(0.5, "rgba(203, 213, 225, 0.5)"); // Mist middle
    fogGrad.addColorStop(1, "rgba(15, 23, 42, 0.8)"); // Dark base to blend with ground
    parts.bg.ctx.fillStyle = fogGrad;
    parts.bg.ctx.fillRect(0, h - ts * 1.2, ts, ts * 1.2);
    parts.bg.ctx.fillStyle = fogGrad;
    parts.bg.ctx.fillRect(0, h - ts, ts, ts);

    return {
        main: parts.main.canvas,
        left: parts.left.canvas,
        right: parts.right.canvas,
        bg: parts.bg.canvas
    };
  }

/*
_preRenderMountainHigh
Tile: M
Graphics: High
*/
function _preRenderMountainHigh(ts) {
    const h = ts * 1.6;
    const canvas = document.createElement("canvas");
    canvas.width = ts;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    const drawNaturalPeak = (x, y, pW, pH, colors, isSharp) => {
        ctx.save();
        const segments = 6;
        const pts = [];
        // Create jagged points for a realistic ridge
        for (let i = 0; i <= segments; i++) {
            const pct = i / segments;
            const px = x - (pW/2) + (pW * pct);
            let py = y - (isSharp ? Math.sin(Math.PI * pct) : Math.pow(Math.sin(Math.PI * pct), 0.5)) * pH;
            if (i > 0 && i < segments) py += (Math.random() - 0.5) * (pH * 0.1);
            pts.push({x: px, y: py});
        }

        // Draw Rock Body
        ctx.beginPath();
        ctx.moveTo(pts[0].x, y);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length-1].x, y);
        ctx.fillStyle = colors.rock;
        ctx.fill();

        // Draw Jagged Snow (Clip to rock)
        ctx.clip();
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(x - pW/2, y - pH * 0.6); // Snow line
        pts.forEach(p => ctx.lineTo(p.x, p.y)); // Follow ridge
        ctx.fill();
        ctx.restore();
    };

    // 1. Atmosphere Gradient (Valley Fog)
    const fog = ctx.createLinearGradient(0, h-ts, 0, h);
    fog.addColorStop(0, "rgba(226, 232, 240, 0)");
    fog.addColorStop(0.6, "rgba(255, 255, 255, 0.7)");
    fog.addColorStop(1, "rgba(203, 213, 225, 0.2)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, h-ts, ts, ts);

    // 2. The Range (Back to Front)
    drawNaturalPeak(ts * 0.2, h, ts * 0.9, h * 0.45, {rock: "#334155"}, false);
    drawNaturalPeak(ts * 0.8, h, ts * 0.9, h * 0.4, {rock: "#334155"}, true);
    drawNaturalPeak(ts * 0.5, h, ts * 1.2, h * 0.85, {rock: "#1e293b"}, true);

    return canvas;
}

/*
_preRenderMountainLow
Tile: M
Graphics: Low
*/
function _preRenderMountainLow(ts) {
    const h = ts * 1.6;
    const canvas = document.createElement("canvas");
    canvas.width = ts;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    const drawTriangle = (x, y, w, h, color, hasSnow) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - w/2, y);
        ctx.lineTo(x, y - h);
        ctx.lineTo(x + w/2, y);
        ctx.fill();
        if(hasSnow) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.moveTo(x, y - h);
            ctx.lineTo(x + w*0.1, y - h*0.7);
            ctx.lineTo(x - w*0.1, y - h*0.7);
            ctx.fill();
        }
    };

    drawTriangle(ts * 0.3, h, ts * 0.8, h * 0.4, "#475569", false);
    drawTriangle(ts * 0.7, h, ts * 0.8, h * 0.4, "#475569", false);
    drawTriangle(ts * 0.5, h, ts * 1.0, h * 0.8, "#1e293b", true);
    return canvas;
}

/*
drawFixedPeak
Tile: M
*/
function drawFixedPeak(ctx, peakX, peakY, leftX, rightX, pH, isMain) {
    // 1. SETUP COLORS (AAA Palette)
    const sunColor = "#64748b";   // Slate-500 (Lit rock)
    const shadeColor = "#1e293b"; // Slate-800 (Shadow rock)
    const snowColor = "#f1f5f9";  // Slate-100 (White snow)
    const snowShadow = "#cbd5e1"; // Slate-300 (Snow in shadow)

    // Generate the noise pattern if it doesn't exist yet
    if (!this.rockPattern) this.rockPattern = this._createNoisePattern();

    // 2. CALCULATE GEOMETRY
    // We create jagged ridges for the left and right slopes
    const leftRidge = this._getJaggedLine(leftX, peakY, peakX, peakY - pH, 8, 1.5);
    const rightRidge = this._getJaggedLine(peakX, peakY - pH, rightX, peakY, 8, 1.5);

    // 3. DRAW BASE SHAPE (The Body)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(leftRidge[0].x, leftRidge[0].y);
    // Trace up the left side
    for(let p of leftRidge) ctx.lineTo(p.x, p.y);
    // Trace down the right side
    for(let p of rightRidge) ctx.lineTo(p.x, p.y);
    ctx.closePath();

    // FILL: Gradient + Noise Pattern
    // A vertical gradient gives "Atmospheric Perspective" (darker at top, misty at bottom)
    const rockGrad = ctx.createLinearGradient(0, peakY - pH, 0, peakY);
    rockGrad.addColorStop(0, shadeColor);
    rockGrad.addColorStop(1, "#0f172a"); // Darker base
    ctx.fillStyle = rockGrad;
    ctx.fill();

    // Overlay texture
    ctx.fillStyle = this.rockPattern;
    ctx.globalCompositeOperation = "overlay"; // Blends texture beautifully
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = "source-over"; // Reset blend mode
    ctx.restore();

    // 4. DRAW LIGHTING (Fixed: No center line)

    // PART A: The Sun Gradient (The Fill)
    // This needs to be a closed shape so the color fills properly
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(leftRidge[0].x, leftRidge[0].y);
    for(let p of leftRidge) ctx.lineTo(p.x, p.y);
    // Close the shape vertically down the middle for the fill
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(leftRidge[0].x, leftRidge[0].y); // Back to start
    ctx.closePath();

    // Sun gradient (same as before)
    const sunGrad = ctx.createLinearGradient(leftX, 0, peakX, 0);
    sunGrad.addColorStop(0, "rgba(255,255,255,0.15)");
    sunGrad.addColorStop(1, "rgba(0,0,0,0.0)"); // Transparent at the center seam
    ctx.fillStyle = sunGrad;
    ctx.fill();
    ctx.restore();

    // PART B: The Rim Light (The Stroke)
    // We draw this separately so we DON'T stroke the middle line
    ctx.save();
    ctx.beginPath();
    // Start at the bottom left
    ctx.moveTo(leftRidge[0].x, leftRidge[0].y);
    // Trace ONLY the ridge up to the peak
    for(let p of leftRidge) ctx.lineTo(p.x, p.y);
    // Do NOT close the path or draw a line down the middle

    ctx.strokeStyle = "rgba(255,255,255,0.2)"; // Slightly brighter for AAA pop
    ctx.lineWidth = 2;
    ctx.lineCap = 'round'; // Makes the jagged corners smoother
    ctx.stroke();
    ctx.restore();

    // 5. DRAW AAA SNOW CAP
    // Snow shouldn't be a straight line. It should cover the top 35% of the mountain.
    ctx.save();
    ctx.beginPath();

    // Start slightly down the left slope
    const snowStartIdx = Math.floor(leftRidge.length * 0.65);
    const snowEndIdx = Math.ceil(rightRidge.length * 0.35);

    ctx.moveTo(leftRidge[snowStartIdx].x, leftRidge[snowStartIdx].y);

    // Trace up to peak
    for (let i = snowStartIdx; i < leftRidge.length; i++) ctx.lineTo(leftRidge[i].x, leftRidge[i].y);
    // Trace down right side
    for (let i = 0; i < snowEndIdx; i++) ctx.lineTo(rightRidge[i].x, rightRidge[i].y);

    // CLOSE THE BOTTOM OF SNOW WITH "DRIPS"
    // Instead of a straight line, we zigzag back to the start to look like snow drifts
    const snowBottomY = peakY - pH * 0.65;
    ctx.bezierCurveTo(
        peakX + 10, snowBottomY + 10, // Control point 1 (sagging snow)
        peakX - 10, snowBottomY - 5,  // Control point 2
        leftRidge[snowStartIdx].x, leftRidge[snowStartIdx].y // End
    );

    ctx.closePath();

    // Fill Snow
    const snowGrad = ctx.createLinearGradient(0, peakY - pH, 0, peakY - pH * 0.5);
    snowGrad.addColorStop(0, snowColor);
    snowGrad.addColorStop(1, snowShadow);
    ctx.fillStyle = snowGrad;
    ctx.fill();
    ctx.restore();
}

/*
_getJaggedLine
Tile: M
*/
function _getJaggedLine(x1, y1, x2, y2, segments = 5, rough = 2) {
    const points = [{x: x1, y: y1}];

    // Recursive midpoint displacement (simplified for loop)
    let dx = (x2 - x1) / segments;
    let dy = (y2 - y1) / segments;

    for(let i = 1; i < segments; i++) {
        const progress = i / segments;
        // The closer to the center (0.5), the more "jagged" it can be
        const arc = Math.sin(progress * Math.PI);

        points.push({
            x: x1 + dx * i + (Math.random() - 0.5) * (rough * 5 * arc),
            y: y1 + dy * i + (Math.random() - 0.5) * (rough * 10 * arc)
        });
    }
    points.push({x: x2, y: y2});
    return points;
}

/*
_createNoisePattern
Tile: M
*/
function _createNoisePattern() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = "#2d3748"; // Base rock color
    ctx.fillRect(0,0,64,64);

    // Add noise
    for(let i=0; i<400; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
        ctx.fillRect(Math.random()*64, Math.random()*64, 2, 2);
    }
    return ctx.createPattern(canvas, 'repeat');
}

/*
_generateGrassTiles
Tile: X
Graphics: High
*/
function _generateGrassTiles() {
      this.grassVariants = [];
      const variantCount = this.editorMode ? 1 : 3;
      const palettes = this.editorMode
          ? [{ base: '#3f7d3c', dark: '#2f6831', light: '#5da569' }]
          : [
              { base: '#3f7d3c', dark: '#2e6d2f', light: '#5ba35f' },
              { base: '#4a9144', dark: '#357034', light: '#73bd73' },
              { base: '#2f5d29', dark: '#21431d', light: '#4c8047' }
            ];

      for (let i = 0; i < variantCount; i++) {
          const canvas = document.createElement('canvas');
          canvas.width = this.tileSize;
          canvas.height = this.tileSize;
          const tctx = canvas.getContext('2d');
          const palette = palettes[i % palettes.length];

          // Base grass block with a light/dark variant feel
          tctx.fillStyle = palette.base;
          tctx.fillRect(0, 0, this.tileSize, this.tileSize);

          if (!this.editorMode) {
              // Add subtle light highlights and dark shadow strokes
              tctx.fillStyle = palette.light;
              for (let h = 0; h < 1; h++) {
                  const hx = Math.random() * this.tileSize * 0.8 + this.tileSize * 0.1;
                  const hy = Math.random() * this.tileSize * 0.8 + this.tileSize * 0.1;
                  tctx.beginPath();
                  tctx.ellipse(hx, hy, 5 + Math.random() * 3, 2 + Math.random() * 1.5, Math.random() * Math.PI, 0, Math.PI * 2);
                  tctx.fill();
              }

              tctx.fillStyle = palette.dark;
              for (let j = 0; j < 2; j++) {
                  const lx = Math.random() * this.tileSize;
                  const ly = Math.random() * this.tileSize;
                  tctx.save();
                  tctx.translate(lx, ly);
                  tctx.rotate(Math.random() * Math.PI);
                  tctx.beginPath();
                  tctx.ellipse(0, 0, 3 + Math.random() * 2, 1.2 + Math.random() * 0.6, 0, 0, Math.PI * 2);
                  tctx.fill();
                  tctx.restore();
              }
          } else {
              // Editor: keep a simple single-tone texture
              const leafCount = 2;
              tctx.fillStyle = '#2e6f32';
              for (let j = 0; j < leafCount; j++) {
                  const lx = Math.random() * this.tileSize;
                  const ly = Math.random() * this.tileSize;
                  tctx.beginPath();
                  tctx.ellipse(lx, ly, 3 + Math.random() * 2, 1.2 + Math.random() * 0.6, 0, 0, Math.PI * 2);
                  tctx.fill();
              }
          }

          this.grassVariants.push(canvas);
      }
    }

/*
_generateGrassTilesLow
Tile: X
Graphics: Low
*/
function _generateGrassTilesLow() {
      this.grassVariants = [];
      const variantCount = this.editorMode ? 1 : 3;
      const palettes = this.editorMode
          ? [{ base: '#376d35', dark: '#2f5b2d', light: '#5f8f55' }]
          : [
              { base: '#376d35', dark: '#2f5a2f', light: '#5e8c56' },
              { base: '#458a43', dark: '#316430', light: '#78b474' },
              { base: '#2a5527', dark: '#1f3f1d', light: '#4d7a47' }
            ];

      for (let i = 0; i < variantCount; i++) {
          const canvas = document.createElement('canvas');
          canvas.width = this.tileSize;
          canvas.height = this.tileSize;
          const tctx = canvas.getContext('2d');
          const palette = palettes[i % palettes.length];

          // Low quality uses only solid base tiles, without extra grass textures or flowers.
          tctx.fillStyle = palette.base;
          tctx.fillRect(0, 0, this.tileSize, this.tileSize);

          this.grassVariants.push(canvas);
      }
    }

/*
_prerenderRoad
Tile: O
*/
function _prerenderRoad() {
        const ctx = this.roadLayer.getContext('2d');
        const ts = this.tileSize;
        const stoneColors = ["#57534e", "#78716c", "#44403c", "#a8a29e"];

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tok = String(this.grid[r][c] ?? '');
                const worldX = c * ts;
                const worldY = r * ts;

                // --- LED (ICE) ---
                if (tok === 'ICE') {
                    if (this.graphicsSettings.terrain === 'low') {
                        this._drawIceTileLow(ctx, worldX, worldY);
                    } else {
                        this._drawIceTile(ctx, worldX, worldY);
                    }
                    continue;
                }

                // --- LÁVA (LAVA) ---
                if (tok === 'LAVA') {
                    if (this.graphicsSettings.terrain === 'low') {
                        this._drawLavaTileLow(ctx, worldX, worldY);
                    } else {
                        this._drawLavaTile(ctx, worldX, worldY);
                    }
                    continue;
                }

                // --- STROM (E) ---
                if (/^E/i.test(tok)) {
                    if (this.graphicsSettings.terrain === 'low') {
                        this._drawHolyGroundLow(ctx, worldX, worldY);
                    } else {
                        this._drawHolyGround(ctx, worldX, worldY);
                    }
                    continue; // Přeskočíme kreslení kamenů
                }

                // --- PORTÁL (S) ---
                if (/^S\d+/.test(tok)) {
                    // Pod portálem vykreslíme spálenou zem
                    if (this.graphicsSettings.terrain === 'low') {
                        this._drawBurnedGroundLow(ctx, worldX, worldY);
                    } else {
                        this._drawBurnedGround(ctx, worldX, worldY);
                    }
                    continue; // Přeskočíme kreslení kamenů
                }

                // --- KLASICKÁ CESTA (O) ---
                if (tok === 'O' || tok === 'O[SNW]' || tok === 'O[SND]') {
                    // number of stones
                    let density = 4;
                    // LOW verze – jednoduchá šedá cesta uprostřed, ne přes celý blok
                    if (this.graphicsSettings.roads === 'low') {
                        density = 2;
                    }
                    const step = ts / density;
                    for (let i = 0; i < density; i++) {
                        for (let j = 0; j < density; j++) {
                            const gX = c * density + j;
                            const gY = r * density + i;
                            const seed = (gX * 1234) ^ (gY * 5678);
                            const rand = (s) => (Math.abs(Math.sin(s) * 10000) % 1);

                            const x = worldX + (j * step) + (rand(seed) * (step * 0.6));
                            const y = worldY + (i * step) + (rand(seed + 1) * (step * 0.6));
                            const size = step * (0.6 + rand(seed + 2) * 0.5);
                            const rot = rand(seed + 3) * Math.PI;
                            const color = stoneColors[Math.floor(rand(seed + 4) * stoneColors.length)];

                            this._drawAAAStone(ctx, x, y, size, rot, color, rand(seed + 5));
                        }
                    }
                }
            }
        }
    }

/*
_prerenderWater
Tile: W
Graphics: Low
*/
function _prerenderWater() {
        const ctx = this.waterLayer.getContext('2d');
        const ts = this.tileSize;

        ctx.clearRect(0, 0, this.waterLayer.width, this.waterLayer.height);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== 'W') continue;

                const x = c * ts;
                const y = r * ts;

                // Base dark water
                ctx.fillStyle = "#0b3a5e";
                ctx.fillRect(x, y, ts, ts);
            }
        }
    }

/*
_prerenderWaterHigh
Tile: W
Graphics: High
*/
function _prerenderWaterHigh() {
        const w = this.waterLayer.width;
        const h = this.waterLayer.height;
        const ts = this.tileSize;

        const ctx = this.waterLayer.getContext("2d");
        ctx.clearRect(0, 0, w, h);

        // OFFSCREEN WATER TEXTURE
        const waterTex = document.createElement("canvas");
        waterTex.width = w;
        waterTex.height = h;
        const wctx = waterTex.getContext("2d");

        // Deep background gradient
        const grad = wctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#0a3d5f");
        grad.addColorStop(1, "#062a44");
        wctx.fillStyle = grad;
        wctx.fillRect(0, 0, w, h);

        // RANDOM FOG PATCHES
        // Instead of one big gradient, we stamp 10 random "clouds"
        let rows = this.rows;
        let cols = this.cols;

        let waterTileCount = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (this.grid[r][c] === "W") waterTileCount++;
            }
        }

        const fogPatches = Math.max(3, Math.floor(waterTileCount / 10));
        for (let i = 0; i < fogPatches; i++) {
            const randX = Math.random() * w;
            const randY = Math.random() * h;
            const radius = (Math.random() * ts * 5) + ts; // 1 to 5 tiles wide

            const fog = wctx.createRadialGradient(randX, randY, 0, randX, randY, radius);
            fog.addColorStop(0, "rgba(255,255,255,0.12)");   // Soft center
            fog.addColorStop(0.5, "rgba(255,255,255,0.04)"); // Fading
            fog.addColorStop(1, "transparent");             // Edge

            wctx.fillStyle = fog;
            wctx.fillRect(0, 0, w, h);
        }

        // 2) MASK (only W tiles)
        const mask = document.createElement("canvas");
        mask.width = w;
        mask.height = h;
        const mctx = mask.getContext("2d");

        mctx.fillStyle = "black";
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === "W") {
                    mctx.fillRect(c * ts, r * ts, ts, ts);
                }
            }
        }

        // 3) APPLY MASK
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(mask, 0, 0);

        ctx.globalCompositeOperation = "source-in";
        ctx.drawImage(waterTex, 0, 0);
        ctx.restore();

        // Reset state for coast shading
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.beginPath();

        // 4) COAST SHADING
        const isLand = (r, c) =>
            r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.grid[r][c] !== "W";

        const cs = Math.floor(ts * 0.12);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== "W") continue;

                const x = c * ts;
                const y = r * ts;

                const drawCoast = (rr, cc, dx, dy, w2, h2) => {
                    if (!isLand(rr, cc)) return;
                    const color = this.getCoastColor(rr, cc);
                    if (!color) return;
                    ctx.fillStyle = color;
                    ctx.fillRect(x + dx, y + dy, w2, h2);
                };

                drawCoast(r - 1, c, 0, 0, ts, cs);
                drawCoast(r + 1, c, 0, ts - cs, ts, cs);
                drawCoast(r, c - 1, 0, 0, cs, ts);
                drawCoast(r, c + 1, ts - cs, 0, cs, ts);
            }
        }
    }

/*
getCoastColor
Tile: W
*/
function getCoastColor(row, col) {
        // 1. Bounds check
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;

        const tile = String(this.grid[row][col] ?? '');

        // 2. Ignore if neighbor is also water
        if (tile === 'W') return null;

        // 3. Return color based on tile type
        if (tile.includes('SNW') || tile === 'M') return "#A5B4C4"; // Snow/Mountain
        if (tile.includes('SND')) return "#C2A35D";                // Sand
        if (tile === 'ICE') return "#88C8E8";                      // Ice
        if (tile === 'LAVA') return "#8B2000";                     // Lava
        return "#4A8C46";                                         // Default (Grass)
    }

/*
_prerenderGrass
Tile: X
*/
function _prerenderGrass() {
    const ctx = this.grassLayer.getContext('2d');
    const flowerColors = ["#ef4444", "#fbbf24", "#a855f7", "#38bdf8"];
    const flowerChance = 1 / 3.5;

    for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
            if (this.grid[r][c] === '-') continue;
            const x = c * this.tileSize;
            const y = r * this.tileSize;
            ctx.drawImage(this.grassVariants[this.terrainIndices[r][c]], x, y);
            if (!this.editorMode && this.graphicsSettings.terrain !== 'low' && Math.random() < flowerChance) {
                const fx = x + Math.random() * this.tileSize * 0.7 + this.tileSize * 0.15;
                const fy = y + Math.random() * this.tileSize * 0.7 + this.tileSize * 0.15;
                ctx.save();
                ctx.translate(fx, fy);
                this._drawNaturalFlower(ctx, flowerColors[Math.floor(Math.random() * flowerColors.length)]);
                ctx.restore();
            }
        }
    }
}

/*
_prerenderVignette
*/
function _prerenderVignette(width, height) {
    const vc = document.createElement('canvas');
    vc.width = width;
    vc.height = height;
    const vctx = vc.getContext('2d');
    const vGrad = vctx.createRadialGradient(
        width / 2, height / 2, width * 0.3,
        width / 2, height / 2, width * 0.8
    );
    vGrad.addColorStop(0, 'transparent');
    vGrad.addColorStop(1, 'rgba(0,5,15,0.4)');
    vctx.fillStyle = vGrad;
    vctx.fillRect(0, 0, width, height);
    this.vignetteLayer = vc;
}

/*
_preRenderMountainFoundations
*/
function _preRenderMountainFoundations(ts) {
    const variants = {};
    const configs = [
        { key: 'both',      x: 0,           w: ts },
        { key: 'rightOnly', x: ts * 0.4,    w: ts * 0.6 },
        { key: 'leftOnly',  x: 0,           w: ts * 0.6 },
    ];
    for (const { key, x, w } of configs) {
        const c = document.createElement('canvas');
        c.width = ts;
        c.height = ts;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#242c3d';
        ctx.fillRect(x, 0, w, ts);
        variants[key] = c;
    }
    this.mountainFoundations = variants;
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
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

/*
_drawIceTileLow
Tile: ICE
Graphics: Low — per-tile seeded, subtle variety, intentionally cheap
*/
function _drawIceTileLow(ctx, x, y) {
    const ts = this.tileSize;
    const tx = (x / ts) | 0, ty = (y / ts) | 0;
    const s0 = tx * 1234 ^ ty * 5678;
    let si = 1;
    const rng = this.editorMode
        ? () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1
        : () => Math.random();
    // Deterministic edge hash — same value on both sides of a shared tile edge
    const eh = (a, b, off) => Math.abs(Math.sin(a * 127.1 + b * 311.7 + off) * 43758.5) % 1;

    // Base — cold blue
    ctx.fillStyle = `hsl(${200 + (s0 & 10)}, 50%, ${68 + (s0 & 7)}%)`;
    ctx.fillRect(x, y, ts, ts);

    // Inner glow
    const gx = x + ts * (0.25 + rng() * 0.50);
    const gy = y + ts * (0.25 + rng() * 0.50);
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, ts * 0.65);
    glow.addColorStop(0, 'rgba(200,235,255,0.32)');
    glow.addColorStop(1, 'rgba(200,235,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, ts, ts);

    // Seamless crack network — endpoints at deterministic positions on each tile edge
    const kx = x + ts * (0.32 + rng() * 0.36);
    const ky = y + ts * (0.32 + rng() * 0.36);
    const edges = [
        [x + ts * (0.12 + eh(tx, ty,     0.2) * 0.76), y     ],   // top
        [x + ts * (0.12 + eh(tx, ty + 1, 0.2) * 0.76), y + ts],   // bottom
        [x,      y + ts * (0.12 + eh(tx,     ty, 0.8) * 0.76)],   // left
        [x + ts, y + ts * (0.12 + eh(tx + 1, ty, 0.8) * 0.76)],   // right
    ];
    ctx.lineCap = 'round';
    for (const [ex, ey] of edges) {
        const mx = (kx + ex) / 2 + (rng() - 0.5) * ts * 0.20;
        const my = (ky + ey) / 2 + (rng() - 0.5) * ts * 0.20;
        ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(190,225,255,0.45)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(40,95,165,0.55)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    }

    // Sparkles
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x + rng() * ts, y + rng() * ts, 1, 1);
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, ts, ts);
}

function _drawIceTile(ctx, x, y) {
    const ts = this.tileSize;
    const tx = (x / ts) | 0, ty = (y / ts) | 0;
    const s0 = tx * 1234 ^ ty * 5678;
    let si = 1;
    const rng = this.editorMode
        ? () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1
        : () => Math.random();
    const eh = (a, b, off) => Math.abs(Math.sin(a * 127.1 + b * 311.7 + off) * 43758.5) % 1;

    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, ts, ts); ctx.clip();
    ctx.translate(x, y);

    // 1. Deep ice base — directional gradient
    const hue     = 198 + rng() * 12;
    const baseLit = 52 + rng() * 8;
    const ang     = rng() * Math.PI * 2;
    const base = ctx.createLinearGradient(
        ts * 0.5 - Math.cos(ang) * ts * 0.7, ts * 0.5 - Math.sin(ang) * ts * 0.7,
        ts * 0.5 + Math.cos(ang) * ts * 0.7, ts * 0.5 + Math.sin(ang) * ts * 0.7
    );
    base.addColorStop(0,   `hsl(${hue - 4}, 58%, ${baseLit + 8}%)`);
    base.addColorStop(0.5, `hsl(${hue    }, 54%, ${baseLit    }%)`);
    base.addColorStop(1,   `hsl(${hue + 6}, 62%, ${baseLit + 4}%)`);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, ts, ts);

    // 2. Subsurface volume glow
    const sx = ts * (0.2 + rng() * 0.6), sy = ts * (0.2 + rng() * 0.6);
    const ss = ctx.createRadialGradient(sx, sy, 0, sx, sy, ts * 0.85);
    ss.addColorStop(0,   `hsla(${hue + 10}, 70%, ${baseLit + 22}%, 0.45)`);
    ss.addColorStop(0.5, `hsla(${hue + 5 }, 62%, ${baseLit + 12}%, 0.18)`);
    ss.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = ss;
    ctx.fillRect(0, 0, ts, ts);

    // 3. Fine surface noise
    for (let i = 0; i < 55; i++) {
        const bright = rng() > 0.5;
        const a = rng() * (bright ? 0.12 : 0.07);
        ctx.fillStyle = bright
            ? `rgba(220,240,255,${a.toFixed(2)})`
            : `rgba(30,80,140,${a.toFixed(2)})`;
        ctx.fillRect(rng() * ts, rng() * ts, 1.4, 1.4);
    }

    // 4. Seamless crack network — cracks connect exactly at tile edges
    const kx = ts * (0.30 + rng() * 0.40);
    const ky = ts * (0.30 + rng() * 0.40);
    const edgePoints = [
        [ts * (0.12 + eh(tx, ty,     0.2) * 0.76), 0 ],   // top
        [ts * (0.12 + eh(tx, ty + 1, 0.2) * 0.76), ts],   // bottom
        [0,  ts * (0.12 + eh(tx,     ty, 0.8) * 0.76)],   // left
        [ts, ts * (0.12 + eh(tx + 1, ty, 0.8) * 0.76)],   // right
    ];
    ctx.lineCap = 'round';
    for (const [ex, ey] of edgePoints) {
        const mx = (kx + ex) / 2 + (rng() - 0.5) * ts * 0.22;
        const my = (ky + ey) / 2 + (rng() - 0.5) * ts * 0.22;
        // Refraction halo
        ctx.lineWidth = ts * 0.10; ctx.strokeStyle = 'rgba(190,225,255,0.20)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Subsurface scatter
        ctx.lineWidth = ts * 0.044; ctx.strokeStyle = 'rgba(150,205,250,0.35)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Bright crack core
        ctx.lineWidth = ts * 0.014; ctx.strokeStyle = `rgba(210,240,255,${(0.70 + rng() * 0.20).toFixed(2)})`;
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Dark air gap
        ctx.lineWidth = ts * 0.005; ctx.strokeStyle = `rgba(25,70,130,${(0.45 + rng() * 0.20).toFixed(2)})`;
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Optional interior branch
        if (rng() > 0.48) {
            const bx = ts * (0.15 + rng() * 0.70), by = ts * (0.15 + rng() * 0.70);
            ctx.lineWidth = ts * 0.026; ctx.strokeStyle = 'rgba(180,220,255,0.28)';
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by); ctx.stroke();
            ctx.lineWidth = ts * 0.008; ctx.strokeStyle = 'rgba(200,235,255,0.60)';
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by); ctx.stroke();
        }
    }

    // 5. Frost patches
    const fCornerX = rng() > 0.5 ? ts * 0.12 : ts * 0.88;
    const fCornerY = rng() > 0.5 ? ts * 0.12 : ts * 0.88;
    const nFrost = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < nFrost; i++) {
        const fx = fCornerX * (0.4 + rng() * 0.6) + ts * rng() * 0.30;
        const fy = fCornerY * (0.4 + rng() * 0.6) + ts * rng() * 0.30;
        const fr = ts * (0.04 + rng() * 0.07);
        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
        fg.addColorStop(0,   `rgba(235,248,255,${(0.30 + rng() * 0.20).toFixed(2)})`);
        fg.addColorStop(0.6, `rgba(215,235,252,${(0.08 + rng() * 0.08).toFixed(2)})`);
        fg.addColorStop(1,   'rgba(200,228,250,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.ellipse(fx, fy, fr * (0.7 + rng() * 0.6), fr * (0.4 + rng() * 0.5), rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    // 6. Specular highlight
    const hlx = ts * (0.25 + rng() * 0.35);
    const hly = ts * (0.15 + rng() * 0.30);
    const hlR = ts * (0.08 + rng() * 0.12);
    const spec = ctx.createRadialGradient(hlx, hly, 0, hlx, hly, hlR);
    spec.addColorStop(0,   'rgba(255,255,255,0.72)');
    spec.addColorStop(0.4, 'rgba(230,248,255,0.22)');
    spec.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(0, 0, ts, ts);

    // 7. Sparkles
    const nSpark = 6 + Math.floor(rng() * 5);
    for (let i = 0; i < nSpark; i++) {
        const px = rng() * ts, py = rng() * ts;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fillRect(px, py, 1, 1);
        if (rng() > 0.50) {
            const fl = 2 + rng() * 2;
            ctx.fillStyle = 'rgba(200,235,255,0.40)';
            ctx.fillRect(px - fl, py, fl * 2 + 1, 1);
            ctx.fillRect(px, py - fl, 1, fl * 2 + 1);
        }
    }

    // 8. Vignette
    const vig = ctx.createRadialGradient(ts / 2, ts / 2, ts * 0.15, ts / 2, ts / 2, ts * 0.95);
    vig.addColorStop(0,   'rgba(0,0,0,0)');
    vig.addColorStop(0.7, 'rgba(0,15,40,0.06)');
    vig.addColorStop(1,   'rgba(0,10,30,0.25)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, ts, ts);

    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, ts, ts);

    ctx.restore();
}

function _drawLavaTileLow(ctx, x, y) {
    const ts = this.tileSize;
    const tx = (x / ts) | 0, ty = (y / ts) | 0;
    const s0 = tx * 1234 ^ ty * 5678;
    let si = 1;
    const rng = this.editorMode
        ? () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1
        : () => Math.random();
    const eh = (a, b, off) => Math.abs(Math.sin(a * 127.1 + b * 311.7 + off) * 43758.5) % 1;

    // 1. Dark basalt base
    ctx.fillStyle = `hsl(${10 + (s0 & 7)}, 35%, ${6 + (s0 & 5)}%)`;
    ctx.fillRect(x, y, ts, ts);

    // 2. Central heat glow
    const gx = x + ts * (0.25 + rng() * 0.50);
    const gy = y + ts * (0.25 + rng() * 0.50);
    const heat = ctx.createRadialGradient(gx, gy, 0, gx, gy, ts * 0.62);
    heat.addColorStop(0, 'rgba(200, 65, 0, 0.48)');
    heat.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = heat;
    ctx.fillRect(x, y, ts, ts);

    // 3. Seamless crack network
    const kx = x + ts * (0.32 + rng() * 0.36);
    const ky = y + ts * (0.32 + rng() * 0.36);
    const edges = [
        [x + ts * (0.12 + eh(tx, ty,     0.1) * 0.76), y     ],   // top
        [x + ts * (0.12 + eh(tx, ty + 1, 0.1) * 0.76), y + ts],   // bottom
        [x,      y + ts * (0.12 + eh(tx,     ty, 0.9) * 0.76)],   // left
        [x + ts, y + ts * (0.12 + eh(tx + 1, ty, 0.9) * 0.76)],   // right
    ];
    ctx.lineCap = 'round';
    for (const [ex, ey] of edges) {
        const mx = (kx + ex) / 2 + (rng() - 0.5) * ts * 0.18;
        const my = (ky + ey) / 2 + (rng() - 0.5) * ts * 0.18;
        ctx.lineWidth = 2.8; ctx.strokeStyle = 'rgba(180, 45, 0, 0.38)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(255, 125, 10, 0.92)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    }
}

function _drawLavaTile(ctx, x, y) {
    const ts = this.tileSize;
    const tx = (x / ts) | 0, ty = (y / ts) | 0;
    const s0 = tx * 1234 ^ ty * 5678;
    let si = 1;
    const rng = this.editorMode
        ? () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1
        : () => Math.random();
    const eh = (a, b, off) => Math.abs(Math.sin(a * 127.1 + b * 311.7 + off) * 43758.5) % 1;

    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, ts, ts); ctx.clip();
    ctx.translate(x, y);

    // 1. Dark orange-brown basalt base (glowing hot, not cooled)
    ctx.fillStyle = `hsl(${18 + (s0 & 6)}, 72%, ${14 + (s0 & 6)}%)`;
    ctx.fillRect(0, 0, ts, ts);

    // 2. Basalt micro-texture
    for (let i = 0; i < 18; i++) {
        const px = rng() * ts, py = rng() * ts;
        const pr = ts * (0.03 + rng() * 0.07);
        ctx.beginPath();
        ctx.ellipse(px, py, pr, pr * (0.5 + rng() * 0.5), rng() * Math.PI, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${(5 + rng() * 10) | 0}, 1, 0, ${(0.20 + rng() * 0.18).toFixed(2)})`;
        ctx.fill();
    }

    // 3. Lava floor glow — bright orange radiating heat
    const lx = ts * (0.2 + rng() * 0.6), ly = ts * (0.2 + rng() * 0.6);
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, ts * 0.88);
    lg.addColorStop(0,   'rgba(255, 145, 0, 0.90)');
    lg.addColorStop(0.35,'rgba(230, 90, 0, 0.62)');
    lg.addColorStop(0.7, 'rgba(180, 40, 0, 0.30)');
    lg.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, ts, ts);

    // 4. Seamless crack network — all 4 edges, guaranteed connectivity
    const kx = ts * (0.30 + rng() * 0.40);
    const ky = ts * (0.30 + rng() * 0.40);
    const edgePoints = [
        [ts * (0.12 + eh(tx, ty,     0.1) * 0.76), 0 ],   // top
        [ts * (0.12 + eh(tx, ty + 1, 0.1) * 0.76), ts],   // bottom
        [0,  ts * (0.12 + eh(tx,     ty, 0.9) * 0.76)],   // left
        [ts, ts * (0.12 + eh(tx + 1, ty, 0.9) * 0.76)],   // right
    ];
    ctx.lineCap = 'round';
    for (const [ex, ey] of edgePoints) {
        const mx = (kx + ex) / 2 + (rng() - 0.5) * ts * 0.22;
        const my = (ky + ey) / 2 + (rng() - 0.5) * ts * 0.22;
        // Outer warm glow
        ctx.lineWidth = ts * 0.11; ctx.strokeStyle = 'rgba(180, 45, 0, 0.22)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Mid orange
        ctx.lineWidth = ts * 0.046; ctx.strokeStyle = 'rgba(230, 100, 5, 0.68)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Bright core
        ctx.lineWidth = ts * 0.016; ctx.strokeStyle = 'rgba(255, 155, 25, 0.95)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Optional interior branch
        if (rng() > 0.42) {
            const bx = ts * (0.15 + rng() * 0.70), by = ts * (0.15 + rng() * 0.70);
            ctx.lineWidth = ts * 0.030; ctx.strokeStyle = 'rgba(200, 60, 0, 0.40)';
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by); ctx.stroke();
            ctx.lineWidth = ts * 0.010; ctx.strokeStyle = 'rgba(255, 135, 20, 0.82)';
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by); ctx.stroke();
        }
    }

    // 5. Central knot glow
    const cg = ctx.createRadialGradient(kx, ky, 0, kx, ky, ts * 0.14);
    cg.addColorStop(0,   'rgba(255, 160, 25, 0.92)');
    cg.addColorStop(0.4, 'rgba(220,  80,  5, 0.60)');
    cg.addColorStop(1,   'rgba(150,  30,  0, 0.00)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(kx, ky, ts * 0.14, 0, Math.PI * 2); ctx.fill();

    // 6. Bubble craters — static solidified holes in the crust
    const nBubbles = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < nBubbles; i++) {
        const bx = ts * (0.15 + rng() * 0.70);
        const by = ts * (0.15 + rng() * 0.70);
        const br = ts * (0.025 + rng() * 0.032);
        const rimG = ctx.createRadialGradient(bx, by, br * 0.5, bx, by, br * 2.8);
        rimG.addColorStop(0,   'rgba(230, 95, 5, 0.62)');
        rimG.addColorStop(0.5, 'rgba(180, 50, 0, 0.30)');
        rimG.addColorStop(1,   'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rimG;
        ctx.beginPath(); ctx.arc(bx, by, br * 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${(3 + (rng() * 5) | 0)}, 0, 0, 0.92)`;
        ctx.fill();
    }

    // 7. Depth vignette — subtle, keeps orange glow visible at edges
    const vg = ctx.createRadialGradient(ts / 2, ts / 2, ts * 0.10, ts / 2, ts / 2, ts * 0.95);
    vg.addColorStop(0,   'rgba(0, 0, 0, 0)');
    vg.addColorStop(0.6, 'rgba(0, 0, 0, 0.04)');
    vg.addColorStop(1,   'rgba(0, 0, 0, 0.22)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, ts, ts);

    ctx.restore();
}

/*
_drawLavaBubbles
Tile: LAVA
Graphics: High — animated overlay, called every frame with current time (seconds).
Performance notes:
  - Seeded params + shimmer canvas cached on first call — zero Math.sin per frame
  - No ctx.clip: bubble centers are ≥11% from tile edge, maxR < 11% → no overflow
  - No string allocs per frame: alpha via globalAlpha float, colors set once
  - Shimmer pre-rendered to offscreen canvas, drawn with drawImage + globalAlpha
*/
function _drawLavaBubbles(ctx, x, y, time) {
    const ts = this.tileSize;

    if (!this._lavaBubbleCache) this._lavaBubbleCache = new Map();
    const key = `${x},${y}`;
    let p = this._lavaBubbleCache.get(key);
    if (!p) {
        const s0 = ((x / ts) | 0) * 1234 ^ ((y / ts) | 0) * 5678;
        let si = 0;
        const seed = () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1;
        const bubbles = [];
        for (let i = 0; i < 5; i++) {
            const period = 2.0 + seed() * 1.6;
            bubbles.push({
                bx:    x + seed() * ts * 0.78 + ts * 0.11,
                by:    y + seed() * ts * 0.78 + ts * 0.11,
                period,
                phase0: seed() * period,
                maxR:  (2.2 + seed() * 2.8) * (ts / 64),
            });
        }
        // Pre-render shimmer gradient once — redrawn every frame via globalAlpha only
        const sx = (0.28 + seed() * 0.44) * ts;
        const sy = (0.28 + seed() * 0.44) * ts;
        const shimCanvas = document.createElement('canvas');
        shimCanvas.width = ts; shimCanvas.height = ts;
        const sc = shimCanvas.getContext('2d');
        const shimG = sc.createRadialGradient(sx, sy, 0, sx, sy, ts * 0.40);
        shimG.addColorStop(0, 'rgb(255,135,15)');
        shimG.addColorStop(1, 'rgba(0,0,0,0)');
        sc.fillStyle = shimG;
        sc.fillRect(0, 0, ts, ts);
        p = { bubbles, shimCanvas };
        this._lavaBubbleCache.set(key, p);
    }

    // Fixed colors set once — alpha controlled via globalAlpha (no per-frame string allocs)
    ctx.lineWidth   = 0.85 * (ts / 64);
    ctx.lineCap     = 'round';
    ctx.strokeStyle = 'rgb(4,1,0)';
    ctx.fillStyle   = 'rgb(255,185,55)';

    for (const { bx, by, period, phase0, maxR } of p.bubbles) {
        const t = ((time + phase0) % period) / period;
        let r, alpha;
        if (t < 0.60) {
            const q = t / 0.60;
            r     = maxR * q;
            alpha = Math.min(q * 2.5, 1.0) * 0.80;
        } else {
            const q = (t - 0.60) / 0.40;
            r     = maxR * (1 + q * 0.35);
            alpha = (1 - q) * 0.50;
        }
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(bx, by, Math.max(r, 0.4), 0, Math.PI * 2);
        ctx.stroke();

        if (t < 0.55 && r > 1.2) {
            ctx.globalAlpha = (t / 0.60) * 0.42;
            ctx.beginPath();
            ctx.arc(bx - r * 0.28, by - r * 0.28, r * 0.30, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Shimmer: pre-rendered canvas + single float globalAlpha — no gradient alloc per frame
    ctx.globalAlpha = 0.055 + Math.sin((time % 3.8) / 3.8 * Math.PI * 2) * 0.038;
    ctx.drawImage(p.shimCanvas, x, y);
    ctx.globalAlpha = 1;
}

export const MapTextures = {
    _preRenderSnowLow,
    _preRenderSnowHigh,
    _preRenderSandLow,
    _preRenderSandHigh,
    _drawIceTileLow,
    _drawIceTile,
    _drawLavaTileLow,
    _drawLavaTile,
    _drawLavaBubbles,
    _drawBurnedGround,
    _drawBurnedGroundLow,
    _drawHolyGround,
    _drawHolyGroundLow,
    _drawNaturalFlower,
    _adjustColor,
    _drawMarker,
    _drawAAAStone,
    _drawMagicPortal,
    _drawMagicPortalHigh,
    _drawMagicPortalLow,
    _preRenderTreeLow,
    _preRenderTreeHigh,
    _drawLifeTree,
    _drawRootBase,
    _preRenderMountainSet,
    _preRenderMountainParts,
    _preRenderMountainHigh,
    _preRenderMountainLow,
    drawFixedPeak,
    _getJaggedLine,
    _createNoisePattern,
    _generateGrassTiles,
    _generateGrassTilesLow,
    _prerenderRoad,
    _prerenderWater,
    _prerenderWaterHigh,
    getCoastColor,
    _prerenderGrass,
    _prerenderVignette,
    _preRenderMountainFoundations,
    roundRect,
};

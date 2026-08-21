// js/game/MapTextures.js
/*
X                - Grass
SND              - Sand
SNW              - Snow
ICE              - Ice (impassable, non-buildable, shootable)
LAVA             - Lava (impassable, non-buildable, shootable)
O                - Road
O[SNW]           - Snowy Road
O[SND]           - Sandy Road
S*               - Start (S1, S2...) [Portal]
E*               - End (E1, E2...) [Tree]
W                - Water (impassable, non-buildable, shootable)
M                - Mountain (impassable, non-buildable, non-shootable)
-                - Air(impassable, non-buildable, shootable)
HLG              - Holy Ground (impassable, non-buildable, shootable)
BRG              - Burned Ground (impassable, non-buildable, shootable)
SND[Bone-1..4]   - cant build towers, doesnt block arrows
SND[Cactus-1..4] - cant build towers, blocks arrows
SND[Palm-1..4]   - cant build towers, blocks arrows
SNW[Spike-1..4]  - cant build towers, blocks arrows
X[Tree]          - cant build towers, blocks arrows
SNW[Tree]        - cant build towers, blocks arrows
X[Log-1..2]      - cant build towers, blocks arrows (low, doesn't block tower vision)
X[Well]          - cant build towers, blocks arrows and tower vision
X[Bush]          - cant build towers, doesnt block arrows
W[Rock-1..4]     - cant build towers, blocks arrows

Pre-Beta IV:
"TODO: SND[Cactus] - cant build towers, blocks arrows",
"TODO: SND[Palm] - cant build towers, blocks arrows",
"TODO: SND[BONE] - cant build towers, doesnt block arrows",
"TODO: X[Tree] - cant build towers, blocks arrows",
"TODO: SNW[Tree] - cant build towers, blocks arrows",
"TODO: SND[Palm] - cant build towers, blocks arrows",
*/

/**
 * 
 * TILES:
 * 
 * @see _preRenderSnowLow - Snow Low 
 * @see _preRenderSnowHigh - Snow High
 * @see _preRenderSandLow - Sand Low
 * @see _preRenderSandHigh - Sand High
 * @see _drawBurnedGroundLow - Burned Ground Low
 * @see _drawBurnedGround - Burned Ground High
 * @see _drawHolyGroundLow - Holy Ground High
 * @see _drawHolyGround - Holy Ground High
 * @see _drawMagicPortal - Starting Portal Helper
 * @see _drawMagicPortalHigh - Starting Portal High
 * @see _drawMagicPortalLow - Starting Portal Low
 * @see _preRenderTreeLow - Ending Tree Low
 * @see _preRenderTreeHigh - Ending Tree High
 * @see _drawLifeTree - Ending Tree 
 * @see _drawRootBase - Ending Tree Roots
 * @see _preRenderMountainSet - Mountins
 * @see _preRenderMountainParts - Mountins
 * @see _preRenderMountainHigh - Mountins High
 * @see _preRenderMountainLow - Mountins Low
 * @see drawFixedPeak - Mountins
 * @see _getJaggedLine - Mountins Helper
 * @see _createNoisePattern - Mountins Helper
 * @see _prerenderGrass - Grass
 * @see _generateGrassTiles - Grass High
 * @see _generateGrassTilesLow - Grass Low
 * @see _prerenderRoad - Roads Low/High
 * @see _prerenderWaterHigh - Water High
 * @see _prerenderWater - Water Low
 * @see _drawIceTile - Ice High
 * @see _drawIceTileLow - Ice Low
 * @see _drawLavaTile - Lava High
 * @see _drawLavaTileLow - Lava Low
 * @see _drawSandBones - Bones Low/High
 * @see _drawSandCactus - Cactuses Low/High
 * @see _drawSandPalm - Palms Low/High
 * @see _drawSnowSpike - Snow Spikes Low/High
 * @see _drawLog - Log Stump/Fallen Trunk Low/High
 * @see _drawWell - Well Low/High
 * @see _drawBush - Bush Low/High
 * @see _drawTree - Conifer Tree (grass) Low/High
 * @see _drawSnowTree - Conifer Tree (snow) Low/High
 * @see _drawWaterRock - Water Rocks Low/High
 *
 * HELPERS:
 * @see _drawNaturalFlower - Flower Helper
 * @see _adjustColor - Color Helper
 * @see _drawAAAStone - Road Helper
 * @see getCoastColor - Coats Helper
 * @see _prerenderVignette - Vignette Helper
 * @see _preRenderMountainFoundations - Mountins Helper
 * @see _drawLavaBubbles - Lava Helper
 * 
 * 
 * EDITOR HELPERS: 
 *
 * @see roundRect - Global Helper
 * 
 * 
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

    // 1. BASE: Glassy obsidian black with a hint of purple in the grain
    ctx.fillStyle = "#0c0a12";
    ctx.fillRect(0, 0, ts, ts);

    // Subtle glassy facets — slightly lighter purple-black blobs, not plain soot
    ctx.globalAlpha = 0.25;
    for(let i=0; i<15; i++) {
        ctx.fillStyle = "#1e1826";
        ctx.beginPath();
        ctx.arc(rng()*ts, rng()*ts, rng()*15, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 1b. GLASSY SHEEN: a soft diagonal highlight, like light catching polished glass
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sheen = ctx.createLinearGradient(0, 0, ts * 0.7, ts * 0.5);
    sheen.addColorStop(0,    "rgba(180, 160, 220, 0.20)");
    sheen.addColorStop(0.35, "rgba(120, 110, 170, 0.06)");
    sheen.addColorStop(1,    "rgba(0, 0, 0, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, ts, ts);
    ctx.restore();

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

    // 0. Pozadí – obsidiánová černá (#0c0a12)
    ctx.fillStyle = "#0c0a12";
    ctx.fillRect(x, y, ts, ts);

    // 1. Jemný lesklý flek (náznak skleněného odlesku uprostřed)
    const grad = ctx.createRadialGradient(
        x + ts/2, y + ts/2, ts * 0.1,
        x + ts/2, y + ts/2, ts * 0.55
    );
    grad.addColorStop(0, "rgba(140,120,180,0.22)");
    grad.addColorStop(0.6, "rgba(60,50,80,0.10)");
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
Graphics: Low
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

                // --- BONES ON SAND (SND[BONE-1..4]) ---
                if (tok === 'SND[BONE-1]' || tok === 'SND[BONE-2]' || tok === 'SND[BONE-3]' || tok === 'SND[BONE-4]') {
                    const vm = {'SND[BONE-1]':1,'SND[BONE-2]':2,'SND[BONE-3]':3,'SND[BONE-4]':4};
                    this._drawSandBones(ctx, worldX, worldY, vm[tok], this.graphicsSettings.objects);
                    continue;
                }

                // --- CACTI ON SAND (SND[CACTUS-1..4]) ---
                if (tok === 'SND[CACTUS-1]' || tok === 'SND[CACTUS-2]' || tok === 'SND[CACTUS-3]' || tok === 'SND[CACTUS-4]') {
                    const vm = {'SND[CACTUS-1]':1,'SND[CACTUS-2]':2,'SND[CACTUS-3]':3,'SND[CACTUS-4]':4};
                    this._drawSandCactus(ctx, worldX, worldY, vm[tok], this.graphicsSettings.objects);
                    continue;
                }

                // --- PALMS ON SAND (SND[PALM-1..4]) ---
                if (tok === 'SND[PALM-1]' || tok === 'SND[PALM-2]' || tok === 'SND[PALM-3]' || tok === 'SND[PALM-4]') {
                    const vm = {'SND[PALM-1]':1,'SND[PALM-2]':2,'SND[PALM-3]':3,'SND[PALM-4]':4};
                    this._drawSandPalm(ctx, worldX, worldY, vm[tok], this.graphicsSettings.objects);
                    continue;
                }

                // --- SPIKES ON SNOW (SNW[SPIKE-1..4]) ---
                if (tok === 'SNW[SPIKE-1]' || tok === 'SNW[SPIKE-2]' || tok === 'SNW[SPIKE-3]' || tok === 'SNW[SPIKE-4]') {
                    const vm = {'SNW[SPIKE-1]':1,'SNW[SPIKE-2]':2,'SNW[SPIKE-3]':3,'SNW[SPIKE-4]':4};
                    this._drawSnowSpike(ctx, worldX, worldY, vm[tok], this.graphicsSettings.objects);
                    continue;
                }

                // --- LOGS (X[Log-1] stump / X[Log-2] fallen trunk) ---
                if (tok === 'X[Log-1]' || tok === 'X[Log-2]') {
                    const variant = tok === 'X[Log-2]' ? 2 : 1;
                    this._drawLog(ctx, worldX, worldY, variant, this.graphicsSettings.objects);
                    continue;
                }

                // --- WELL (X[Well]) ---
                if (tok === 'X[Well]') {
                    this._drawWell(ctx, worldX, worldY, this.graphicsSettings.objects);
                    continue;
                }

                // --- BUSH (X[Bush]) ---
                if (tok === 'X[Bush]') {
                    this._drawBush(ctx, worldX, worldY, this.graphicsSettings.objects);
                    continue;
                }

                // --- CONIFER TREES (X[Tree] / SNW[Tree]) ---
                if (tok === 'X[Tree]' || tok === 'SNW[Tree]') {
                    const hasLeft  = c > 0 && String(this.grid[r][c - 1] ?? '') === tok;
                    const hasRight = c < this.cols - 1 && String(this.grid[r][c + 1] ?? '') === tok;
                    const hasUp    = r > 0 && String(this.grid[r - 1][c] ?? '') === tok;
                    const hasDown  = r < this.rows - 1 && String(this.grid[r + 1][c] ?? '') === tok;
                    const isTopRow = r === 0;
                    if (tok === 'X[Tree]') {
                        this._drawTree(ctx, worldX, worldY, this.graphicsSettings.objects, hasLeft, hasRight, hasUp, hasDown, isTopRow);
                    } else {
                        this._drawSnowTree(ctx, worldX, worldY, this.graphicsSettings.objects, hasLeft, hasRight, hasUp, hasDown, isTopRow);
                    }
                    continue;
                }

                // --- HOLY GROUND (HLG) ---
                if (tok === 'HLG') {
                    if (this.graphicsSettings.terrain === 'low') {
                        this._drawHolyGroundLow(ctx, worldX, worldY);
                    } else {
                        this._drawHolyGround(ctx, worldX, worldY);
                    }
                    continue;
                }

                // --- BURNED GROUND (BRG) ---
                if (tok === 'BRG') {
                    if (this.graphicsSettings.terrain === 'low') {
                        this._drawBurnedGroundLow(ctx, worldX, worldY);
                    } else {
                        this._drawBurnedGround(ctx, worldX, worldY);
                    }
                    continue;
                }

                // --- WATER ROCKS (W[Rock-1..4]) ---
                if (tok === 'W[Rock-1]' || tok === 'W[Rock-2]' || tok === 'W[Rock-3]' || tok === 'W[Rock-4]') {
                    const vm = {'W[Rock-1]':1,'W[Rock-2]':2,'W[Rock-3]':3,'W[Rock-4]':4};
                    this._drawWaterRock(ctx, worldX, worldY, vm[tok], this.graphicsSettings.objects);
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
                const tok = String(this.grid[r][c]);
                if (tok !== 'W' && !tok.startsWith('W[Rock-')) continue;

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
                const tok = String(this.grid[r][c]);
                if (tok === 'W' || tok.startsWith('W[Rock-')) waterTileCount++;
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
                const tok = String(this.grid[r][c]);
                if (tok === 'W' || tok.startsWith('W[Rock-')) {
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
        const isLand = (r, c) => {
            if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
            const t = String(this.grid[r][c]);
            return t !== 'W' && !t.startsWith('W[Rock-');
        };

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

        // 2. Ignore if neighbor is also water (including water rocks)
        if (tile === 'W' || tile.startsWith('W[Rock-')) return null;

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

/*
roundRect
*/
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

    // Inner glow — subtle, kept dim for realism
    const gx = x + ts * (0.25 + rng() * 0.50);
    const gy = y + ts * (0.25 + rng() * 0.50);
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, ts * 0.65);
    glow.addColorStop(0, 'rgba(200,235,255,0.14)');
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
        ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(155,195,235,0.55)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(25,70,140,0.65)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Branch crack from midpoint
        if (rng() > 0.35) {
            const bx = x + ts * (0.15 + rng() * 0.70), by = y + ts * (0.15 + rng() * 0.70);
            ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(155,195,235,0.40)';
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by); ctx.stroke();
            ctx.lineWidth = 0.4; ctx.strokeStyle = 'rgba(25,70,140,0.50)';
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by); ctx.stroke();
        }
    }

    // Sparkles — just one faint pixel
    ctx.fillStyle = 'rgba(255,255,255,0.60)';
    ctx.fillRect(x + rng() * ts, y + rng() * ts, 1, 1);

    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, ts, ts);
}

/*
_drawIceTile
Tile: ICE
Graphics: High
*/
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

    // 2. Subsurface volume glow — kept faint so ice looks cold and solid
    const sx = ts * (0.2 + rng() * 0.6), sy = ts * (0.2 + rng() * 0.6);
    const ss = ctx.createRadialGradient(sx, sy, 0, sx, sy, ts * 0.85);
    ss.addColorStop(0,   `hsla(${hue + 10}, 70%, ${baseLit + 22}%, 0.20)`);
    ss.addColorStop(0.5, `hsla(${hue + 5 }, 62%, ${baseLit + 12}%, 0.08)`);
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
        // Refraction halo — narrower so cracks look sharper
        ctx.lineWidth = ts * 0.065; ctx.strokeStyle = 'rgba(160,205,240,0.20)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Subsurface scatter
        ctx.lineWidth = ts * 0.032; ctx.strokeStyle = 'rgba(120,180,230,0.38)';
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Bright crack core
        ctx.lineWidth = ts * 0.014; ctx.strokeStyle = `rgba(210,240,255,${(0.75 + rng() * 0.15).toFixed(2)})`;
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Dark air gap — deeper for realism
        ctx.lineWidth = ts * 0.006; ctx.strokeStyle = `rgba(15,50,110,${(0.55 + rng() * 0.20).toFixed(2)})`;
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        // Primary branch — always present
        {
            const bx = ts * (0.15 + rng() * 0.70), by = ts * (0.15 + rng() * 0.70);
            ctx.lineWidth = ts * 0.022; ctx.strokeStyle = 'rgba(160,210,245,0.30)';
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by); ctx.stroke();
            ctx.lineWidth = ts * 0.007; ctx.strokeStyle = 'rgba(200,235,255,0.65)';
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by); ctx.stroke();
            ctx.lineWidth = ts * 0.003; ctx.strokeStyle = 'rgba(10,45,100,0.50)';
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by); ctx.stroke();
        }
        // Secondary micro-branch — 60% chance
        if (rng() > 0.40) {
            const b2x = ts * (0.10 + rng() * 0.80), b2y = ts * (0.10 + rng() * 0.80);
            ctx.lineWidth = ts * 0.010; ctx.strokeStyle = 'rgba(185,225,255,0.25)';
            ctx.beginPath(); ctx.moveTo(ex * 0.4 + kx * 0.6, ey * 0.4 + ky * 0.6); ctx.lineTo(b2x, b2y); ctx.stroke();
            ctx.lineWidth = ts * 0.004; ctx.strokeStyle = 'rgba(10,45,100,0.45)';
            ctx.beginPath(); ctx.moveTo(ex * 0.4 + kx * 0.6, ey * 0.4 + ky * 0.6); ctx.lineTo(b2x, b2y); ctx.stroke();
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

    // 6. Specular highlight — dimmed for a matte, realistic ice look
    const hlx = ts * (0.25 + rng() * 0.35);
    const hly = ts * (0.15 + rng() * 0.30);
    const hlR = ts * (0.06 + rng() * 0.09);
    const spec = ctx.createRadialGradient(hlx, hly, 0, hlx, hly, hlR);
    spec.addColorStop(0,   'rgba(255,255,255,0.38)');
    spec.addColorStop(0.4, 'rgba(230,248,255,0.10)');
    spec.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(0, 0, ts, ts);

    // 7. Sparkles — sparse, very faint; real ice doesn't glitter much
    const nSpark = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < nSpark; i++) {
        const px = rng() * ts, py = rng() * ts;
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(px, py, 1, 1);
        if (rng() > 0.75) {
            const fl = 1.5 + rng() * 1.5;
            ctx.fillStyle = 'rgba(200,235,255,0.22)';
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

/*
_drawLavaTileLow
Tile: LAVA
Graphics: Low
*/
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

/*
_drawLavaTile
Tile: LAVA
Graphics: High
*/
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
        const tx = (x / ts) | 0, ty = (y / ts) | 0;
        const s0 = tx * 1234 ^ ty * 5678;
        let si = 0;
        const seed = () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1;
        const eh = (a, b, off) => Math.abs(Math.sin(a * 127.1 + b * 311.7 + off) * 43758.5) % 1;

        // 1. Generování bublin
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
        
        // 2. CACHE PRO PRASKLINY (Musí přesně odpovídat generátoru v _drawLavaTile!)
        const kx = ts * (0.30 + seed() * 0.40);
        const ky = ts * (0.30 + seed() * 0.40);
        const edgePoints = [
            [ts * (0.12 + eh(tx, ty,     0.1) * 0.76), 0 ],
            [ts * (0.12 + eh(tx, ty + 1, 0.1) * 0.76), ts],
            [0,  ts * (0.12 + eh(tx,     ty, 0.9) * 0.76)],
            [ts, ts * (0.12 + eh(tx + 1, ty, 0.9) * 0.76)],
        ];
        
        const cracks = [];
        for (const [ex, ey] of edgePoints) {
            const mx = (kx + ex) / 2 + (seed() - 0.5) * ts * 0.22;
            const my = (ky + ey) / 2 + (seed() - 0.5) * ts * 0.22;
            const hasBranch = seed() > 0.42;
            let bx = 0, by = 0;
            if (hasBranch) {
                bx = ts * (0.15 + seed() * 0.70);
                by = ts * (0.15 + seed() * 0.70);
            }
            cracks.push({ kx, ky, mx, my, ex, ey, hasBranch, bx, by });
        }

        // 3. Shimmer záře
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

        p = { bubbles, cracks, shimCanvas, pulsePhase: seed() * Math.PI * 2 };
        this._lavaBubbleCache.set(key, p);
    }

    // --- ANIMACE TOKU / PULZACE PRASKLIN ---
    // Vytvoříme rychlou matematickou vlnu závislou na čase a unikátní fázi dlaždice
    const wave = Math.sin(time * 3.5 + p.pulsePhase);
    
    ctx.save();
    ctx.translate(x, y); // Posuneme kontext na 0,0 dlaždice pro snazší kreslení z cache
    ctx.lineCap = 'round';

    for (const chunk of p.cracks) {
        // Pulzující zářivé jádro praskliny (překreslujeme jen to nejjasnější středové koryto)
        ctx.lineWidth   = ts * (0.014 + wave * 0.004); 
        ctx.strokeStyle = `rgba(255, ${200 + wave * 55}, 40, ${0.85 + wave * 0.15})`;
        ctx.beginPath();
        ctx.moveTo(chunk.kx, chunk.ky);
        ctx.quadraticCurveTo(chunk.mx, chunk.my, chunk.ex, chunk.ey);
        ctx.stroke();

        // Pulzování vedlejších větví
        if (chunk.hasBranch) {
            ctx.lineWidth   = ts * (0.009 + wave * 0.003);
            ctx.strokeStyle = `rgba(255, ${160 + wave * 40}, 20, ${0.75 + wave * 0.15})`;
            ctx.beginPath();
            ctx.moveTo(chunk.mx, chunk.my);
            ctx.lineTo(chunk.bx, chunk.by);
            ctx.stroke();
        }
    }
    ctx.restore(); // Vrátíme souřadnicový systém zpět

    // --- KRESLENÍ BUBLED (Zůstává rychlé bez stringů) ---
    ctx.lineCap     = 'round';
    ctx.strokeStyle = 'rgb(4,1,0)';
    ctx.fillStyle   = 'rgb(255,185,55)';

    for (const { bx, by, period, phase0, maxR } of p.bubbles) {
        const t = ((time + phase0) % period) / period;
        
        if (t < 0.60) {
            const q = t / 0.60;
            const r = maxR * q;
            ctx.lineWidth   = 0.85 * (ts / 64);
            ctx.globalAlpha = Math.min(q * 2.5, 1.0) * 0.80;
            ctx.beginPath();
            ctx.arc(bx, by, Math.max(r, 0.4), 0, Math.PI * 2);
            ctx.stroke();

            if (t < 0.55 && r > 1.2) {
                ctx.globalAlpha = (t / 0.60) * 0.42;
                ctx.beginPath();
                ctx.arc(bx - r * 0.28, by - r * 0.28, r * 0.30, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            const q = (t - 0.60) / 0.40; 
            const r = maxR * (1.0 + q * 0.8);
            ctx.lineWidth   = 0.5 * (ts / 64) * (1 - q);
            ctx.globalAlpha = (1 - q) * 0.65;
            ctx.beginPath();
            ctx.arc(bx, by, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // --- ORGANICKÝ SHIMMER (ZÁŘE) ---
    const pulse = Math.sin((time % 3.8) / 3.8 * Math.PI * 2);
    ctx.globalAlpha = 0.06 + pulse * 0.04;
    const offset = pulse * (ts * 0.03); 
    ctx.drawImage(p.shimCanvas, x - offset / 2, y - offset / 2, ts + offset, ts + offset);
    
    ctx.globalAlpha = 1;
}

/*
_drawSandBones
Tiles: SND[BONE-1..4]
Graphics: shared (both quality levels)
Sun-bleached bones / skull partially buried in desert sand.
Background is fully transparent — sand texture below shows through.
Burial via canvas clip only — no gradient overlay that could darken sand.
*/
function _drawSandBones(ctx, x, y, variant, quality) {
    const ts = this.tileSize;
    const tx = (x / ts) | 0, ty = (y / ts) | 0;
    const s0 = tx * 1234 ^ ty * 5678;
    let si = 1;
    const rng = () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1;

    const COL_BASE = '#d9d0b0';   // sun-bleached ivory
    const COL_DARK = '#b0a074';   // crevice / underside shadow
    const COL_HI   = '#ecead8';   // lit top surface

    // ── LOW quality: flat shapes, no shadows/highlights ──
    if (quality === 'low') {
        const drawBoneLow = (cx, cy, length, thick, angle) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            const hw = length * 0.42;
            const sh = thick * 0.28;
            ctx.fillStyle = COL_BASE;
            ctx.fillRect(-hw * 0.88, -sh, hw * 1.76, sh * 2);
            ctx.restore();
        };

        const drawRibLow = (cx, cy, width, sag, thick, angle) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.lineCap = 'round';
            ctx.lineWidth = thick;
            ctx.strokeStyle = COL_BASE;
            ctx.beginPath();
            ctx.moveTo(-width / 2, 0);
            ctx.quadraticCurveTo(0, -sag, width / 2, 0);
            ctx.stroke();
            ctx.restore();
        };

        const drawSkullLow = (cx, cy, size) => {
            ctx.save();
            ctx.translate(cx, cy);
            const cw = size * 0.46, ch = size * 0.38;
            ctx.fillStyle = COL_BASE;
            ctx.beginPath();
            ctx.ellipse(0, 0, cw, ch, 0, 0, Math.PI * 2);
            ctx.fill();
            const eW = size * 0.12, eH = size * 0.09;
            const eX = size * 0.155, eY = size * 0.02;
            ctx.fillStyle = 'rgba(22,15,5,0.75)';
            ctx.beginPath(); ctx.ellipse(-eX, eY, eW, eH, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse( eX, eY, eW, eH, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        };

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, ts, ts * 0.68);
        ctx.clip();

        if (variant === 1) {
            const a = Math.PI * 0.11 + (rng() - 0.5) * 0.14;
            drawBoneLow(x + ts * 0.50, y + ts * 0.46, ts * 0.68, ts * 0.095, a);
        } else if (variant === 2) {
            drawBoneLow(x + ts * 0.50, y + ts * 0.46, ts * 0.62, ts * 0.084,  Math.PI * 0.21);
            drawBoneLow(x + ts * 0.50, y + ts * 0.46, ts * 0.62, ts * 0.084, -Math.PI * 0.21);
        } else if (variant === 3) {
            const rAngle = Math.PI * 0.04 + (rng() - 0.5) * 0.06;
            const rW = ts * 0.64, rSag = ts * 0.14, rT = ts * 0.076;
            drawRibLow(x + ts * 0.50, y + ts * 0.28, rW,        rSag,        rT,        rAngle);
            drawRibLow(x + ts * 0.50, y + ts * 0.44, rW * 0.86, rSag * 0.82, rT * 0.90, rAngle);
            drawRibLow(x + ts * 0.50, y + ts * 0.60, rW * 0.70, rSag * 0.62, rT * 0.78, rAngle);
        } else {
            drawSkullLow(x + ts * 0.50, y + ts * 0.40, ts * 0.46);
        }

        ctx.restore();
        return;
    }

    // ── Long bone: flat epiphysis ends (ew < eh → not round) ──
    const drawBone = (cx, cy, length, thick, angle) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        const hw = length * 0.42;
        const sh = thick * 0.28;
        const ew = thick * 0.44;   // end cap half-length along bone (narrow = flat)
        const eh = thick * 0.88;   // end cap half-height perp (wide = flared)

        // Drop shadow
        ctx.fillStyle = 'rgba(70,50,10,0.16)';
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(hw*s + thick*0.10, thick*0.12, ew*0.88, eh*0.88, 0, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.fillRect(-hw*0.88 + thick*0.10, -sh*0.5 + thick*0.12, hw*1.76, sh);

        // Shaft
        ctx.fillStyle = COL_BASE;
        ctx.fillRect(-hw*0.88, -sh, hw*1.76, sh*2);
        // End caps
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(hw*s, 0, ew, eh, 0, 0, Math.PI*2);
            ctx.fill();
        }

        // Bottom shade (cylindrical depth)
        ctx.fillStyle = COL_DARK;
        ctx.fillRect(-hw*0.80, sh*0.28, hw*1.60, sh*0.68);
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(hw*s, eh*0.22, ew*0.78, eh*0.58, 0, 0, Math.PI);
            ctx.fill();
        }

        // Top highlight
        ctx.fillStyle = COL_HI;
        ctx.fillRect(-hw*0.75, -sh, hw*1.50, sh*0.65);
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(hw*s, -eh*0.20, ew*0.60, eh*0.44, 0, 0, Math.PI);
            ctx.fill();
        }
        ctx.restore();
    };

    // ── Rib: curved arc bone (quadratic bezier stroke) ──
    const drawRib = (cx, cy, width, sag, thick, angle) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.lineCap = 'round';

        // Shadow
        ctx.lineWidth = thick + thick * 0.24;
        ctx.strokeStyle = 'rgba(70,50,10,0.15)';
        ctx.beginPath();
        ctx.moveTo(-width/2, thick*0.14);
        ctx.quadraticCurveTo(0, -sag + thick*0.14, width/2, thick*0.14);
        ctx.stroke();

        // Main body
        ctx.lineWidth = thick;
        ctx.strokeStyle = COL_BASE;
        ctx.beginPath();
        ctx.moveTo(-width/2, 0);
        ctx.quadraticCurveTo(0, -sag, width/2, 0);
        ctx.stroke();

        // Bottom shade strip
        ctx.lineWidth = thick * 0.33;
        ctx.strokeStyle = COL_DARK;
        ctx.beginPath();
        ctx.moveTo(-width/2 + thick*0.5, thick*0.22);
        ctx.quadraticCurveTo(0, -sag + thick*0.44, width/2 - thick*0.5, thick*0.22);
        ctx.stroke();

        // Top highlight
        ctx.lineWidth = thick * 0.36;
        ctx.strokeStyle = COL_HI;
        ctx.beginPath();
        ctx.moveTo(-width/2 + thick*0.5, -thick*0.05);
        ctx.quadraticCurveTo(0, -sag + thick*0.14, width/2 - thick*0.5, -thick*0.05);
        ctx.stroke();

        ctx.restore();
    };

    // ── Skull: oval cranium with eye sockets and nose cavity ──
    const drawSkull = (cx, cy, size) => {
        ctx.save();
        ctx.translate(cx, cy);

        const cw = size * 0.46;
        const ch = size * 0.38;

        // Drop shadow
        ctx.fillStyle = 'rgba(70,50,10,0.20)';
        ctx.beginPath();
        ctx.ellipse(size*0.06, size*0.07, cw*0.94, ch*0.94, 0, 0, Math.PI*2);
        ctx.fill();

        // Cranium
        ctx.fillStyle = COL_BASE;
        ctx.beginPath();
        ctx.ellipse(0, 0, cw, ch, 0, 0, Math.PI*2);
        ctx.fill();

        // Underside shade
        ctx.fillStyle = COL_DARK;
        ctx.beginPath();
        ctx.ellipse(0, ch*0.24, cw*0.82, ch*0.55, 0, 0, Math.PI);
        ctx.fill();

        // Top highlight
        ctx.fillStyle = COL_HI;
        ctx.beginPath();
        ctx.ellipse(-cw*0.16, -ch*0.26, cw*0.38, ch*0.32, 0, 0, Math.PI*2);
        ctx.fill();

        // Eye sockets — elongated horizontally, dark hollow
        const eW = size * 0.125, eH = size * 0.095;
        const eX = size * 0.155, eY = size * 0.02;
        ctx.fillStyle = 'rgba(22,15,5,0.82)';
        ctx.beginPath(); ctx.ellipse(-eX, eY, eW, eH, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( eX, eY, eW, eH, 0, 0, Math.PI*2); ctx.fill();

        // Nose cavity
        ctx.fillStyle = 'rgba(22,15,5,0.65)';
        ctx.beginPath();
        ctx.ellipse(0, ch*0.33, size*0.062, size*0.082, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    };

    // Clip to upper portion of tile — burial effect without any dark overlay.
    // Sand texture below shows through transparent road-layer pixels.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ts, ts * 0.68);
    ctx.clip();

    if (variant === 1) {
        // Single large long bone, slight diagonal
        const a = Math.PI * 0.11 + (rng() - 0.5) * 0.14;
        drawBone(x + ts*0.50, y + ts*0.46, ts*0.68, ts*0.095, a);

    } else if (variant === 2) {
        // Two crossed bones — X shape
        drawBone(x + ts*0.50, y + ts*0.46, ts*0.62, ts*0.084,  Math.PI*0.21);
        drawBone(x + ts*0.50, y + ts*0.46, ts*0.62, ts*0.084, -Math.PI*0.21);

    } else if (variant === 3) {
        // Ribs — 3 parallel curved rib arcs, slightly angled
        const rAngle = Math.PI * 0.04 + (rng() - 0.5) * 0.06;
        const rW = ts * 0.64, rSag = ts * 0.14, rT = ts * 0.076;
        drawRib(x + ts*0.50, y + ts*0.28, rW,        rSag,        rT,        rAngle);
        drawRib(x + ts*0.50, y + ts*0.44, rW * 0.86, rSag * 0.82, rT * 0.90, rAngle);
        drawRib(x + ts*0.50, y + ts*0.60, rW * 0.70, rSag * 0.62, rT * 0.78, rAngle);

    } else {
        // Skull
        drawSkull(x + ts*0.50, y + ts*0.40, ts*0.46);
    }

    ctx.restore();
}

/*
_drawSandCactus
Tiles: SND[Cactus-1..4]
Graphics: shared (both quality levels)
*/
function _drawSandCactus(ctx, x, y, variant, quality) {
    const ts = this.tileSize;

    const COL_BODY  = '#4c8c2a';
    const COL_DARK  = '#2e5a18';
    const COL_HI    = '#72bb40';
    const COL_SPINE = '#d4c882';

    // ── LOW quality: plain flat rectangles, no arms detail, no spines ──
    if (quality === 'low') {
        const drawCactusLow = (cx, baseY, scale, withArms) => {
            const W  = ts * 0.13 * scale;
            const H  = ts * 0.62 * scale;
            const tx = cx - W * 0.5;
            const ty = baseY - H;

            if (withArms) {
                const AW = W * 0.76;
                const AH = ts * 0.17 * scale;
                const AJ = ty + H * 0.42;
                ctx.fillStyle = COL_BODY;
                // left arm
                ctx.fillRect(tx - AH, AJ - AW * 0.5, AH + W * 0.1, AW);
                ctx.fillRect(tx - AH, AJ - AW * 0.5 - ts * 0.21 * scale, AW, ts * 0.21 * scale + AW * 0.5);
                // right arm
                ctx.fillRect(tx + W - W * 0.1, AJ - AW * 0.5, AH + W * 0.1, AW);
                ctx.fillRect(tx + W + AH - AW, AJ - AW * 0.5 - ts * 0.21 * scale, AW, ts * 0.21 * scale + AW * 0.5);
            }

            ctx.fillStyle = COL_BODY;
            ctx.fillRect(tx, ty, W, H);
        };

        const baseY = y + ts * 0.88;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, ts, ts);
        ctx.clip();

        if (variant === 1) {
            drawCactusLow(x + ts * 0.34, baseY - ts * 0.10, 1.00, true);
            drawCactusLow(x + ts * 0.71, baseY - ts * 0.10, 0.62, false);
        } else if (variant === 2) {
            drawCactusLow(x + ts * 0.50, baseY, 1.15, true);
        } else if (variant === 3) {
            drawCactusLow(x + ts * 0.28, baseY, 0.80, false);
            drawCactusLow(x + ts * 0.70, baseY - ts * 0.16, 0.62, false);
        } else {
            drawCactusLow(x + ts * 0.29, baseY - ts * 0.10, 0.62, false);
            drawCactusLow(x + ts * 0.66, baseY - ts * 0.10, 1.00, true);
        }

        ctx.restore();
        return;
    }

    // cx = center x, baseY = bottom of cactus, scale = size multiplier, withArms = bool
    const drawCactus = (cx, baseY, scale, withArms) => {
        const W  = ts * 0.13 * scale;   // trunk full width
        const H  = ts * 0.62 * scale;   // trunk height
        const R  = W * 0.45;            // trunk corner radius
        const tx = cx - W * 0.5;        // trunk left edge
        const ty = baseY - H;           // trunk top edge

        if (withArms) {
            const AW = W * 0.76;              // arm cross-section width
            const AH = ts * 0.17 * scale;     // arm horizontal reach
            const AV = ts * 0.21 * scale;     // arm vertical height
            const AJ = ty + H * 0.42;         // Y where arm meets trunk
            const AR = AW * 0.5;              // arm corner radius

            for (const side of [-1, 1]) {
                // Horizontal segment of arm
                const hx = side < 0 ? tx - AH : tx + W;
                ctx.fillStyle = COL_BODY;
                this.roundRect(ctx, hx, AJ - AW * 0.5, AH + W * 0.1, AW, AR, true, false);
                ctx.fillStyle = COL_DARK;
                ctx.fillRect(hx + AW * 0.15, AJ + AW * 0.08, AH - AW * 0.3 + W * 0.1, AW * 0.30);

                // Vertical segment going up from elbow
                const vcx = side < 0 ? (tx - AH) + AW * 0.5 : (tx + W + AH) - AW * 0.5;
                const vx  = vcx - AW * 0.5;
                const vty = AJ - AW * 0.5 - AV;
                ctx.fillStyle = COL_BODY;
                this.roundRect(ctx, vx, vty, AW, AV + AW * 0.5, AR, true, false);
                ctx.fillStyle = COL_DARK;
                ctx.fillRect(vx + AW * 0.56, vty + AW * 0.14, AW * 0.34, AV * 0.74);
                ctx.fillStyle = COL_HI;
                ctx.fillRect(vx + AW * 0.08, vty + AW * 0.12, AW * 0.22, AV * 0.66);
            }
        }

        // Trunk drop shadow
        ctx.fillStyle = 'rgba(0,40,0,0.18)';
        ctx.fillRect(tx + W * 0.12, ty + H * 0.03, W + 2, H);

        // Trunk body
        ctx.fillStyle = COL_BODY;
        this.roundRect(ctx, tx, ty, W, H, R, true, false);

        // Dark right strip
        ctx.fillStyle = COL_DARK;
        this.roundRect(ctx, tx + W * 0.57, ty + H * 0.06, W * 0.37, H * 0.87, R * 0.5, true, false);

        // Highlight left strip
        ctx.fillStyle = COL_HI;
        ctx.fillRect(tx + W * 0.07, ty + H * 0.07, W * 0.25, H * 0.79);

        // Top gleam
        ctx.fillStyle = COL_HI;
        ctx.beginPath();
        ctx.ellipse(cx - W * 0.09, ty + W * 0.42, W * 0.30, W * 0.20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Spines on trunk sides
        ctx.save();
        ctx.strokeStyle = COL_SPINE;
        ctx.lineWidth = Math.max(0.7, ts * 0.011 * scale);
        for (let i = 0; i < 3; i++) {
            const sy = ty + H * (0.18 + i * 0.28);
            const sl = W * 0.52;
            ctx.beginPath(); ctx.moveTo(tx, sy); ctx.lineTo(tx - sl, sy - sl * 0.35); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(tx + W, sy); ctx.lineTo(tx + W + sl, sy - sl * 0.35); ctx.stroke();
        }
        ctx.restore();
    };

    const baseY = y + ts * 0.88;

    // Clip to tile bounds
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ts, ts);
    ctx.clip();

    if (variant === 1) {
        // Left bigger, right smaller — both shifted slightly higher
        drawCactus(x + ts * 0.34, baseY - ts * 0.10, 1.00, true);
        drawCactus(x + ts * 0.71, baseY - ts * 0.10, 0.62, false);
    } else if (variant === 2) {
        // 1 big cactus in the middle
        drawCactus(x + ts * 0.50, baseY, 1.15, true);
    } else if (variant === 3) {
        // 2 small cacti: left at bottom, right slightly higher
        drawCactus(x + ts * 0.28, baseY, 0.80, false);
        drawCactus(x + ts * 0.70, baseY - ts * 0.16, 0.62, false);
    } else {
        // variant 4: Left smaller, right bigger — both shifted slightly higher
        drawCactus(x + ts * 0.29, baseY - ts * 0.10, 0.62, false);
        drawCactus(x + ts * 0.66, baseY - ts * 0.10, 1.00, true);
    }

    ctx.restore();
}

/*
_drawSandPalm
Tiles: SND[Palm-1..2]
Graphics: shared (both quality levels)
*/
function _drawSandPalm(ctx, x, y, variant, quality) {
    const ts = this.tileSize;

    const COL_TRUNK      = '#7D5510';
    const COL_TRUNK_DARK = '#4E3408';
    const COL_TRUNK_LIT  = '#B8841C';
    const COL_FROND      = '#2B7019';
    const COL_FROND_DRK  = '#1A4A10';
    const COL_FROND_LIT  = '#48A030';
    const COL_COCONUT    = '#5C3608';

    // ── LOW quality ──
    if (quality === 'low') {
        const drawPalmLow = (cx, baseY, scale, lean) => {
            const H   = ts * 0.68 * scale;
            const TW  = ts * 0.07  * scale;
            const topX = cx + lean * H * 0.28;
            const topY = baseY - H;

            ctx.fillStyle = COL_TRUNK;
            ctx.beginPath();
            ctx.moveTo(cx - TW, baseY);
            ctx.lineTo(cx + TW, baseY);
            ctx.lineTo(topX + TW * 0.55, topY);
            ctx.lineTo(topX - TW * 0.55, topY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = COL_FROND;
            const crR = ts * 0.23 * scale;
            ctx.beginPath();
            ctx.ellipse(topX, topY - crR * 0.28, crR * 1.05, crR * 0.52, lean * 0.25, 0, Math.PI * 2);
            ctx.fill();
        };

        const baseY = y + ts * 0.88;
        ctx.save();

        if (variant === 1) {
            drawPalmLow(x + ts * 0.50, baseY, 1.00,  0.20);
        } else if (variant === 2) {
            drawPalmLow(x + ts * 0.27, baseY, 0.90, -0.18);
            drawPalmLow(x + ts * 0.70, baseY, 0.90,  0.18);
        } else if (variant === 3) {
            drawPalmLow(x + ts * 0.26, baseY, 0.66, -0.32);
            drawPalmLow(x + ts * 0.69, baseY, 1.00,  0.32);
        } else {
            drawPalmLow(x + ts * 0.30, baseY, 1.00, -0.32);
            drawPalmLow(x + ts * 0.72, baseY, 0.66,  0.32);
        }

        ctx.restore();
        return;
    }

    // ── HIGH quality ──
    const drawPalm = (cx, baseY, scale, lean) => {
        const H   = ts * 0.72 * scale;
        const TW  = ts * 0.072 * scale;
        const topX = cx + lean * H * 0.28;
        const topY = baseY - H;

        // Bezier control points for the curved trunk
        const c1x = cx  + lean * H * 0.09;
        const c1y = baseY - H * 0.38;
        const c2x = topX - lean * H * 0.05;
        const c2y = topY  + H * 0.25;

        // Ground shadow ellipse
        ctx.fillStyle = 'rgba(50,25,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(cx + lean * ts * 0.07 * scale, baseY - 1, TW * 3.2, TW * 0.70, lean * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Trunk body
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = COL_TRUNK;
        ctx.lineWidth   = TW * 2.1;
        ctx.beginPath();
        ctx.moveTo(cx, baseY);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, topX, topY);
        ctx.stroke();

        // Dark edge
        ctx.strokeStyle = COL_TRUNK_DARK;
        ctx.lineWidth   = TW * 0.72;
        ctx.beginPath();
        ctx.moveTo(cx + TW * 0.52, baseY);
        ctx.bezierCurveTo(c1x + TW * 0.55, c1y, c2x + TW * 0.55, c2y, topX + TW * 0.52, topY);
        ctx.stroke();

        // Lit edge
        ctx.strokeStyle = COL_TRUNK_LIT;
        ctx.lineWidth   = TW * 0.44;
        ctx.beginPath();
        ctx.moveTo(cx - TW * 0.46, baseY);
        ctx.bezierCurveTo(c1x - TW * 0.42, c1y, c2x - TW * 0.42, c2y, topX - TW * 0.46, topY);
        ctx.stroke();

        // Trunk ring scars
        ctx.strokeStyle = COL_TRUNK_DARK;
        ctx.lineWidth   = Math.max(0.5, ts * 0.009 * scale);
        for (let i = 0; i < 6; i++) {
            const t  = 0.07 + i * 0.155;
            const mt = 1 - t;
            const bx = mt*mt*mt*cx + 3*mt*mt*t*c1x + 3*mt*t*t*c2x + t*t*t*topX;
            const by = mt*mt*mt*baseY + 3*mt*mt*t*c1y + 3*mt*t*t*c2y + t*t*t*topY;
            ctx.beginPath();
            ctx.moveTo(bx - TW, by);
            ctx.lineTo(bx + TW, by + TW * 0.30);
            ctx.stroke();
        }

        // ── FRONDS (AAA — leaflets along each rachis) ──
        const frondLen  = ts * 0.34 * scale;
        const numFronds = 11;
        const fanOffset = lean * 0.28;

        const COL_RACHIS    = '#16400D';
        const COL_FROND_TIP = '#5FC838';

        // Dark ambient-occlusion blob at crown
        const crownGrad = ctx.createRadialGradient(topX, topY, 0, topX, topY, ts * 0.09 * scale);
        crownGrad.addColorStop(0, 'rgba(8,22,4,0.72)');
        crownGrad.addColorStop(1, 'rgba(8,22,4,0.0)');
        ctx.fillStyle = crownGrad;
        ctx.beginPath();
        ctx.arc(topX, topY, ts * 0.09 * scale, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < numFronds; i++) {
            const rawAngle = (i / numFronds) * Math.PI * 2 + fanOffset;
            const norm = ((rawAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

            // Skip fronds pointing too far downward
            if (norm > Math.PI * 0.18 && norm < Math.PI * 0.82) continue;

            // Rachis with natural gravitational droop
            const droop = frondLen * 0.42;
            const endX  = topX + Math.cos(rawAngle) * frondLen;
            const endY  = topY + Math.sin(rawAngle) * frondLen + droop;
            const ctrlX = topX + Math.cos(rawAngle) * frondLen * 0.50;
            const ctrlY = topY + Math.sin(rawAngle) * frondLen * 0.34 + droop * 0.26;

            // Broad shadow behind the whole frond
            ctx.strokeStyle = 'rgba(0,30,0,0.15)';
            ctx.lineWidth   = frondLen * 0.22;
            ctx.lineCap     = 'butt';
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.quadraticCurveTo(ctrlX + 1, ctrlY + 2, endX + 1, endY + 2);
            ctx.stroke();

            // Leaflets along the rachis
            const numLeaflets = 11;
            for (let j = 0; j < numLeaflets; j++) {
                const t  = (j + 0.5) / numLeaflets;
                const mt = 1 - t;

                // Point on rachis (quadratic bezier)
                const rx = mt*mt*topX + 2*mt*t*ctrlX + t*t*endX;
                const ry = mt*mt*topY + 2*mt*t*ctrlY + t*t*endY;

                // Tangent direction along rachis
                const dtx  = 2*(1-t)*(ctrlX - topX) + 2*t*(endX - ctrlX);
                const dty  = 2*(1-t)*(ctrlY - topY) + 2*t*(endY - ctrlY);
                const dtlen = Math.sqrt(dtx*dtx + dty*dty) || 1;
                const tnx = dtx / dtlen, tny = dty / dtlen;
                const pnx = -tny, pny =  tnx; // left-side perpendicular

                // Leaflet length: long at base, tapers toward rachis tip
                const taper   = 1.0 - t * 0.54;
                const leafLen = frondLen * 0.195 * taper * (j < 1 ? 0.58 : 1.0);
                const leafW   = Math.max(0.4, frondLen * 0.033 * (1 - t * 0.44));

                // Colour: tips are bright lime, body alternates dark / mid / light
                let lColor;
                if      (t > 0.76)      lColor = COL_FROND_TIP;
                else if (j % 3 === 0)   lColor = COL_FROND_LIT;
                else if (j % 3 === 1)   lColor = COL_FROND;
                else                    lColor = COL_FROND_DRK;

                // Leaflets lean slightly forward (toward tip) and droop
                const fwdBias  = 0.18;
                const leafDroop = leafLen * 0.30;

                ctx.strokeStyle = lColor;
                ctx.lineWidth   = leafW;
                ctx.lineCap     = 'round';

                // Left leaflet
                const l1ex = rx + (pnx + tnx * fwdBias) * leafLen;
                const l1ey = ry + (pny + tny * fwdBias) * leafLen + leafDroop;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.quadraticCurveTo(
                    rx + (pnx + tnx * fwdBias) * leafLen * 0.52,
                    ry + (pny + tny * fwdBias) * leafLen * 0.52 + leafDroop * 0.30,
                    l1ex, l1ey
                );
                ctx.stroke();

                // Right leaflet (mirrored)
                const l2ex = rx + (-pnx + tnx * fwdBias) * leafLen;
                const l2ey = ry + (-pny + tny * fwdBias) * leafLen + leafDroop;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.quadraticCurveTo(
                    rx + (-pnx + tnx * fwdBias) * leafLen * 0.52,
                    ry + (-pny + tny * fwdBias) * leafLen * 0.52 + leafDroop * 0.30,
                    l2ex, l2ey
                );
                ctx.stroke();
            }

            // Rachis spine drawn on top of leaflets
            ctx.strokeStyle = COL_RACHIS;
            ctx.lineWidth   = Math.max(0.5, frondLen * 0.018);
            ctx.lineCap     = 'round';
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
            ctx.stroke();

            // Midrib rim light on proximal half
            ctx.strokeStyle = COL_FROND_LIT;
            ctx.lineWidth   = Math.max(0.3, frondLen * 0.007);
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.quadraticCurveTo(
                ctrlX * 0.52 + topX * 0.48, ctrlY * 0.52 + topY * 0.48,
                ctrlX, ctrlY
            );
            ctx.stroke();
        }

        // Coconuts at crown
        ctx.fillStyle = COL_COCONUT;
        for (let i = 0; i < 3; i++) {
            const ca  = (i / 3) * Math.PI * 1.2 - Math.PI * 0.1 + fanOffset;
            const cr  = ts * 0.034 * scale;
            const ccx = topX + Math.cos(ca) * cr * 2.8;
            const ccy = topY + cr * 1.6  + Math.sin(ca) * cr;
            ctx.beginPath();
            ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(220,160,60,0.30)';
            ctx.beginPath();
            ctx.arc(ccx - cr * 0.28, ccy - cr * 0.28, cr * 0.42, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = COL_COCONUT;
        }
    };

    const baseY = y + ts * 0.88;
    ctx.save();

    if (variant === 1) {
        // Single big palm, slight right lean
        drawPalm(x + ts * 0.50, baseY, 1.00,  0.20);
    } else if (variant === 2) {
        // 2 big palms leaning outward
        drawPalm(x + ts * 0.27, baseY, 0.92, -0.18);
        drawPalm(x + ts * 0.70, baseY, 0.92,  0.18);
    } else if (variant === 3) {
        // Big on right leaning right, smaller on left leaning left
        drawPalm(x + ts * 0.26, baseY, 0.68, -0.32);
        drawPalm(x + ts * 0.69, baseY, 1.00,  0.32);
    } else {
        // Big on left leaning left, smaller on right leaning right
        drawPalm(x + ts * 0.30, baseY, 1.00, -0.32);
        drawPalm(x + ts * 0.72, baseY, 0.68,  0.32);
    }

    ctx.restore();
}

/*
_drawSnowSpike
Tiles: SNW[SPIKE-1..4]
Graphics: shared (both quality levels)
Frosty bent ice-crystal spikes rising from the snow.
Background is the snow texture — spike is drawn on top in the road layer.
Bent via quadratic bezier curves; snowy frost patches cling to the lit side.
*/
function _drawSnowSpike(ctx, x, y, variant, quality) {
    const ts = this.tileSize;
    const tx = (x / ts) | 0, ty = (y / ts) | 0;
    const s0 = tx * 1234 ^ ty * 5678;
    let si = 1;
    const rng = () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1;

    const COL_SNOW   = '#e4f2fa';   // snow mound / frost patches
    const COL_ICE_D  = '#0d1e30';   // deep shadow facet
    const COL_ICE_M  = '#2a5a7a';   // mid ice blue
    const COL_ICE_L  = '#5aaccf';   // lit ice face

    // ── LOW quality: bent triangles with frost accent ──
    if (quality === 'low') {
        const drawSpikeLow = (cx, baseY, h, w, angle, bendX) => {
            const bx = bendX || 0;
            ctx.save();
            ctx.translate(cx, baseY);
            ctx.rotate(angle || 0);

            // Main body — curved sides
            ctx.fillStyle = COL_ICE_M;
            ctx.beginPath();
            ctx.moveTo(-w / 2, 0);
            ctx.quadraticCurveTo(bx - w * 0.20, -h * 0.50, bx, -h);
            ctx.quadraticCurveTo(bx + w * 0.20, -h * 0.50, w / 2, 0);
            ctx.closePath();
            ctx.fill();

            // Lit right face
            ctx.fillStyle = COL_ICE_L;
            ctx.beginPath();
            ctx.moveTo(w * 0.05, 0);
            ctx.quadraticCurveTo(bx + w * 0.20, -h * 0.50, bx + w * 0.04, -h);
            ctx.lineTo(w / 2, 0);
            ctx.closePath();
            ctx.fill();

            // Frost patch near tip
            ctx.fillStyle = 'rgba(220, 244, 255, 0.75)';
            ctx.beginPath();
            ctx.ellipse(bx, -h * 0.82, w * 0.18, h * 0.07, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        const baseY = y + ts * 0.80;
        const b1 = (rng() - 0.5) * ts * 0.09;
        const b2 = (rng() - 0.5) * ts * 0.07;
        const b3 = (rng() - 0.5) * ts * 0.08;
        const b4 = (rng() - 0.5) * ts * 0.07;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, ts, ts);
        ctx.clip();

        if (variant === 1) {
            drawSpikeLow(x + ts * 0.50, baseY, ts * 0.72, ts * 0.22, 0, b1);
        } else if (variant === 2) {
            drawSpikeLow(x + ts * 0.32, baseY, ts * 0.44, ts * 0.14, -0.14, b1);
            drawSpikeLow(x + ts * 0.68, baseY, ts * 0.44, ts * 0.14,  0.14, b2);
            drawSpikeLow(x + ts * 0.50, baseY, ts * 0.60, ts * 0.18, 0, b3);
        } else if (variant === 3) {
            drawSpikeLow(x + ts * 0.36, baseY, ts * 0.66, ts * 0.18, -0.20, b1);
            drawSpikeLow(x + ts * 0.64, baseY, ts * 0.66, ts * 0.18,  0.20, b2);
        } else {
            drawSpikeLow(x + ts * 0.22, baseY, ts * 0.34, ts * 0.11, -0.22, b1);
            drawSpikeLow(x + ts * 0.42, baseY, ts * 0.60, ts * 0.16, 0, b2);
            drawSpikeLow(x + ts * 0.62, baseY, ts * 0.46, ts * 0.14,  0.14, b3);
            drawSpikeLow(x + ts * 0.77, baseY, ts * 0.30, ts * 0.09,  0.25, b4);
        }

        ctx.restore();
        return;
    }

    // ── HIGH quality: glassy frosty bent spike ──
    const drawSpike = (cx, baseY, h, w, angle, bendX) => {
        const bx = bendX || 0;

        ctx.save();
        ctx.translate(cx, baseY);
        ctx.rotate(angle || 0);

        // Helper: spike outline as quadratic bezier (bent shape)
        const spikePath = (offX, offY) => {
            const ox = offX || 0, oy = offY || 0;
            ctx.beginPath();
            ctx.moveTo(-w / 2 + ox, oy);
            ctx.quadraticCurveTo(bx - w * 0.22 + ox, -h * 0.50 + oy, bx + ox, -h + oy);
            ctx.quadraticCurveTo(bx + w * 0.22 + ox, -h * 0.50 + oy,  w / 2 + ox, oy);
            ctx.closePath();
        };

        // Drop shadow (offset)
        ctx.fillStyle = 'rgba(0, 12, 35, 0.40)';
        spikePath(3.5, 4);
        ctx.fill();

        // Snow mound at base
        ctx.fillStyle = COL_SNOW;
        ctx.beginPath();
        ctx.ellipse(bx * 0.25, 1, w * 0.92, w * 0.30, 0, 0, Math.PI * 2);
        ctx.fill();

        // === Clip all interior to spike silhouette ===
        ctx.save();
        spikePath();
        ctx.clip();

        // STEP 1: Ice core — dark-to-lit horizontal gradient, translucent like real glass
        // (alpha < 1 lets the snow mound/backdrop faintly bleed through the body)
        const coreGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        coreGrad.addColorStop(0,    'rgba(8, 26, 42, 0.90)');
        coreGrad.addColorStop(0.25, 'rgba(18, 58, 90, 0.88)');
        coreGrad.addColorStop(0.55, 'rgba(34, 118, 164, 0.82)');
        coreGrad.addColorStop(0.82, 'rgba(94, 208, 240, 0.76)');
        coreGrad.addColorStop(1,    'rgba(18, 58, 90, 0.88)');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(-w, -h - 2, w * 2.5, h + 4);

        // STEP 1b: Glassy internal glint — soft diagonal light bloom for extra clarity
        ctx.globalCompositeOperation = 'lighter';
        const glintGrad = ctx.createLinearGradient(-w * 0.30, -h * 0.85, w * 0.35, -h * 0.10);
        glintGrad.addColorStop(0,   'rgba(255, 255, 255, 0)');
        glintGrad.addColorStop(0.5, 'rgba(224, 250, 255, 0.30)');
        glintGrad.addColorStop(1,   'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glintGrad;
        ctx.fillRect(-w, -h - 2, w * 2.5, h + 4);
        ctx.globalCompositeOperation = 'source-over';

        // STEP 2: Frosted surface — white-blue near tip, fading to nothing at base
        const frostGrad = ctx.createLinearGradient(0, -h, 0, 0);
        frostGrad.addColorStop(0,    'rgba(238, 252, 255, 0.76)');
        frostGrad.addColorStop(0.22, 'rgba(195, 235, 250, 0.44)');
        frostGrad.addColorStop(0.60, 'rgba(115, 175, 215, 0.18)');
        frostGrad.addColorStop(1,    'rgba(60, 100, 140, 0.04)');
        ctx.fillStyle = frostGrad;
        ctx.fillRect(-w, -h - 2, w * 2.5, h + 4);

        // STEP 3: Left shadow facet
        ctx.globalAlpha = 0.60;
        ctx.fillStyle = '#050e1a';
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.quadraticCurveTo(bx - w * 0.20, -h * 0.48, bx - w * 0.02, -h);
        ctx.lineTo(bx + w * 0.10, -h * 0.45);
        ctx.lineTo(-w * 0.10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // STEP 4: Snow/frost patches clinging to the lit side
        ctx.globalAlpha = 0.70;
        ctx.fillStyle = '#eef7ff';
        ctx.beginPath();
        ctx.ellipse(bx + w * 0.18, -h * 0.66, w * 0.26, h * 0.10, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + w * 0.26, -h * 0.50, w * 0.16, h * 0.065, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + w * 0.10, -h * 0.82, w * 0.14, h * 0.055, -0.10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // STEP 5: Frost sparkle pixels (single-pixel bright dots)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
        for (let i = 0; i < 8; i++) {
            ctx.fillRect(
                bx + (rng() - 0.5) * w * 1.1,
                -(rng() * h * 0.87 + h * 0.04),
                1, 1
            );
        }

        ctx.restore(); // end clip

        // STEP 6: Caustic refraction streak (over silhouette)
        ctx.globalAlpha = 0.30;
        ctx.strokeStyle = '#b8e4ff';
        ctx.lineWidth = Math.max(0.5, ts * 0.009);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx + w * 0.07, -h * 0.88);
        ctx.lineTo(bx + w * 0.28, -h * 0.28);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // STEP 7: Right rim light — the glass/ice edge sheen (brighter + slightly wider for a polished-glass edge)
        ctx.globalAlpha = 0.92;
        const rimGrad = ctx.createLinearGradient(w / 2, 0, w / 2, -h);
        rimGrad.addColorStop(0,    'rgba(200, 240, 255, 0)');
        rimGrad.addColorStop(0.20, '#d8f4ff');
        rimGrad.addColorStop(0.75, '#ffffff');
        rimGrad.addColorStop(1,    'rgba(255, 255, 255, 0.25)');
        ctx.strokeStyle = rimGrad;
        ctx.lineWidth = Math.max(1.1, ts * 0.016);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.quadraticCurveTo(bx + w * 0.24, -h * 0.50, bx + w * 0.04, -h);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // STEP 8: Left edge cold-blue outline
        ctx.globalAlpha = 0.36;
        ctx.strokeStyle = '#4a90b0';
        ctx.lineWidth = Math.max(0.4, ts * 0.006);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.quadraticCurveTo(bx - w * 0.24, -h * 0.50, bx, -h);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // STEP 9: Bright white tip + sparkle cross
        ctx.globalAlpha = 0.96;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(bx - w * 0.03, -h + 2.5);
        ctx.lineTo(bx, -h);
        ctx.lineTo(bx + w * 0.03, -h + 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.68)';
        ctx.lineWidth = Math.max(0.5, ts * 0.007);
        ctx.beginPath(); ctx.moveTo(bx, -h - 3.5); ctx.lineTo(bx, -h + 1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx - 2.5, -h);  ctx.lineTo(bx + 2.5, -h); ctx.stroke();
        ctx.globalAlpha = 1.0;

        ctx.restore();
    };

    const baseY = y + ts * 0.80;

    // Per-tile seeded bend values (deterministic, unique per tile position)
    const b1 = (rng() - 0.5) * ts * 0.10;
    const b2 = (rng() - 0.5) * ts * 0.09;
    const b3 = (rng() - 0.5) * ts * 0.08;
    const b4 = (rng() - 0.5) * ts * 0.08;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ts, ts);
    ctx.clip();

    if (variant === 1) {
        drawSpike(x + ts * 0.50, baseY, ts * 0.74, ts * 0.25, 0, b1);
    } else if (variant === 2) {
        drawSpike(x + ts * 0.30, baseY, ts * 0.52, ts * 0.16, -0.14, b1);
        drawSpike(x + ts * 0.70, baseY, ts * 0.52, ts * 0.16,  0.14, b2);
        drawSpike(x + ts * 0.50, baseY, ts * 0.74, ts * 0.21,  0,    b3);
    } else if (variant === 3) {
        drawSpike(x + ts * 0.34, baseY, ts * 0.80, ts * 0.21, -0.20, b1);
        drawSpike(x + ts * 0.66, baseY, ts * 0.80, ts * 0.21,  0.20, b2);
    } else {
        drawSpike(x + ts * 0.20, baseY, ts * 0.40, ts * 0.13, -0.22, b1);
        drawSpike(x + ts * 0.41, baseY, ts * 0.72, ts * 0.19,  0,    b2);
        drawSpike(x + ts * 0.62, baseY, ts * 0.55, ts * 0.16,  0.14, b3);
        drawSpike(x + ts * 0.78, baseY, ts * 0.36, ts * 0.11,  0.25, b4);
    }

    ctx.restore();
}

/*
_drawLog
Tiles: X[Log-1], X[Log-2]
Graphics: Low / High quality
Log-1: an upright chopped tree stump ("pařez") with a ringed, cracked cut top.
Log-2: a whole trunk lying fallen on the ground, one cut end showing rings.
Both sit on grass. Cannot build towers, block arrows (see Bullet.js / Tower.js
/ Map.js), but both are low enough that they don't block a tower's line of
sight over them.
*/
function _drawLog(ctx, x, y, variant, quality) {
    const ts = this.tileSize;
    const tx = (x / ts) | 0, ty = (y / ts) | 0;
    const s0 = tx * 1234 ^ ty * 5678;
    let si = 1;
    const rng = () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1;

    if (variant === 2) {
        _drawLogFallen.call(this, ctx, x, y, quality, rng);
    } else {
        _drawLogStump.call(this, ctx, x, y, quality, rng);
    }
}

function _drawLogStump(ctx, x, y, quality, rng) {
    const ts = this.tileSize;
    // Fixed, not randomized — the stump should look identical everywhere it's placed.
    const cx      = x + ts * 0.5;
    const baseY   = y + ts * 0.82;
    const stumpW  = ts * 0.44;
    const stumpH  = ts * 0.24;
    const topRy   = ts * 0.14;
    const topCy   = baseY - stumpH;

    const COL_BARK_D = '#2c1a0d';
    const COL_BARK_M = '#4a2f18';
    const COL_BARK_L = '#6b4726';
    const COL_WOOD_D = '#8a5a30';
    const COL_WOOD_M = '#c08a4e';
    const COL_WOOD_L = '#e0b573';
    const COL_MOSS   = '#5a7a3a';

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ts, ts);
    ctx.clip();

    // Drop shadow
    if (quality !== 'low') {
        ctx.fillStyle = 'rgba(0, 15, 0, 0.30)';
        ctx.beginPath();
        ctx.ellipse(cx + ts * 0.03, baseY + ts * 0.02, stumpW * 0.55, ts * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Bark body — a squat trapezoid trunk
    const barkPath = () => {
        ctx.beginPath();
        ctx.moveTo(cx - stumpW * 0.50, baseY);
        ctx.lineTo(cx - stumpW * 0.42, baseY - stumpH);
        ctx.lineTo(cx + stumpW * 0.42, baseY - stumpH);
        ctx.lineTo(cx + stumpW * 0.50, baseY);
        ctx.closePath();
    };

    barkPath();
    if (quality === 'low') {
        ctx.fillStyle = COL_BARK_M;
        ctx.fill();
    } else {
        const bg = ctx.createLinearGradient(cx - stumpW * 0.5, 0, cx + stumpW * 0.5, 0);
        bg.addColorStop(0,   COL_BARK_L);
        bg.addColorStop(0.5, COL_BARK_M);
        bg.addColorStop(1,   COL_BARK_D);
        ctx.fillStyle = bg;
        ctx.fill();

        // Vertical bark grain
        ctx.save();
        barkPath();
        ctx.clip();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.lineWidth = Math.max(0.6, ts * 0.008);
        for (let i = 0; i < 5; i++) {
            const fx = -0.35 + i * 0.18;
            ctx.beginPath();
            ctx.moveTo(cx + stumpW * fx, baseY);
            ctx.lineTo(cx + stumpW * fx * 0.85, baseY - stumpH);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Top face — cut wood with growth rings
    ctx.beginPath();
    ctx.ellipse(cx, topCy, stumpW * 0.42, topRy, 0, 0, Math.PI * 2);
    if (quality === 'low') {
        ctx.fillStyle = COL_WOOD_M;
        ctx.fill();
    } else {
        const tg = ctx.createRadialGradient(cx, topCy, 2, cx, topCy, stumpW * 0.42);
        tg.addColorStop(0,   COL_WOOD_L);
        tg.addColorStop(0.6, COL_WOOD_M);
        tg.addColorStop(1,   COL_WOOD_D);
        ctx.fillStyle = tg;
        ctx.fill();
    }
    ctx.strokeStyle = COL_BARK_D;
    ctx.lineWidth = Math.max(1, ts * 0.012);
    ctx.stroke();

    if (quality !== 'low') {
        // Growth rings + a crack
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, topCy, stumpW * 0.42, topRy, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = 'rgba(90, 55, 20, 0.5)';
        ctx.lineWidth = Math.max(0.5, ts * 0.006);
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.ellipse(cx, topCy, stumpW * 0.42 * (i / 4), topRy * (i / 4), 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(50, 30, 10, 0.6)';
        ctx.lineWidth = Math.max(0.4, ts * 0.005);
        ctx.beginPath();
        ctx.moveTo(cx - stumpW * 0.30, topCy - topRy * 0.20);
        ctx.lineTo(cx + stumpW * 0.25, topCy + topRy * 0.30);
        ctx.stroke();
        ctx.restore();

        // Small moss patch clinging to the bark
        ctx.fillStyle = COL_MOSS;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.ellipse(cx - stumpW * 0.28, baseY - stumpH * 0.35, stumpW * 0.14, stumpH * 0.16, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    ctx.restore();
}

function _drawLogFallen(ctx, x, y, quality, rng) {
    const ts = this.tileSize;
    const cx = x + ts * 0.5;
    const cy = y + ts * 0.62;
    // Fixed, not randomized — the fallen trunk should look and lean the same
    // way everywhere it's placed, instead of a different tilt on every tile.
    const angle  = -0.18;
    const logLen = ts * 0.78;
    const logTh  = ts * 0.24;

    const COL_BARK_D = '#2c1a0d';
    const COL_BARK_M = '#4a2f18';
    const COL_BARK_L = '#6b4726';
    const COL_WOOD_D = '#8a5a30';
    const COL_WOOD_M = '#c08a4e';
    const COL_WOOD_L = '#e0b573';
    const COL_MOSS   = '#5a7a3a';

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ts, ts);
    ctx.clip();

    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Drop shadow
    if (quality !== 'low') {
        ctx.fillStyle = 'rgba(0, 15, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(ts * 0.02, logTh * 0.65, logLen * 0.48, logTh * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Trunk body — a capsule lying on its side
    const capX = logLen / 2 - logTh * 0.3;
    const bodyPath = () => {
        ctx.beginPath();
        ctx.moveTo(-logLen / 2, -logTh / 2);
        ctx.lineTo(capX, -logTh / 2);
        ctx.arc(capX, 0, logTh / 2, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-logLen / 2, logTh / 2);
        ctx.arc(-logLen / 2, 0, logTh / 2, Math.PI / 2, -Math.PI / 2, true);
        ctx.closePath();
    };

    bodyPath();
    if (quality === 'low') {
        ctx.fillStyle = COL_BARK_M;
        ctx.fill();
    } else {
        const bg = ctx.createLinearGradient(0, -logTh / 2, 0, logTh / 2);
        bg.addColorStop(0,   COL_BARK_L);
        bg.addColorStop(0.5, COL_BARK_M);
        bg.addColorStop(1,   COL_BARK_D);
        ctx.fillStyle = bg;
        ctx.fill();

        // Bark rings running around the trunk's length
        ctx.save();
        bodyPath();
        ctx.clip();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = Math.max(0.6, ts * 0.008);
        for (let i = 0; i < 4; i++) {
            const lx = -logLen * 0.32 + i * logLen * 0.22;
            ctx.beginPath();
            ctx.moveTo(lx, -logTh * 0.5);
            ctx.quadraticCurveTo(lx + logTh * 0.15, 0, lx, logTh * 0.5);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Cut end cap — growth rings, showing this was chopped
    ctx.beginPath();
    ctx.ellipse(capX, 0, logTh * 0.42, logTh * 0.5, 0, 0, Math.PI * 2);
    if (quality === 'low') {
        ctx.fillStyle = COL_WOOD_M;
        ctx.fill();
    } else {
        const tg = ctx.createRadialGradient(capX, 0, 1, capX, 0, logTh * 0.5);
        tg.addColorStop(0,   COL_WOOD_L);
        tg.addColorStop(0.6, COL_WOOD_M);
        tg.addColorStop(1,   COL_WOOD_D);
        ctx.fillStyle = tg;
        ctx.fill();
    }
    ctx.strokeStyle = COL_BARK_D;
    ctx.lineWidth = Math.max(1, ts * 0.010);
    ctx.stroke();

    if (quality !== 'low') {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(capX, 0, logTh * 0.42, logTh * 0.5, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = 'rgba(90, 55, 20, 0.5)';
        ctx.lineWidth = Math.max(0.5, ts * 0.006);
        for (let i = 1; i <= 2; i++) {
            ctx.beginPath();
            ctx.ellipse(capX, 0, logTh * 0.42 * (i / 3), logTh * 0.5 * (i / 3), 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // Moss growing along the top of the trunk
        ctx.fillStyle = COL_MOSS;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(-logLen * 0.10, -logTh * 0.28, logLen * 0.16, logTh * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    ctx.restore();
}

/*
_drawWell
Tile: X[Well]
Graphics: Low / High quality
A round grey stone well wall with water inside. Cannot build towers, blocks
arrows and a tower's line of sight (see Bullet.js / Tower.js / Map.js) — it's
a solid raised stone structure.
*/
function _drawWell(ctx, x, y, quality) {
    const ts = this.tileSize;
    const tx = (x / ts) | 0, ty = (y / ts) | 0;
    const s0 = tx * 1234 ^ ty * 5678;
    let si = 1;
    const rng = () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1;

    const cx = x + ts * 0.5;
    const cy = y + ts * 0.54;
    const outerRx = ts * 0.32, outerRy = ts * 0.24;
    const innerRx = ts * 0.20, innerRy = ts * 0.15;
    const wallH = ts * 0.16;

    // Lighter, warmer limestone — reads as old hewn medieval stone rather than dark modern brick
    const COL_STONE_D = '#6b6357';
    const COL_STONE_M = '#a89e8a';
    const COL_STONE_L = '#d8cdb2';
    const COL_WATER_D = '#0b3a5e';
    const COL_WATER_M = '#1f6b9e';
    const COL_WATER_L = '#6fc8e8';
    const COL_WOOD_D  = '#2c1a0d';
    const COL_WOOD_M  = '#5a3a1c';
    const COL_ROOF_D  = '#4a2418';
    const COL_ROOF_M  = '#7a4028';

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ts, ts);
    ctx.clip();

    // Drop shadow
    if (quality !== 'low') {
        ctx.fillStyle = 'rgba(0, 10, 5, 0.28)';
        ctx.beginPath();
        ctx.ellipse(cx + ts * 0.02, cy + wallH + ts * 0.03, outerRx * 1.02, outerRy * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Wall skirt (front face of the stone ring, gives it height)
    ctx.beginPath();
    ctx.ellipse(cx, cy + wallH, outerRx, outerRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = COL_STONE_D;
    ctx.fill();

    // Top rim — the stone ring
    ctx.beginPath();
    ctx.ellipse(cx, cy, outerRx, outerRy, 0, 0, Math.PI * 2);
    if (quality === 'low') {
        ctx.fillStyle = COL_STONE_M;
    } else {
        const rg = ctx.createRadialGradient(cx - outerRx * 0.3, cy - outerRy * 0.3, 2, cx, cy, outerRx);
        rg.addColorStop(0,   COL_STONE_L);
        rg.addColorStop(0.6, COL_STONE_M);
        rg.addColorStop(1,   COL_STONE_D);
        ctx.fillStyle = rg;
    }
    ctx.fill();
    ctx.strokeStyle = COL_STONE_D;
    ctx.lineWidth = Math.max(1, ts * 0.010);
    ctx.stroke();

    if (quality !== 'low') {
        // Stone block seams around the rim
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, outerRx, outerRy, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = Math.max(0.5, ts * 0.006);
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + rng() * 0.2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * innerRx * 1.1, cy + Math.sin(a) * innerRy * 1.1);
            ctx.lineTo(cx + Math.cos(a) * outerRx * 1.05, cy + Math.sin(a) * outerRy * 1.05);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Water inside the ring
    ctx.beginPath();
    ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
    if (quality === 'low') {
        ctx.fillStyle = COL_WATER_M;
    } else {
        const wg = ctx.createRadialGradient(cx, cy, 1, cx, cy, innerRx);
        wg.addColorStop(0,   COL_WATER_L);
        wg.addColorStop(0.6, COL_WATER_M);
        wg.addColorStop(1,   COL_WATER_D);
        ctx.fillStyle = wg;
    }
    ctx.fill();

    if (quality !== 'low') {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = 'rgba(200, 235, 255, 0.35)';
        ctx.lineWidth = Math.max(0.5, ts * 0.006);
        ctx.beginPath();
        ctx.ellipse(cx, cy, innerRx * 0.6, innerRy * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Specular glint on the water
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.ellipse(cx - innerRx * 0.3, cy - innerRy * 0.3, innerRx * 0.15, innerRy * 0.10, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Wooden well-house frame — two posts, a crossbeam and a small peaked roof.
    // This is what actually sells the "medieval well" read, in both qualities.
    const postLX  = cx - outerRx * 0.78;
    const postRX  = cx + outerRx * 0.78;
    const postTopY = cy - ts * 0.34;
    const postW   = ts * 0.045;

    ctx.fillStyle = COL_WOOD_M;
    ctx.fillRect(postLX - postW / 2, postTopY, postW, cy - postTopY);
    ctx.fillRect(postRX - postW / 2, postTopY, postW, cy - postTopY);
    if (quality !== 'low') {
        ctx.strokeStyle = COL_WOOD_D;
        ctx.lineWidth = Math.max(0.5, ts * 0.006);
        ctx.strokeRect(postLX - postW / 2, postTopY, postW, cy - postTopY);
        ctx.strokeRect(postRX - postW / 2, postTopY, postW, cy - postTopY);
    }

    // Crossbeam
    ctx.fillStyle = COL_WOOD_M;
    ctx.fillRect(postLX - postW * 0.6, postTopY, (postRX - postLX) + postW * 1.2, ts * 0.030);

    // Peaked roof
    const roofPeakY    = postTopY - ts * 0.12;
    const roofOverhang = ts * 0.05;
    ctx.beginPath();
    ctx.moveTo(postLX - postW * 0.6 - roofOverhang, postTopY);
    ctx.lineTo(cx, roofPeakY);
    ctx.lineTo(postRX + postW * 0.6 + roofOverhang, postTopY);
    ctx.lineTo(postRX + postW * 0.6 + roofOverhang, postTopY + ts * 0.03);
    ctx.lineTo(cx, roofPeakY + ts * 0.03);
    ctx.lineTo(postLX - postW * 0.6 - roofOverhang, postTopY + ts * 0.03);
    ctx.closePath();
    if (quality === 'low') {
        ctx.fillStyle = COL_ROOF_M;
        ctx.fill();
    } else {
        const rfg = ctx.createLinearGradient(postLX, 0, postRX, 0);
        rfg.addColorStop(0,   COL_ROOF_D);
        rfg.addColorStop(0.5, COL_ROOF_M);
        rfg.addColorStop(1,   COL_ROOF_D);
        ctx.fillStyle = rfg;
        ctx.fill();
        ctx.strokeStyle = COL_WOOD_D;
        ctx.lineWidth = Math.max(0.5, ts * 0.006);
        ctx.stroke();
    }

    ctx.restore();
}

/*
_drawBush
Tile: X[Bush]
Graphics: Low / High quality
A rounded shrub made of overlapping leafy lobes, sitting on grass. Doesn't
block arrows and a tower can still see over/through it, but it's dense enough
that a tower can't be built on it (see Map.js).
*/
function _drawBush(ctx, x, y, quality) {
    const ts = this.tileSize;
    const tx = (x / ts) | 0, ty = (y / ts) | 0;
    const s0 = tx * 1234 ^ ty * 5678;
    let si = 1;
    const rng = () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1;

    const cx = x + ts * 0.5;
    const baseY = y + ts * 0.80;

    // Same dark conifer green as X[Tree]/SNW[Tree], so it reads as part of the same "grass" family
    const COL_DEEP  = '#0c2a14';
    const COL_MID   = '#1c5c2c';
    const COL_LIT   = '#3f9048';
    const COL_BERRY = '#c0392b';

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ts, ts);
    ctx.clip();

    if (quality !== 'low') {
        ctx.fillStyle = 'rgba(0, 15, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(cx + ts * 0.02, baseY + ts * 0.02, ts * 0.32, ts * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // A handful of overlapping rounded lobes forming a shrub silhouette
    const lobes = [
        { fx: -0.20, fy: -0.10, r: 0.20 },
        { fx:  0.20, fy: -0.10, r: 0.20 },
        { fx:  0.00, fy: -0.22, r: 0.22 },
        { fx: -0.10, fy:  0.02, r: 0.17 },
        { fx:  0.12, fy:  0.02, r: 0.17 },
    ];

    for (const lobe of lobes) {
        const lx = cx + ts * lobe.fx + (rng() - 0.5) * ts * 0.02;
        const ly = baseY + ts * lobe.fy + (rng() - 0.5) * ts * 0.02;
        const r  = ts * lobe.r * (0.9 + rng() * 0.2);
        ctx.beginPath();
        ctx.arc(lx, ly, r, 0, Math.PI * 2);
        if (quality === 'low') {
            ctx.fillStyle = COL_MID;
            ctx.fill();
            // Thin dark outline so each lobe stays readable without a shading gradient
            ctx.strokeStyle = COL_DEEP;
            ctx.lineWidth = Math.max(0.6, ts * 0.008);
            ctx.stroke();
        } else {
            const g = ctx.createRadialGradient(lx - r * 0.3, ly - r * 0.3, 1, lx, ly, r);
            g.addColorStop(0,    COL_LIT);
            g.addColorStop(0.65, COL_MID);
            g.addColorStop(1,    COL_DEEP);
            ctx.fillStyle = g;
            ctx.fill();
        }
    }

    if (quality !== 'low') {
        // A few berries for character
        ctx.fillStyle = COL_BERRY;
        for (let i = 0; i < 4; i++) {
            const a  = rng() * Math.PI * 2;
            const rr = ts * 0.18 * rng();
            const bx = cx + Math.cos(a) * rr;
            const by = baseY - ts * 0.10 + Math.sin(a) * rr * 0.6;
            ctx.beginPath();
            ctx.arc(bx, by, ts * 0.018, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

/*
_drawTree / _drawSnowTree
Tiles: X[Tree], SNW[Tree]
Graphics: Low / High quality
A small cluster of 4 stylized conifer/spruce silhouettes, arranged in a diamond
(rhombus) layout, simulating a little patch of forest inside a single tile.
Blocks arrows and tower line of sight (see Bullet.js / Tower.js), cannot build towers.
"Joins in group": when a same-type tree tile sits on the immediate left/right/up/down,
the tile's clip region is widened on that side and an extra tree is grown straddling
the shared edge, so two adjacent tree tiles sprout trees INTO the seam between them —
the forest reads as continuous instead of two separate clumps with a visible gap.
*/
// Vertical distance from a tree's baseline up to the tip of its tallest tier —
// must stay in sync with the tier math in _drawOneConiferTree below (used to
// figure out, ahead of drawing, how much headroom a given tree will need).
function _coniferApexReach(ts, scale, hJit) {
    const trunkH = ts * 0.075 * scale;
    const treeH  = ts * 0.62 * scale * hJit;
    return trunkH + 0.7056 * treeH;
}

function _drawOneConiferTree(ctx, cx, baseY, scale, quality, snowy, hJit) {
    const ts = this.tileSize;

    const trunkH = ts * 0.075 * scale;
    const treeH  = ts * 0.62 * scale * hJit;

    const COL_TRUNK   = '#3e2712';
    const COL_TRUNK_L = '#6a4522';
    const COL_DEEP  = snowy ? '#0c2a20' : '#0c2a14';
    const COL_MID   = snowy ? '#1c5c42' : '#1c5c2c';
    const COL_LIT   = snowy ? '#3f9068' : '#3f9048';
    const COL_SNOWC = '#eef7ff';

    // 3 tapering tiers stacked bottom-to-top, each overlapping the one below
    const tierCount = 3;
    const baseHalfW = ts * 0.20 * scale;
    const baseTierH = treeH * 0.36;
    const tiers = [];
    for (let i = 0; i < tierCount; i++) {
        const halfW = baseHalfW * (1 - i * 0.24);
        const tH    = baseTierH * (1 - i * 0.10);
        const botY  = baseY - trunkH - i * (baseTierH * 0.58);
        tiers.push({ halfW, tH, botY, apexY: botY - tH });
    }

    // Trunk (mostly hidden under the bottom tier, peeks out at the base)
    ctx.fillStyle = COL_TRUNK;
    ctx.fillRect(cx - ts * 0.022 * scale, baseY - trunkH, ts * 0.044 * scale, trunkH + ts * 0.015 * scale);
    if (quality !== 'low') {
        ctx.fillStyle = COL_TRUNK_L;
        ctx.fillRect(cx - ts * 0.022 * scale, baseY - trunkH, ts * 0.011 * scale, trunkH + ts * 0.015 * scale);
    }

    // Low quality has no shading to hint which end is the top, so it gets a plain
    // symmetric cone (no inward notch at the base) — with the notch, a flat single-color
    // fill could read as upside-down. High quality keeps the notch for a fuller needle-tip
    // silhouette, since the gradient/highlights make the correct orientation obvious.
    const tierPath = (t) => {
        ctx.beginPath();
        ctx.moveTo(cx - t.halfW, t.botY);
        ctx.quadraticCurveTo(cx - t.halfW * 0.35, t.botY - t.tH * 0.55, cx, t.apexY);
        ctx.quadraticCurveTo(cx + t.halfW * 0.35, t.botY - t.tH * 0.55, cx + t.halfW, t.botY);
        if (quality !== 'low') {
            ctx.lineTo(cx + t.halfW * 0.55, t.botY - t.tH * 0.18);
            ctx.lineTo(cx - t.halfW * 0.55, t.botY - t.tH * 0.18);
        }
        ctx.closePath();
    };

    // Drop shadow (high quality only)
    if (quality !== 'low') {
        ctx.save();
        ctx.translate(ts * 0.018 * scale, ts * 0.018 * scale);
        ctx.fillStyle = 'rgba(0, 10, 5, 0.28)';
        for (let i = tierCount - 1; i >= 0; i--) { tierPath(tiers[i]); ctx.fill(); }
        ctx.restore();
    }

    // Tiers, drawn top-first so lower/wider tiers overlap the ones above them
    for (let i = tierCount - 1; i >= 0; i--) {
        const t = tiers[i];

        if (quality === 'low') {
            tierPath(t);
            ctx.fillStyle = COL_MID;
            ctx.fill();
            continue;
        }

        tierPath(t);
        const grad = ctx.createLinearGradient(cx - t.halfW, 0, cx + t.halfW, 0);
        grad.addColorStop(0,    COL_LIT);
        grad.addColorStop(0.45, COL_MID);
        grad.addColorStop(1,    COL_DEEP);
        ctx.fillStyle = grad;
        ctx.fill();

        // Shadow facet on the right side of each tier
        ctx.save();
        tierPath(t);
        ctx.clip();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = COL_DEEP;
        ctx.beginPath();
        ctx.moveTo(cx, t.apexY);
        ctx.lineTo(cx + t.halfW, t.botY);
        ctx.lineTo(cx + t.halfW * 0.4, t.botY);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.restore();

        // Snow cap along the top edge of each tier
        if (snowy) {
            ctx.save();
            tierPath(t);
            ctx.clip();
            ctx.fillStyle = COL_SNOWC;
            ctx.beginPath();
            ctx.moveTo(cx - t.halfW * 0.62, t.botY - t.tH * 0.30);
            ctx.quadraticCurveTo(cx - t.halfW * 0.20, t.botY - t.tH * 0.70, cx, t.apexY + t.tH * 0.06);
            ctx.quadraticCurveTo(cx + t.halfW * 0.22, t.botY - t.tH * 0.66, cx + t.halfW * 0.58, t.botY - t.tH * 0.32);
            ctx.quadraticCurveTo(cx + t.halfW * 0.30, t.botY - t.tH * 0.46, cx, t.apexY + t.tH * 0.20);
            ctx.quadraticCurveTo(cx - t.halfW * 0.28, t.botY - t.tH * 0.44, cx - t.halfW * 0.62, t.botY - t.tH * 0.30);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    // Small ground tuft at the base of this one tree
    ctx.fillStyle = snowy ? COL_SNOWC : COL_MID;
    ctx.globalAlpha = snowy ? 0.75 : 0.45;
    ctx.beginPath();
    ctx.ellipse(cx, baseY + ts * 0.006, ts * 0.15 * scale, ts * 0.03 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
}

function _drawConiferTree(ctx, x, y, quality, hasLeft, hasRight, hasUp, hasDown, isTopRow, snowy) {
    const ts = this.tileSize;
    const tx = (x / ts) | 0, ty = (y / ts) | 0;
    const s0 = tx * 1234 ^ ty * 5678;
    let si = 1;
    const rng = () => Math.abs(Math.sin(s0 + si++ * 9301 + 49297) * 10000) % 1;
    const jit = () => (rng() - 0.5) * ts * 0.05;

    // Base margin (always applied): trees are taller than one tile, so their thin canopy
    // tips are allowed to softly overflow the tile edge like a real treetop would. Sides
    // bordering a same-type tree get extra room on top of that for seam trees.
    // Exception: the map's very first row has no canvas above it to overflow into — any
    // upward overflow there would just get cut off — so it gets no upward margin at all,
    // and every tree's height is clamped instead (see placeTree below).
    const baseMargin = ts * 0.55;
    const extL = baseMargin + (hasLeft  ? ts * 0.30 : 0);
    const extR = baseMargin + (hasRight ? ts * 0.30 : 0);
    const extU = isTopRow ? 0 : baseMargin + (hasUp ? ts * 0.30 : 0);
    const extD = baseMargin + (hasDown  ? ts * 0.30 : 0);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - extL, y - extU, ts + extL + extR, ts + extU + extD);
    ctx.clip();

    // Rolls this tree's height jitter, then places it — on the top row, baseY is pushed
    // down just enough that the tallest tier's tip lands exactly on the tile's top edge
    // instead of being cut off by the canvas boundary above it.
    const placeTree = (fx, fy, scale) => {
        const hJit = 0.86 + rng() * 0.26;
        const cx = x + ts * fx + jit();
        let baseY = y + ts * fy + jit() * 0.4;
        if (isTopRow) {
            const minBaseY = y + _coniferApexReach(ts, scale, hJit);
            if (baseY < minBaseY) baseY = minBaseY;
        }
        _drawOneConiferTree.call(this, ctx, cx, baseY, scale, quality, snowy, hJit);
    };

    // 9 trees filling a full 3x3 grid (including the corners) so the whole tile reads as
    // packed forest instead of a diamond with empty corners — drawn back-to-front (row by
    // row) so nearer/lower trees overlap the ones behind them.
    const slots = [
        // back row (furthest, smallest)
        { fx: 0.15, fy: 0.16, scale: 0.95 },
        { fx: 0.50, fy: 0.14, scale: 1.10 },
        { fx: 0.85, fy: 0.16, scale: 0.95 },
        // middle row
        { fx: 0.15, fy: 0.50, scale: 1.20 },
        { fx: 0.50, fy: 0.48, scale: 1.05 },
        { fx: 0.85, fy: 0.50, scale: 1.20 },
        // front row (closest, biggest)
        { fx: 0.15, fy: 0.84, scale: 1.40 },
        { fx: 0.50, fy: 0.86, scale: 1.54 },
        { fx: 0.85, fy: 0.84, scale: 1.40 },
    ];
    for (const slot of slots) {
        placeTree(slot.fx, slot.fy, slot.scale);
    }

    // Seam trees: grow extra trunks INTO the gap toward each same-type neighbor tile
    const jitFrac = () => (rng() - 0.5) * 0.05;
    if (hasRight) placeTree(1.00 + rng() * 0.08, 0.55 + jitFrac(), 1.32);
    if (hasLeft)  placeTree(0.00 - rng() * 0.08, 0.55 + jitFrac(), 1.32);
    if (hasDown)  placeTree(0.50 + jitFrac(), 1.00 + rng() * 0.08, 1.32);
    if (hasUp)    placeTree(0.50 + jitFrac(), 0.00 - rng() * 0.08, 1.08);

    ctx.restore();
}

function _drawTree(ctx, x, y, quality, hasLeft, hasRight, hasUp, hasDown, isTopRow) {
    _drawConiferTree.call(this, ctx, x, y, quality, hasLeft, hasRight, hasUp, hasDown, isTopRow, false);
}

function _drawSnowTree(ctx, x, y, quality, hasLeft, hasRight, hasUp, hasDown, isTopRow) {
    _drawConiferTree.call(this, ctx, x, y, quality, hasLeft, hasRight, hasUp, hasDown, isTopRow, true);
}

/*
_drawWaterRock
Tiles: W[Rock-1..4]
Graphics: Low / High quality
Static decorative rocks emerging from water.
Water background is drawn by _prerenderWater under them.
W[Rock-1] = round boulder, half submerged
W[Rock-2] = spike leaning left
W[Rock-3] = spike leaning right
W[Rock-4] = cluster of three boulders
*/
function _drawWaterRock(ctx, x, y, variant, quality) {
    const ts = this.tileSize;
    const wY = y + ts * 0.62;

    // Slate/granite palette
    const R_DEEP = '#181a26';
    const R_BASE = '#2c2f3e';
    const R_MID  = '#464a5e';
    const R_LIT  = '#666a82';
    const R_HIGH = '#8e92aa';
    const ALGAE  = 'rgba(35,68,28,0.72)';
    const WET    = 'rgba(8,30,72,0.44)';
    const FOAM   = 'rgba(190,225,255,0.62)';
    const RIPPLE = 'rgba(100,172,232,0.30)';
    const SHADOW = 'rgba(0,10,30,0.42)';

    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, ts, ts); ctx.clip();

    // ── LOW quality ──
    if (quality === 'low') {
        if (variant === 1) {
            const cx = x + ts*0.48;
            ctx.fillStyle = R_MID;
            ctx.beginPath();
            ctx.moveTo(cx - ts*0.33, wY);
            ctx.bezierCurveTo(cx - ts*0.40, wY - ts*0.18, cx - ts*0.30, wY - ts*0.44, cx - ts*0.06, wY - ts*0.46);
            ctx.bezierCurveTo(cx + ts*0.12, wY - ts*0.48, cx + ts*0.34, wY - ts*0.38, cx + ts*0.36, wY - ts*0.16);
            ctx.lineTo(cx + ts*0.33, wY);
            ctx.closePath(); ctx.fill();
            const lg1 = ctx.createLinearGradient(cx - ts*0.30, wY - ts*0.44, cx, wY);
            lg1.addColorStop(0, 'rgba(142,146,170,0.70)'); lg1.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = lg1;
            ctx.beginPath();
            ctx.moveTo(cx - ts*0.33, wY);
            ctx.bezierCurveTo(cx - ts*0.40, wY - ts*0.18, cx - ts*0.30, wY - ts*0.44, cx - ts*0.06, wY - ts*0.46);
            ctx.bezierCurveTo(cx + ts*0.12, wY - ts*0.48, cx + ts*0.34, wY - ts*0.38, cx + ts*0.36, wY - ts*0.16);
            ctx.lineTo(cx + ts*0.33, wY);
            ctx.closePath(); ctx.fill();
        } else if (variant === 2) {
            ctx.fillStyle = R_MID;
            ctx.beginPath();
            ctx.moveTo(x+ts*0.22, wY);
            ctx.quadraticCurveTo(x+ts*0.10, wY - ts*0.28, x+ts*0.15, y+ts*0.06);
            ctx.quadraticCurveTo(x+ts*0.34, wY - ts*0.24, x+ts*0.52, wY);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = R_HIGH; ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.moveTo(x+ts*0.22, wY); ctx.quadraticCurveTo(x+ts*0.10, wY - ts*0.28, x+ts*0.15, y+ts*0.06);
            ctx.lineTo(x+ts*0.26, wY - ts*0.14); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1.0;
        } else if (variant === 3) {
            ctx.fillStyle = R_MID;
            ctx.beginPath();
            ctx.moveTo(x+ts*0.48, wY);
            ctx.quadraticCurveTo(x+ts*0.66, wY - ts*0.24, x+ts*0.85, y+ts*0.06);
            ctx.quadraticCurveTo(x+ts*0.90, wY - ts*0.28, x+ts*0.78, wY);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = R_HIGH; ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.moveTo(x+ts*0.74, wY); ctx.lineTo(x+ts*0.85, y+ts*0.06);
            ctx.quadraticCurveTo(x+ts*0.90, wY - ts*0.28, x+ts*0.78, wY);
            ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1.0;
        } else {
            // Jagged reef
            const sp = [{p:0.18,h:0.26,w:0.09},{p:0.38,h:0.44,w:0.11},{p:0.58,h:0.34,w:0.10},{p:0.76,h:0.20,w:0.08}];
            ctx.fillStyle = R_MID;
            for (const s of sp) {
                ctx.beginPath();
                ctx.moveTo(x+ts*(s.p-s.w), wY);
                ctx.quadraticCurveTo(x+ts*(s.p-s.w*0.3), wY-ts*s.h*0.5, x+ts*s.p, wY-ts*s.h);
                ctx.quadraticCurveTo(x+ts*(s.p+s.w*0.3), wY-ts*s.h*0.5, x+ts*(s.p+s.w), wY);
                ctx.closePath(); ctx.fill();
            }
        }
        ctx.restore();
        return;
    }

    // ── HIGH quality shared helpers ──
    // Block-scoped so these shadow the cold slate R_* constants above ONLY for the
    // high-quality render — the low-quality path above keeps the original palette.
    // Warmer, earthy granite tones that match the rest of the game's stone assets
    // (mountains, road stones) instead of the previous cold blue-grey slate look.
    {
    const R_DEEP = '#241f1a';
    const R_BASE = '#3c3226';
    const R_MID  = '#5f5140';
    const R_LIT  = '#83725a';
    const R_HIGH = '#ab9a80';

    const bY = wY + ts*0.02;

    const drawRipples = (cx2, n = 3) => {
        ctx.save();
        for (let i = 0; i < n; i++) {
            ctx.strokeStyle = RIPPLE;
            ctx.lineWidth = Math.max(0.5, ts*0.008);
            ctx.globalAlpha = 1.0 - i*0.30;
            ctx.beginPath();
            ctx.ellipse(cx2, wY + ts*0.010, ts*0.32*(1+i*0.28), ts*0.046*(1+i*0.28), 0, 0, Math.PI*2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0; ctx.restore();
    };

    const drawFoam = (x1, y1, x2, y2, cpx, cpy) => {
        ctx.save();
        ctx.strokeStyle = FOAM; ctx.lineWidth = Math.max(1.0, ts*0.016);
        ctx.lineCap = 'round'; ctx.globalAlpha = 0.72;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cpx, cpy, x2, y2); ctx.stroke();
        ctx.globalAlpha = 1.0; ctx.restore();
    };

    // Clip-and-fill helper
    const cfill = (pathFn, grad) => {
        ctx.save(); pathFn(); ctx.clip(); ctx.fillStyle = grad; ctx.fillRect(x, y, ts, ts); ctx.restore();
    };

    // ── HIGH: VARIANT 1 — The Great Coastal Cliff (massive sheer face) ──
    if (variant === 1) {
        const cx = x + ts*0.50;

        // Massive cliff spanning ~88% of tile, reaching near tile top
        const cliff = () => {
            ctx.beginPath();
            ctx.moveTo(x + ts*0.06, bY);
            ctx.bezierCurveTo(x + ts*0.01, wY - ts*0.18, x + ts*0.03, wY - ts*0.44, x + ts*0.08, y + ts*0.06);
            ctx.lineTo(x + ts*0.14, y + ts*0.04);
            ctx.lineTo(x + ts*0.22, y + ts*0.02);   // left peak
            ctx.lineTo(x + ts*0.30, y + ts*0.06);
            ctx.lineTo(x + ts*0.40, y + ts*0.03);   // center-left peak
            ctx.lineTo(x + ts*0.50, y + ts*0.05);
            ctx.lineTo(x + ts*0.62, y + ts*0.04);
            ctx.lineTo(x + ts*0.72, y + ts*0.08);   // shoulder
            ctx.lineTo(x + ts*0.82, y + ts*0.10);
            ctx.lineTo(x + ts*0.88, y + ts*0.07);   // right secondary peak
            ctx.lineTo(x + ts*0.94, y + ts*0.16);
            ctx.bezierCurveTo(x + ts*0.98, wY - ts*0.24, x + ts*0.96, wY - ts*0.06, x + ts*0.94, bY);
            ctx.closePath();
        };

        ctx.save(); ctx.translate(6, 7); cliff(); ctx.fillStyle = SHADOW; ctx.fill(); ctx.restore();
        cliff(); ctx.fillStyle = R_DEEP; ctx.fill();

        // Body gradient: lit upper-left, dark lower-right
        cfill(cliff, (() => {
            const g = ctx.createLinearGradient(x+ts*0.04, y+ts*0.04, x+ts*0.94, bY);
            g.addColorStop(0.0, R_MID); g.addColorStop(0.24, R_BASE); g.addColorStop(0.62, R_DEEP); g.addColorStop(1.0, '#0e0f18');
            return g;
        })());

        // Left sheer face bright strip
        cfill(cliff, (() => {
            const g = ctx.createLinearGradient(x+ts*0.01, 0, x+ts*0.24, 0);
            g.addColorStop(0, 'rgba(162,176,205,0.84)'); g.addColorStop(0.22, 'rgba(102,116,145,0.50)'); g.addColorStop(0.58, 'rgba(0,0,0,0)');
            return g;
        })());

        // Top edge lit
        cfill(cliff, (() => {
            const g = ctx.createLinearGradient(0, y+ts*0.01, 0, y+ts*0.11);
            g.addColorStop(0, 'rgba(198,212,238,0.88)'); g.addColorStop(0.28, 'rgba(145,162,194,0.52)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            return g;
        })());

        // Right face deep shadow
        cfill(cliff, (() => {
            const g = ctx.createLinearGradient(x+ts*0.68, 0, x+ts*0.98, 0);
            g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.40, 'rgba(0,0,8,0.28)'); g.addColorStop(1, 'rgba(0,0,14,0.74)');
            return g;
        })());

        // Specular at ridge peaks
        ctx.save(); cliff(); ctx.clip();
        for (const [px, py] of [[x+ts*0.22, y+ts*0.02], [x+ts*0.40, y+ts*0.03], [x+ts*0.88, y+ts*0.07]]) {
            const g = ctx.createRadialGradient(px, py, 0, px, py, ts*0.07);
            g.addColorStop(0, 'rgba(235,248,255,0.90)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(x, y, ts, ts);
        }
        ctx.restore();

        // Horizontal strata (geological layers)
        ctx.save(); cliff(); ctx.clip(); ctx.lineCap = 'round';
        for (const [yfrac, alpha] of [[0.20, 0.30], [0.36, 0.24], [0.52, 0.18]]) {
            const fy = y + ts * yfrac;
            ctx.strokeStyle = `rgba(8,9,16,${alpha})`; ctx.lineWidth = Math.max(0.6, ts*0.008);
            ctx.beginPath(); ctx.moveTo(x+ts*0.04, fy);
            ctx.bezierCurveTo(x+ts*0.30, fy-ts*0.008, x+ts*0.65, fy+ts*0.010, x+ts*0.92, fy+ts*0.004); ctx.stroke();
        }
        // Vertical cracks
        ctx.strokeStyle = 'rgba(8,9,16,0.45)'; ctx.lineWidth = Math.max(0.7, ts*0.010);
        ctx.beginPath(); ctx.moveTo(x+ts*0.32, y+ts*0.05);
        ctx.bezierCurveTo(x+ts*0.34, wY-ts*0.28, x+ts*0.30, wY-ts*0.14, x+ts*0.32, wY-ts*0.02); ctx.stroke();
        ctx.strokeStyle = 'rgba(8,9,16,0.30)'; ctx.lineWidth = Math.max(0.5, ts*0.007);
        ctx.beginPath(); ctx.moveTo(x+ts*0.60, y+ts*0.06);
        ctx.bezierCurveTo(x+ts*0.62, wY-ts*0.24, x+ts*0.58, wY-ts*0.10, x+ts*0.60, wY-ts*0.02); ctx.stroke();
        ctx.restore();

        // Algae belt
        ctx.save(); ctx.beginPath(); ctx.rect(x, wY-ts*0.074, ts, ts*0.078); ctx.clip();
        cliff(); ctx.fillStyle = ALGAE; ctx.fill(); ctx.restore();

        // Wet zone
        cfill(cliff, (() => {
            const g = ctx.createLinearGradient(cx, wY-ts*0.08, cx, bY);
            g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, WET); return g;
        })());

        // Spray
        ctx.fillStyle = 'rgba(215,238,255,0.58)';
        for (const [sx, sy, sr] of [
            [x+ts*0.04, wY-ts*0.04, ts*0.017], [x+ts*0.10, wY-ts*0.07, ts*0.011],
            [x+ts*0.92, wY-ts*0.04, ts*0.016], [x+ts*0.86, wY-ts*0.06, ts*0.011],
            [cx-ts*0.14, wY-ts*0.03, ts*0.009], [cx+ts*0.16, wY-ts*0.05, ts*0.008],
        ]) { ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill(); }

        drawFoam(x+ts*0.02, wY, x+ts*0.98, wY+ts*0.007, cx, wY-ts*0.024);
        drawRipples(cx, 3);

    // ── HIGH: VARIANT 2 — Cathedral Spire left + secondary rock right ──
    } else if (variant === 2) {

        // Main tall spire — leans hard left with dramatic overhang
        const spire2 = () => {
            ctx.beginPath();
            ctx.moveTo(x + ts*0.12, bY);
            ctx.bezierCurveTo(x - ts*0.01, wY - ts*0.10, x - ts*0.01, wY - ts*0.36, x + ts*0.04, wY - ts*0.52);
            ctx.quadraticCurveTo(x + ts*0.08, y + ts*0.05, x + ts*0.16, y + ts*0.02);
            ctx.lineTo(x + ts*0.22, y + ts*0.01);   // left peak
            ctx.lineTo(x + ts*0.27, y + ts*0.04);   // notch
            ctx.lineTo(x + ts*0.32, y + ts*0.01);   // right peak
            ctx.bezierCurveTo(x + ts*0.40, wY - ts*0.36, x + ts*0.58, wY - ts*0.08, x + ts*0.58, bY);
            ctx.closePath();
        };

        // Secondary spire (right side) — shorter but still impressive
        const sec2 = () => {
            ctx.beginPath();
            ctx.moveTo(x + ts*0.56, bY);
            ctx.bezierCurveTo(x + ts*0.52, wY - ts*0.08, x + ts*0.58, wY - ts*0.30, x + ts*0.68, y + ts*0.15);
            ctx.lineTo(x + ts*0.73, y + ts*0.12);
            ctx.lineTo(x + ts*0.77, y + ts*0.15);
            ctx.bezierCurveTo(x + ts*0.86, wY - ts*0.26, x + ts*0.90, wY - ts*0.08, x + ts*0.88, bY);
            ctx.closePath();
        };

        ctx.save(); ctx.translate(5, 7); spire2(); ctx.fillStyle = SHADOW; ctx.fill(); sec2(); ctx.fillStyle = SHADOW; ctx.fill(); ctx.restore();
        spire2(); ctx.fillStyle = R_DEEP; ctx.fill();
        sec2(); ctx.fillStyle = R_DEEP; ctx.fill();

        cfill(spire2, (() => {
            const g = ctx.createLinearGradient(x+ts*0.01, y+ts*0.02, x+ts*0.58, bY);
            g.addColorStop(0.0, R_LIT); g.addColorStop(0.22, R_MID); g.addColorStop(0.58, R_BASE); g.addColorStop(1.0, R_DEEP);
            return g;
        })());
        cfill(spire2, (() => {
            const g = ctx.createLinearGradient(x-ts*0.02, 0, x+ts*0.20, 0);
            g.addColorStop(0, 'rgba(178,194,220,0.88)'); g.addColorStop(0.28, 'rgba(108,122,152,0.50)'); g.addColorStop(0.65, 'rgba(0,0,0,0)');
            return g;
        })());
        cfill(spire2, (() => {
            const g = ctx.createLinearGradient(0, y+ts*0.01, 0, y+ts*0.10);
            g.addColorStop(0, 'rgba(208,222,248,0.90)'); g.addColorStop(0.28, 'rgba(152,168,200,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            return g;
        })());
        cfill(spire2, (() => {
            const g = ctx.createLinearGradient(x+ts*0.28, 0, x+ts*0.60, 0);
            g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(0,0,8,0.30)'); g.addColorStop(1, 'rgba(0,0,14,0.72)');
            return g;
        })());
        cfill(sec2, (() => {
            const g = ctx.createLinearGradient(x+ts*0.56, y+ts*0.12, x+ts*0.90, bY);
            g.addColorStop(0, R_MID); g.addColorStop(0.40, R_BASE); g.addColorStop(1, R_DEEP);
            return g;
        })());

        // Specular tips
        ctx.save(); spire2(); ctx.clip();
        for (const [px, py] of [[x+ts*0.22, y+ts*0.01], [x+ts*0.32, y+ts*0.01]]) {
            const g = ctx.createRadialGradient(px, py, 0, px, py, ts*0.07);
            g.addColorStop(0, 'rgba(238,250,255,0.92)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(x, y, ts, ts);
        }
        ctx.restore();
        ctx.save(); sec2(); ctx.clip();
        const g2s = ctx.createRadialGradient(x+ts*0.73, y+ts*0.12, 0, x+ts*0.73, y+ts*0.12, ts*0.06);
        g2s.addColorStop(0, 'rgba(220,236,255,0.82)'); g2s.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2s; ctx.fillRect(x, y, ts, ts); ctx.restore();

        // Left ridge highlight
        ctx.save(); spire2(); ctx.clip();
        ctx.strokeStyle = 'rgba(185,202,230,0.56)'; ctx.lineWidth = Math.max(0.9, ts*0.013); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x+ts*0.12, bY);
        ctx.bezierCurveTo(x-ts*0.01, wY-ts*0.10, x-ts*0.01, wY-ts*0.36, x+ts*0.04, wY-ts*0.52);
        ctx.quadraticCurveTo(x+ts*0.08, y+ts*0.05, x+ts*0.22, y+ts*0.01);
        ctx.stroke(); ctx.restore();

        // Strata + crack
        ctx.save(); spire2(); ctx.clip(); ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(8,9,16,0.30)'; ctx.lineWidth = Math.max(0.5, ts*0.007);
        ctx.beginPath(); ctx.moveTo(x+ts*0.08, wY-ts*0.22); ctx.lineTo(x+ts*0.46, wY-ts*0.20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+ts*0.08, wY-ts*0.38); ctx.lineTo(x+ts*0.38, wY-ts*0.37); ctx.stroke();
        ctx.strokeStyle = 'rgba(8,9,16,0.48)'; ctx.lineWidth = Math.max(0.7, ts*0.010);
        ctx.beginPath(); ctx.moveTo(x+ts*0.26, y+ts*0.06);
        ctx.bezierCurveTo(x+ts*0.28, wY-ts*0.28, x+ts*0.24, wY-ts*0.12, x+ts*0.26, wY-ts*0.02); ctx.stroke();
        ctx.restore();

        const rcx2 = x + ts*0.40;
        ctx.save(); ctx.beginPath(); ctx.rect(x, wY-ts*0.074, ts, ts*0.078); ctx.clip();
        spire2(); ctx.fillStyle = ALGAE; ctx.fill(); sec2(); ctx.fillStyle = ALGAE; ctx.fill(); ctx.restore();
        for (const fn of [spire2, sec2]) {
            cfill(fn, (() => { const g = ctx.createLinearGradient(rcx2, wY-ts*0.08, rcx2, bY); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, WET); return g; })());
        }
        ctx.fillStyle = 'rgba(215,238,255,0.58)';
        for (const [sx, sy, sr] of [
            [x+ts*0.06, wY-ts*0.04, ts*0.018], [x+ts*0.12, wY-ts*0.07, ts*0.011],
            [x+ts*0.57, wY-ts*0.04, ts*0.013], [x+ts*0.86, wY-ts*0.05, ts*0.014],
        ]) { ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill(); }
        drawFoam(x+ts*0.04, wY, x+ts*0.92, wY+ts*0.007, rcx2, wY-ts*0.022);
        drawRipples(rcx2, 3);

    // ── HIGH: VARIANT 3 — Cathedral Spire right + secondary rock left ──
    } else if (variant === 3) {

        // Main tall spire — leans hard right with dramatic overhang
        const spire3 = () => {
            ctx.beginPath();
            ctx.moveTo(x + ts*0.42, bY);
            ctx.bezierCurveTo(x + ts*0.38, wY - ts*0.10, x + ts*0.44, wY - ts*0.36, x + ts*0.56, wY - ts*0.52);
            ctx.quadraticCurveTo(x + ts*0.64, y + ts*0.05, x + ts*0.68, y + ts*0.01);
            ctx.lineTo(x + ts*0.73, y + ts*0.01);   // main peak
            ctx.lineTo(x + ts*0.78, y + ts*0.04);   // notch
            ctx.lineTo(x + ts*0.84, y + ts*0.02);   // right peak
            ctx.bezierCurveTo(x + ts*0.94, wY - ts*0.34, x + ts*1.01, wY - ts*0.10, x + ts*0.88, bY);
            ctx.closePath();
        };

        // Secondary spire (left side) — shorter
        const sec3 = () => {
            ctx.beginPath();
            ctx.moveTo(x + ts*0.12, bY);
            ctx.bezierCurveTo(x + ts*0.10, wY - ts*0.08, x + ts*0.16, wY - ts*0.28, x + ts*0.27, y + ts*0.15);
            ctx.lineTo(x + ts*0.32, y + ts*0.12);
            ctx.lineTo(x + ts*0.36, y + ts*0.15);
            ctx.bezierCurveTo(x + ts*0.44, wY - ts*0.24, x + ts*0.46, wY - ts*0.08, x + ts*0.44, bY);
            ctx.closePath();
        };

        ctx.save(); ctx.translate(5, 7); spire3(); ctx.fillStyle = SHADOW; ctx.fill(); sec3(); ctx.fillStyle = SHADOW; ctx.fill(); ctx.restore();
        spire3(); ctx.fillStyle = R_DEEP; ctx.fill();
        sec3(); ctx.fillStyle = R_DEEP; ctx.fill();

        cfill(spire3, (() => {
            const g = ctx.createLinearGradient(x+ts*0.90, y+ts*0.02, x+ts*0.42, bY);
            g.addColorStop(0.0, R_LIT); g.addColorStop(0.22, R_MID); g.addColorStop(0.58, R_BASE); g.addColorStop(1.0, R_DEEP);
            return g;
        })());
        cfill(spire3, (() => {
            const g = ctx.createLinearGradient(x+ts*1.02, 0, x+ts*0.80, 0);
            g.addColorStop(0, 'rgba(178,194,220,0.88)'); g.addColorStop(0.28, 'rgba(108,122,152,0.50)'); g.addColorStop(0.65, 'rgba(0,0,0,0)');
            return g;
        })());
        cfill(spire3, (() => {
            const g = ctx.createLinearGradient(0, y+ts*0.01, 0, y+ts*0.10);
            g.addColorStop(0, 'rgba(208,222,248,0.90)'); g.addColorStop(0.28, 'rgba(152,168,200,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            return g;
        })());
        cfill(spire3, (() => {
            const g = ctx.createLinearGradient(x+ts*0.40, 0, x+ts*0.72, 0);
            g.addColorStop(0, 'rgba(0,0,14,0.68)'); g.addColorStop(0.50, 'rgba(0,0,8,0.30)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            return g;
        })());
        cfill(sec3, (() => {
            const g = ctx.createLinearGradient(x+ts*0.12, y+ts*0.12, x+ts*0.46, bY);
            g.addColorStop(0, R_MID); g.addColorStop(0.40, R_BASE); g.addColorStop(1, R_DEEP);
            return g;
        })());

        // Specular tips
        ctx.save(); spire3(); ctx.clip();
        for (const [px, py] of [[x+ts*0.73, y+ts*0.01], [x+ts*0.84, y+ts*0.02]]) {
            const g = ctx.createRadialGradient(px, py, 0, px, py, ts*0.07);
            g.addColorStop(0, 'rgba(238,250,255,0.92)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(x, y, ts, ts);
        }
        ctx.restore();
        ctx.save(); sec3(); ctx.clip();
        const g3s = ctx.createRadialGradient(x+ts*0.32, y+ts*0.12, 0, x+ts*0.32, y+ts*0.12, ts*0.06);
        g3s.addColorStop(0, 'rgba(220,236,255,0.82)'); g3s.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g3s; ctx.fillRect(x, y, ts, ts); ctx.restore();

        // Right ridge highlight
        ctx.save(); spire3(); ctx.clip();
        ctx.strokeStyle = 'rgba(185,202,230,0.56)'; ctx.lineWidth = Math.max(0.9, ts*0.013); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x+ts*0.88, bY);
        ctx.bezierCurveTo(x+ts*1.01, wY-ts*0.10, x+ts*0.96, wY-ts*0.36, x+ts*0.84, wY-ts*0.52);
        ctx.quadraticCurveTo(x+ts*0.80, y+ts*0.05, x+ts*0.84, y+ts*0.02);
        ctx.stroke(); ctx.restore();

        // Strata + crack
        ctx.save(); spire3(); ctx.clip(); ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(8,9,16,0.30)'; ctx.lineWidth = Math.max(0.5, ts*0.007);
        ctx.beginPath(); ctx.moveTo(x+ts*0.52, wY-ts*0.22); ctx.lineTo(x+ts*0.86, wY-ts*0.20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+ts*0.58, wY-ts*0.38); ctx.lineTo(x+ts*0.86, wY-ts*0.37); ctx.stroke();
        ctx.strokeStyle = 'rgba(8,9,16,0.48)'; ctx.lineWidth = Math.max(0.7, ts*0.010);
        ctx.beginPath(); ctx.moveTo(x+ts*0.74, y+ts*0.06);
        ctx.bezierCurveTo(x+ts*0.72, wY-ts*0.28, x+ts*0.76, wY-ts*0.12, x+ts*0.74, wY-ts*0.02); ctx.stroke();
        ctx.restore();

        const rcx3 = x + ts*0.54;
        ctx.save(); ctx.beginPath(); ctx.rect(x, wY-ts*0.074, ts, ts*0.078); ctx.clip();
        spire3(); ctx.fillStyle = ALGAE; ctx.fill(); sec3(); ctx.fillStyle = ALGAE; ctx.fill(); ctx.restore();
        for (const fn of [spire3, sec3]) {
            cfill(fn, (() => { const g = ctx.createLinearGradient(rcx3, wY-ts*0.08, rcx3, bY); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, WET); return g; })());
        }
        ctx.fillStyle = 'rgba(215,238,255,0.58)';
        for (const [sx, sy, sr] of [
            [x+ts*0.12, wY-ts*0.04, ts*0.018], [x+ts*0.44, wY-ts*0.05, ts*0.013],
            [x+ts*0.88, wY-ts*0.04, ts*0.016], [x+ts*0.82, wY-ts*0.06, ts*0.011],
        ]) { ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill(); }
        drawFoam(x+ts*0.08, wY, x+ts*0.94, wY+ts*0.007, rcx3, wY-ts*0.022);
        drawRipples(rcx3, 3);

    // ── HIGH: VARIANT 4 — The Basalt Crown (5 massive peaks, fortress width) ──
    } else {
        const peaks = [
            { cx: x+ts*0.10, h: ts*0.42, wL: ts*0.09, wR: ts*0.10 },
            { cx: x+ts*0.28, h: ts*0.56, wL: ts*0.13, wR: ts*0.12 },
            { cx: x+ts*0.50, h: ts*0.60, wL: ts*0.14, wR: ts*0.13 }, // king peak
            { cx: x+ts*0.70, h: ts*0.52, wL: ts*0.12, wR: ts*0.13 },
            { cx: x+ts*0.88, h: ts*0.38, wL: ts*0.09, wR: ts*0.09 },
        ];

        const peakPath = (p) => {
            ctx.beginPath();
            ctx.moveTo(p.cx - p.wL - ts*0.02, bY);
            ctx.bezierCurveTo(p.cx - p.wL*0.6, bY - p.h*0.38, p.cx - p.wL*0.18, bY - p.h*0.80, p.cx - ts*0.01, bY - p.h + ts*0.01);
            ctx.lineTo(p.cx, bY - p.h);
            ctx.lineTo(p.cx + ts*0.01, bY - p.h + ts*0.01);
            ctx.bezierCurveTo(p.cx + p.wR*0.18, bY - p.h*0.80, p.cx + p.wR*0.6, bY - p.h*0.38, p.cx + p.wR + ts*0.02, bY);
            ctx.closePath();
        };

        ctx.save(); ctx.translate(4, 6);
        for (const p of peaks) { peakPath(p); ctx.fillStyle = SHADOW; ctx.fill(); }
        ctx.restore();

        for (const p of [...peaks].sort((a, b) => a.h - b.h)) {
            peakPath(p); ctx.fillStyle = R_DEEP; ctx.fill();

            cfill(() => peakPath(p), (() => {
                const g = ctx.createLinearGradient(p.cx - p.wL, bY, p.cx + p.wR*0.22, bY - p.h);
                g.addColorStop(0.0, R_BASE); g.addColorStop(0.28, R_MID); g.addColorStop(0.66, R_LIT); g.addColorStop(1.0, R_HIGH);
                return g;
            })());

            cfill(() => peakPath(p), (() => {
                const g = ctx.createLinearGradient(p.cx, bY, p.cx + p.wR + ts*0.02, bY);
                g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.44, 'rgba(0,0,8,0.22)'); g.addColorStop(1, 'rgba(0,0,14,0.68)');
                return g;
            })());

            // Left ridge highlight
            ctx.save(); peakPath(p); ctx.clip();
            ctx.strokeStyle = 'rgba(180,196,224,0.52)'; ctx.lineWidth = Math.max(0.7, ts*0.010); ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.cx - p.wL - ts*0.02, bY);
            ctx.bezierCurveTo(p.cx - p.wL*0.6, bY - p.h*0.38, p.cx - p.wL*0.18, bY - p.h*0.80, p.cx, bY - p.h);
            ctx.stroke(); ctx.restore();

            // Specular tip
            ctx.save(); peakPath(p); ctx.clip();
            const tG = ctx.createRadialGradient(p.cx - ts*0.01, bY - p.h, 0, p.cx - ts*0.01, bY - p.h, ts*0.066);
            tG.addColorStop(0, 'rgba(235,250,255,0.92)'); tG.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = tG; ctx.fillRect(x, y, ts, ts); ctx.restore();

            // Crack
            ctx.save(); peakPath(p); ctx.clip();
            ctx.strokeStyle = 'rgba(8,10,20,0.42)'; ctx.lineWidth = Math.max(0.4, ts*0.006); ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.cx - ts*0.01, bY - p.h*0.28);
            ctx.bezierCurveTo(p.cx + ts*0.02, bY - p.h*0.54, p.cx - ts*0.02, bY - p.h*0.80, p.cx, bY - p.h);
            ctx.stroke(); ctx.restore();
        }

        // Wide strata across the whole formation
        ctx.save(); ctx.lineCap = 'round';
        for (const [yfrac, alpha, lw] of [[0.52, 0.26, 0.009], [0.38, 0.20, 0.007]]) {
            const fy = y + ts * yfrac;
            ctx.strokeStyle = `rgba(8,9,16,${alpha})`; ctx.lineWidth = Math.max(0.5, ts*lw);
            ctx.beginPath(); ctx.moveTo(x+ts*0.01, fy); ctx.bezierCurveTo(x+ts*0.28, fy-ts*0.009, x+ts*0.72, fy+ts*0.010, x+ts*0.99, fy); ctx.stroke();
        }
        ctx.restore();

        const crownCx = x + ts*0.50;
        ctx.save(); ctx.beginPath(); ctx.rect(x+ts*0.01, wY-ts*0.074, ts*0.98, ts*0.078); ctx.clip();
        ctx.fillStyle = ALGAE;
        for (const p of peaks) { peakPath(p); ctx.fill(); }
        ctx.restore();

        ctx.fillStyle = WET;
        ctx.beginPath(); ctx.ellipse(crownCx, wY, ts*0.50, ts*0.048, 0, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = 'rgba(215,238,255,0.58)';
        for (const [sx, sy, sr] of [
            [x+ts*0.04, wY-ts*0.04, ts*0.016], [x+ts*0.12, wY-ts*0.07, ts*0.010],
            [x+ts*0.30, wY-ts*0.03, ts*0.012], [x+ts*0.50, wY-ts*0.05, ts*0.009],
            [x+ts*0.68, wY-ts*0.04, ts*0.013], [x+ts*0.88, wY-ts*0.06, ts*0.010],
            [x+ts*0.95, wY-ts*0.04, ts*0.015],
        ]) { ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill(); }

        drawFoam(x+ts*0.01, wY, x+ts*0.99, wY+ts*0.007, crownCx, wY-ts*0.022);
        ctx.save();
        for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = RIPPLE; ctx.lineWidth = Math.max(0.5, ts*0.008);
            ctx.globalAlpha = 1.0 - i*0.28;
            ctx.beginPath(); ctx.ellipse(crownCx, wY+ts*0.010, ts*0.48*(1+i*0.30), ts*0.060*(1+i*0.30), 0, 0, Math.PI*2); ctx.stroke();
        }
        ctx.globalAlpha = 1.0; ctx.restore();
    }
    } // end high-quality warm-palette block

    ctx.restore();
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
    _drawSandBones,
    _drawSandCactus,
    _drawSandPalm,
    _drawSnowSpike,
    _drawLog,
    _drawWell,
    _drawBush,
    _drawTree,
    _drawSnowTree,
    _drawWaterRock,
};

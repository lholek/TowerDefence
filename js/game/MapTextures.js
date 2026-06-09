// js/game/MapTextures.js
/*
X - Grass
SND - Sand
SNW - Snow
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
"TODO: LAVA - cant build towers, doesnt block arrows",
"TODO: ICE - cant build towers, doesnt block arrows",
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

export const MapTextures = {
    _preRenderSnowLow,
    _preRenderSnowHigh,
    _preRenderSandLow,
    _preRenderSandHigh,
    _drawBurnedGround,
    _drawBurnedGroundLow,
    _drawHolyGround,
    _drawHolyGroundLow,
};

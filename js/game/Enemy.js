export default class Enemy {
    constructor(map, path, offsetX = 0, offsetY = 0, speed = 1, health = 10, coinReward = 1) {
        this.map = map;             // reference na Mapu
        this.path = path;           // pole tile {x,y}
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.speed = speed;
        this.maxHealth = health;    // store max health for health bar
        this.health = health;
        this.coinReward = coinReward;
        this.currentIndex = 0;

        // počáteční pozice podle world souřadnic
        const startTile = path[0];
        const pos = this.map.tileToWorld(startTile.x, startTile.y);
        this.x = pos.x + offsetX;
        this.y = pos.y + offsetY;

        // velikost enemy
        this.size = 30;
    }

    update(deltaTime) {
        if (this.currentIndex >= this.path.length - 1) return;

        const nextTile = this.path[this.currentIndex + 1];
        const targetPos = this.map.tileToWorld(nextTile.x, nextTile.y);
        const targetX = targetPos.x + this.offsetX;
        const targetY = targetPos.y + this.offsetY;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.speed) {
            this.x = targetX;
            this.y = targetY;
            this.currentIndex++;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    render(ctx) {
        // apply camera
        this.map.applyCameraTransform(ctx);

        // draw enemy body
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);

        // --- HEALTH BAR ---
        const barWidth = this.size + 5;
        const barHeight = 6;
        const healthRatio = Math.max(0, this.health / this.maxHealth);
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size / 2 - barHeight - 4; // above the enemy

        // draw background
        ctx.fillStyle = 'black';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

        // draw health fill
        ctx.fillStyle = healthRatio > 0.5 ? '#0f0' : healthRatio > 0.25 ? 'orange' : 'red';
        ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);

        // reset transform
        this.map.resetTransform(ctx);
    }
}

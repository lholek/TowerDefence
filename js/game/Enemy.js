export default class Enemy {
    constructor(map, path, offsetX = 0, offsetY = 0, speed = 1, health = 10, coinReward = 1) {
        this.map = map;             // reference na Mapu
        this.path = path;           // pole tile {x,y}
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.speed = speed;
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
        // aplikujeme kameru
        this.map.applyCameraTransform(ctx);

        // vykreslení enemy
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);

        // reset transform
        this.map.resetTransform(ctx);
    }
}

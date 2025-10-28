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
                const b = new Bullet(this.x, this.y, target, this.bulletSpeed);
                b.damage = this.damage;
                this.bullets.push(b);
                this.lastShot = 0;
            }
        }

        // update bullets
        this.bullets.forEach(b => b.update(deltaTime));
        this.bullets = this.bullets.filter(b => b.active);
    }

    render(ctx) {
        // aplikujeme kameru
        this.map.applyCameraTransform(ctx);

        // vykreslení toweru
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // vykreslení bullets
        this.bullets.forEach(b => b.render(ctx));

        // reset transform
        this.map.resetTransform(ctx);
    }
}

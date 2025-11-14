export default class Bullet {
    constructor(x, y, target, speed = 3) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.speed = speed;
        this.damage = 1;
        this.active = true;

        // store life in ms
        this.maxLifetime = 5000; // 5 seconds
        this.lived = 0;

        // Reuse angle variable for rendering
        this.angle = 0;
    }

    update(deltaTime) {
        if (!this.active) return;

        // lifetime check
        this.lived += deltaTime;
        if (this.lived >= this.maxLifetime) {
            this.active = false;
            return;
        }

        // target dead or removed
        if (!this.target || (typeof this.target.health === 'number' && this.target.health <= 0)) {
            this.active = false;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;

        // only ONE sqrt
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Update arrow angle
        this.angle = Math.atan2(dy, dx);

        // HIT
        if (dist < this.speed) {
            this.x = this.target.x;
            this.y = this.target.y;
            this.target.health -= this.damage;
            this.active = false;
            return;
        }

        // MOVE
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
            
        // ----- SHAFT -----
        ctx.fillStyle = "#8B4513"; // brown
        ctx.beginPath();
        ctx.moveTo(-5, -1.75);   // back-left
        ctx.lineTo(8, -1.75);    // front-left
        ctx.lineTo(8, 1.75);     // front-right
        ctx.lineTo(-5, 1.75);    // back-right
        ctx.closePath();
        ctx.fill();
            
        // ----- TIP -----
        ctx.fillStyle = "#CCCCCC"; // steel/gray tip
        ctx.beginPath();
        ctx.moveTo(8, -3);      // start of tip
        ctx.lineTo(14, 0);      // tip point
        ctx.lineTo(8, 3);       // other side
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

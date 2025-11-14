export default class Bullet {
    constructor(x, y, target, speed = 3) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.speed = speed;
        this.damage = 1;
        this.active = true;
    }

    update(deltaTime) {
        // quickly bail out if already inactive
        if (!this.active) return;
        // if target gone or dead, deactivate the bullet to avoid wasted work
        if (!this.target || (typeof this.target.health === 'number' && this.target.health <= 0)) {
            this.active = false;
            return;
        }
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < this.speed) {
            this.x = this.target.x;
            this.y = this.target.y;
            this.target.health -= this.damage;
            this.active = false;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    render(ctx) {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI*2);
        ctx.fill();
    }
}

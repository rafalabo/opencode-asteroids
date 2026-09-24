'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const SHOOTING_STAR_MULT = 2.5;   // multiplicador de velocidad
const SHOOTING_STAR_TTL = 6;      // segundos antes de desaparecer
const SHOOTING_STAR_BLINK = 2;    // últimos segundos con parpadeo
const SHOOTING_STAR_POINTS = 150; // puntos al destruirla
const SHOOTING_STAR_SPAWN_MIN = 10;
const SHOOTING_STAR_SPAWN_MAX = 16;

class Asteroid {
  constructor(x, y, size = 3, isShootingStar = false) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;
    this.isShootingStar = isShootingStar;
    this.ttl = isShootingStar ? SHOOTING_STAR_TTL : Infinity;

    const angle = rand(0, Math.PI * 2);
    const baseSpeed = SPEEDS[size] + rand(-15, 15);
    const speed = isShootingStar ? baseSpeed * SHOOTING_STAR_MULT : baseSpeed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    // Estrella fugaz: desaparece con el tiempo, sin explosión ni puntos
    if (this.isShootingStar) {
      this.ttl -= dt;
      if (this.ttl <= 0) this.dead = true;
    }
  }

  split() {
    if (this.isShootingStar) return [];
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    // Parpadeo final antes de desaparecer
    if (this.isShootingStar && this.ttl < SHOOTING_STAR_BLINK &&
        Math.floor(this.ttl * 8) % 2 === 0) return;

    const color = this.isShootingStar ? '#ffcc33' : '#fff';

    // Estela en dirección opuesta a la velocidad (espacio de mundo, sin rotar)
    if (this.isShootingStar) {
      const mag = Math.hypot(this.vx, this.vy) || 1;
      const tx = this.x - (this.vx / mag) * 44;
      const ty = this.y - (this.vy / mag) * 44;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 204, 51, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Skins de nave ─────────────────────────────────────────────────────────────
const SKINS = [
  { name: 'CLÁSICA',  color: '#ffffff', flame: 'rgba(255, 130, 0, 0.85)',  shape: 'classic', scale: 1, scoreMult: 1 },
  { name: 'CAZA',     color: '#33ff88', flame: 'rgba(51, 255, 136, 0.9)',   shape: 'dart',    scale: 1, scoreMult: 1 },
  { name: 'TITÁN',    color: '#ff8833', flame: 'rgba(255, 136, 51, 0.9)',   shape: 'heavy',   scale: 1, scoreMult: 1 },
  { name: 'FANTASMA', color: '#cc66ff', flame: 'rgba(204, 102, 255, 0.9)',  shape: 'needle',  scale: 1, scoreMult: 1 },
  { name: 'ORO',      color: '#ffcc33', flame: 'rgba(255, 204, 51, 0.9)',   shape: 'classic', scale: 1, scoreMult: 1 },
  { name: 'MORADA',   color: '#a855f7', flame: 'rgba(168, 85, 247, 0.9)',   shape: 'classic', scale: 2, scoreMult: 2 },
];
const SKIN_STORAGE_KEY = 'asteroids-skin';
let currentSkinId = 0;
let skinFlashTimer = 0;

function getSkin(id) {
  return SKINS[id] || SKINS[0];
}

function getShipScale() {
  return getSkin(currentSkinId).scale || 1;
}

function getScoreMult() {
  return getSkin(currentSkinId).scoreMult || 1;
}

function addScore(base) {
  score += base * getScoreMult();
}

function loadStoredSkin() {
  try {
    const raw = localStorage.getItem(SKIN_STORAGE_KEY);
    const id = parseInt(raw, 10);
    if (Number.isInteger(id) && id >= 0 && id < SKINS.length) currentSkinId = id;
  } catch (e) { /* localStorage no disponible: usa skin por defecto */ }
}

function setSkin(id) {
  if (!Number.isInteger(id) || id < 0 || id >= SKINS.length || id === currentSkinId) return;
  currentSkinId = id;
  skinFlashTimer = 1.5;
  if (typeof ship !== 'undefined' && ship) ship.radius = 12 * getShipScale();
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, String(id));
  } catch (e) { /* ignorar: el juego sigue sin persistencia */ }
}

loadStoredSkin();

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12 * getShipScale();
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.shieldTime    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    // El radio depende de la skin activa (MORADA es el doble de grande)
    this.radius = 12 * getShipScale();
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost     = Math.max(0, this.speedBoost - dt);
    if (this.tripleShot    > 0) this.tripleShot     = Math.max(0, this.tripleShot - dt);
    if (this.shieldTime    > 0) this.shieldTime     = Math.max(0, this.shieldTime - dt);

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (this.speedBoost > 0 ? 2 : 1);  // Velocidad: empuje x2
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const scale = getShipScale();
    const NOSE = 21 * scale;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot <= 0) return [new Bullet(ox, oy, this.angle)];
    // Triple shot: 3 balas paralelas en línea recta, separadas lateralmente
    const perp = this.angle + Math.PI / 2;
    const GAP = 8 * scale;
    return [-GAP, 0, GAP].map(o =>
      new Bullet(ox + Math.cos(perp) * o, oy + Math.sin(perp) * o, this.angle)
    );
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(getShipScale(), getShipScale());
    const boosted = this.speedBoost > 0;
    const triple = this.tripleShot > 0;
    const skin = getSkin(currentSkinId);
    ctx.strokeStyle = triple ? '#ff44ff' : (boosted ? '#33eeff' : skin.color);
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta según skin (todas normalizadas: nariz x=20, cola x≈-12)
    ctx.beginPath();
    switch (skin.shape) {
      case 'dart':    // CAZA: nariz larga, alas en flecha
        ctx.moveTo( 22,  0);   // nariz
        ctx.lineTo(-10, -11);  // ala izquierda
        ctx.lineTo( -4,  0);   // muesca trasera
        ctx.lineTo(-10, 11);   // ala derecha
        break;
      case 'heavy':   // TITÁN: ancha/blindada
        ctx.moveTo( 18,  0);   // nariz
        ctx.lineTo(-12, -12);  // ala izquierda
        ctx.lineTo( -8,  0);   // muesca trasera
        ctx.lineTo(-12, 12);   // ala derecha
        break;
      case 'needle':  // FANTASMA: fina/alargada
        ctx.moveTo( 24,  0);   // nariz
        ctx.lineTo(-12, -6);   // ala izquierda
        ctx.lineTo( -7,  0);   // muesca trasera
        ctx.lineTo(-12,  6);   // ala derecha
        break;
      default:        // CLÁSICA / ORO: triángulo con muesca trasera
        ctx.moveTo( 20,  0);   // nariz
        ctx.lineTo(-12, -9);   // ala izquierda
        ctx.lineTo( -7,  0);   // muesca trasera
        ctx.lineTo(-12,  9);   // ala derecha
        break;
    }
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor (color propio de la skin, cian con boost)
    if (this.thrusting && Math.random() > 0.35) {
      const flameLen = boosted ? rand(10, 22) : rand(6, 14);
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - flameLen, 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boosted ? 'rgba(51, 238, 255, 0.9)' : skin.flame;
      ctx.stroke();
    }

    // Aura durante Velocidad
    if (boosted) {
      ctx.beginPath();
      ctx.arc(0, 0, 22 + Math.sin(performance.now() / 120) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(51, 238, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Aura durante Triple Shot (radio mayor para coexistir con Velocidad)
    if (triple) {
      ctx.beginPath();
      ctx.arc(0, 0, 26 + Math.sin(performance.now() / 120 + 1) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 68, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Burbuja del escudo (visible incluso con parpadeo de invencibilidad consumido arriba,
    // protege de asteroides y los destruye al contacto)
    if (this.shieldTime > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(performance.now() / 130) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(68, 136, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(performance.now() / 130) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(68, 136, 255, 0.25)';
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up Velocidad ────────────────────────────────────────────────────────
const SPEED_BOOST_DURATION = 5;   // segundos de empuje x2
const SPEED_SPAWN_MIN = 12;       // espera mínima entre apariciones
const SPEED_SPAWN_MAX = 18;       // espera máxima entre apariciones
const SPEED_POWERUP_TTL = 12;     // segundos antes de desaparecer

// ── Power-up Triple Shot ──────────────────────────────────────────────────────
const TRIPLE_SHOT_DURATION = 5;   // segundos de triple disparo
const TRIPLE_SPAWN_MIN = 15;      // espera mínima entre apariciones
const TRIPLE_SPAWN_MAX = 22;      // espera máxima entre apariciones
const TRIPLE_POWERUP_TTL = 12;    // segundos antes de desaparecer

class SpeedPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(10, 30);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 12;
    this.ttl  = SPEED_POWERUP_TTL;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const pulse = 1 + Math.sin(performance.now() / 200) * 0.08;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#33eeff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    // Símbolo >> de velocidad
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(0, 0);
    ctx.lineTo(-6, 6);
    ctx.moveTo(0, -6);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 6);
    ctx.stroke();
    ctx.restore();
  }
}

class TripleShotPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(10, 30);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 12;
    this.ttl  = TRIPLE_POWERUP_TTL;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const pulse = 1 + Math.sin(performance.now() / 200) * 0.08;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#ff44ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    // Símbolo de 3 líneas verticales (triple disparo)
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(-5, 6);
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 6);
    ctx.moveTo(5, -6);
    ctx.lineTo(5, 6);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Power-up Escudo ───────────────────────────────────────────────────────────
const SHIELD_DURATION = 10;    // segundos de protección (destruye asteroides al contacto)
const SHIELD_SPAWN_MIN = 15;   // espera mínima entre apariciones
const SHIELD_SPAWN_MAX = 22;   // espera máxima entre apariciones
const SHIELD_POWERUP_TTL = 12; // segundos antes de desaparecer

class ShieldPowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(10, 30);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 12;
    this.ttl  = SHIELD_POWERUP_TTL;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const pulse = 1 + Math.sin(performance.now() / 200) * 0.08;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    // Símbolo de escudo
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5, -3);
    ctx.lineTo(5, 2);
    ctx.lineTo(0, 7);
    ctx.lineTo(-5, 2);
    ctx.lineTo(-5, -3);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let speedSpawnTimer;
let tripleSpawnTimer;
let shieldSpawnTimer;
let shootingStarTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnSpeedPowerUp() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  powerups.push(new SpeedPowerUp(x, y));
}

function spawnTriplePowerUp() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  powerups.push(new TripleShotPowerUp(x, y));
}

function spawnShieldPowerUp() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  powerups.push(new ShieldPowerUp(x, y));
}

function spawnShootingStar() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  asteroids.push(new Asteroid(x, y, 2, true));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  speedSpawnTimer = 8;
  tripleSpawnTimer = 12;
  shieldSpawnTimer = 12;
  shootingStarTimer = rand(SHOOTING_STAR_SPAWN_MIN, SHOOTING_STAR_SPAWN_MAX);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  ship.reset();
  speedSpawnTimer = rand(SPEED_SPAWN_MIN, SPEED_SPAWN_MAX);
  tripleSpawnTimer = rand(TRIPLE_SPAWN_MIN, TRIPLE_SPAWN_MAX);
  shieldSpawnTimer = rand(SHIELD_SPAWN_MIN, SHIELD_SPAWN_MAX);
  shootingStarTimer = rand(SHOOTING_STAR_SPAWN_MIN, SHOOTING_STAR_SPAWN_MAX);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Cambio de skin con teclas 1-6 (una llamada a pressed() por código y frame)
  for (let i = 0; i < SKINS.length; i++) {
    if (pressed(`Digit${i + 1}`)) setSkin(i);
  }
  if (skinFlashTimer > 0) skinFlashTimer = Math.max(0, skinFlashTimer - dt);

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Aparición de power-ups (máx 1 global en pantalla, no aparece con su efecto activo)
  speedSpawnTimer -= dt;
  if (speedSpawnTimer <= 0 && powerups.length === 0 && ship.speedBoost <= 0) {
    spawnSpeedPowerUp();
    speedSpawnTimer = rand(SPEED_SPAWN_MIN, SPEED_SPAWN_MAX);
  }
  // Aparición de Triple Shot (máx 1 global en pantalla, no aparece con triple activo)
  tripleSpawnTimer -= dt;
  if (tripleSpawnTimer <= 0 && powerups.length === 0 && ship.tripleShot <= 0) {
    spawnTriplePowerUp();
    tripleSpawnTimer = rand(TRIPLE_SPAWN_MIN, TRIPLE_SPAWN_MAX);
  }
  // Aparición de Escudo (máx 1 global en pantalla, no aparece con escudo activo)
  shieldSpawnTimer -= dt;
  if (shieldSpawnTimer <= 0 && powerups.length === 0 && ship.shieldTime <= 0) {
    spawnShieldPowerUp();
    shieldSpawnTimer = rand(SHIELD_SPAWN_MIN, SHIELD_SPAWN_MAX);
  }
  powerups = powerups.filter(p => !p.dead);

  // Aparición de estrella fugaz (máx 1 en pantalla, desaparece sola en 6s)
  shootingStarTimer -= dt;
  if (shootingStarTimer <= 0 && !asteroids.some(a => a.isShootingStar && !a.dead)) {
    spawnShootingStar();
    shootingStarTimer = rand(SHOOTING_STAR_SPAWN_MIN, SHOOTING_STAR_SPAWN_MAX);
  }
  // Limpia fugaces expiradas (muerte silenciosa, sin puntos ni explosión)
  asteroids = asteroids.filter(a => !a.dead);

  // Nave vs power-ups (re-recoger refresca la duración)
  if (!ship.dead) {
    for (const p of powerups) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        if (p instanceof ShieldPowerUp) {
          ship.shieldTime = SHIELD_DURATION;
        } else if (p instanceof TripleShotPowerUp) {
          ship.tripleShot = TRIPLE_SHOT_DURATION;
        } else {
          ship.speedBoost = SPEED_BOOST_DURATION;
        }
        explode(p.x, p.y, 6);
      }
    }
    powerups = powerups.filter(p => !p.dead);
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        addScore(a.isShootingStar ? SHOOTING_STAR_POINTS : POINTS[a.size]);
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide: con escudo se destruyen (como una bala), sin escudo matan
  const shieldHits = [];
  if (!ship.dead && ship.shieldTime > 0) {
    for (const a of asteroids) {
      if (!a.dead && dist(ship, a) < ship.radius + a.radius * 0.82) {
        a.dead = true;
        addScore(a.isShootingStar ? SHOOTING_STAR_POINTS : POINTS[a.size]);
        explode(a.x, a.y, a.size * 5);
        shieldHits.push(...a.split());
      }
    }
    if (shieldHits.length > 0)
      asteroids = asteroids.filter(a => !a.dead).concat(shieldHits);
  }
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (!a.dead && dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nivel completado (la estrella fugaz no bloquea el avance)
  if (asteroids.filter(a => !a.isShootingStar).length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y, color = '#fff') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18, getSkin(currentSkinId).color);

  // Indicador de skin actual + ayuda de teclas
  const skin = getSkin(currentSkinId);
  ctx.textAlign = 'left';
  ctx.fillStyle = skin.color;
  ctx.fillText(`NAVE ${skin.name}  [1-${SKINS.length}]`, 14, H - 14);
  if ((skin.scoreMult || 1) > 1) {
    ctx.fillText(`PUNTOS x${skin.scoreMult}`, 14, H - 32);
  }

  // Confirmación temporal al cambiar de skin
  if (skinFlashTimer > 0) {
    ctx.textAlign = 'center';
    ctx.fillText(`SKIN: ${skin.name}`, W / 2, H - 44);
  }

  // Indicadores de efectos con cuenta regresiva + barra (apilados)
  let hudY = 46;
  // Indicador de Velocidad con cuenta regresiva + barra
  if (ship && ship.speedBoost > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#33eeff';
    ctx.fillText(`VELOCIDAD x2  ${ship.speedBoost.toFixed(1)}s`, 14, hudY);
    ctx.strokeStyle = '#33eeff';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, hudY + 6, 120, 6);
    ctx.fillRect(14, hudY + 6, 120 * (ship.speedBoost / SPEED_BOOST_DURATION), 6);
    hudY += 24;
  }

  // Indicador de Triple Shot con cuenta regresiva + barra
  if (ship && ship.tripleShot > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff44ff';
    ctx.fillText(`TRIPLE x3  ${ship.tripleShot.toFixed(1)}s`, 14, hudY);
    ctx.strokeStyle = '#ff44ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, hudY + 6, 120, 6);
    ctx.fillRect(14, hudY + 6, 120 * (ship.tripleShot / TRIPLE_SHOT_DURATION), 6);
    hudY += 24;
  }

  // Indicador de Escudo con cuenta regresiva + barra
  if (ship && ship.shieldTime > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4488ff';
    ctx.fillText(`ESCUDO  ${ship.shieldTime.toFixed(1)}s`, 14, hudY);
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, hudY + 6, 120, 6);
    ctx.fillRect(14, hudY + 6, 120 * (ship.shieldTime / SHIELD_DURATION), 6);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);

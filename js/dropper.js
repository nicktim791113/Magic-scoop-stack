// ============================================================
// dropper.js — 頂端左右擺盪的投放器，放手後把球丟進物理世界
// ============================================================
const Dropper = (() => {
  let x, dir, speed;
  let currentFlavor;
  let armed = false;          // 是否準備好可以放手
  let lockedUntil = 0;        // 短暫鎖住投放（剛放手後的緩衝）

  function pickFlavor() {
    const arr = GAME_CONFIG.FLAVORS;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function init() {
    const W = GAME_CONFIG.WIDTH;
    x = W / 2;
    dir = Math.random() > 0.5 ? 1 : -1;
    speed = GAME_CONFIG.DROPPER_BASE_SPEED;
    currentFlavor = pickFlavor();
    armed = true;
    lockedUntil = performance.now() + 250;
  }

  function setSpeedByScore(score) {
    const s = GAME_CONFIG.DROPPER_BASE_SPEED +
              score * GAME_CONFIG.DROPPER_SPEED_PER_SCORE;
    speed = Math.min(s, GAME_CONFIG.DROPPER_MAX_SPEED);
  }

  function update() {
    if (!armed) return;
    const W = GAME_CONFIG.WIDTH;
    const minX = GAME_CONFIG.DROPPER_MARGIN;
    const maxX = W - GAME_CONFIG.DROPPER_MARGIN;
    x += dir * speed;
    if (x >= maxX) { x = maxX; dir = -1; }
    if (x <= minX) { x = minX; dir = 1; }
  }

  // 放手：在 (x, DROPPER_Y) 生成球並給水平初速。
  // 回傳剛放掉的 body，game.js 可拿去等它 settle 後計分。
  function release() {
    if (!armed) return null;
    if (performance.now() < lockedUntil) return null;
    const body = Physics.createScoop(x, GAME_CONFIG.DROPPER_Y, currentFlavor);
    Matter.Body.setVelocity(body, {
      x: dir * speed * GAME_CONFIG.DROPPER_VX_TRANSFER,
      y: 0,
    });
    Physics.addScoop(body);
    armed = false;
    return body;
  }

  // 球落穩 / Game Over 後重新裝填下一顆
  function reload() {
    currentFlavor = pickFlavor();
    armed = true;
    lockedUntil = performance.now() + 200;
  }

  function getX() { return x; }
  function getFlavor() { return currentFlavor; }
  function isArmed() { return armed; }

  return { init, update, release, reload, setSpeedByScore,
           getX, getFlavor, isArmed };
})();

// ============================================================
// game.js — 狀態機、分數、相機、結束判定、最高分
// ============================================================
const Game = (() => {
  const STATE = { START: 'start', PLAYING: 'playing', OVER: 'over' };

  let state = STATE.START;
  let score = 0;
  let high = 0;
  let lastScoredScoop = null;   // 最近一顆放下尚未計分的球
  let lastStackedScoop = null;  // 最後一顆已計分的球（用來算 Perfect）
  let settleFrames = 0;
  let pendingPerfect = false;
  let perfectFlashUntil = 0;
  let towerTopHistory = [];     // 紀錄塔頂高度判定垮台
  let cameraY = 0;              // 鏡頭頂端 world y
  let cameraTargetY = 0;
  let onGameOver = null;
  let onScore = null;

  function init() {
    high = parseInt(localStorage.getItem('mss_highscore') || '0', 10) || 0;
    resetCamera();
  }

  function resetCamera() {
    cameraY = GAME_CONFIG.HEIGHT - GAME_CONFIG.HEIGHT;
    cameraTargetY = cameraY;
  }

  function start() {
    state = STATE.PLAYING;
    score = 0;
    lastScoredScoop = null;
    lastStackedScoop = null;
    settleFrames = 0;
    pendingPerfect = false;
    perfectFlashUntil = 0;
    towerTopHistory = [];
    resetCamera();
    Physics.reset();
    Dropper.init();
  }

  function gameOver() {
    if (state !== STATE.PLAYING) return;
    state = STATE.OVER;
    if (score > high) {
      high = score;
      localStorage.setItem('mss_highscore', String(high));
    }
    if (onGameOver) onGameOver(score, high);
  }

  function restart() { start(); }

  // 玩家按下空白/點擊
  function handleAction() {
    if (state === STATE.START || state === STATE.OVER) {
      start();
      return;
    }
    if (state === STATE.PLAYING && Dropper.isArmed()) {
      const body = Dropper.release();
      if (body) {
        lastScoredScoop = body;
        settleFrames = 0;
      }
    }
  }

  // 每幀呼叫：物理跑完後做計分 / 相機 / 結束判定
  function update() {
    if (state !== STATE.PLAYING) {
      updateCamera();
      return;
    }

    Dropper.setSpeedByScore(score);
    Dropper.update();

    // 計分：等剛放下的球停穩
    if (lastScoredScoop) {
      const s = lastScoredScoop;
      const moving =
        Math.abs(s.velocity.x) > GAME_CONFIG.SETTLE_SPEED ||
        Math.abs(s.velocity.y) > GAME_CONFIG.SETTLE_SPEED ||
        Math.abs(s.angularVelocity) > 0.05;
      if (moving) {
        settleFrames = 0;
      } else {
        settleFrames++;
        if (settleFrames >= GAME_CONFIG.SETTLE_FRAMES) {
          scoreCurrentScoop();
        }
      }
    }

    // 失敗：球掉出畫面
    if (Physics.checkFallOut(cameraY)) {
      gameOver();
      return;
    }

    // 失敗：塔頂高度短時間驟降
    const topY = Physics.topScoopY();
    towerTopHistory.push(topY);
    if (towerTopHistory.length > GAME_CONFIG.TOWER_COLLAPSE_FRAMES) {
      towerTopHistory.shift();
      const oldest = towerTopHistory[0];
      // y 越小越高；驟降 = 變大
      if (topY - oldest > GAME_CONFIG.TOWER_COLLAPSE_DROP && score > 2) {
        gameOver();
        return;
      }
    }

    updateCamera();
  }

  function scoreCurrentScoop() {
    const s = lastScoredScoop;
    let gained = 1;

    // Perfect：與下方那顆水平偏移很小
    if (lastStackedScoop) {
      const dx = Math.abs(s.position.x - lastStackedScoop.position.x);
      if (dx <= GAME_CONFIG.PERFECT_THRESHOLD &&
          s.position.y < lastStackedScoop.position.y) {
        gained += GAME_CONFIG.PERFECT_BONUS;
        pendingPerfect = true;
        perfectFlashUntil = performance.now() + 600;
      }
    }
    score += gained;
    lastStackedScoop = s;
    lastScoredScoop = null;
    settleFrames = 0;
    towerTopHistory = []; // 計分後重置觀察視窗
    Dropper.reload();
    if (onScore) onScore(score, gained, pendingPerfect);
    pendingPerfect = false;
  }

  function updateCamera() {
    const topY = Physics.topScoopY();
    // 想讓 topY 出現在畫面距頂約 CAMERA_TOP_PADDING 的位置
    const desired = topY - GAME_CONFIG.CAMERA_TOP_PADDING;
    // 但鏡頭最低不低於初始（不要往下露出地板下方）
    const minCam = 0; // 不限制下界更好觀察；保留 0 起始
    cameraTargetY = Math.min(desired, minCam);
    cameraY += (cameraTargetY - cameraY) * GAME_CONFIG.CAMERA_LERP;
  }

  function getState()   { return state; }
  function getScore()   { return score; }
  function getHigh()    { return high; }
  function getCameraY() { return cameraY; }
  function isPerfectFlash() { return performance.now() < perfectFlashUntil; }

  return {
    STATE, init, start, restart, handleAction, update,
    getState, getScore, getHigh, getCameraY, isPerfectFlash,
    set onGameOver(fn) { onGameOver = fn; },
    set onScore(fn) { onScore = fn; },
  };
})();

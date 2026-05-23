// ============================================================
// physics.js — Matter.js 世界、地面、甜筒、球體工廠、失敗偵測
// ============================================================
const Physics = (() => {
  const { Engine, World, Bodies, Composite, Body, Events } = Matter;

  let engine, world;
  let cone;           // 甜筒底座（靜態）
  let scoops = [];    // 已放下的球
  let onDropOut = null; // 球掉出畫面時呼叫

  function init() {
    engine = Engine.create();
    engine.gravity.y = GAME_CONFIG.GRAVITY_Y;
    engine.positionIterations = 10;
    engine.velocityIterations = 10;
    world = engine.world;

    buildCone();
    return engine;
  }

  function buildCone() {
    const W = GAME_CONFIG.WIDTH;
    const H = GAME_CONFIG.HEIGHT;
    const cw = GAME_CONFIG.CONE_WIDTH;
    const ch = GAME_CONFIG.CONE_HEIGHT;
    const tw = GAME_CONFIG.CONE_TOP_WIDTH;

    const cx = W / 2;
    const topY = H - 60;

    // 甜筒頂端做一個略寬的平台 + 兩側斜邊圍住，球才不會滾走
    const platform = Bodies.rectangle(cx, topY, tw, 14, {
      isStatic: true,
      friction: 1.0,
      frictionStatic: 1.0,
      restitution: 0.05,
      label: 'cone-top',
      render: { visible: false },
    });

    const angle = Math.atan2(ch, (cw - tw) / 2);
    const sideLen = Math.hypot(ch, (cw - tw) / 2);

    const leftWall = Bodies.rectangle(
      cx - tw / 2 - Math.sin(angle) * sideLen / 2,
      topY + Math.cos(angle) * sideLen / 2,
      8, sideLen,
      {
        isStatic: true,
        angle: -angle,
        friction: 0.6,
        label: 'cone-side',
        render: { visible: false },
      }
    );
    const rightWall = Bodies.rectangle(
      cx + tw / 2 + Math.sin(angle) * sideLen / 2,
      topY + Math.cos(angle) * sideLen / 2,
      8, sideLen,
      {
        isStatic: true,
        angle: angle,
        friction: 0.6,
        label: 'cone-side',
        render: { visible: false },
      }
    );

    cone = { platform, leftWall, rightWall, cx, topY, tw, cw, ch };
    Composite.add(world, [platform, leftWall, rightWall]);
  }

  function createScoop(x, y, flavor) {
    const body = Bodies.circle(x, y, GAME_CONFIG.SCOOP_RADIUS, {
      restitution: GAME_CONFIG.SCOOP_RESTITUTION,
      friction: GAME_CONFIG.SCOOP_FRICTION,
      frictionStatic: GAME_CONFIG.SCOOP_FRICTION_STATIC,
      density: GAME_CONFIG.SCOOP_DENSITY,
      slop: GAME_CONFIG.SCOOP_SLOP,
      label: 'scoop',
      render: { visible: false },
    });
    body.flavor = flavor;
    body.bornAt = performance.now();
    return body;
  }

  function addScoop(scoop) {
    Composite.add(world, scoop);
    scoops.push(scoop);
  }

  function step(deltaMs) {
    Engine.update(engine, deltaMs);
  }

  // 鏡頭以下太遠 → 掉出畫面
  function checkFallOut(cameraTopY) {
    const limit = cameraTopY + GAME_CONFIG.HEIGHT + GAME_CONFIG.FALL_OUT_OFFSET;
    for (const s of scoops) {
      if (s.position.y > limit) {
        if (onDropOut) onDropOut(s);
        return true;
      }
    }
    return false;
  }

  function topScoopY() {
    if (!scoops.length) return cone.topY;
    let minY = Infinity;
    for (const s of scoops) {
      if (s.position.y < minY) minY = s.position.y;
    }
    return minY;
  }

  function highestScoop() {
    let top = null;
    let minY = Infinity;
    for (const s of scoops) {
      if (s.position.y < minY) {
        minY = s.position.y;
        top = s;
      }
    }
    return top;
  }

  function isAllSettled() {
    const v = GAME_CONFIG.SETTLE_SPEED;
    for (const s of scoops) {
      if (Math.abs(s.velocity.x) > v || Math.abs(s.velocity.y) > v) return false;
      if (Math.abs(s.angularVelocity) > 0.05) return false;
    }
    return true;
  }

  function reset() {
    for (const s of scoops) Composite.remove(world, s);
    scoops = [];
  }

  function getScoops() { return scoops; }
  function getCone()   { return cone; }
  function getWorld()  { return world; }

  return {
    init, step, reset,
    createScoop, addScoop,
    checkFallOut, topScoopY, highestScoop, isAllSettled,
    getScoops, getCone, getWorld,
    set onDropOut(fn) { onDropOut = fn; },
  };
})();

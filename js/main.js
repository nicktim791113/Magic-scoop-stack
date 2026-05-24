// ============================================================
// main.js — 進入點：建立 canvas、繪圖、主迴圈、輸入、Service Worker
// ============================================================
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = GAME_CONFIG.WIDTH;
  const H = GAME_CONFIG.HEIGHT;

  // HUD
  const elScore     = document.getElementById('score');
  const elHigh      = document.getElementById('high');
  const elStart     = document.getElementById('start-screen');
  const elGameOver  = document.getElementById('gameover-screen');
  const elFinal     = document.getElementById('final-score');
  const elFinalHigh = document.getElementById('final-high');
  const elPerfect   = document.getElementById('perfect-pop');
  const elNewHigh   = document.getElementById('new-high');

  // 縮放：把固定的 (W x H) 邏輯畫布縮到視窗大小、加上 DPR
  function fitCanvas() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const wrap = canvas.parentElement.getBoundingClientRect();
    // layout 還沒結算（preview / iframe / 切到背景時可能為 0）→ 給個保底
    const wrapW = wrap.width  > 0 ? wrap.width  : W;
    const wrapH = wrap.height > 0 ? wrap.height : H;
    const scale = Math.max(0.001, Math.min(wrapW / W, wrapH / H));
    const cssW = Math.max(1, Math.floor(W * scale));
    const cssH = Math.max(1, Math.floor(H * scale));
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  }

  // ---------------- 繪圖 ----------------
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, GAME_CONFIG.COLORS.SKY_TOP);
    g.addColorStop(1, GAME_CONFIG.COLORS.SKY_BOTTOM);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 軟綿綿雲朵裝飾（與相機微視差）
    const cam = Game.getCameraY();
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    const cloudOffset = (cam * 0.15) % 200;
    for (let i = 0; i < 4; i++) {
      const cx = 30 + i * 110 + Math.sin(i) * 20;
      const cy = 60 + (i % 2) * 90 - cloudOffset;
      cloud(cx, ((cy % (H + 80)) + (H + 80)) % (H + 80) - 40);
    }
    ctx.restore();
  }
  function cloud(x, y) {
    ctx.beginPath();
    ctx.arc(x,       y,      18, 0, Math.PI * 2);
    ctx.arc(x + 18,  y - 8,  22, 0, Math.PI * 2);
    ctx.arc(x + 40,  y,      18, 0, Math.PI * 2);
    ctx.arc(x + 20,  y + 10, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCone() {
    const c = Physics.getCone();
    const camY = Game.getCameraY();
    const cy = c.topY - camY;

    // 甜筒主體（梯形）
    ctx.fillStyle = GAME_CONFIG.COLORS.CONE;
    ctx.beginPath();
    ctx.moveTo(c.cx - c.tw / 2, cy);
    ctx.lineTo(c.cx + c.tw / 2, cy);
    ctx.lineTo(c.cx + c.cw / 2, cy + c.ch);
    ctx.lineTo(c.cx - c.cw / 2, cy + c.ch);
    ctx.closePath();
    ctx.fill();

    // 格紋
    ctx.strokeStyle = GAME_CONFIG.COLORS.CONE_DARK;
    ctx.lineWidth = 1.2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(c.cx - c.tw / 2, cy);
    ctx.lineTo(c.cx + c.tw / 2, cy);
    ctx.lineTo(c.cx + c.cw / 2, cy + c.ch);
    ctx.lineTo(c.cx - c.cw / 2, cy + c.ch);
    ctx.closePath();
    ctx.clip();
    for (let i = -c.cw; i < c.cw * 2; i += 14) {
      ctx.beginPath(); ctx.moveTo(c.cx - c.cw + i, cy);     ctx.lineTo(c.cx - c.cw + i + c.ch, cy + c.ch); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.cx - c.cw + i, cy + c.ch); ctx.lineTo(c.cx - c.cw + i + c.ch, cy);     ctx.stroke();
    }
    ctx.restore();

    // 頂端平台描邊
    ctx.strokeStyle = GAME_CONFIG.COLORS.CONE_DARK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.cx - c.tw / 2, cy);
    ctx.lineTo(c.cx + c.tw / 2, cy);
    ctx.stroke();

    // 地面
    ctx.fillStyle = '#f8c8df';
    ctx.fillRect(0, cy + c.ch, W, H);
  }

  function drawScoop(body, opts = {}) {
    const camY = Game.getCameraY();
    const x = body.position.x;
    const y = body.position.y - camY;
    const r = GAME_CONFIG.SCOOP_RADIUS;
    const f = body.flavor || GAME_CONFIG.FLAVORS[0];

    // 飛行中 vs 落定：用速度判定。落定後畫成軟塌 dollop（橫向略寬、
    // 底部小垂滴）而不是完美圓球——冰淇淋是軟的，碰到東西會塌一點
    const vx = (body.velocity && body.velocity.x) || 0;
    const vy = (body.velocity && body.velocity.y) || 0;
    const speed = Math.hypot(vx, vy);
    // 沒 velocity 屬性 = dropper 預覽用的假 body → 一律當作空中圓球
    const inAir = !body.velocity || speed > 0.6;

    // squash 形變參數
    const sx = inAir ? 0.97 : 1.10;   // 落定後橫向稍寬
    const sy = inAir ? 1.04 : 0.86;   // 落定後縱向壓扁
    const rx = r * sx;
    const ry = r * sy;

    ctx.save();
    ctx.translate(x, y);

    // 陰影（橢圓，跟著形變）
    ctx.fillStyle = GAME_CONFIG.COLORS.SHADOW;
    ctx.beginPath();
    ctx.ellipse(2, 3 + (1 - sy) * r * 0.6, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // 主體漸層
    const g = ctx.createRadialGradient(-rx * 0.4, -ry * 0.45, r * 0.2, 0, 0, Math.max(rx, ry));
    g.addColorStop(0, f.hi);
    g.addColorStop(1, f.body);
    ctx.fillStyle = g;

    // dollop 輪廓：橢圓 + 落定時底部多兩坨小垂滴
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!inAir) {
      // 兩坨小「融化」垂滴在底邊偏下，模擬軟冰淇淋黏住下方那顆的感覺
      const dripR1 = r * 0.26;
      const dripR2 = r * 0.18;
      const dripY  = ry * 0.78;
      ctx.beginPath();
      ctx.arc(-rx * 0.32, dripY, dripR1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc( rx * 0.42, dripY + r * 0.05, dripR2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 飛行中：底部拉出一條小尾巴（像水滴），更有「正在掉」的感覺
      ctx.beginPath();
      ctx.moveTo(-rx * 0.35, ry * 0.55);
      ctx.quadraticCurveTo(0, ry * 1.18, rx * 0.35, ry * 0.55);
      ctx.fill();
    }

    // 頂端小尖（剛挖出來的軟冰造型）
    ctx.beginPath();
    ctx.moveTo(-rx * 0.22, -ry * 0.78);
    ctx.quadraticCurveTo(0, -ry * 1.20, rx * 0.22, -ry * 0.78);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-rx * 0.4, -ry * 0.45, rx * 0.22, ry * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 小巧克力豆/配料（不旋轉）
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2 + ((body.id || 0) % 7);
      const rr = r * 0.55;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * rr * sx, Math.sin(ang) * rr * sy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawDropper() {
    if (!Dropper.isArmed()) return;
    const camY = Game.getCameraY();
    const x = Dropper.getX();
    const y = GAME_CONFIG.DROPPER_Y - camY;
    const r = GAME_CONFIG.SCOOP_RADIUS;

    // 雲朵載具
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 14, y - 26, 14, 0, Math.PI * 2);
    ctx.arc(x + 14, y - 26, 14, 0, Math.PI * 2);
    ctx.arc(x,      y - 32, 18, 0, Math.PI * 2);
    ctx.arc(x,      y - 18, 18, 0, Math.PI * 2);
    ctx.fill();

    // 從雲朵垂下的虛線到球
    ctx.strokeStyle = 'rgba(122,80,100,0.45)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x, y - r + 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 球（待放手）
    const fakeBody = {
      position: { x, y: GAME_CONFIG.DROPPER_Y },
      angle: 0,
      flavor: Dropper.getFlavor(),
      id: 0,
    };
    drawScoop(fakeBody);

    // 落點輔助線（淡淡的虛線）
    ctx.strokeStyle = 'rgba(255,158,205,0.35)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + r);
    ctx.lineTo(x, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPerfectFlash() {
    if (!Game.isPerfectFlash()) return;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fffae0';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawCone();
    for (const s of Physics.getScoops()) drawScoop(s);
    if (Game.getState() === Game.STATE.PLAYING) drawDropper();
    drawPerfectFlash();
  }

  // ---------------- 主迴圈 ----------------
  let lastTs = performance.now();
  function loop(ts) {
    let dt = ts - lastTs;
    lastTs = ts;
    if (dt > 50) dt = 50; // 大頓挫保護

    if (Game.getState() === Game.STATE.PLAYING) {
      Physics.step(dt);
    }
    Game.update();
    render();
    requestAnimationFrame(loop);
  }

  // ---------------- 輸入 ----------------
  function action() {
    Audio.unlock();
    if (Game.getState() === Game.STATE.PLAYING && Dropper.isArmed()) {
      Audio.play('drop');
    }
    Game.handleAction();
  }

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      action();
    }
  });

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    action();
  });
  // 阻止雙擊縮放、長按選字
  canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });

  document.getElementById('btn-start').addEventListener('click', () => {
    elStart.classList.add('hidden');
    action();
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    elGameOver.classList.add('hidden');
    action();
  });

  // ---------------- HUD callbacks ----------------
  Game.onScore = (score, gained, perfect) => {
    elScore.textContent = String(score);
    if (perfect) {
      Audio.play('perfect');
      elPerfect.classList.remove('show');
      void elPerfect.offsetWidth; // 重新觸發動畫
      elPerfect.classList.add('show');
    } else {
      Audio.play('stack');
    }
  };

  Game.onGameOver = (score, high) => {
    Audio.play('over');
    elFinal.textContent = String(score);
    elFinalHigh.textContent = String(high);
    if (score === high && high > 0) {
      elNewHigh.classList.remove('hidden');
    } else {
      elNewHigh.classList.add('hidden');
    }
    elGameOver.classList.remove('hidden');
  };

  // ---------------- 啟動 ----------------
  function boot() {
    fitCanvas();
    Physics.init();
    Game.init();
    elHigh.textContent = String(Game.getHigh());
    elScore.textContent = '0';
    requestAnimationFrame(loop);

    // layout 可能晚一拍才完成 → 多 fit 幾次保險
    requestAnimationFrame(fitCanvas);
    window.addEventListener('load', fitCanvas);
    window.addEventListener('resize', fitCanvas);
    window.addEventListener('orientationchange', fitCanvas);

    // 註冊 Service Worker（PWA）
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  boot();
})();

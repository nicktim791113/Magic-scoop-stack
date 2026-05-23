# 🍦 Magic Scoop Stack — 冰淇淋疊疊樂 開發藍圖

> 一款網頁版的物理堆疊遊戲：冰淇淋球從上方擺盪掉落，玩家抓準時機放手，球落在塔頂後依物理規則碰撞、搖晃、堆疊。疊得越高分數越高，整座塔垮掉或有球掉出畫面就結束。
> 並做成 **PWA**：可「加到主畫面」像 App 一樣全螢幕遊玩，並支援離線開啟。

---

## 1. 命名

| 用途 | 名稱 |
|------|------|
| 遊戲主名 | **Magic Scoop Stack** |
| **GitHub repo 名** | **`Magic-scoop-stack`** |
| GitHub Pages 網址 | `你的帳號.github.io/Magic-scoop-stack/` |
| PWA 顯示名稱 | Magic Scoop Stack（主畫面短名可用 `ScoopStack`） |
| 中文暱稱 | 「魔法疊疊冰」 |

> ⚠️ repo 名有大小寫（`Magic-scoop-stack`）。GitHub Pages 的網址路徑**對大小寫敏感**，後面 PWA 的所有設定都要跟這個路徑一致，否則 Service Worker 會註冊失敗（見第 6 節）。

---

## 2. 技術選型

| 項目 | 選擇 | 理由 |
|------|------|------|
| 語言 | HTML + CSS + 原生 JavaScript | 不需框架，學習與除錯成本最低 |
| 物理引擎 | **Matter.js** | 最成熟的 2D 物理引擎，碰撞、堆疊、搖晃開箱即用 |
| 渲染 | HTML5 `<canvas>` | Matter.js 內建 renderer，起步快 |
| **App 化** | **PWA**（manifest + Service Worker） | 可加到主畫面、全螢幕、離線遊玩 |
| 部署 | **GitHub Pages** | 免費、純靜態、push 即上線、**自帶 HTTPS（PWA 必要條件）** |
| 資料儲存 | `localStorage` | 存最高分（純前端不需資料庫） |

Matter.js 用 CDN 引入即可：
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js"></script>
```
> 開工前到 cdnjs 或 Matter.js 官網確認一下最新版本號再填進去。
> 註：要支援**離線**時，建議把 Matter.js 下載成本地檔放進 repo，這樣 Service Worker 才好快取（CDN 離線時不一定拿得到）。

---

## 3. 專案檔案結構

```
Magic-scoop-stack/
├── index.html          ← 入口，掛 canvas、連 manifest、註冊 service worker
├── manifest.json       ← 【PWA】App 名稱、圖示、顏色、顯示模式
├── sw.js               ← 【PWA】Service Worker，快取資源、離線運作
├── css/
│   └── style.css
├── js/
│   ├── config.js       ← 所有可調參數集中放這（重力、摩擦、球大小…）
│   ├── physics.js      ← 建立物理世界、地面、邊界
│   ├── dropper.js      ← 上方擺盪/平移的投放器與放手邏輯
│   ├── game.js         ← 遊戲狀態機、分數、相機
│   └── main.js         ← 進入點，串起所有模組、主迴圈
├── assets/
│   ├── images/         ← 冰淇淋球、甜筒、背景
│   ├── sounds/         ← 掉落、疊中、垮掉音效
│   └── icons/          ← 【PWA】App 圖示（192x192、512x512 等）
└── README.md
```

> 初學建議：先把遊戲寫到一個 `index.html` + `main.js` 跑通（M1~M5），**PWA 是最後才加的外殼**（M7），不影響遊戲本體。

---

## 4. 核心玩法機制

```
   ┌─────────────────────────┐
   │   🍦  ← 投放器左右擺盪    │   1. 球在頂端來回移動/擺盪
   │    \                    │
   │     ●  ← 點擊/空白鍵放手  │   2. 玩家抓時機放手
   │     |                   │
   │     ▼  ← 依重力掉落       │   3. 物理引擎接管
   │    ███  ← 落在塔頂        │   4. 碰撞、彈一下、卡住或滑掉
   │   █████ ← 整座塔會搖晃     │   5. 疊歪了塔會晃，太歪就垮
   │  ───────                 │
   │   地面/甜筒底座           │
   └─────────────────────────┘
```

**玩家操作**：只有一個動作——**點擊（或按空白鍵）放手**。簡單上手是這類遊戲的精髓。

**一回合流程**：
1. 新球出現在畫面頂端的投放器上，左右擺盪（難度越高擺越快）。
2. 玩家放手 → 球脫離投放器，依當前水平速度 + 重力掉落。
3. 球碰到塔頂 → Matter.js 計算碰撞、回彈、摩擦，球可能卡穩、滑落或把塔撞歪。
4. 塔有重量會自然搖晃；疊得越高、重心越偏，越容易倒。
5. 球靜止後 → 分數 +1，相機往上移，生成下一顆球。

**結束條件（擇一或並用）**：
- 有任何球的 `y` 座標掉出畫面底部（球掉光了）。
- 塔頂高度在短時間內驟降（整座塔垮了）。

**計分**：成功疊上的球數即分數。可加「完美對齊」加成（落點與下方球的水平偏移很小時 +2）。

---

## 5. 物理實作要點（Matter.js）

這是整個遊戲的靈魂，參數沒調好會「球一直彈」或「永遠疊不穩」。

### 5.1 建立世界
```js
const engine = Matter.Engine.create();
engine.gravity.y = 1;          // 重力，1 是預設，調大掉得快
const world = engine.world;
```

### 5.2 冰淇淋球（重點在材質參數）
```js
const scoop = Matter.Bodies.circle(x, y, RADIUS, {
  restitution: 0.1,   // 彈性 → 一定要低，不然球會彈跳疊不住
  friction: 0.8,      // 摩擦 → 要高，球才咬得住下面那顆
  density: 0.001,     // 密度 → 影響重量與搖晃慣性
});
Matter.Composite.add(world, scoop);
```
> **調參心法**：彈性低（0.05~0.2）、摩擦高（0.6~1.0）。先把這兩個調順，手感就出來八成了。

### 5.3 投放器（擺盪 → 放手）
最簡單的做法是「不受重力的載具」在頂端水平來回移動：
```js
dropperX += dir * speed;
if (dropperX > maxX || dropperX < minX) dir *= -1;

// 放手時：在 dropperX 位置生成真正的球，給它水平初速
Matter.Body.setVelocity(scoop, { x: dir * speed * 0.5, y: 0 });
```
> 進階：想做成真的「鐘擺」可用 `Matter.Constraint`（繩子）把球吊起來，放手時移除 constraint。先用平移版上手即可。

### 5.4 相機跟隨（塔變高要往上看）
```js
Matter.Render.lookAt(render, {
  min: { x: 0, y: topY - 400 },
  max: { x: WIDTH, y: topY + 200 }
});
```

### 5.5 失敗偵測
```js
Matter.Events.on(engine, 'afterUpdate', () => {
  for (const body of Matter.Composite.allBodies(world)) {
    if (body.position.y > CANVAS_BOTTOM + 100) {
      gameOver();   // 有球掉出畫面
    }
  }
});
```

---

## 6. 【PWA】漸進式網頁應用實作

目標：讓玩家用瀏覽器開啟後能「加到主畫面」，像原生 App 一樣全螢幕、無網址列，甚至離線也能玩。

### 6.1 PWA 三要素

| 要素 | 檔案 | 作用 |
|------|------|------|
| App 設定檔 | `manifest.json` | 定義名稱、圖示、顏色、全螢幕模式 |
| Service Worker | `sw.js` | 快取資源，讓遊戲可離線、載入更快 |
| HTTPS | （GitHub Pages 內建） | PWA 強制要求，Pages 自動符合 |

### 6.2 manifest.json（範例）
```json
{
  "name": "Magic Scoop Stack",
  "short_name": "ScoopStack",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#fff5fb",
  "theme_color": "#ff9ecd",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "assets/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
> `display: standalone` 是全螢幕無網址列的關鍵。圖示至少要備 192 與 512 兩種尺寸；多一張 `maskable` 版本在 Android 上邊角才不會被裁切。

### 6.3 index.html 要加的標籤
```html
<head>
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#ff9ecd">
  <!-- iOS Safari 額外支援 -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <link rel="apple-touch-icon" href="assets/icons/icon-192.png">
</head>
```
並在主程式註冊 Service Worker：
```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
```

### 6.4 sw.js（最小可用的離線快取）
```js
const CACHE = 'magic-scoop-v1';   // 改版時把 v1 → v2，使用者才會拿到新檔
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/game.js',
  './js/physics.js',
  './js/dropper.js',
  './js/config.js',
  './lib/matter.min.js',   // 建議把 Matter.js 放本地才能離線快取
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  // 清掉舊版快取
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
```

### 6.5 ⚠️ GitHub Pages 子路徑陷阱（最容易出錯的地方）
因為網站部署在 **子路徑** `https://你的帳號.github.io/Magic-scoop-stack/` 底下，**所有路徑一律用相對路徑（`./` 開頭），絕對不要用 `/` 開頭的絕對路徑**：
- ✅ 對：`href="manifest.json"`、`register('sw.js')`、快取清單用 `./index.html`
- ❌ 錯：`href="/manifest.json"`、`register('/sw.js')` → 會跑去找 `github.io/sw.js`，註冊失敗
- `manifest.json` 裡的 `start_url` 與 `scope` 都用 `"./"`。

> 驗證方法：用 Chrome 開 DevTools → **Application** 分頁，可看到 Manifest 是否正確、Service Worker 是否註冊成功、能否觸發「安裝」。手機上則會跳出「加到主畫面」。

---

## 7. 開發里程碑（建議照順序，每階段都能跑）

- [ ] **M1 — 環境搭建**：`index.html` 引入 Matter.js，畫面上有一顆球受重力掉到地面。
- [ ] **M2 — 能堆疊**：加地面/底座，連續放好幾顆球會自然堆起、搖晃。專心調 `restitution` / `friction`。
- [ ] **M3 — 投放器與操作**：頂端的球左右擺盪，點擊/空白鍵放手掉落。
- [ ] **M4 — 計分與相機**：成功疊一顆 +1，塔變高時視角往上跟。
- [ ] **M5 — 結束與重來**：球掉出畫面 → Game Over → 重新開始；`localStorage` 存最高分。
- [ ] **M6 — 美術與音效**：冰淇淋圖、背景、音效、開始畫面、手機觸控支援。
- [ ] **M7 — PWA 化**：加 `manifest.json` + `sw.js` + 圖示，註冊 Service Worker，用 DevTools 驗證可安裝、可離線。
- [ ] **M8 — 打磨上線**：難度遞增、完美對齊加成，部署到 GitHub Pages，手機實機測試「加到主畫面」。

> 每完成一個 M 就 commit 一次。PWA（M7）務必排在遊戲本體可玩之後。

---

## 8. 部署到 GitHub Pages

1. 在 GitHub 建立新 repo，命名 **`Magic-scoop-stack`**（**Public**，Pages 免費版需公開）。
2. 把專案檔案 push 上去，**確認 `index.html`、`manifest.json`、`sw.js` 都在 repo 根目錄**。
3. 進入 repo → **Settings** → 左側 **Pages**。
4. Source 選 **Deploy from a branch**，Branch 選 **main**、資料夾選 **/ (root)**，按 Save。
5. 等一兩分鐘，網址出現：`https://你的帳號.github.io/Magic-scoop-stack/`。
6. 用手機開這個網址 → 瀏覽器選單應出現「**加到主畫面 / 安裝**」，裝起來就是一個 App 圖示。
7. 之後每次 `git push` 網站自動更新（PWA 改版記得把 `sw.js` 的快取版本號 +1）。

> 安全提醒：建 repo、改 Settings、開啟 Pages 這些動作請你自己在 GitHub 介面操作，我不會代為更動權限或設定。

---

## 9. 進階點子（行有餘力再加）

- **多種口味**：每顆球隨機顏色/口味。
- **完美對齊回饋**：對齊很準時閃光 + 加成音效。
- **難度曲線**：分數越高擺盪越快、球越大或形狀更難疊。
- **搗蛋元素**：偶爾來陣風、或底座緩慢移動。
- **分享分數**：Game Over 顯示「我疊到 N 層」方便截圖分享。

---

## 10. 起步檢查清單

```
□ 建立 Magic-scoop-stack 資料夾與基本檔案
□ index.html 成功引入 Matter.js（M1 那顆球會掉）
□ 調出滿意的堆疊手感（M2 的彈性/摩擦）
□ 完成可玩的最小版本（M1~M5）
□ 加上 PWA：manifest.json + sw.js + 圖示（M7）
□ DevTools → Application 確認可安裝、可離線
□ 路徑全部用相對路徑（./），避開子路徑陷阱
□ 建 GitHub repo「Magic-scoop-stack」並開啟 Pages
□ 電腦與手機都打得開，手機可「加到主畫面」
```

---

*祝開發順利 🍦 路線：先讓一顆球掉下來（M1）→ 做出可玩遊戲（~M5）→ 最後套上 PWA 外殼（M7）。*

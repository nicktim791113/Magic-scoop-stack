// ============================================================
// Magic Scoop Stack — 全域可調參數
// 改 GAME_CONFIG 任何一個值，重新整理頁面就能看到差異。
// ============================================================
const GAME_CONFIG = {
  // 畫布（內部解析度，DPR 在 main.js 處理）
  WIDTH: 420,
  HEIGHT: 720,

  // 物理
  GRAVITY_Y: 1.0,

  // 冰淇淋球
  SCOOP_RADIUS: 26,
  SCOOP_RESTITUTION: 0.05,   // 彈性低 → 不會彈跳
  SCOOP_FRICTION: 0.95,      // 摩擦高 → 咬得住下一顆
  SCOOP_FRICTION_STATIC: 1.0,
  SCOOP_FRICTION_AIR: 0.02,  // 空氣阻力 → 讓掉落不會無限加速
  SCOOP_DENSITY: 0.0018,     // 密度 → 重量與慣性
  SCOOP_SLOP: 0.02,
  // 註：scoop 的 inertia 在 physics.js 鎖成 Infinity，球不會自轉/滾動

  // 投放器（頂端左右擺盪）
  DROPPER_Y: 80,
  DROPPER_BASE_SPEED: 2.2,       // 每幀像素位移
  DROPPER_SPEED_PER_SCORE: 0.08, // 每多 1 分加多少速度
  DROPPER_MAX_SPEED: 6.0,
  DROPPER_MARGIN: 60,            // 左右邊界內縮
  DROPPER_VX_TRANSFER: 0.42,     // 放手瞬間水平速度繼承比例

  // 甜筒底座
  CONE_WIDTH: 110,
  CONE_HEIGHT: 90,
  CONE_TOP_WIDTH: 90,

  // 相機
  CAMERA_TOP_PADDING: 280,   // 鏡頭頂端與最高球距離
  CAMERA_BOTTOM_PADDING: 180,
  CAMERA_LERP: 0.06,         // 鏡頭平滑追隨（越小越柔和）
  CAMERA_MAX_DELTA: 6,       // 每幀相機最大位移上限（像素）→ 防止暴衝

  // 失敗判定
  FALL_OUT_OFFSET: 120,      // 球 y 超過鏡頭下緣多少視為掉光
  SETTLE_SPEED: 0.35,        // 速度低於此值視為「停下來」
  SETTLE_FRAMES: 30,         // 連續幾幀低於 SETTLE_SPEED 才算 settled
  TOWER_COLLAPSE_DROP: 90,   // 塔頂高度短時間驟降此值視為垮掉
  TOWER_COLLAPSE_FRAMES: 60, // 觀察視窗（幀）

  // 完美對齊加成
  PERFECT_THRESHOLD: 10,     // 水平偏移 ≤ 此值算 Perfect
  PERFECT_BONUS: 2,

  // 冰淇淋口味（顏色配色 — 球體 + 高光）
  FLAVORS: [
    { name: 'strawberry', body: '#ff8db3', hi: '#ffd0e0' },
    { name: 'matcha',     body: '#a6d49f', hi: '#dff0d8' },
    { name: 'blueberry',  body: '#9aa9ff', hi: '#cfd6ff' },
    { name: 'mango',      body: '#ffc26b', hi: '#ffe5b8' },
    { name: 'taro',       body: '#c3a4e0', hi: '#e6d6f5' },
    { name: 'chocolate',  body: '#a87248', hi: '#d9b18a' },
    { name: 'mint',       body: '#9be3d4', hi: '#d1f4ec' },
    { name: 'lemon',      body: '#ffe783', hi: '#fff3bd' },
  ],

  // 顏色
  COLORS: {
    SKY_TOP: '#fff5fb',
    SKY_BOTTOM: '#ffe1ef',
    GROUND: '#8a5a3b',
    CONE: '#d39158',
    CONE_DARK: '#a86a3a',
    DROPPER: '#ff9ecd',
    SHADOW: 'rgba(0,0,0,0.10)',
    TEXT: '#5a3a4a',
  },
};

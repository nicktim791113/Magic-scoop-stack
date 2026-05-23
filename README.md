# 🍦 Magic Scoop Stack 魔法疊疊冰

一款網頁版的物理堆疊小遊戲：頂端的冰淇淋球左右擺盪，**點擊 / 空白鍵放手**，球落到甜筒上自由堆疊。疊得越高分數越高，球掉出畫面或塔垮掉就 Game Over。

- 純前端：HTML + CSS + 原生 JS
- 物理引擎：[Matter.js](https://brm.io/matter-js/) 0.20.0（本地檔，PWA 離線可用）
- **PWA**：可加到主畫面、全螢幕、離線遊玩
- 部署：GitHub Pages 免費靜態托管，自帶 HTTPS

## 玩法

| 操作 | 動作 |
|------|------|
| 滑鼠左鍵 / 觸控點擊 / 空白鍵 / Enter | 放手 |
| 對齊下方那球（水平偏移 ≤ 10px） | **PERFECT +2** |

結束條件：任何球掉出畫面，或塔頂高度短時間驟降（塔垮）。

## 本機跑

PWA 需要 HTTP 環境（直接 `file://` 開無法註冊 Service Worker）。最簡單：

```bash
# 任選一個（在專案根目錄執行）
python -m http.server 8080
# 或
npx serve .
```

打開 <http://localhost:8080> 即可遊玩。

## PWA 驗證

Chrome DevTools → **Application** 分頁：

- **Manifest**：應出現名稱、圖示、theme color。
- **Service Workers**：`sw.js` 應顯示 **activated and is running**。
- **Cache Storage** → `magic-scoop-v1`：應列出所有 ASSETS。
- 按工具列的「Install」或手機選單的「加到主畫面」即可像 App 一樣全螢幕。

改版時記得把 `sw.js` 裡 `const CACHE = 'magic-scoop-v1'` 的版本號 +1，使用者下次開才會抓到新檔。

## 部署到 GitHub Pages

1. 在 GitHub 建立 **public** repo，命名 `Magic-scoop-stack`（**大小寫要一致**，PWA 路徑相關）。
2. push 此資料夾的所有檔案到 `main` 分支根目錄。
3. repo → **Settings → Pages** → Source 選 **Deploy from a branch**，Branch 選 `main` / `/ (root)`。
4. 等一兩分鐘，網址：`https://你的帳號.github.io/Magic-scoop-stack/`。
5. 用手機開 → 瀏覽器選單會出現「**加到主畫面**」。

> ⚠️ 子路徑陷阱：所有路徑（manifest.json、sw.js、圖示）都已用相對路徑 `./...`，不要改成 `/...`，否則 Service Worker 會註冊失敗。

## 檔案結構

```
Magic-scoop-stack/
├── index.html              入口、掛 canvas、連 manifest、註冊 SW
├── manifest.json           PWA：名稱、圖示、顏色、顯示模式
├── sw.js                   Service Worker：快取資源、離線運作
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── config.js           所有可調參數（重力、摩擦、球大小…）
│   ├── audio.js            Web Audio API 程式合成音效
│   ├── physics.js          Matter.js 世界、地面、甜筒、失敗偵測
│   ├── dropper.js          頂端擺盪投放器 + 放手邏輯
│   ├── game.js             狀態機、分數、相機、Perfect 加成
│   └── main.js             進入點、繪圖、主迴圈、輸入
├── lib/
│   └── matter.min.js       本地 Matter.js（離線快取用）
└── assets/
    └── icons/
        ├── icon-192.png
        ├── icon-512.png
        └── icon-512-maskable.png
```

## 調參數

所有手感都集中在 [js/config.js](js/config.js)。

| 參數 | 作用 |
|------|------|
| `SCOOP_RESTITUTION` | 彈性。**低**（0.05~0.2）才疊得住 |
| `SCOOP_FRICTION` | 摩擦。**高**（0.6~1.0）球才咬得住下一顆 |
| `SCOOP_DENSITY` | 密度。越大越重越穩，但搖晃慣性也大 |
| `DROPPER_BASE_SPEED` / `DROPPER_SPEED_PER_SCORE` | 投放器初速 + 每分加速。難度曲線在此 |
| `PERFECT_THRESHOLD` | Perfect 對齊容差（像素） |
| `TOWER_COLLAPSE_DROP` | 塔頂幾秒內下降多少視為垮台 |

## 開發里程碑

- [x] **M1** 環境搭建：球受重力掉落
- [x] **M2** 能堆疊：地面 + 甜筒，連續放球會自然堆起
- [x] **M3** 投放器與操作：頂端擺盪、放手掉落
- [x] **M4** 計分與相機：疊一顆 +1，塔變高鏡頭往上
- [x] **M5** 結束與重來：Game Over、localStorage 最高分
- [x] **M6** 美術與音效：程式繪製冰淇淋、Web Audio 合成音效、開始畫面、手機觸控
- [x] **M7** PWA 化：manifest + sw.js + 圖示，可安裝、可離線
- [x] **M8** 難度遞增、Perfect 對齊閃光 +2、README

---

🍦 Have fun stacking!

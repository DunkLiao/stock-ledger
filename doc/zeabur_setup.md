# 🚀 Zeabur 部署指南

本文說明如何將股票記帳軟體部署到 [Zeabur](https://zeabur.com) 平台。

---

## 前置準備

- GitHub 帳號，並將此專案推送上去
- [Zeabur](https://zeabur.com) 帳號（可用 GitHub 登入）
- 專案根目錄已包含 `Dockerfile`（Zeabur 會自動偵測）

---

## 步驟一：建立服務

1. 登入 Zeabur Dashboard
2. 點選 **New Service**
3. 選擇 **Deploy from GitHub**，授權 Zeabur 存取你的 repo
4. 選取此專案 repo

Zeabur 會自動偵測到根目錄的 `Dockerfile`，並開始建置。

---

## 步驟二：掛載 Volume（持久化資料庫）

由於 SQLite 資料庫檔案在容器重啟後會消失，需要掛載永續儲存：

1. 進入服務 → **Settings** → **Volumes**
2. 點選 **Add Volume**
3. 設定：
   | 欄位 | 值 |
   |---|---|
   | Mount Path | `/data` |
   | Volume Name | `stock-ledger-db`（可自訂） |

> `/data` 會對應 Dockerfile 中預先建立的目錄，DB 檔案將寫入此處。

---

## 步驟三：設定環境變數

進入服務 → **Settings** → **Environment Variables**，新增以下變數：

| 變數名稱 | 說明 | 範例值 |
|---|---|---|
| `DATABASE_PATH` | 資料庫檔案路徑 | `/data/stock_booking.db` |
| `AUTH_USERNAME` | 登入帳號 | `admin` |
| `AUTH_PASSWORD` | 登入密碼 | 請自行設定 |
| `AUTH_SECRET` | Token 簽署密鑰 | 隨機字串（建議 32 字元以上） |

⚠️ 請務必修改 `AUTH_PASSWORD` 和 `AUTH_SECRET`，不要使用預設值。

---

## 步驟四：部署

設定完成後，Zeabur 會自動重新部署。等待建置完成即可透過 Zeabur 提供的網址存取。

---

## 選用：綁定自有網域

1. 進入服務 → **Settings** → **Domain**
2. 點選 **Add Custom Domain**
3. 依指示在 DNS 服務商新增 CNAME 記錄

---

## 本機開發 vs 部署對照

| 項目 | 本機開發 | Zeabur 部署 |
|---|---|---|
| DB 路徑 | `./stock_booking.db`（自動 fallback） | `/data/stock_booking.db`（需設定 `DATABASE_PATH`） |
| 環境變數 | `.env.local` 檔案 | Zeabur Dashboard 設定 |
| 啟動方式 | `npm run dev` | Docker 容器內 `node server.js` |
| 持久化 | 本機檔案系統 | Zeabur Volume |

---

## 常見問題

### Q: 部署後資料會不見嗎？

不會。資料庫檔案寫在掛載的 Volume（`/data`）內，重新部署不會清除。

### Q: 如何備份資料？

1. 登入系統後，前往「備份管理」頁面
2. 點選「下載備份」，即可將 `.db` 檔案下載到本機
3. 若要還原，使用同頁面的「還原備份」功能上傳 `.db` 檔案

### Q: 建置失敗怎麼處理？

通常與 `better-sqlite3` 原生模組編譯有關。Dockerfile 已包含必要編譯工具（python3、make、g++），如仍失敗請檢查 Zeabur 建置日誌。

### Q: 如何查看日誌？

進入服務 → **Logs**，可即時查看應用程式輸出。

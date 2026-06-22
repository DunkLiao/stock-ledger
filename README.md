# 股票記帳軟體

台股交易記帳與資產追蹤工具，內建月報表及 PDF 匯出功能。

---

## 功能

| 頁面 | 說明 |
|---|---|
| **儀表板** | 總資產概覽、持股損益試算（即時股價、預估收入、預估損益、已領取股息） |
| **交易紀錄** | 股票買賣資料的新增、編輯、刪除 |
| **股利領息** | 股利發放記錄的新增、編輯、刪除，自動滾入交割戶餘額 |
| **匯入 CSV** | 批次匯入券商提供的交易明細 CSV |
| **月報表** | 選擇月份產生完整報表，一鍵下載 PDF 或列印 |
| **備份管理** | 下載 / 還原 / 重置 SQLite 資料庫，CSV 匯出 |

### 儀表板

- **帳戶總覽** — 交割戶餘額 + 持股市值 = 總資產
- **持股損益表** — 使用移動平均成本法計算，支援手動更新股價，已領取股息由股利記錄自動彙總顯示
- **預估損益** — 自動扣除手續費（可設折扣）及證交稅（股票 0.3% / ETF 0.1%）

### 股利領息

- 新增、編輯、刪除逐筆股利發放記錄
- 新增時自動將金額加入交割戶餘額，刪除時自動扣回，修改時差額調整
- 各股票累計股息由系統自動彙總，於儀表板及月報表中顯示

### 月報表

- 帳戶總覽、持股損益、本月交割戶收支三大區塊
- **列印預覽** — A4 橫式彈窗預覽，所見即所得
- **下載 PDF** — 一鍵匯出，自動分頁、保留紅綠色損益標示

---

## 快速開始

### 環境需求

- [Node.js](https://nodejs.org/) 18 以上
- npm（隨 Node.js 安裝）

### 安裝與啟動

```bash
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:3000` 即可使用。

### 設定登入帳密

複製 `.env.local` 並修改登入資訊：

```env
AUTH_USERNAME=admin
AUTH_PASSWORD=你的密碼
AUTH_SECRET=隨機字串（用於簽署登入 token）
```

> 若未設定 `DATABASE_PATH`，資料庫預設儲存在專案根目錄的 `stock_booking.db`。

---

## 部署

### 一般部署

```bash
npm run build
npm start
```

### Zeabur 部署

專案已包含 Dockerfile 與部署所需設定。詳細步驟請參閱 [doc/zeabur_setup.md](doc/zeabur_setup.md)。

簡要步驟：

1. 將專案推上 GitHub
2. Zeabur → New Service → 選擇 repo
3. 掛載 Volume 到 `/data`
4. 設定環境變數：`DATABASE_PATH=/data/stock_booking.db`、`AUTH_USERNAME`、`AUTH_PASSWORD`、`AUTH_SECRET`

---

## 技術架構

| 項目 | 說明 |
|---|---|
| 框架 | Next.js 16（App Router） |
| 語言 | TypeScript |
| 樣式 | Tailwind CSS v4 |
| 資料庫 | SQLite（better-sqlite3） |
| PDF 匯出 | html2canvas + jsPDF |
| CSV 解析 | PapaParse |
| 認證 | Token-based（HMAC-SHA256），middleware 攔截 |
| 部署 | Docker（含 standalone output） |

資料庫在首次啟動時自動建立，包含交易紀錄、股利記錄、股價快取、股息彙總、系統設定五張資料表。

---

## 專案結構

```
src/
├── app/
│   ├── page.tsx                # 儀表板
│   ├── layout.tsx              # 共版框架（導覽列 + 登出按鈕）
│   ├── globals.css             # 全域樣式 + 列印樣式
│   ├── login/
│   │   └── page.tsx            # 登入頁面
│   ├── report/
│   │   └── page.tsx            # 月報表
│   ├── transactions/
│   │   └── page.tsx            # 交易紀錄
│   ├── dividends/
│   │   └── page.tsx            # 股利領息
│   ├── import/
│   │   └── page.tsx            # 匯入 CSV
│   ├── backup/
│   │   └── page.tsx            # 備份管理
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts  # 登入 API
│       │   └── logout/route.ts # 登出 API
│       ├── backup/route.ts     # 備份下載 / 還原 / 重置
│       ├── config/route.ts     # 系統設定
│       ├── dashboard/route.ts  # 儀表板資料
│       ├── dividends/
│       │   ├── route.ts        # 股利列表 / 新增
│       │   └── [id]/route.ts   # 股利修改 / 刪除
│       ├── export/csv/route.ts # CSV 匯出
│       ├── import/route.ts     # CSV 匯入
│       ├── report/route.ts     # 月報表資料
│       ├── stock-price/route.ts # 即時股價
│       └── transactions/
│           ├── route.ts        # 交易列表 / 新增
│           └── [id]/route.ts   # 交易修改 / 刪除
├── components/
│   ├── LogoutButton.tsx        # 登出按鈕
│   └── PrintPreviewModal.tsx   # 列印預覽彈窗
└── lib/
    ├── auth.ts                 # 認證工具（token 簽署 / 驗證）
    ├── db.ts                   # 資料庫初始化
    ├── holdings.ts             # 移動平均成本計算
    └── types.ts                # TypeScript 型別定義
```

---

## 備份與重置

- **下載備份** — 將完整 SQLite 資料庫匯出為 `.db` 檔案（含交易、股利、股價、設定）
- **還原備份** — 上傳 `.db` 檔案取代現有資料庫，還原前自動備份
- **重置資料庫** — 清空所有交易、持股、股息及設定，還原為空白資料庫（需雙重確認）

---

## 設定說明

在儀表板點擊「設定」可調整：

- **交割戶餘額** — 手動輸入銀行交割戶的實際餘額（股利領息會自動加減此餘額）
- **手續費折扣** — 依券商折扣填入（例：3.5 折 = 0.35）

---

## CSV 匯入格式

支援中文或英文欄名，必要欄位：

| 中文欄名 | 英文欄名 | 說明 |
|---|---|---|
| 日期 | date | YYYY-MM-DD 或 YYYYMMDD |
| 股票代碼 | stock_code | 4 碼以上 |
| 股票名稱 | stock_name | |
| 買賣別 | type | 買進 / 賣出（或 buy / sell） |
| 股數 | quantity | 整數 |
| 成交單價 | price | |
| 手續費 | fee | 可為 0 |
| 交易稅 | tax | 可為 0 |
| 成交金額 | total_amount | |

---

## 列印與匯出

月報表提供兩種輸出方式：

- **預覽列印** → 瀏覽器列印對話框（可另存為 PDF）
- **下載 PDF** → 直接匯出 `.pdf` 檔案，自動分頁、保留紅綠損益顏色

---

## 開發指令

```bash
npm run dev      # 開發模式（localhost:3000）
npm run build    # 正式編譯
npm start        # 啟動正式伺服器
npm run lint     # 程式碼檢查
```

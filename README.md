# 📊 股票記帳軟體

一個簡潔的台股交易記帳與資產追蹤工具，內建月報表及 PDF 匯出功能。

---

## ✨ 功能

| 頁面 | 說明 |
|---|---|
| 📈 **儀表板** | 總資產概覽、持股損益試算（即時股價、預估收入、預估損益） |
| 📋 **交易紀錄** | 股票買賣資料的新增、編輯、刪除 |
| 📥 **匯入 CSV** | 批次匯入券商提供的交易明細 CSV |
| 📄 **月報表** | 選擇月份產生完整報表，一鍵下載 PDF 或列印 |

### 儀表板重點

- **帳戶總覽** — 交割戶餘額 + 持股市值 = 總資產
- **持股損益表** — 使用移動平均成本法計算，支援手動更新股價、記錄股息利息
- **預估損益** — 自動扣除手續費（可設折扣）及證交稅（股票 0.3% / ETF 0.1%）

### 月報表重點

- 帳戶總覽、持股損益、本月交割戶收支三大區塊
- **列印預覽** — A4 橫式彈窗預覽，所見即所得
- **下載 PDF** — 一鍵匯出，自動分頁、保留紅綠色損益標示

---

## 🚀 快速開始

### 環境需求

- [Node.js](https://nodejs.org/) 18 以上
- npm（隨 Node.js 安裝）

### 安裝與啟動

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

瀏覽器開啟 `http://localhost:3000` 即可使用。

### 正式部署

```bash
npm run build
npm start
```

---

## 🗄️ 技術架構

| 項目 | 說明 |
|---|---|
| 框架 | Next.js 16（App Router） |
| 語言 | TypeScript |
| 樣式 | Tailwind CSS v4 |
| 資料庫 | SQLite（better-sqlite3），儲存於 `stock_booking.db` |
| PDF 匯出 | html2canvas + jsPDF |
| CSV 解析 | PapaParse |

資料庫會在首次啟動時自動建立，包含交易紀錄、股價快取、股息記錄、系統設定四張資料表。

---

## 📂 專案結構

```
src/
├── app/
│   ├── page.tsx              # 儀表板
│   ├── layout.tsx            # 共版框架（導覽列）
│   ├── globals.css           # 全域樣式 + 列印樣式
│   ├── report/
│   │   └── page.tsx          # 月報表
│   ├── transactions/
│   │   └── page.tsx          # 交易紀錄
│   ├── import/
│   │   └── page.tsx          # 匯入 CSV
│   └── api/                  # API 路由
├── components/
│   └── PrintPreviewModal.tsx # 列印預覽彈窗
└── lib/
    ├── db.ts                 # 資料庫初始化
    └── types.ts              # TypeScript 型別定義
```

---

## ⚙️ 設定說明

在儀表板點擊「設定」可調整：

- **交割戶餘額** — 手動輸入銀行交割戶的實際餘額
- **手續費折扣** — 依券商折扣填入（例：3.5 折 = 0.35）

---

## 📝 CSV 匯入格式

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

## 🖨️ 列印與匯出

月報表提供兩種輸出方式：

- **預覽列印** → 瀏覽器列印對話框（可另存為 PDF）
- **下載 PDF** → 直接匯出 `.pdf` 檔案，自動分頁、保留紅綠損益顏色

---

## 🛠️ 開發指令

```bash
npm run dev      # 開發模式
npm run build    # 正式編譯
npm start        # 啟動正式伺服器
npm run lint     # 程式碼檢查
```

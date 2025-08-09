# BotLark v3

Bot Lark là một bot cho Lark với hệ thống economy và mini-game **World Boss** phong phú.

## ✨ Tính năng chính

### 💰 Economy
- `!balance` – kiểm tra số dư
- `!daily` – nhận thưởng hàng ngày
- `!transfer` – chuyển tiền giữa người dùng
- `!top` – bảng xếp hạng người giàu

### 🐉 World Boss (`!wb`)
Hệ thống game với nhiều tiểu lệnh:
- `info`, `map`, `hunt`, `pve`
- `inventory`, `equipment`, `shop`, `use`
- `quest`, `stats`, `pvp`, `rest`, `skill`

Mỗi tiểu lệnh được xử lý trong thư mục `modules/commands/wb/`.

### 🔧 Kỹ thuật
- Singleton **UserManager**
- **File locking** tránh race condition
- **Rate limiting** và **error handling** toàn diện
- Cấu hình qua environment variables

## 🚀 Cài đặt & Chạy bot
1. Clone repository và cài đặt:
   ```bash
   git clone <repo-url>
   cd larksuite_Bot
   npm install
   ```
2. Tạo file cấu hình môi trường:
   ```bash
   cp .env.example .env
   ```
   Cập nhật các biến: `APP_ID`, `APP_SECRET`, `ENCRYPT_KEY`, `VERIFY_TOKEN`, `PORT`.
3. Khởi động bot:
   ```bash
   # chế độ development
   npm run dev
   
   # chế độ production
   npm start
   ```

## 📁 Cấu trúc thư mục
```
.
├── data/                # dữ liệu người dùng
├── modules/
│   ├── commandHandler.js
│   ├── userManager.js
│   └── commands/
│       └── wb.js        # lệnh World Boss
├── index.js             # entry point
├── package.json
└── README.md
```

## 🤝 Đóng góp
1. Fork repo
2. Tạo branch mới và commit
3. Mở Pull Request mô tả thay đổi

## 📄 License
MIT License

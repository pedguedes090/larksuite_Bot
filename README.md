# BotLark v3 🤖

Bot Discord/Lark tự động với hệ thống economy và commands được tối ưu hóa.

## ✨ Tính năng

### 💰 Hệ thống Economy
- **Balance**: Kiểm tra số dư tiền
- **Daily**: Nhận tiền thưởng hàng ngày với streak bonus
- **Transfer**: Chuyển tiền giữa các user
- **Top**: Bảng xếp hạng người giàu nhất

### 🎮 Commands Khác
- **Ping**: Kiểm tra độ trễ
- **Profile**: Xem thông tin cá nhân
- **Stats**: Thống kê bot và hệ thống
- **Help**: Hướng dẫn sử dụng

### 🔧 Tính năng Kỹ thuật
- ✅ **Singleton Pattern**: UserManager tối ưu
- ✅ **File Locking**: Tránh race conditions
- ✅ **Rate Limiting**: Chống spam commands
- ✅ **Error Handling**: Xử lý lỗi toàn diện
- ✅ **Memory Management**: Auto cleanup
- ✅ **Environment Config**: Bảo mật credentials
- ✅ **Command Validation**: Input validation đầy đủ

## 🚀 Cài đặt

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd botlarkv3
```

### 2. Cài đặt Dependencies
```bash
npm install
```

### 3. Cấu hình Environment
Tạo file `.env` từ template:
```bash
cp .env.example .env
```

Cập nhật file `.env` với thông tin bot của bạn:
```env
APP_ID=your_app_id_here
APP_SECRET=your_app_secret_here
ENCRYPT_KEY=your_encrypt_key_here
VERIFY_TOKEN=your_verify_token_here
PORT=3000
NODE_ENV=development
```

### 4. Chạy Bot
```bash
# Development với auto-reload
npm run dev

# Production
npm start
```

## 📁 Cấu trúc Project

```
botlarkv3/
├── data/                   # User data storage
│   └── users.json         # User database (JSON)
├── modules/
│   ├── commandHandler.js  # Command processing logic
│   ├── userManager.js     # User data management
│   └── commands/          # Individual command files
│       ├── balance.js
│       ├── daily.js
│       ├── help.js
│       ├── ping.js
│       ├── profile.js
│       ├── stats.js
│       ├── top.js
│       └── transfer.js
├── index.js              # Main bot entry point
├── package.json          # Dependencies
└── README.md            # This file
```

## 🎮 Sử dụng Commands

Prefix mặc định: `!`

### Economy Commands
```
!balance          # Kiểm tra số dư
!daily            # Nhận tiền hàng ngày
!transfer user123 1000  # Chuyển 1000 xu cho user123
!top              # Xem top giàu có
!top 20           # Xem top 20
```

### Info Commands
```
!profile          # Xem thông tin cá nhân
!stats            # Thống kê bot
!ping             # Kiểm tra độ trễ
!help             # Danh sách commands
```

## 🔧 Tính năng Kỹ thuật

### Rate Limiting
Mỗi command có cooldown riêng:
- `ping`: 5 giây
- `help`: 3 giây  
- `balance`: 2 giây
- `transfer`: 10 giây
- Mặc định: 1 giây

### Error Handling
- Input validation đầy đủ
- Graceful error recovery
- Detailed error messages
- Auto-suggestion cho commands sai

### Performance Optimizations
- **Singleton UserManager**: Tránh tạo multiple instances
- **File Locking**: Atomic file operations
- **Debounced Saves**: Giảm I/O operations
- **Memory Cleanup**: Auto cleanup old data
- **Command Caching**: Faster command lookup

### Security
- Environment variables cho credentials
- Input sanitization
- Rate limiting
- Error message filtering

## 📊 Monitoring

### Health Check
```
GET /health
```
Response:
```json
{
  "status": "ok",
  "uptime": 3600
}
```

### Command Statistics
Được track tự động và hiển thị trong `!stats`

## 🔄 Development

### Thêm Command Mới
1. Tạo file trong `modules/commands/`
2. Export object với structure:
```javascript
export default {
  name: 'commandname',
  description: 'Command description',
  usage: '!commandname [args]',
  aliases: ['alias1', 'alias2'],
  
  async execute({ userId, args, chatId, client, prefix }) {
    // Command logic here
    return 'Response message';
  }
};
```

### Environment Variables
- `APP_ID`: Lark App ID
- `APP_SECRET`: Lark App Secret  
- `ENCRYPT_KEY`: Message encryption key
- `VERIFY_TOKEN`: Webhook verification token
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## 🐛 Troubleshooting

### Bot không response
1. Kiểm tra `.env` file
2. Xem logs trong console
3. Test endpoint `/health`

### Lỗi file permission
```bash
chmod 755 data/
```

### Memory issues
- Monitor với `!stats`
- Restart bot nếu cần

## 📝 Changelog

### v3.0.0 (Latest)
- ✅ Refactored architecture với singleton pattern
- ✅ Added comprehensive error handling
- ✅ Implemented rate limiting
- ✅ Added file locking mechanism
- ✅ Environment configuration
- ✅ Command validation & suggestions
- ✅ Memory leak fixes
- ✅ Performance optimizations

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push và tạo Pull Request

## 📄 License

MIT License - see LICENSE file for details. 
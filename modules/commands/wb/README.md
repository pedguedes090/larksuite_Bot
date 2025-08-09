# World Boss Developer Guide

Tệp `modules/commands/wb.js` là lệnh chính cho hệ thống World Boss. Nó định tuyến tới các tiểu lệnh nằm trong thư mục hiện tại.

## Cấu trúc
```
modules/commands/
├── wb.js            # dispatcher chính
└── wb/
    ├── info.js
    ├── map.js
    ├── hunt.js
    └── ...
```

## Thêm tiểu lệnh mới
1. Tạo file mới trong `modules/commands/wb/` và export hàm xử lý:
   ```javascript
   export default async function handleFoo({ userId, args }) {
     // logic tại đây
     return 'foo';
   }
   ```
2. Import và thêm case trong `wb.js`:
   ```javascript
   import handleFoo from './wb/foo.js';

   switch (subcommand) {
     case 'foo':
       return await handleFoo({ userId, args });
   }
   ```

## Tiện ích
- `userManager` trong `wb/utils.js` quản lý dữ liệu người chơi và đếm số lần dùng lệnh.
- Dữ liệu game lưu tại thư mục `worldboss_data/`.

## Lưu ý
- Giữ tên tiểu lệnh ngắn gọn; có thể thêm alias trong `switch`.
- Mọi hàm xử lý nên trả về chuỗi để bot gửi lại cho người dùng.

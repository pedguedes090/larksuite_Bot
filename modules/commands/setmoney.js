// modules/commands/setmoney.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'setmoney',
  description: 'Thiết lập số tiền cho user (admin only)',
  usage: '!setmoney <user_id> <amount>',
  aliases: ['sm', 'setcoin'],
  adminOnly: true, // Chỉ admin mới được dùng

  async execute({ userId, args }) {
    try {
      userManager.incrementCommandCount(userId);

      if (args.length < 2) {
        return `❌ **Thiếu thông tin!**
💡 **Cách dùng:** !setmoney <user_id> <amount>
📝 **Ví dụ:** !setmoney 4548471c 50000
🔢 **Số tiền:** Phải là số nguyên dương`;
      }

      const targetUserId = args[0].trim();
      const amountStr = args[1].trim();
      
      if (!targetUserId) {
        return `❌ **User ID không hợp lệ!**`;
      }

      // Kiểm tra và parse amount
      const amount = parseInt(amountStr);
      
      if (isNaN(amount)) {
        return `❌ **Số tiền không hợp lệ!**
🔢 **Nhập:** "${amountStr}"
💡 **Yêu cầu:** Phải là số nguyên`;
      }

      if (amount < 0) {
        return `❌ **Số tiền không thể âm!**
💡 **Số tiền tối thiểu:** 0 xu`;
      }

      if (amount > 999999999) {
        return `❌ **Số tiền quá lớn!**
💡 **Số tiền tối đa:** 999,999,999 xu`;
      }

      // Lấy thông tin user cũ để hiển thị
      const targetUser = userManager.getUser(targetUserId);
      const oldMoney = targetUser.money;

      // Set tiền mới
      const newMoney = userManager.setMoney(targetUserId, amount);

      return `✅ **Đã thiết lập tiền thành công!**
👤 **User:** ${targetUserId}
💰 **Tiền cũ:** ${oldMoney.toLocaleString('vi-VN')} xu
💎 **Tiền mới:** ${newMoney.toLocaleString('vi-VN')} xu
📊 **Thay đổi:** ${(newMoney - oldMoney).toLocaleString('vi-VN')} xu`;

    } catch (error) {
      console.error('❌ SetMoney command error:', error);
      return `❌ **Lỗi thiết lập tiền:** ${error.message}`;
    }
  }
}; 
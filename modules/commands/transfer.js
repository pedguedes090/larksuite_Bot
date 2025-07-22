// modules/commands/transfer.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'transfer',
  description: 'Chuyển tiền cho người khác',
  usage: '!transfer <user_id> <số_tiền>',
  aliases: ['send', 'give'],

  async execute({ userId, args, client, chatId }) {
    try {
      userManager.incrementCommandCount(userId);

      // Validation arguments
      if (args.length < 2) {
        return `❌ **Cú pháp sai!**
📝 **Cách dùng:** !transfer <user_id> <số_tiền>
💡 **Ví dụ:** !transfer user123 1000`;
      }

      const targetUserId = args[0].trim();
      const amountStr = args[1].trim();

      // Validation target user
      if (!targetUserId || targetUserId.length < 3) {
        return '❌ **User ID không hợp lệ!** (tối thiểu 3 ký tự)';
      }

      if (targetUserId === userId) {
        return '❌ **Không thể chuyển tiền cho chính mình!**';
      }

      // Validation amount
      const amount = parseInt(amountStr);
      if (isNaN(amount) || amount <= 0) {
        return '❌ **Số tiền không hợp lệ!** (phải là số nguyên dương)';
      }

      if (amount < 10) {
        return '❌ **Số tiền tối thiểu là 10 xu!**';
      }

      if (amount > 1000000) {
        return '❌ **Số tiền tối đa là 1,000,000 xu mỗi lần!**';
      }

      // Check sender balance
      const sender = userManager.getUser(userId);
      if (sender.money < amount) {
        return `❌ **Không đủ tiền!**
💰 **Số dư của bạn:** ${sender.money.toLocaleString('vi-VN')} xu
💸 **Cần:** ${amount.toLocaleString('vi-VN')} xu`;
      }

      // Execute transfer
      userManager.updateMoney(userId, -amount);
      userManager.updateMoney(targetUserId, amount);

      const newBalance = userManager.getUser(userId).money;

      return `✅ **Chuyển tiền thành công!**
💸 **Đã chuyển:** ${amount.toLocaleString('vi-VN')} xu
👤 **Người nhận:** ${targetUserId}
💰 **Số dư còn lại:** ${newBalance.toLocaleString('vi-VN')} xu`;

    } catch (error) {
      console.error('❌ Transfer command error:', error.message);
      return `❌ **Lỗi thực hiện chuyển tiền:** ${error.message}`;
    }
  }
}; 
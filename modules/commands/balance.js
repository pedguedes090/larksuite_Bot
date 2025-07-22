// modules/commands/balance.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'balance',
  description: 'Kiểm tra số tiền của bạn',
  usage: '!balance',
  aliases: ['bal', 'money'],

  async execute({ userId, args }) {
    const user = userManager.getUser(userId);
    userManager.incrementCommandCount(userId);

    return `💰 **Số dư của bạn:** ${user.money.toLocaleString('vi-VN')} xu
📅 **Tham gia từ:** ${new Date(user.joinDate).toLocaleDateString('vi-VN')}
🎮 **Đã dùng:** ${user.commandCount} lệnh`;
  }
}; 
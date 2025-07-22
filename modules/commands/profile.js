// modules/commands/profile.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'profile',
  description: 'Xem thông tin hồ sơ của bạn',
  usage: '!profile',
  aliases: ['me', 'info'],

  async execute({ userId, args }) {
    const user = userManager.getUser(userId);
    userManager.incrementCommandCount(userId);

    const joinDate = new Date(user.joinDate);
    const lastActive = new Date(user.lastActive);
    const daysSinceJoin = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

    return `👤 **Hồ sơ của bạn**
🆔 **User ID:** ${userId}
💰 **Số tiền:** ${user.money.toLocaleString('vi-VN')} xu
📅 **Tham gia:** ${joinDate.toLocaleDateString('vi-VN')} (${daysSinceJoin} ngày)
⏰ **Hoạt động cuối:** ${lastActive.toLocaleString('vi-VN')}
🎮 **Lệnh đã dùng:** ${user.commandCount}`;
  }
}; 
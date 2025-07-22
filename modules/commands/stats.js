// modules/commands/stats.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'stats',
  description: 'Xem thống kê hệ thống (admin only)',
  usage: '!stats',
  aliases: ['statistics'],
  adminOnly: true, // Chỉ admin mới được dùng

  async execute({ userId, userManager }) {
    try {
      userManager.incrementCommandCount(userId);
      
      const stats = userManager.getStats();
      const admins = userManager.getAdmins();
      
      let response = `📊 **THỐNG KÊ HỆ THỐNG**\n\n`;
      response += `👥 **Tổng users:** ${stats.totalUsers}\n`;
      response += `🔐 **Tổng admins:** ${stats.totalAdmins}\n`;
      response += `💰 **Tổng tiền:** ${stats.totalMoney.toLocaleString('vi-VN')} xu\n`;
      response += `🎮 **Tổng lệnh đã dùng:** ${stats.totalCommands}\n`;
      response += `📈 **Tiền TB/user:** ${stats.avgMoney.toLocaleString('vi-VN')} xu\n\n`;
      
      if (admins.length > 0) {
        response += `🔐 **DANH SÁCH ADMIN:**\n`;
        admins.forEach((admin, index) => {
          response += `${index + 1}. ${admin.userId} (${admin.money.toLocaleString('vi-VN')} xu)\n`;
        });
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Stats command error:', error);
      return `❌ **Lỗi lấy thống kê:** ${error.message}`;
    }
  }
}; 
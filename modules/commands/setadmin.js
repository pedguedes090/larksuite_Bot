// modules/commands/setadmin.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'setadmin',
  description: 'Cấp quyền admin cho user (admin only)',
  usage: '!setadmin <user_id>',
  aliases: ['addadmin', 'grantadmin'],
  adminOnly: true, // Chỉ admin mới được dùng

  async execute({ userId, args, userManager }) {
    try {
      userManager.incrementCommandCount(userId);

      if (args.length < 1) {
        return `❌ **Thiếu thông tin!**\n💡 **Cách dùng:** !setadmin <user_id>\n📝 **Ví dụ:** !setadmin 4548471c`;
      }

      const targetUserId = args[0].trim();
      
      if (!targetUserId) {
        return `❌ **User ID không hợp lệ!**`;
      }

      // Kiểm tra user đã tồn tại chưa
      const targetUser = userManager.getUser(targetUserId);
      
      // Kiểm tra xem đã là admin chưa
      if (userManager.isAdmin(targetUserId)) {
        return `⚠️ **User ${targetUserId} đã là admin rồi!**`;
      }

      // Cấp quyền admin
      userManager.setAdmin(targetUserId, true);

      return `✅ **Đã cấp quyền admin thành công!**\n🔐 **User:** ${targetUserId}\n🎉 **User này giờ có thể sử dụng các lệnh admin.**`;

    } catch (error) {
      console.error('❌ SetAdmin command error:', error);
      return `❌ **Lỗi cấp quyền admin:** ${error.message}`;
    }
  }
}; 
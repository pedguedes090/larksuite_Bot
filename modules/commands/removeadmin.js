// modules/commands/removeadmin.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'removeadmin',
  description: 'Thu hồi quyền admin từ user (admin only)',
  usage: '!removeadmin <user_id>',
  aliases: ['deladmin', 'revokeadmin'],
  adminOnly: true, // Chỉ admin mới được dùng

  async execute({ userId, args, userManager }) {
    try {
      userManager.incrementCommandCount(userId);

      if (args.length < 1) {
        return `❌ **Thiếu thông tin!**\n💡 **Cách dùng:** !removeadmin <user_id>\n📝 **Ví dụ:** !removeadmin 4548471c`;
      }

      const targetUserId = args[0].trim();
      
      if (!targetUserId) {
        return `❌ **User ID không hợp lệ!**`;
      }

      // Không cho phép tự thu hồi quyền admin của chính mình
      if (targetUserId === userId) {
        return `❌ **Bạn không thể thu hồi quyền admin của chính mình!**\n💡 **Để tránh tình huống mất hết admin trong hệ thống.**`;
      }

      // Kiểm tra user có tồn tại không
      const targetUser = userManager.getUser(targetUserId);
      
      // Kiểm tra xem có phải admin không
      if (!userManager.isAdmin(targetUserId)) {
        return `⚠️ **User ${targetUserId} không phải là admin!**`;
      }

      // Thu hồi quyền admin
      userManager.setAdmin(targetUserId, false);

      return `✅ **Đã thu hồi quyền admin thành công!**\n👤 **User:** ${targetUserId}\n📝 **User này giờ chỉ có thể dùng lệnh thông thường.**`;

    } catch (error) {
      console.error('❌ RemoveAdmin command error:', error);
      return `❌ **Lỗi thu hồi quyền admin:** ${error.message}`;
    }
  }
}; 
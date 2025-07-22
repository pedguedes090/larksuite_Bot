// modules/commands/reload.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'reload',
  description: 'Load lại tất cả lệnh (admin only)',
  usage: '!reload',
  aliases: ['reloadcommands', 'rl'],
  adminOnly: true, // Chỉ admin mới được dùng

  async execute({ userId, chatId, client, userManager, commandHandler }) {
    try {
      userManager.incrementCommandCount(userId);

      // Gửi thông báo bắt đầu reload
      await client.im.message.create({
        params: { receive_id_type: 'chat_id' },
        data: {
          receive_id: chatId,
          content: JSON.stringify({ text: '🔄 **Đang reload commands...** Vui lòng chờ...' }),
          msg_type: 'text',
        },
      });

      console.log(`🔄 Commands reload requested by admin: ${userId}`);

      // Thực hiện reload commands
      const reloadResult = await commandHandler.reloadCommands();
      
      if (reloadResult.success) {
        return `✅ **Reload commands thành công!**

📁 **Commands trước:** ${reloadResult.oldCount}
📁 **Commands sau:** ${reloadResult.newCount}
🎮 **Unique commands:** ${reloadResult.uniqueCommands}

🚀 **Tất cả lệnh đã được load lại và sẵn sàng sử dụng!**`;
      } else {
        return `❌ **Reload commands thất bại!**

🔴 **Lỗi:** ${reloadResult.error}

💡 **Gợi ý:** Sử dụng \`!restart\` để khởi động lại bot.`;
      }

    } catch (error) {
      console.error('❌ Reload command error:', error);
      return `❌ **Lỗi reload commands:** ${error.message}`;
    }
  }
}; 
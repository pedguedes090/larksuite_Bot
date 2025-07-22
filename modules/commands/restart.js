// modules/commands/restart.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'restart',
  description: 'Khởi động lại bot (chỉ admin)',
  usage: '!restart',
  aliases: ['reboot'],
  adminOnly: true, // Chỉ admin mới được dùng

  async execute({ userId, args, chatId, client, userManager }) {
    try {
      userManager.incrementCommandCount(userId);

      // Send confirmation message first
      await client.im.message.create({
        params: { receive_id_type: 'chat_id' },
        data: {
          receive_id: chatId,
          content: JSON.stringify({ text: '🔄 **Đang khởi động lại bot...** Vui lòng chờ 5-10 giây.' }),
          msg_type: 'text',
        },
      });

      console.log(`🔄 Bot restart requested by admin: ${userId}`);

      // Cleanup before restart
      await userManager.cleanup();

      // Exit process (assuming you're using a process manager like PM2 or nodemon)
      setTimeout(() => {
        process.exit(0);
      }, 1000);

      return null; // Don't send response as we're restarting

    } catch (error) {
      console.error('❌ Restart command error:', error);
      return `❌ **Lỗi restart:** ${error.message}`;
    }
  }
}; 
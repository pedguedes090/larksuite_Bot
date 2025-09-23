// modules/commands/menu.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'menu',
  description: 'Hiển thị menu tương tác của bot',
  usage: '!menu [create|remove]',
  aliases: ['botmenu', 'interactive'],

  async execute({ userId, args, chatId, client }) {
    try {
      userManager.incrementCommandCount(userId);

      const subcommand = args[0]?.toLowerCase();

      switch (subcommand) {
        case 'create':
        case 'add':
          return await this.createBotMenu(client, chatId);
        
        case 'remove':
        case 'delete':
          return await this.removeBotMenu(client, chatId);
          
        default:
          return this.showMenuInfo();
      }

    } catch (error) {
      console.error('❌ Menu command error:', error);
      return `❌ **Lỗi menu:** ${error.message}`;
    }
  },

  showMenuInfo() {
    return `🔘 **BOT MENU SYSTEM**

📋 **Thông tin:**
Bot hỗ trợ menu tương tác để dễ dàng sử dụng các tính năng phổ biến.

🎯 **Menu có sẵn:**
• **Help** - Xem hướng dẫn
• **Daily** - Nhận tiền hàng ngày  
• **Balance** - Kiểm tra số dư
• **World Boss** - Khám phá game

⚡ **Sử dụng:**
• \`!menu create\` - Tạo menu tương tác
• \`!menu remove\` - Xóa menu

💡 **Lưu ý:** Menu sẽ xuất hiện dưới dạng các nút có thể nhấn để thực hiện lệnh nhanh chóng.`;
  },

  async createBotMenu(client, chatId) {
    try {
      const menuConfig = {
        chat_id: chatId,
        menu_tree: [
          {
            "menu_key": "help",
            "menu_name": "📋 Help",
            "menu_icon": {
              "icon_key": "help_filled"
            }
          },
          {
            "menu_key": "daily", 
            "menu_name": "💰 Daily",
            "menu_icon": {
              "icon_key": "money_bag_filled"
            }
          },
          {
            "menu_key": "balance",
            "menu_name": "💳 Balance", 
            "menu_icon": {
              "icon_key": "wallet_filled"
            }
          },
          {
            "menu_key": "worldboss",
            "menu_name": "⚔️ World Boss",
            "menu_icon": {
              "icon_key": "game_filled"
            }
          }
        ]
      };

      const response = await client.application.bot.menu.create(menuConfig);
      
      if (response.code === 0) {
        console.log('✅ Bot menu created successfully');
        return `✅ **Menu đã được tạo thành công!**

🔘 Bạn có thể thấy menu tương tác trong chat này. Nhấn vào các nút để sử dụng tính năng nhanh chóng.

📋 **Menu có sẵn:**
• 📋 Help - Xem hướng dẫn
• 💰 Daily - Nhận tiền hàng ngày
• 💳 Balance - Kiểm tra số dư  
• ⚔️ World Boss - Khám phá game`;
      } else {
        console.error('❌ Failed to create bot menu:', response);
        return `❌ **Không thể tạo menu:** ${response.msg || 'Lỗi không xác định'}`;
      }

    } catch (error) {
      console.error('❌ Error creating bot menu:', error);
      return `❌ **Lỗi tạo menu:** ${error.message}`;
    }
  },

  async removeBotMenu(client, chatId) {
    try {
      const response = await client.application.bot.menu.delete({
        chat_id: chatId
      });
      
      if (response.code === 0) {
        console.log('✅ Bot menu removed successfully');
        return `✅ **Menu đã được xóa thành công!**

Menu tương tác đã bị gỡ bỏ khỏi chat này. Bạn có thể sử dụng \`!menu create\` để tạo lại.`;
      } else {
        console.error('❌ Failed to remove bot menu:', response);
        return `❌ **Không thể xóa menu:** ${response.msg || 'Lỗi không xác định'}`;
      }

    } catch (error) {
      console.error('❌ Error removing bot menu:', error);
      return `❌ **Lỗi xóa menu:** ${error.message}`;
    }
  }
};
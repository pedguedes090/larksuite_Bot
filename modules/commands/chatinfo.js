// modules/commands/chatinfo.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'chatinfo',
  description: 'Hiển thị thông tin về chat và thành viên',
  usage: '!chatinfo [members|activity]',
  aliases: ['chat', 'members'],

  async execute({ userId, args, chatId, client }) {
    try {
      userManager.incrementCommandCount(userId);

      const subcommand = args[0]?.toLowerCase();

      switch (subcommand) {
        case 'members':
        case 'list':
          return await this.getChatMembers(client, chatId);
        
        case 'activity':
        case 'stats':
          return await this.getChatActivity(chatId);
          
        default:
          return await this.getChatInfo(client, chatId);
      }

    } catch (error) {
      console.error('❌ ChatInfo command error:', error);
      return `❌ **Lỗi chat info:** ${error.message}`;
    }
  },

  async getChatInfo(client, chatId) {
    try {
      const chatInfo = await client.im.chat.get({
        params: { chat_id: chatId }
      });

      if (chatInfo.code !== 0) {
        return `❌ **Không thể lấy thông tin chat:** ${chatInfo.msg}`;
      }

      const chat = chatInfo.data;
      const chatName = chat.name || 'Không có tên';
      const chatType = this.getChatTypeDisplay(chat.chat_type);
      const memberCount = chat.member_count || 0;

      return `💬 **THÔNG TIN CHAT**

📋 **Chi tiết:**
• **Tên chat:** ${chatName}
• **Loại:** ${chatType}
• **ID:** \`${chatId}\`
• **Số thành viên:** ${memberCount}

🎮 **Bot statistics:**
• **Users đã đăng ký:** ${this.getRegisteredUsersCount()}
• **Commands khả dụng:** ${global.commandHandler?.getCommands(0).length || 0}

⚡ **Sử dụng:**
• \`!chatinfo members\` - Xem danh sách thành viên
• \`!chatinfo activity\` - Xem hoạt động chat`;

    } catch (error) {
      console.error('❌ Error getting chat info:', error);
      return `❌ **Lỗi lấy thông tin chat:** ${error.message}`;
    }
  },

  async getChatMembers(client, chatId) {
    try {
      const membersInfo = await client.im.chat.members.get({
        params: { 
          chat_id: chatId,
          page_size: 50 
        }
      });

      if (membersInfo.code !== 0) {
        return `❌ **Không thể lấy danh sách thành viên:** ${membersInfo.msg}`;
      }

      const members = membersInfo.data?.items || [];
      const totalMembers = members.length;
      
      let response = `👥 **DANH SÁCH THÀNH VIÊN** (${totalMembers})\n\n`;

      if (totalMembers === 0) {
        response += '❌ Không có thành viên nào trong chat này';
        return response;
      }

      // Count registered users
      let registeredCount = 0;
      let adminCount = 0;

      for (const member of members.slice(0, 20)) { // Limit to 20 for display
        const userId = member.member_id;
        const isRegistered = userManager.userExists(userId);
        const isAdmin = isRegistered ? userManager.isAdmin(userId) : false;
        
        if (isRegistered) registeredCount++;
        if (isAdmin) adminCount++;

        const status = isAdmin ? '👑 Admin' : isRegistered ? '✅ Registered' : '❌ Guest';
        response += `• \`${userId}\` - ${status}\n`;
      }

      if (totalMembers > 20) {
        response += `\n... và ${totalMembers - 20} thành viên khác`;
      }

      response += `\n\n📊 **Thống kê:**
• **Đã đăng ký:** ${registeredCount}/${totalMembers}
• **Admins:** ${adminCount}
• **Guests:** ${totalMembers - registeredCount}`;

      return response;

    } catch (error) {
      console.error('❌ Error getting chat members:', error);
      return `❌ **Lỗi lấy danh sách thành viên:** ${error.message}`;
    }
  },

  async getChatActivity(chatId) {
    try {
      const eventHandler = global.botEventHandler;
      if (!eventHandler) {
        return '❌ **Event handler không khả dụng**';
      }

      const eventStats = eventHandler.getEventStats();
      const totalEvents = Object.values(eventStats).reduce((sum, count) => sum + count, 0);

      let response = `📊 **HOẠT ĐỘNG CHAT**\n\n`;
      response += `🔢 **Tổng events:** ${totalEvents.toLocaleString()}\n\n`;

      response += `📋 **Chi tiết events:**\n`;
      for (const [eventType, count] of Object.entries(eventStats)) {
        const emoji = this.getEventEmoji(eventType);
        response += `${emoji} ${this.getEventDescription(eventType)}: ${count.toLocaleString()}\n`;
      }

      response += `\n💡 **Ghi chú:** Thống kê này bao gồm tất cả hoạt động của bot trên server, không chỉ riêng chat này.`;

      return response;

    } catch (error) {
      console.error('❌ Error getting chat activity:', error);
      return `❌ **Lỗi lấy hoạt động chat:** ${error.message}`;
    }
  },

  getChatTypeDisplay(chatType) {
    const typeMap = {
      'p2p': '💬 Chat riêng',
      'group': '👥 Group chat',
      'supergroup': '🏢 Super group',
      'thread': '🧵 Thread'
    };
    return typeMap[chatType] || '❓ Không xác định';
  },

  getRegisteredUsersCount() {
    try {
      const allUsers = userManager.getAllUsers();
      return Object.keys(allUsers).length;
    } catch (error) {
      return 0;
    }
  },

  getEventEmoji(eventType) {
    const emojiMap = {
      'im.message.receive_v1': '💬',
      'im.chat.member.user.added_v1': '👋',
      'im.chat.member.user.deleted_v1': '👋',
      'im.message.message_read_v1': '👁️',
      'application.bot.menu_v6': '🔘',
      'contact.user.created_v3': '👤'
    };
    return emojiMap[eventType] || '📋';
  },

  getEventDescription(eventType) {
    const descMap = {
      'im.message.receive_v1': 'Messages',
      'im.chat.member.user.added_v1': 'User joins',
      'im.chat.member.user.deleted_v1': 'User leaves',
      'im.message.message_read_v1': 'Message reads',
      'application.bot.menu_v6': 'Menu clicks',
      'contact.user.created_v3': 'New users'
    };
    return descMap[eventType] || 'Unknown';
  }
};
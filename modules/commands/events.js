// modules/commands/events.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'events',
  description: 'Xem thống kê và quản lý events của bot (admin only)',
  usage: '!events [stats|handlers]',
  aliases: ['eventstats'],
  adminOnly: true,

  async execute({ userId, args, commandHandler }) {
    try {
      userManager.incrementCommandCount(userId);

      // Get event handler from the bot instance
      const eventHandler = global.botEventHandler;
      if (!eventHandler) {
        return '❌ **Event handler chưa được khởi tạo**';
      }

      const subcommand = args[0]?.toLowerCase();

      switch (subcommand) {
        case 'stats':
        case 'statistics':
          return this.showEventStats(eventHandler);
        
        case 'handlers':
        case 'list':
          return this.showEventHandlers(eventHandler);
          
        default:
          return this.showEventOverview(eventHandler);
      }

    } catch (error) {
      console.error('❌ Events command error:', error);
      return `❌ **Lỗi hệ thống:** ${error.message}`;
    }
  },

  showEventOverview(eventHandler) {
    const stats = eventHandler.getEventStats();
    const totalEvents = Object.values(stats).reduce((sum, count) => sum + count, 0);
    const uniqueEvents = Object.keys(stats).length;

    return `📊 **TỔNG QUAN EVENT SYSTEM**

🔢 **Thống kê:**
• **Tổng events xử lý:** ${totalEvents.toLocaleString()}
• **Loại events:** ${uniqueEvents}
• **Handlers đang hoạt động:** ${Object.keys(eventHandler.getEventHandlers()).length}

📋 **Sử dụng:**
• \`!events stats\` - Xem thống kê chi tiết
• \`!events handlers\` - Xem danh sách handlers

🎯 **Events được hỗ trợ:**
✅ Message receive (text, media)
✅ User join/leave chat  
✅ Message read tracking
✅ Bot menu interactions
✅ New user registration`;
  },

  showEventStats(eventHandler) {
    const stats = eventHandler.getEventStats();
    
    if (Object.keys(stats).length === 0) {
      return '📊 **THỐNG KÊ EVENTS**\n\n❌ Chưa có events nào được xử lý';
    }

    let response = '📊 **THỐNG KÊ EVENTS CHI TIẾT**\n\n';
    
    // Sort by count descending
    const sortedStats = Object.entries(stats)
      .sort(([,a], [,b]) => b - a);

    for (const [eventType, count] of sortedStats) {
      const emoji = this.getEventEmoji(eventType);
      const description = this.getEventDescription(eventType);
      response += `${emoji} **${description}**\n   Đã xử lý: ${count.toLocaleString()} lần\n\n`;
    }

    const totalEvents = Object.values(stats).reduce((sum, count) => sum + count, 0);
    response += `🔢 **Tổng cộng:** ${totalEvents.toLocaleString()} events`;

    return response;
  },

  showEventHandlers(eventHandler) {
    const handlers = eventHandler.getEventHandlers();
    
    let response = '🔧 **DANH SÁCH EVENT HANDLERS**\n\n';
    
    for (const [eventType, handler] of Object.entries(handlers)) {
      const emoji = this.getEventEmoji(eventType);
      const description = this.getEventDescription(eventType);
      const status = typeof handler === 'function' ? '✅ Hoạt động' : '❌ Lỗi';
      
      response += `${emoji} **${eventType}**\n   ${description}\n   Trạng thái: ${status}\n\n`;
    }

    return response;
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
      'im.message.receive_v1': 'Nhận tin nhắn',
      'im.chat.member.user.added_v1': 'User tham gia chat',
      'im.chat.member.user.deleted_v1': 'User rời khỏi chat',
      'im.message.message_read_v1': 'Đọc tin nhắn',
      'application.bot.menu_v6': 'Tương tác menu bot',
      'contact.user.created_v3': 'Tạo user mới'
    };
    return descMap[eventType] || 'Event không xác định';
  }
};
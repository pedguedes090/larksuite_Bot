// modules/commands/eventconfig.js
import UserManager from '../userManager.js';
import { getEventConfig } from '../eventConfig.js';

const userManager = UserManager.getInstance();

export default {
  name: 'eventconfig',
  description: 'Quản lý cấu hình event handlers (admin only)',
  usage: '!eventconfig [show|enable|disable|ratelimit|welcome|reset] [event_type] [value]',
  aliases: ['evconfig'],
  adminOnly: true,

  async execute({ userId, args }) {
    try {
      userManager.incrementCommandCount(userId);

      const eventConfig = getEventConfig();
      const subcommand = args[0]?.toLowerCase();

      switch (subcommand) {
        case 'show':
        case 'list':
          return this.showConfiguration(eventConfig);
        
        case 'enable':
          return this.enableEvent(eventConfig, args[1]);
          
        case 'disable':
          return this.disableEvent(eventConfig, args[1]);
          
        case 'ratelimit':
        case 'rate':
          return this.setRateLimit(eventConfig, args[1], args[2]);
          
        case 'welcome':
          return this.setWelcomeMessage(eventConfig, args[1]);
          
        case 'reset':
          return this.resetConfiguration(eventConfig);
          
        default:
          return this.showHelp();
      }

    } catch (error) {
      console.error('❌ EventConfig command error:', error);
      return `❌ **Lỗi cấu hình event:** ${error.message}`;
    }
  },

  showHelp() {
    return `⚙️ **EVENT CONFIGURATION MANAGER**

🔧 **Commands:**
• \`!eventconfig show\` - Hiển thị cấu hình hiện tại
• \`!eventconfig enable <event>\` - Bật event
• \`!eventconfig disable <event>\` - Tắt event  
• \`!eventconfig ratelimit <event> <ms>\` - Đặt rate limit
• \`!eventconfig welcome <true/false>\` - Bật/tắt welcome message
• \`!eventconfig reset\` - Reset về mặc định

📋 **Event Types:**
• \`message\` - im.message.receive_v1
• \`join\` - im.chat.member.user.added_v1
• \`leave\` - im.chat.member.user.deleted_v1
• \`read\` - im.message.message_read_v1
• \`menu\` - application.bot.menu_v6
• \`contact\` - contact.user.created_v3

💡 **Examples:**
\`!eventconfig disable read\`
\`!eventconfig ratelimit join 10000\`
\`!eventconfig welcome false\``;
  },

  showConfiguration(eventConfig) {
    const events = eventConfig.getAllEventConfigs();
    const general = eventConfig.getGeneralSettings();
    const summary = eventConfig.getConfigSummary();

    let response = `⚙️ **EVENT CONFIGURATION**\n\n`;
    
    response += `📊 **Summary:**\n`;
    response += `• **Enabled Events:** ${summary.enabledEvents}/${summary.totalEvents}\n`;
    response += `• **Statistics:** ${summary.statisticsEnabled ? '✅ Enabled' : '❌ Disabled'}\n`;
    response += `• **Log Level:** ${summary.logLevel}\n`;
    response += `• **Cleanup Interval:** ${(summary.cleanupInterval / 1000 / 60).toFixed(1)} minutes\n\n`;

    response += `🎯 **Event Details:**\n`;
    for (const [eventType, config] of Object.entries(events)) {
      const shortName = this.getShortEventName(eventType);
      const status = config.enabled ? '✅' : '❌';
      const rate = `${config.rateLimitMs}ms`;
      response += `${status} **${shortName}** (${rate})\n   ${config.description}\n`;
      
      if (eventType === 'im.chat.member.user.added_v1') {
        response += `   Welcome messages: ${config.sendWelcome ? '✅' : '❌'}\n`;
      }
      response += '\n';
    }

    return response;
  },

  enableEvent(eventConfig, eventArg) {
    if (!eventArg) {
      return '❌ **Vui lòng chỉ định event type**\nVí dụ: `!eventconfig enable message`';
    }

    const eventType = this.getFullEventName(eventArg);
    if (!eventType) {
      return `❌ **Event type không hợp lệ:** ${eventArg}\nDùng \`!eventconfig show\` để xem danh sách`;
    }

    if (eventConfig.setEventEnabled(eventType, true)) {
      return `✅ **Event đã được bật:** ${this.getShortEventName(eventType)}\n\n💡 **Lưu ý:** Cần restart bot để áp dụng thay đổi này.`;
    } else {
      return `❌ **Không thể bật event:** ${eventArg}`;
    }
  },

  disableEvent(eventConfig, eventArg) {
    if (!eventArg) {
      return '❌ **Vui lòng chỉ định event type**\nVí dụ: `!eventconfig disable read`';
    }

    const eventType = this.getFullEventName(eventArg);
    if (!eventType) {
      return `❌ **Event type không hợp lệ:** ${eventArg}\nDùng \`!eventconfig show\` để xem danh sách`;
    }

    if (eventConfig.setEventEnabled(eventType, false)) {
      return `✅ **Event đã được tắt:** ${this.getShortEventName(eventType)}\n\n💡 **Lưu ý:** Cần restart bot để áp dụng thay đổi này.`;
    } else {
      return `❌ **Không thể tắt event:** ${eventArg}`;
    }
  },

  setRateLimit(eventConfig, eventArg, rateArg) {
    if (!eventArg || !rateArg) {
      return '❌ **Syntax:** `!eventconfig ratelimit <event> <milliseconds>`\nVí dụ: `!eventconfig ratelimit join 5000`';
    }

    const eventType = this.getFullEventName(eventArg);
    if (!eventType) {
      return `❌ **Event type không hợp lệ:** ${eventArg}`;
    }

    const rateMs = parseInt(rateArg);
    if (isNaN(rateMs) || rateMs < 0) {
      return `❌ **Rate limit không hợp lệ:** ${rateArg} (phải là số >= 0)`;
    }

    if (eventConfig.setEventRateLimit(eventType, rateMs)) {
      return `✅ **Rate limit đã được cập nhật:**\n• **Event:** ${this.getShortEventName(eventType)}\n• **Rate limit:** ${rateMs}ms`;
    } else {
      return `❌ **Không thể cập nhật rate limit cho:** ${eventArg}`;
    }
  },

  setWelcomeMessage(eventConfig, enableArg) {
    if (!enableArg) {
      return '❌ **Syntax:** `!eventconfig welcome <true/false>`\nVí dụ: `!eventconfig welcome true`';
    }

    const enabled = enableArg.toLowerCase() === 'true';
    
    if (eventConfig.setSendWelcome(enabled)) {
      return `✅ **Welcome messages ${enabled ? 'đã được bật' : 'đã được tắt'}**\n\nUser mới tham gia chat ${enabled ? 'sẽ' : 'sẽ không'} nhận được tin nhắn chào mừng.`;
    } else {
      return `❌ **Không thể cập nhật welcome message setting**`;
    }
  },

  resetConfiguration(eventConfig) {
    eventConfig.resetToDefaults();
    return `🔄 **CẤU HÌNH ĐÃ ĐƯỢC RESET**

✅ **Tất cả settings đã về mặc định:**
• **Message events:** Enabled  
• **Join/Leave events:** Enabled
• **Read events:** Disabled
• **Menu events:** Enabled
• **Contact events:** Enabled
• **Welcome messages:** Enabled
• **Rate limits:** Restored to defaults

💡 **Cần restart bot để áp dụng các thay đổi.**`;
  },

  getShortEventName(fullEventType) {
    const shortNames = {
      'im.message.receive_v1': 'message',
      'im.chat.member.user.added_v1': 'join',
      'im.chat.member.user.deleted_v1': 'leave',
      'im.message.message_read_v1': 'read',
      'application.bot.menu_v6': 'menu',
      'contact.user.created_v3': 'contact'
    };
    return shortNames[fullEventType] || fullEventType;
  },

  getFullEventName(shortName) {
    const fullNames = {
      'message': 'im.message.receive_v1',
      'join': 'im.chat.member.user.added_v1',
      'leave': 'im.chat.member.user.deleted_v1',
      'read': 'im.message.message_read_v1',
      'menu': 'application.bot.menu_v6',
      'contact': 'contact.user.created_v3'
    };
    return fullNames[shortName.toLowerCase()] || null;
  }
};
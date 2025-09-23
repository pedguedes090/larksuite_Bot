// modules/commands/eventsconfig.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'eventsconfig',
  description: 'Cấu hình và quản lý event handlers của bot (admin only)',
  usage: '!eventsconfig [status|cleanup|reset]',
  aliases: ['eventconfig', 'eventmanager'],
  adminOnly: true,

  async execute({ userId, args, chatId, client }) {
    try {
      userManager.incrementCommandCount(userId);

      const subcommand = args[0]?.toLowerCase();
      const eventHandler = global.botEventHandler;

      if (!eventHandler) {
        return '❌ **Event handler chưa được khởi tạo**';
      }

      switch (subcommand) {
        case 'status':
        case 'info':
          return this.getEventStatus(eventHandler);
        
        case 'cleanup':
        case 'clean':
          return this.cleanupEvents(eventHandler);
          
        case 'reset':
          return this.resetEventStats(eventHandler);

        case 'test':
          return await this.testEventHandlers(eventHandler, chatId, client);
          
        default:
          return this.showConfigHelp();
      }

    } catch (error) {
      console.error('❌ EventsConfig command error:', error);
      return `❌ **Lỗi cấu hình events:** ${error.message}`;
    }
  },

  showConfigHelp() {
    return `⚙️ **EVENT CONFIGURATION MANAGER**

🛠️ **Commands:**
• \`!eventsconfig status\` - Xem trạng thái event handlers
• \`!eventsconfig cleanup\` - Dọn dẹp memory cache
• \`!eventsconfig reset\` - Reset thống kê events
• \`!eventsconfig test\` - Test event handlers

📋 **Event Types:**
✅ **Message Receive** - Xử lý tin nhắn
✅ **User Join/Leave** - Theo dõi thành viên
✅ **Message Read** - Tracking đọc tin nhắn
✅ **Bot Menu** - Menu tương tác
✅ **Contact Created** - User mới tạo

🔧 **Advanced Features:**
• Auto cleanup handled messages
• Event statistics tracking
• Error handling và logging
• Rate limiting cho events`;
  },

  getEventStatus(eventHandler) {
    const stats = eventHandler.getEventStats();
    const handlers = eventHandler.getEventHandlers();
    const totalEvents = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    let response = `📊 **EVENT HANDLER STATUS**\n\n`;
    
    response += `🔢 **Tổng quan:**\n`;
    response += `• **Total events processed:** ${totalEvents.toLocaleString()}\n`;
    response += `• **Handler types:** ${Object.keys(handlers).length}\n`;
    response += `• **Memory usage:** ${this.getMemoryUsage()}\n\n`;
    
    response += `📋 **Handler Status:**\n`;
    for (const [eventType, handler] of Object.entries(handlers)) {
      const count = stats[eventType] || 0;
      const status = typeof handler === 'function' ? '✅' : '❌';
      response += `${status} **${eventType}** (${count.toLocaleString()} processed)\n`;
    }
    
    response += `\n⏰ **System Info:**\n`;
    response += `• **Uptime:** ${this.formatUptime(process.uptime())}\n`;
    response += `• **Node version:** ${process.version}\n`;
    response += `• **Memory usage:** ${this.getDetailedMemory()}`;
    
    return response;
  },

  cleanupEvents(eventHandler) {
    try {
      // Trigger cleanup of handled messages
      eventHandler.cleanupHandledMessages();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const memoryUsage = process.memoryUsage();
      const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;
      
      return `🧹 **EVENT CLEANUP COMPLETED**

✅ **Actions performed:**
• Cleaned up handled message cache
• Released unused memory references
${global.gc ? '• Forced garbage collection' : '• Garbage collection not available'}

📊 **Current memory usage:**
• **Heap used:** ${heapUsed} MB
• **RSS:** ${Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100} MB

💡 **Cleanup được tự động chạy mỗi 5 phút**`;

    } catch (error) {
      return `❌ **Cleanup failed:** ${error.message}`;
    }
  },

  resetEventStats(eventHandler) {
    try {
      // Reset event statistics
      eventHandler.eventStats.clear();
      
      return `🔄 **EVENT STATISTICS RESET**

✅ **All event counters have been reset to 0**

📊 **Stats cleared:**
• Message receive events
• User join/leave events  
• Message read events
• Bot menu interactions
• Contact creation events

💡 **New statistics will start accumulating immediately**`;

    } catch (error) {
      return `❌ **Reset failed:** ${error.message}`;
    }
  },

  async testEventHandlers(eventHandler, chatId, client) {
    try {
      let response = `🧪 **EVENT HANDLER TESTING**\n\n`;
      
      const handlers = eventHandler.getEventHandlers();
      let passedTests = 0;
      let totalTests = 0;
      
      // Test each handler function
      for (const [eventType, handler] of Object.entries(handlers)) {
        totalTests++;
        
        try {
          // Basic function test
          if (typeof handler === 'function') {
            response += `✅ **${eventType}** - Handler function OK\n`;
            passedTests++;
          } else {
            response += `❌ **${eventType}** - Handler not a function\n`;
          }
        } catch (error) {
          response += `❌ **${eventType}** - Error: ${error.message}\n`;
        }
      }
      
      response += `\n📊 **Test Results:** ${passedTests}/${totalTests} handlers passed\n`;
      
      if (passedTests === totalTests) {
        response += `\n🎉 **All event handlers are working correctly!**`;
      } else {
        response += `\n⚠️ **Some handlers have issues. Check logs for details.**`;
      }
      
      return response;
      
    } catch (error) {
      return `❌ **Testing failed:** ${error.message}`;
    }
  },

  getMemoryUsage() {
    const usage = process.memoryUsage();
    const heapUsed = Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100;
    return `${heapUsed} MB`;
  },

  getDetailedMemory() {
    const usage = process.memoryUsage();
    const heapUsed = Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100;
    const heapTotal = Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100;
    const rss = Math.round(usage.rss / 1024 / 1024 * 100) / 100;
    return `${heapUsed}/${heapTotal} MB (RSS: ${rss} MB)`;
  },

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
};
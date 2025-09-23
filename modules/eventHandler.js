// modules/eventHandler.js
import UserManager from './userManager.js';
import { getEventConfig } from './eventConfig.js';

class EventHandler {
  constructor(client, commandHandler) {
    this.client = client;
    this.commandHandler = commandHandler;
    this.userManager = UserManager.getInstance();
    this.eventStats = new Map();
    this.handledMessages = new Map(); // Moved from index.js for better organization
    this.eventConfig = getEventConfig();
    this.rateLimitCache = new Map(); // For event-specific rate limiting
  }

  // Function to clean old handled messages
  cleanupHandledMessages() {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 180000; // 3 minutes
    const maxMessages = this.eventConfig.getMaxHandledMessages();
    
    // Clean by age
    for (const [msgId, timestamp] of this.handledMessages.entries()) {
      if (now - timestamp > CLEANUP_THRESHOLD) {
        this.handledMessages.delete(msgId);
      }
    }
    
    // Clean by size if still too large
    if (this.handledMessages.size > maxMessages) {
      const entries = Array.from(this.handledMessages.entries());
      entries.sort((a, b) => a[1] - b[1]); // Sort by timestamp
      const toDelete = entries.slice(0, entries.length - maxMessages);
      for (const [msgId] of toDelete) {
        this.handledMessages.delete(msgId);
      }
    }
  }

  // Check rate limiting for events
  isEventRateLimited(eventType, identifier) {
    const rateLimit = this.eventConfig.getEventRateLimit(eventType);
    const key = `${eventType}:${identifier}`;
    const now = Date.now();
    const lastTime = this.rateLimitCache.get(key) || 0;
    
    if (now - lastTime < rateLimit) {
      return true;
    }
    
    this.rateLimitCache.set(key, now);
    
    // Cleanup old entries occasionally
    if (Math.random() < 0.01) {
      for (const [k, timestamp] of this.rateLimitCache.entries()) {
        if (now - timestamp > 60000) { // 1 minute old
          this.rateLimitCache.delete(k);
        }
      }
    }
    
    return false;
  }

  // Track event usage statistics
  trackEvent(eventType) {
    this.eventStats.set(eventType, (this.eventStats.get(eventType) || 0) + 1);
  }

  // Get event statistics
  getEventStats() {
    return Object.fromEntries(this.eventStats);
  }

  // Enhanced message receive handler
  async handleMessageReceive(ctx) {
    const eventType = 'im.message.receive_v1';
    
    // Check if event is enabled
    if (!this.eventConfig.isEventEnabled(eventType)) {
      return { status: 'ok' };
    }

    const msgId = ctx.message.message_id;
    const userId = ctx.sender?.sender_id?.user_id || 'unknown';
    
    // Check rate limiting
    if (this.isEventRateLimited(eventType, userId)) {
      return { status: 'ok' };
    }

    const now = Date.now();

    // Track event
    this.trackEvent(eventType);

    // ⚠️ Nếu đã xử lý rồi thì bỏ qua
    if (this.handledMessages.has(msgId)) {
      console.log(`⚠️ Đã xử lý message: ${msgId}`);
      return { status: 'ok' };
    }

    // 📝 Ghi log with enhanced info
    const chatId = ctx.message.chat_id;
    const messageType = ctx.message.msg_type || 'text';
    
    let text = '[Không có nội dung]';
    try {
      const content = JSON.parse(ctx.message.content || '{}');
      text = content.text || text;
    } catch (err) {
      console.error('❌ Không đọc được nội dung:', err.message);
    }

    console.log(`➡️ Message [${messageType}]: ${text} | Chat: ${chatId} | User: ${userId}`);

    // ⏩ Xử lý message sau, không chặn webhook
    setImmediate(async () => {
      try {
        // Handle different message types
        if (messageType === 'text') {
          // 🎮 Kiểm tra xem có phải command không
          const commandResponse = await this.commandHandler.handleMessage(text, userId, chatId, this.client);
          
          if (commandResponse) {
            console.log(`🎮 Command executed: ${text}`);
            
            const res = await this.client.im.message.create({
              params: { receive_id_type: 'chat_id' },
              data: {
                receive_id: chatId,
                content: JSON.stringify({ text: commandResponse }),
                msg_type: 'text',
              },
            });
            
            console.log('✅ Response sent:', res.data?.message_id);
          } else {
            // Không phải command, đăng ký user nhưng không phản hồi
            this.userManager.getUser(userId);
            console.log(`💬 Regular message (no response): ${text}`);
          }
        } else {
          // Handle non-text messages (images, files, etc.)
          this.userManager.getUser(userId);
          console.log(`📎 Non-text message [${messageType}] from ${userId}`);
        }
      } catch (err) {
        console.error('❌ Error sending response:', err.message);
      }
    });

    // ✅ Trả về ngay để tăng tốc và tránh retry
    return { status: 'ok' };
  }

  // Handle user joined chat event
  async handleUserJoinedChat(ctx) {
    const eventType = 'im.chat.member.user.added_v1';
    
    // Check if event is enabled
    if (!this.eventConfig.isEventEnabled(eventType)) {
      return { status: 'ok' };
    }

    this.trackEvent(eventType);
    
    try {
      const chatId = ctx.chat_id;
      const users = ctx.users || [];
      
      // Check rate limiting
      if (this.isEventRateLimited(eventType, chatId)) {
        return { status: 'ok' };
      }
      
      console.log(`👋 Users joined chat ${chatId}:`, users.map(u => u.user_id));

      // Register new users
      for (const user of users) {
        const userId = user.user_id;
        if (userId) {
          this.userManager.getUser(userId);
          console.log(`✨ Registered new user from chat join: ${userId}`);
        }
      }

      // Send welcome message if enabled
      if (users.length > 0 && this.eventConfig.getSendWelcome()) {
        const welcomeMessage = `🎉 **Chào mừng bạn đến với Bot Game!**

🎮 **Sử dụng lệnh sau để bắt đầu:**
• \`!help\` - Xem danh sách lệnh
• \`!daily\` - Nhận tiền hàng ngày
• \`!wb info\` - Khám phá thế giới World Boss

💡 **Gõ \`!help\` để xem tất cả tính năng của bot!**`;

        await this.client.im.message.create({
          params: { receive_id_type: 'chat_id' },
          data: {
            receive_id: chatId,
            content: JSON.stringify({ text: welcomeMessage }),
            msg_type: 'text',
          },
        });
      }

    } catch (err) {
      console.error('❌ Error handling user joined chat:', err.message);
    }

    return { status: 'ok' };
  }

  // Handle user left chat event
  async handleUserLeftChat(ctx) {
    const eventType = 'im.chat.member.user.deleted_v1';
    
    // Check if event is enabled
    if (!this.eventConfig.isEventEnabled(eventType)) {
      return { status: 'ok' };
    }

    this.trackEvent(eventType);
    
    try {
      const chatId = ctx.chat_id;
      const users = ctx.users || [];
      
      // Check rate limiting
      if (this.isEventRateLimited(eventType, chatId)) {
        return { status: 'ok' };
      }
      
      console.log(`👋 Users left chat ${chatId}:`, users.map(u => u.user_id));

      // Log user departures
      for (const user of users) {
        const userId = user.user_id;
        if (userId && this.userManager.userExists(userId)) {
          console.log(`👋 User left chat: ${userId}`);
        }
      }

    } catch (err) {
      console.error('❌ Error handling user left chat:', err.message);
    }

    return { status: 'ok' };
  }

  // Handle message read events
  async handleMessageRead(ctx) {
    const eventType = 'im.message.message_read_v1';
    
    // Check if event is enabled
    if (!this.eventConfig.isEventEnabled(eventType)) {
      return { status: 'ok' };
    }

    this.trackEvent(eventType);
    
    try {
      const chatId = ctx.chat_id;
      const userId = ctx.reader?.reader_id?.user_id;
      
      // Check rate limiting
      if (userId && this.isEventRateLimited(eventType, userId)) {
        return { status: 'ok' };
      }
      
      if (userId) {
        // Register user activity
        this.userManager.getUser(userId);
        console.log(`👁️ Message read by ${userId} in chat ${chatId}`);
      }

    } catch (err) {
      console.error('❌ Error handling message read:', err.message);
    }

    return { status: 'ok' };
  }

  // Handle bot menu interactions
  async handleBotMenu(ctx) {
    const eventType = 'application.bot.menu_v6';
    
    // Check if event is enabled
    if (!this.eventConfig.isEventEnabled(eventType)) {
      return { status: 'ok' };
    }

    this.trackEvent(eventType);
    
    try {
      const userId = ctx.operator?.operator_id?.user_id;
      const menuKey = ctx.menu_key;
      
      // Check rate limiting
      if (userId && this.isEventRateLimited(eventType, userId)) {
        return { status: 'ok' };
      }
      
      console.log(`🔘 Bot menu interaction: ${menuKey} by ${userId}`);

      if (!userId) {
        return { status: 'ok' };
      }

      // Register user
      this.userManager.getUser(userId);

      // Handle different menu actions
      let response = '';
      switch (menuKey) {
        case 'help':
          response = await this.commandHandler.handleMessage('!help', userId, ctx.chat_id, this.client);
          break;
        case 'daily':
          response = await this.commandHandler.handleMessage('!daily', userId, ctx.chat_id, this.client);
          break;
        case 'balance':
          response = await this.commandHandler.handleMessage('!balance', userId, ctx.chat_id, this.client);
          break;
        case 'worldboss':
          response = await this.commandHandler.handleMessage('!wb info', userId, ctx.chat_id, this.client);
          break;
        default:
          response = `❓ Menu không được hỗ trợ: ${menuKey}`;
      }

      if (response) {
        await this.client.im.message.create({
          params: { receive_id_type: 'chat_id' },
          data: {
            receive_id: ctx.chat_id,
            content: JSON.stringify({ text: response }),
            msg_type: 'text',
          },
        });
      }

    } catch (err) {
      console.error('❌ Error handling bot menu:', err.message);
    }

    return { status: 'ok' };
  }

  // Handle contact user created (new user in organization)
  async handleContactUserCreated(ctx) {
    const eventType = 'contact.user.created_v3';
    
    // Check if event is enabled
    if (!this.eventConfig.isEventEnabled(eventType)) {
      return { status: 'ok' };
    }

    this.trackEvent(eventType);
    
    try {
      const user = ctx.object;
      const userId = user?.user_id;
      
      // Check rate limiting
      if (userId && this.isEventRateLimited(eventType, userId)) {
        return { status: 'ok' };
      }
      
      if (userId) {
        console.log(`👤 New user created in organization: ${userId}`);
        // Auto-register the user
        this.userManager.getUser(userId);
      }

    } catch (err) {
      console.error('❌ Error handling contact user created:', err.message);
    }

    return { status: 'ok' };
  }

  // Get all event handlers configured for the dispatcher
  getEventHandlers() {
    const allHandlers = {
      'im.message.receive_v1': this.handleMessageReceive.bind(this),
      'im.chat.member.user.added_v1': this.handleUserJoinedChat.bind(this),
      'im.chat.member.user.deleted_v1': this.handleUserLeftChat.bind(this),
      'im.message.message_read_v1': this.handleMessageRead.bind(this),
      'application.bot.menu_v6': this.handleBotMenu.bind(this),
      'contact.user.created_v3': this.handleContactUserCreated.bind(this)
    };

    // Only return enabled handlers
    const enabledHandlers = {};
    for (const [eventType, handler] of Object.entries(allHandlers)) {
      if (this.eventConfig.isEventEnabled(eventType)) {
        enabledHandlers[eventType] = handler;
      }
    }

    return enabledHandlers;
  }

  // Initialize cleanup interval
  startCleanupInterval() {
    const interval = this.eventConfig.getCleanupInterval();
    // Cleanup based on configuration
    setInterval(() => {
      this.cleanupHandledMessages();
    }, interval);
  }

  // Get event configuration
  getEventConfig() {
    return this.eventConfig;
  }
}

export default EventHandler;
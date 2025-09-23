// modules/eventHandler.js
import UserManager from './userManager.js';

class EventHandler {
  constructor(client, commandHandler) {
    this.client = client;
    this.commandHandler = commandHandler;
    this.userManager = UserManager.getInstance();
    this.eventStats = new Map();
    this.handledMessages = new Map(); // Moved from index.js for better organization
  }

  // Function to clean old handled messages
  cleanupHandledMessages() {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 180000; // 3 minutes
    
    for (const [msgId, timestamp] of this.handledMessages.entries()) {
      if (now - timestamp > CLEANUP_THRESHOLD) {
        this.handledMessages.delete(msgId);
      }
    }
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
    const msgId = ctx.message.message_id;
    const now = Date.now();

    // Track event
    this.trackEvent('im.message.receive_v1');

    // ⚠️ Nếu đã xử lý rồi thì bỏ qua
    if (this.handledMessages.has(msgId)) {
      console.log(`⚠️ Đã xử lý message: ${msgId}`);
      return { status: 'ok' };
    }

    this.handledMessages.set(msgId, now);

    // 📝 Ghi log with enhanced info
    const chatId = ctx.message.chat_id;
    const userId = ctx.sender?.sender_id?.user_id || 'unknown';
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
    this.trackEvent('im.chat.member.user.added_v1');
    
    try {
      const chatId = ctx.chat_id;
      const users = ctx.users || [];
      
      console.log(`👋 Users joined chat ${chatId}:`, users.map(u => u.user_id));

      // Register new users and send welcome message
      for (const user of users) {
        const userId = user.user_id;
        if (userId) {
          this.userManager.getUser(userId);
          console.log(`✨ Registered new user from chat join: ${userId}`);
        }
      }

      // Send welcome message
      if (users.length > 0) {
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
    this.trackEvent('im.chat.member.user.deleted_v1');
    
    try {
      const chatId = ctx.chat_id;
      const users = ctx.users || [];
      
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
    this.trackEvent('im.message.message_read_v1');
    
    try {
      const chatId = ctx.chat_id;
      const userId = ctx.reader?.reader_id?.user_id;
      
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
    this.trackEvent('application.bot.menu_v6');
    
    try {
      const userId = ctx.operator?.operator_id?.user_id;
      const menuKey = ctx.menu_key;
      
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
    this.trackEvent('contact.user.created_v3');
    
    try {
      const user = ctx.object;
      const userId = user?.user_id;
      
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
    return {
      'im.message.receive_v1': this.handleMessageReceive.bind(this),
      'im.chat.member.user.added_v1': this.handleUserJoinedChat.bind(this),
      'im.chat.member.user.deleted_v1': this.handleUserLeftChat.bind(this),
      'im.message.message_read_v1': this.handleMessageRead.bind(this),
      'application.bot.menu_v6': this.handleBotMenu.bind(this),
      'contact.user.created_v3': this.handleContactUserCreated.bind(this)
    };
  }

  // Initialize cleanup interval
  startCleanupInterval() {
    // Cleanup every 5 minutes
    setInterval(() => {
      this.cleanupHandledMessages();
    }, 300000);
  }
}

export default EventHandler;
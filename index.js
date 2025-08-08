// index.js
import express from 'express';
import bodyParser from 'body-parser';
import * as lark from '@larksuiteoapi/node-sdk';
import CommandHandler from './modules/commandHandler.js';
import UserManager from './modules/userManager.js';
import {
  APP_ID,
  APP_SECRET,
  ENCRYPT_KEY,
  VERIFY_TOKEN,
  PORT,
  NODE_ENV,
  DEFAULT_ADMINS
} from './config.js';

// 🚀 Khởi tạo các components
const client = new lark.Client({
  appId: APP_ID,
  appSecret: APP_SECRET,
  domain: lark.Domain.Feishu,
  // Enable manual token management if needed
  disableTokenCache: process.env.DISABLE_TOKEN_CACHE === 'true'
});

const commandHandler = await new CommandHandler('!').init(); // Prefix: !
const userManager = UserManager.getInstance(); // Sử dụng singleton

// 🧠 Bộ nhớ tạm để chống lặp message với automatic cleanup
const handledMessages = new Map(); // Sử dụng Map thay vì Set để lưu timestamp

// Function to clean old handled messages
function cleanupHandledMessages() {
  const now = Date.now();
  const CLEANUP_THRESHOLD = 180000; // 3 phút
  
  for (const [msgId, timestamp] of handledMessages.entries()) {
    if (now - timestamp > CLEANUP_THRESHOLD) {
      handledMessages.delete(msgId);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupHandledMessages, 300000);

// 📦 Tạo Event Dispatcher
const dispatcher = new lark.EventDispatcher({
  encryptKey: ENCRYPT_KEY,
  verificationToken: VERIFY_TOKEN,
}).register({
  'im.message.receive_v1': async (ctx) => {
    const msgId = ctx.message.message_id;
    const now = Date.now();

    // ⚠️ Nếu đã xử lý rồi thì bỏ qua
    if (handledMessages.has(msgId)) {
      console.log(`⚠️ Đã xử lý message: ${msgId}`);
      return { status: 'ok' };
    }

    handledMessages.set(msgId, now);

    // 📝 Ghi log (simplified)
    const chatId = ctx.message.chat_id;
    const userId = ctx.sender?.sender_id?.user_id || 'unknown';
    
    let text = '[Không có nội dung]';
    try {
      const content = JSON.parse(ctx.message.content || '{}');
      text = content.text || text;
    } catch (err) {
      console.error('❌ Không đọc được nội dung:', err.message);
    }

    console.log(`➡️ Message: ${text} | Chat: ${chatId} | User: ${userId}`);

    // ⏩ Xử lý message sau, không chặn webhook
    setImmediate(async () => {
      try {
        // 🎮 Kiểm tra xem có phải command không
        const commandResponse = await commandHandler.handleMessage(text, userId, chatId, client);
        
        if (commandResponse) {
          console.log(`🎮 Command executed: ${text}`);
          
          const res = await client.im.message.create({
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
          userManager.getUser(userId);
          console.log(`💬 Regular message (no response): ${text}`);
        }
      } catch (err) {
        console.error('❌ Error sending response:', err.message);
      }
    });

    // ✅ Trả về ngay để tăng tốc và tránh retry
    return { status: 'ok' };
  },
});

// 🌐 Khởi tạo Express app
const app = express();
app.use(bodyParser.json());

// 📥 Log webhook requests (simplified)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log('📥 Webhook received');
    next();
  });
}

// 🌐 Gắn endpoint webhook
app.use('/webhook/event', lark.adaptExpress(dispatcher, { autoChallenge: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 🚀 Chạy server
app.listen(PORT, () => {
  const userCommands = commandHandler.getCommands(0).length; // User commands
  const adminCommands = commandHandler.getCommands(1).length; // All commands (including admin)
  const totalAdminOnly = adminCommands - userCommands;
  
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🎮 Command prefix: ${commandHandler.prefix}`);
  console.log(`📁 Commands loaded: ${userCommands} user + ${totalAdminOnly} admin = ${adminCommands} total`);
  console.log(`🔒 Environment: ${NODE_ENV}`);
  console.log(`🔐 Default admins: ${DEFAULT_ADMINS || 'none'}`);
});

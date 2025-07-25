// index.js
import express from 'express';
import bodyParser from 'body-parser';
import * as lark from '@larksuiteoapi/node-sdk';
import CommandHandler from './modules/commandHandler.js';
import UserManager from './modules/userManager.js';
import EventManager from './modules/eventManager.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ⚙️ Cấu hình từ environment variables
const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const ENCRYPT_KEY = process.env.ENCRYPT_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

// Kiểm tra required environment variables
const requiredEnvVars = ['APP_ID', 'APP_SECRET', 'ENCRYPT_KEY', 'VERIFY_TOKEN'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.error('💡 Please check your .env file or environment configuration');
    process.exit(1);
  }
}

// 🚀 Khởi tạo các components
const client = new lark.Client({
  appId: APP_ID,
  appSecret: APP_SECRET,
  domain: lark.Domain.Feishu,
  // Enable manual token management if needed
  disableTokenCache: process.env.DISABLE_TOKEN_CACHE === 'true'
});

const commandHandler = new CommandHandler('!'); // Prefix: !
const userManager = UserManager.getInstance(); // Sử dụng singleton
const eventManager = EventManager.getInstance(); // Khởi tạo hệ thống sự kiện

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
if (process.env.NODE_ENV === 'development') {
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
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Default admins: ${process.env.DEFAULT_ADMINS || 'none'}`);
});

// index.js
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import * as lark from '@larksuiteoapi/node-sdk';
import CommandHandler from './modules/commandHandler.js';
import UserManager from './modules/userManager.js';
import EventHandler from './modules/eventHandler.js';
import adminRoutes from './routes/admin.js';
import {
  APP_ID,
  APP_SECRET,
  ENCRYPT_KEY,
  VERIFY_TOKEN,
  PORT,
  NODE_ENV,
  DEFAULT_ADMINS
} from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// 🎯 Khởi tạo Event Handler
const eventHandler = new EventHandler(client, commandHandler);
global.botEventHandler = eventHandler; // Make available globally for commands

// Start cleanup interval for handled messages
eventHandler.startCleanupInterval();

// 📦 Tạo Event Dispatcher với enhanced event handling
const dispatcher = new lark.EventDispatcher({
  encryptKey: ENCRYPT_KEY,
  verificationToken: VERIFY_TOKEN,
}).register(eventHandler.getEventHandlers());

// 🌐 Khởi tạo Express app
const app = express();
app.use(bodyParser.json());

// 📁 Serve dashboard static files
app.use('/assets', express.static(path.join(__dirname, 'public/dashboard/assets')));
app.use('/dashboard', express.static(path.join(__dirname, 'public/dashboard')));

// 🔐 Admin API routes
app.use('/api/admin', adminRoutes);

// 📥 Log webhook requests (simplified)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/webhook')) {
      console.log('📥 Webhook received');
    }
    next();
  });
}

// 🌐 Gắn endpoint webhook
app.use('/webhook/event', lark.adaptExpress(dispatcher, { autoChallenge: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard/index.html'));
});

// 🚀 Chạy server
app.listen(PORT, () => {
  const userCommands = commandHandler.getCommands(0).length; // User commands
  const adminCommands = commandHandler.getCommands(1).length; // All commands (including admin)
  const totalAdminOnly = adminCommands - userCommands;
  const eventHandlers = Object.keys(eventHandler.getEventHandlers()).length;
  
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🎮 Command prefix: ${commandHandler.prefix}`);
  console.log(`📁 Commands loaded: ${userCommands} user + ${totalAdminOnly} admin = ${adminCommands} total`);
  console.log(`📡 Event handlers: ${eventHandlers} types registered`);
  console.log(`🔒 Environment: ${NODE_ENV}`);
  console.log(`🔐 Default admins: ${DEFAULT_ADMINS || 'none'}`);
  
  // Log registered event types
  const eventTypes = Object.keys(eventHandler.getEventHandlers());
  console.log(`🎯 Registered events: ${eventTypes.join(', ')}`);
});

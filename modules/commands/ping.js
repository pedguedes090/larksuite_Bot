// modules/commands/ping.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'ping',
  description: 'Kiểm tra độ trễ bot',
  usage: '!ping',
  aliases: ['p'],

  async execute({ userId, args }) {
    userManager.incrementCommandCount(userId);
    
    const startTime = Date.now();
    // Simulate some processing
    await new Promise(resolve => setTimeout(resolve, 10));
    const endTime = Date.now();
    
    const latency = endTime - startTime;
    
    return `🏓 **Pong!**
⚡ **Độ trễ:** ${latency}ms
🤖 **Bot status:** Online
📡 **Kết nối:** Ổn định`;
  }
}; 
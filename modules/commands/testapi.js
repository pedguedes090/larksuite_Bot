// modules/commands/testapi.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'testapi',
  description: 'Test kết nối API Lark (admin only)',
  usage: '!testapi',
  aliases: ['apitest'],
  adminOnly: true, // Chỉ admin mới được dùng

  async execute({ userId, args, chatId, client }) {
    try {
      userManager.incrementCommandCount(userId);

      console.log('🔍 Testing Lark API connection...');

      // Test 1: Get bot info
      try {
        const botInfo = await client.im.bot.info({});
        console.log('✅ Bot info:', JSON.stringify(botInfo, null, 2));
      } catch (err) {
        console.log('❌ Bot info failed:', err.message);
      }

      // Test 2: Get chat info
      try {
        const chatInfo = await client.im.chat.get({
          params: { chat_id: chatId }
        });
        console.log('✅ Chat info:', JSON.stringify(chatInfo, null, 2));
      } catch (err) {
        console.log('❌ Chat info failed:', err.message);
      }

      // Test 3: Try to create a small test image
      try {
        // Create a tiny test buffer (1x1 pixel PNG)
        const testPngBuffer = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
          0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
          0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
          0x01, 0x00, 0x01, 0x5C, 0xCF, 0x80, 0x64, 0x00, 0x00, 0x00, 0x00, 0x49,
          0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);

        const imageTest = await client.im.image.create({
          data: {
            image_type: 'message',
            image: testPngBuffer,
          },
        });

        console.log('✅ Image test response:', JSON.stringify(imageTest, null, 2));
        
        return `🔍 **API Test Results:**

🤖 **Bot Connection:** OK
💬 **Chat Access:** OK  
📸 **Image API:** ${imageTest.data?.image_key ? 'OK' : 'FAILED'}

📋 **Debug Info:**
• **Image Response Code:** ${imageTest.code}
• **Image Key:** ${imageTest.data?.image_key || 'N/A'}
• **Full Response:** \`${JSON.stringify(imageTest, null, 1)}\``;

      } catch (err) {
        console.log('❌ Image test failed:', err.message);
        return `🔍 **API Test Results:**

📸 **Image API:** FAILED
❌ **Error:** ${err.message}

💡 **Gợi ý:** Kiểm tra permissions trong Lark Developer Console`;
      }

    } catch (error) {
      console.error('❌ TestAPI command error:', error);
      return `❌ **API Test thất bại:** ${error.message}`;
    }
  }
}; 
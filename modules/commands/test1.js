// modules/commands/test1.js
import UserManager from '../userManager.js';
import fs from 'fs';
import path from 'path';

const userManager = UserManager.getInstance();

export default {
  name: 'test1',
  description: 'Test gửi ảnh 1.png nhanh (admin only)',
  usage: '!test1',
  aliases: ['t1'],
  adminOnly: true, // Chỉ admin mới được dùng

  async execute({ userId, args, chatId, client }) {
    try {
      userManager.incrementCommandCount(userId);

      // Đường dẫn cố định
      const imagePath = "C:\\Users\\dun\\OneDrive\\Hình ảnh\\Screenshots\\1.png";

      // Kiểm tra file có tồn tại không
      if (!fs.existsSync(imagePath)) {
        return `❌ **File không tồn tại:** \`${imagePath}\`
💡 **Gợi ý:** Đảm bảo file 1.png có trong thư mục Screenshots`;
      }

      // Kiểm tra có phải file không
      const stats = fs.statSync(imagePath);
      if (!stats.isFile()) {
        return '❌ **Đường dẫn phải là file, không phải thư mục!**';
      }

      // Kiểm tra kích thước
      const fileSizeInMB = stats.size / (1024 * 1024);
      if (fileSizeInMB > 10) {
        return `❌ **File quá lớn:** ${fileSizeInMB.toFixed(2)}MB (max 10MB)`;
      }

      console.log(`📤 Testing image upload: ${imagePath}`);

      // 1. Upload ảnh lên Lark
      const imageStream = fs.createReadStream(imagePath);
      const resImg = await client.im.image.create({
        data: {
          image_type: 'message',
          image: imageStream,
        },
      });

      // Debug logging
      console.log('📋 Test1 upload response:', JSON.stringify(resImg, null, 2));
      
      const imageKey = resImg.data?.image_key || resImg.image_key || resImg.data?.key;
      
      if (!imageKey) {
        console.error('❌ Test1 upload failed - no image_key found');
        return `❌ **Upload thất bại!**
📋 **Code:** ${resImg.code}
📋 **Data:** ${JSON.stringify(resImg.data)}`;
      }

      console.log(`✅ Image uploaded, image_key: ${imageKey}`);

      // 2. Gửi ảnh
      await client.im.message.create({
        params: { receive_id_type: 'chat_id' },
        data: {
          receive_id: chatId,
          msg_type: 'image',
          content: JSON.stringify({ image_key: imageKey }),
        },
      });

      console.log(`🎉 Test image sent to chat: ${chatId}`);

      return `✅ **Test thành công!**
📁 **File:** 1.png
📏 **Size:** ${fileSizeInMB.toFixed(2)}MB
🔑 **Key:** ${imageKey}`;

    } catch (error) {
      console.error('❌ Test1 command error:', error);
      return `❌ **Test thất bại:** ${error.message}`;
    }
  }
}; 
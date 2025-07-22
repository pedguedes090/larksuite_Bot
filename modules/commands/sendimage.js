// modules/commands/sendimage.js
import UserManager from '../userManager.js';
import fs from 'fs';
import path from 'path';

const userManager = UserManager.getInstance();

export default {
  name: 'sendimage',
  description: 'Gửi ảnh từ đường dẫn local (admin only)',
  usage: '!sendimage <đường_dẫn_ảnh>',
  aliases: ['img', 'image', 'pic'],
  adminOnly: true, // Chỉ admin mới được dùng

  async execute({ userId, args, chatId, client }) {
    try {
      userManager.incrementCommandCount(userId);

      // Validation arguments
      if (args.length < 1) {
        return `❌ **Cú pháp sai!**
📝 **Cách dùng:** !sendimage <đường_dẫn_ảnh>
💡 **Ví dụ:** !sendimage C:\\Users\\dun\\OneDrive\\Hình ảnh\\Screenshots\\1.png`;
      }

      // Lấy đường dẫn từ args (có thể có spaces)
      const imagePath = args.join(' ').trim();

      // Validation file path
      if (!imagePath) {
        return '❌ **Đường dẫn ảnh không được để trống!**';
      }

      // Kiểm tra file có tồn tại không
      if (!fs.existsSync(imagePath)) {
        return `❌ **File không tồn tại:** \`${imagePath}\`
💡 **Gợi ý:** Kiểm tra lại đường dẫn file`;
      }

      // Kiểm tra có phải file không (không phải folder)
      const stats = fs.statSync(imagePath);
      if (!stats.isFile()) {
        return '❌ **Đường dẫn phải là file, không phải thư mục!**';
      }

      // Kiểm tra extension file
      const ext = path.extname(imagePath).toLowerCase();
      const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
      if (!allowedExtensions.includes(ext)) {
        return `❌ **Format ảnh không được hỗ trợ!**
✅ **Được hỗ trợ:** ${allowedExtensions.join(', ')}
🔍 **File của bạn:** ${ext || 'không có extension'}`;
      }

      // Kiểm tra kích thước file (max 10MB)
      const fileSizeInMB = stats.size / (1024 * 1024);
      if (fileSizeInMB > 10) {
        return `❌ **File quá lớn!**
📏 **Kích thước hiện tại:** ${fileSizeInMB.toFixed(2)}MB
⚠️ **Giới hạn:** 10MB`;
      }

      // Bắt đầu upload
      console.log(`📤 Uploading image: ${imagePath}`);

      // 1. Upload ảnh lên Lark
      const imageStream = fs.createReadStream(imagePath);
      
      // Add stream error handling
      imageStream.on('error', (streamError) => {
        throw new Error(`File read error: ${streamError.message}`);
      });

      const resImg = await client.im.image.create({
        data: {
          image_type: 'message',
          image: imageStream,
        },
      });

      // Debug logging
      console.log('📋 Image upload response:', JSON.stringify(resImg, null, 2));
      console.log('📋 Response data:', resImg.data);
      console.log('📋 Response code:', resImg.code);

      // Try different ways to get image_key
      const imageKey = resImg.data?.image_key || resImg.image_key || resImg.data?.key;
      
      if (!imageKey) {
        console.error('❌ Upload failed - no image_key found in response');
        console.error('Full response:', JSON.stringify(resImg, null, 2));
        return `❌ **Upload ảnh thất bại!** 
📋 **Response code:** ${resImg.code || 'unknown'}
📋 **Response:** ${JSON.stringify(resImg.data || resImg, null, 2)}`;
      }

      console.log(`✅ Image uploaded successfully, image_key: ${imageKey}`);

      // 2. Gửi ảnh dưới dạng message
      await client.im.message.create({
        params: { receive_id_type: 'chat_id' },
        data: {
          receive_id: chatId,
          msg_type: 'image',
          content: JSON.stringify({ image_key: imageKey }),
        },
      });

      console.log(`🎉 Sent image to chat: ${chatId}`);

      // Return success message
      const fileName = path.basename(imagePath);
      return ``;

    } catch (error) {
      console.error('❌ SendImage command error:', error);
      
      // Handle specific errors
      if (error.message?.includes('PERMISSION_DENIED')) {
        return '❌ **Bot không có quyền gửi ảnh!** Vui lòng kiểm tra permissions';
      } else if (error.message?.includes('FILE_TOO_LARGE')) {
        return '❌ **File quá lớn!** Vui lòng chọn ảnh nhỏ hơn 10MB';
      } else if (error.code === 'ENOENT') {
        return '❌ **File không tồn tại hoặc không thể đọc!**';
      } else if (error.code === 'EACCES') {
        return '❌ **Không có quyền đọc file!** Kiểm tra file permissions';
      }
      
      return `❌ **Lỗi gửi ảnh:** ${error.message}`;
    }
  }
}; 
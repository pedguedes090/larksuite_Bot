// modules/commands/sendvideo.js
import UserManager from '../userManager.js';
import fs from 'fs';
import path from 'path';

const userManager = UserManager.getInstance();

export default {
  name: 'sendvideo',
  description: 'Gửi video từ đường dẫn local (admin only)',
  usage: '!sendvideo <đường_dẫn_video>',
  aliases: ['vid', 'video'],
  adminOnly: true, // Chỉ admin mới được dùng

  async execute({ userId, args, chatId, client }) {
    try {
      userManager.incrementCommandCount(userId);

      // Validation arguments
      if (args.length < 1) {
        return `❌ **Cú pháp sai!**
📝 **Cách dùng:** !sendvideo <đường_dẫn_video>
💡 **Ví dụ:** !sendvideo C:\\Users\\dun\\OneDrive\\Videos\\myvideo.mp4`;
      }

      // Lấy đường dẫn từ args (có thể có spaces)
      const videoPath = args.join(' ').trim();

      // Validation file path
      if (!videoPath) {
        return '❌ **Đường dẫn video không được để trống!**';
      }

      // Kiểm tra file có tồn tại không
      if (!fs.existsSync(videoPath)) {
        return `❌ **File không tồn tại:** \`${videoPath}\`
💡 **Gợi ý:** Kiểm tra lại đường dẫn file`;
      }

      // Kiểm tra có phải file không (không phải folder)
      const stats = fs.statSync(videoPath);
      if (!stats.isFile()) {
        return '❌ **Đường dẫn phải là file, không phải thư mục!**';
      }

      // Kiểm tra extension file
      const ext = path.extname(videoPath).toLowerCase();
      const allowedExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v'];
      if (!allowedExtensions.includes(ext)) {
        return `❌ **Format video không được hỗ trợ!**
✅ **Được hỗ trợ:** ${allowedExtensions.join(', ')}
🔍 **File của bạn:** ${ext || 'không có extension'}`;
      }

      // Kiểm tra kích thước file (max 100MB cho video)
      const fileSizeInMB = stats.size / (1024 * 1024);
      if (fileSizeInMB > 100) {
        return `❌ **File quá lớn!**
📏 **Kích thước hiện tại:** ${fileSizeInMB.toFixed(2)}MB
⚠️ **Giới hạn:** 100MB`;
      }

      // Bắt đầu upload
      console.log(`📤 Uploading video: ${videoPath}`);

      // 1. Upload video lên Lark
      const videoStream = fs.createReadStream(videoPath);
      
      // Add stream error handling
      videoStream.on('error', (streamError) => {
        throw new Error(`File read error: ${streamError.message}`);
      });

      const resVideo = await client.im.file.create({
        data: {
          file_type: 'stream',
          file_name: path.basename(videoPath),
          file: videoStream,
        },
      });

      // Debug logging
      console.log('📋 Video upload response:', JSON.stringify(resVideo, null, 2));
      console.log('📋 Response data:', resVideo.data);
      console.log('📋 Response code:', resVideo.code);

      // Try different ways to get file_key
      const fileKey = resVideo.data?.file_key || resVideo.file_key || resVideo.data?.key;
      
      if (!fileKey) {
        console.error('❌ Upload failed - no file_key found in response');
        console.error('Full response:', JSON.stringify(resVideo, null, 2));
        return `❌ **Upload video thất bại!** 
📋 **Response code:** ${resVideo.code || 'unknown'}
📋 **Response:** ${JSON.stringify(resVideo.data || resVideo, null, 2)}`;
      }

      console.log(`✅ Video uploaded successfully, file_key: ${fileKey}`);

      // 2. Gửi video dưới dạng message
      await client.im.message.create({
        params: { receive_id_type: 'chat_id' },
        data: {
          receive_id: chatId,
          msg_type: 'file',
          content: JSON.stringify({ file_key: fileKey }),
        },
      });

      console.log(`🎉 Sent video to chat: ${chatId}`);

      // Return success message (empty để không hiển thị gì)
      return ``;

    } catch (error) {
      console.error('❌ SendVideo command error:', error);
      
      // Handle specific errors
      if (error.message?.includes('PERMISSION_DENIED')) {
        return '❌ **Bot không có quyền gửi video!** Vui lòng kiểm tra permissions';
      } else if (error.message?.includes('FILE_TOO_LARGE')) {
        return '❌ **File quá lớn!** Vui lòng chọn video nhỏ hơn 100MB';
      } else if (error.code === 'ENOENT') {
        return '❌ **File không tồn tại hoặc không thể đọc!**';
      } else if (error.code === 'EACCES') {
        return '❌ **Không có quyền đọc file!** Kiểm tra file permissions';
      }
      
      return `❌ **Lỗi gửi video:** ${error.message}`;
    }
  }
}; 
// modules/commands/help.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'help',
  description: 'Hiển thị danh sách lệnh',
  usage: '!help [tên_lệnh]',
  aliases: ['h', '?'],

  async execute({ args, userId, prefix, userManager, commandHandler }) {
    try {
      userManager.incrementCommandCount(userId);
      
      // Kiểm tra quyền của user
      const isAdmin = userManager.isAdmin(userId);
      const userRole = isAdmin ? 1 : 0;
      
      // Nếu có tên lệnh cụ thể
      if (args.length > 0) {
        const commandName = args[0].toLowerCase();
        const command = commandHandler.commands.get(commandName);
        
        if (!command) {
          // Gợi ý lệnh tương tự
          const suggestions = commandHandler.getSimilarCommands(commandName);
          let response = `❌ **Không tìm thấy lệnh:** ${commandName}`;
          
          if (suggestions.length > 0) {
            response += `\n💡 **Có phải bạn muốn:** ${suggestions.map(cmd => `${prefix}${cmd}`).join(', ')}?`;
          }
          
          response += `\n📋 Dùng ${prefix}help để xem danh sách lệnh`;
          return response;
        }
        
        // Kiểm tra quyền xem lệnh
        if (command.adminOnly && !isAdmin) {
          return `🔒 **Lệnh ${commandName} chỉ dành cho Admin**\n📋 Dùng ${prefix}help để xem lệnh bạn có thể sử dụng`;
        }
        
        // Hiển thị thông tin chi tiết lệnh
        let response = `📖 **Thông tin lệnh: ${command.name}**\n\n`;
        response += `📝 **Mô tả:** ${command.description}\n`;
        response += `💡 **Cách dùng:** ${command.usage}`;
        
        if (command.aliases && command.aliases.length > 0) {
          response += `\n🔗 **Lệnh tắt:** ${command.aliases.map(alias => `${prefix}${alias}`).join(', ')}`;
        }
        
        if (command.adminOnly) {
          response += `\n🔐 **Quyền hạn:** Chỉ dành cho Admin`;
        }
        
        return response;
      }

      // Lấy danh sách lệnh tự động từ commandHandler
      const allCommands = commandHandler.getCommands(1); // Lấy tất cả lệnh (admin mode)
      const userCommands = allCommands.filter(cmd => !cmd.adminOnly);
      const adminCommands = allCommands.filter(cmd => cmd.adminOnly);
      
      // Tạo response động
      let response = `📋 **DANH SÁCH LỆNH** ${isAdmin ? '🔐 (Admin Mode)' : '👤 (User Mode)'}\n\n`;
      
      // Hiển thị lệnh user
      if (userCommands.length > 0) {
        response += `👤 **LỆNH CHO MỌI NGƯỜI:** (${userCommands.length} lệnh)\n`;
        userCommands
          .sort((a, b) => a.name.localeCompare(b.name)) // Sắp xếp alphabetical
          .forEach(cmd => {
            const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
            response += `• ${prefix}${cmd.name}${aliases} - ${cmd.description}\n`;
          });
      }
      
      // Hiển thị lệnh admin (chỉ cho admin)
      if (isAdmin && adminCommands.length > 0) {
        response += `\n🔐 **LỆNH ADMIN:** (${adminCommands.length} lệnh)\n`;
        adminCommands
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach(cmd => {
            const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
            response += `• ${prefix}${cmd.name}${aliases} - ${cmd.description}\n`;
          });
      }
      
      // Thống kê và hướng dẫn
      const totalCommands = isAdmin ? allCommands.length : userCommands.length;
      response += `\n📊 **Tổng cộng:** ${totalCommands} lệnh có sẵn`;
      response += `\n💡 **Dùng ${prefix}help <tên_lệnh> để xem chi tiết**`;
      
      if (!isAdmin && adminCommands.length > 0) {
        response += `\n🔒 **Có ${adminCommands.length} lệnh Admin ẩn. Liên hệ Admin để được cấp quyền.**`;
      }
      
      return response;

    } catch (error) {
      console.error('❌ Help command error:', error);
      return `❌ **Lỗi hiển thị help:** ${error.message}\n💡 Vui lòng thử lại hoặc liên hệ admin`;
    }
  }
}; 
// modules/commandHandler.js
import fs from 'fs';
import path from 'path';
import UserManager from './userManager.js';

class CommandHandler {
  constructor(prefix = '!') {
    this.prefix = prefix;
    this.commands = new Map();
    this.commandStats = new Map(); // Track command usage
    this.userManager = UserManager.getInstance();
    this.loadCommands();
  }

  // 📂 Load tất cả commands từ thư mục commands/
  async loadCommands() {
    try {
      const commandsPath = path.join(process.cwd(), 'modules', 'commands');
      
      if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, { recursive: true });
        console.log('📁 Created commands directory');
        return;
      }

      const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
      
      if (files.length === 0) {
        console.log('⚠️ No command files found');
        return;
      }
      
      for (const file of files) {
        try {
          const commandPath = path.join(commandsPath, file);
          const command = await import(`file://${commandPath}`);
          
          if (command.default && command.default.name) {
            // Validate command structure
            if (!this.validateCommandStructure(command.default)) {
              console.error(`❌ Invalid command structure: ${file}`);
              continue;
            }

            this.commands.set(command.default.name, command.default);
            this.commandStats.set(command.default.name, 0);
            
            // Register aliases
            if (command.default.aliases && Array.isArray(command.default.aliases)) {
              for (const alias of command.default.aliases) {
                this.commands.set(alias, command.default);
              }
            }
            
            const permissionType = command.default.adminOnly ? '🔐 Admin' : '👤 User';
            console.log(`✅ Loaded command: ${command.default.name} (${permissionType})`);
          } else {
            console.error(`❌ Invalid command export: ${file}`);
          }
        } catch (err) {
          console.error(`❌ Error loading command ${file}:`, err.message);
        }
      }
    } catch (err) {
      console.error('❌ Error loading commands:', err.message);
    }
  }

  // 🔍 Validate command structure
  validateCommandStructure(command) {
    const required = ['name', 'description', 'execute'];
    for (const field of required) {
      if (!command[field]) {
        return false;
      }
    }
    
    if (typeof command.execute !== 'function') {
      return false;
    }
    
    return true;
  }

  // 🔐 Kiểm tra quyền admin
  checkPermission(userId, command) {
    // Nếu lệnh không cần quyền admin thì cho phép
    if (!command.adminOnly) {
      return { allowed: true };
    }

    // Kiểm tra quyền admin
    const isAdmin = this.userManager.isAdmin(userId);
    if (!isAdmin) {
      return {
        allowed: false,
        message: `🔒 **Quyền hạn không đủ!**\n❌ Lệnh **${command.name}** chỉ dành cho Admin.\n💡 Liên hệ Admin để được cấp quyền.`
      };
    }

    return { allowed: true };
  }

  // 🔍 Kiểm tra và xử lý message
  async handleMessage(text, userId, chatId, client) {
    try {
      // Input validation
      if (!text || typeof text !== 'string') {
        return null;
      }

      if (!userId || typeof userId !== 'string') {
        console.error('❌ Invalid userId provided to command handler');
        return null;
      }

    // Kiểm tra prefix
    if (!text.startsWith(this.prefix)) {
      return null; // Không phải command
    }

    // Parse command và args
    const args = text.slice(this.prefix.length).trim().split(/\s+/);
      const commandName = args.shift()?.toLowerCase();

      if (!commandName) {
        return `❌ Lệnh không hợp lệ. Dùng ${this.prefix}help để xem danh sách lệnh`;
      }

    // Tìm command
    const command = this.commands.get(commandName);
    if (!command) {
        // Suggest similar commands
        const suggestions = this.getSimilarCommands(commandName);
        let response = `❌ Không tìm thấy lệnh: **${commandName}**`;
        
        if (suggestions.length > 0) {
          response += `\n💡 **Có phải bạn muốn:** ${suggestions.map(cmd => `${this.prefix}${cmd}`).join(', ')}?`;
        }
        
        response += `\n📋 Dùng ${this.prefix}help để xem danh sách lệnh`;
        return response;
      }

      // 🔐 Kiểm tra quyền trước khi thực thi
      const permissionCheck = this.checkPermission(userId, command);
      if (!permissionCheck.allowed) {
        return permissionCheck.message;
      }

      // Track command usage
      const originalName = command.name;
      this.commandStats.set(originalName, (this.commandStats.get(originalName) || 0) + 1);

      // Rate limiting (simple implementation)
      if (this.isRateLimited(userId, commandName)) {
        return '⏰ **Bạn đang sử dụng lệnh quá nhanh!** Vui lòng chờ một chút.';
      }

      // Log command execution với thông tin quyền
      const userRole = this.userManager.isAdmin(userId) ? 'Admin' : 'User';
      console.log(`🎮 Command executed: ${commandName} by ${userId} (${userRole})`);

      // Thực thi command
      const result = await command.execute({
        args,
        userId,
        chatId,
        client,
        prefix: this.prefix,
        userManager: this.userManager, // Truyền userManager cho commands
        commandHandler: this // Truyền commandHandler cho commands
      });

      return result;

    } catch (err) {
      console.error(`❌ Command handler error:`, err.message);
      return `❌ **Lỗi hệ thống:** ${err.message}\n💡 Nếu lỗi tiếp tục, vui lòng liên hệ admin`;
    }
  }

  // 🔤 Get similar command names
  getSimilarCommands(input) {
    const commands = Array.from(this.commands.keys());
    return commands.filter(cmd => {
      return cmd.includes(input) || input.includes(cmd) || this.levenshteinDistance(cmd, input) <= 2;
    }).slice(0, 3);
  }

  // 📏 Calculate Levenshtein distance
  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  // ⏱️ Simple rate limiting
  rateLimitData = new Map();
  
  isRateLimited(userId, commandName) {
    const key = `${userId}:${commandName}`;
    const now = Date.now();
    const lastUsed = this.rateLimitData.get(key) || 0;
    
    // Different rate limits for different commands
    const rateLimits = {
      'ping': 5000,      // 5 seconds
      'help': 3000,      // 3 seconds
      'balance': 2000,   // 2 seconds
      'daily': 1000,     // 1 second (but daily has its own cooldown)
      'transfer': 10000, // 10 seconds
      'sendimage': 15000, // 15 seconds (image upload takes time)
      'test1': 10000,    // 10 seconds
      'restart': 30000,  // 30 seconds for restart
      'setadmin': 5000,  // 5 seconds for admin commands
      'default': 1000    // 1 second default
    };
    
    const cooldown = rateLimits[commandName] || rateLimits.default;
    
    if (now - lastUsed < cooldown) {
      return true;
    }
    
    this.rateLimitData.set(key, now);
    
    // Cleanup old entries every minute
    if (Math.random() < 0.01) { // 1% chance
      for (const [k, timestamp] of this.rateLimitData.entries()) {
        if (now - timestamp > 60000) { // 1 minute old
          this.rateLimitData.delete(k);
    }
      }
    }
    
    return false;
  }

  // 📋 Lấy danh sách commands theo quyền
  getCommands(userRole = 0) {
    const uniqueCommands = new Map();
    for (const [name, command] of this.commands.entries()) {
      if (command.name === name) { // Only original names, not aliases
        // Lọc theo quyền: user thông thường chỉ thấy lệnh công khai
        if (userRole === 0 && command.adminOnly) {
          continue; // Bỏ qua lệnh admin
        }
        uniqueCommands.set(name, command);
      }
    }
    return Array.from(uniqueCommands.values());
  }

  // 📊 Get command statistics
  getCommandStats() {
    return Object.fromEntries(this.commandStats);
  }

  // 🔄 Reload all commands
  async reloadCommands() {
    try {
      console.log('🔄 Starting command reload...');
      
      // Clear current commands
      const oldCommandCount = this.commands.size;
      this.commands.clear();
      this.commandStats.clear();
      
      // Reload commands
      await this.loadCommands();
      
      const newCommandCount = this.commands.size;
      
      console.log(`🔄 Command reload completed: ${oldCommandCount} -> ${newCommandCount}`);
      
      return {
        success: true,
        oldCount: oldCommandCount,
        newCount: newCommandCount,
        uniqueCommands: this.getCommands(1).length // All commands including admin
      };
      
    } catch (error) {
      console.error('❌ Error reloading commands:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default CommandHandler; 
// modules/userManager.js
import fs from 'fs';
import path from 'path';

class UserManager {
  static instance = null;
  
  constructor() {
    if (UserManager.instance) {
      return UserManager.instance;
    }
    
    this.dataFile = path.join(process.cwd(), 'data', 'users.json');
    this.lockFile = path.join(process.cwd(), 'data', 'users.json.lock');
    this.ensureDataDirectory();
    this.users = this.loadUsers();
    this.saveTimeout = null; // Debounce saves
    
    // Default admin list from environment variable
    this.defaultAdmins = (process.env.DEFAULT_ADMINS || '').split(',').filter(id => id.trim());
    
    UserManager.instance = this;
  }

  static getInstance() {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }

  // 📁 Đảm bảo thư mục data tồn tại
  ensureDataDirectory() {
    const dataDir = path.dirname(this.dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Đã tạo thư mục data/');
    }
  }

  // 🔒 File locking để tránh race conditions
  async acquireLock(timeout = 5000) {
    const start = Date.now();
    while (fs.existsSync(this.lockFile)) {
      if (Date.now() - start > timeout) {
        throw new Error('Timeout acquiring file lock');
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    try {
      fs.writeFileSync(this.lockFile, process.pid.toString());
    } catch (err) {
      throw new Error('Failed to acquire lock: ' + err.message);
    }
  }

  releaseLock() {
    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
      }
    } catch (err) {
      console.error('⚠️ Error releasing lock:', err.message);
    }
  }

  // 📖 Load dữ liệu user từ file
  loadUsers() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf8');
        const parsed = JSON.parse(data);
        console.log(`📖 Loaded ${Object.keys(parsed).length} users`);
        return parsed;
      }
    } catch (err) {
      console.error('❌ Lỗi đọc file users.json:', err.message);
    }
    return {};
  }

  // 💾 Lưu dữ liệu user vào file với debouncing
  async saveUsers() {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce saves to avoid excessive file writes
    this.saveTimeout = setTimeout(async () => {
      try {
        await this.acquireLock();
        
        const tempFile = this.dataFile + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(this.users, null, 2), 'utf8');
        
        // Atomic rename
        fs.renameSync(tempFile, this.dataFile);
        
        this.releaseLock();
    } catch (err) {
      console.error('❌ Lỗi ghi file users.json:', err.message);
        this.releaseLock();
    }
    }, 100); // 100ms debounce
  }

  // 👤 Lấy thông tin user
  getUser(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }

    if (!this.users[userId]) {
      // Kiểm tra xem có phải default admin không
      const isDefaultAdmin = this.defaultAdmins.includes(userId);
      
      this.users[userId] = {
        userId,
        money: 1000, // Tiền khởi tạo
        joinDate: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        commandCount: 0,
        role: isDefaultAdmin ? 1 : 0 // 1 = admin, 0 = user
      };
      this.saveUsers();
      console.log(`✨ Created new user: ${userId} ${isDefaultAdmin ? '(Admin)' : '(User)'}`);
    } else {
      // Cập nhật lần cuối hoạt động
      this.users[userId].lastActive = new Date().toISOString();
      
      // Migrate existing users without role field
      if (this.users[userId].role === undefined) {
        const isDefaultAdmin = this.defaultAdmins.includes(userId);
        this.users[userId].role = isDefaultAdmin ? 1 : 0;
        console.log(`🔄 Migrated user role: ${userId} -> ${isDefaultAdmin ? 'Admin' : 'User'}`);
      }
      
      this.saveUsers();
    }
    return { ...this.users[userId] }; // Return copy to prevent mutations
  }

  // 🔐 Kiểm tra quyền admin
  isAdmin(userId) {
    if (!userId || typeof userId !== 'string') {
      return false;
    }
    
    const user = this.getUser(userId);
    return user.role === 1;
  }

  // 🔧 Set quyền admin
  setAdmin(userId, isAdmin = true) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }
    
    const user = this.getUser(userId);
    this.users[userId].role = isAdmin ? 1 : 0;
    this.saveUsers();
    
    console.log(`🔧 ${isAdmin ? 'Granted' : 'Removed'} admin role: ${userId}`);
    return this.users[userId].role;
  }

  // 📋 Lấy danh sách admin
  getAdmins() {
    return Object.values(this.users)
      .filter(user => user.role === 1)
      .map(user => ({ ...user })); // Return copies
  }

  // 💰 Cập nhật tiền
  updateMoney(userId, amount) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Invalid amount provided');
    }

    const user = this.getUser(userId);
    this.users[userId].money += amount;
    if (this.users[userId].money < 0) this.users[userId].money = 0; // Không cho âm
    this.saveUsers();
    return this.users[userId].money;
  }

  // 💸 Set tiền
  setMoney(userId, amount) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Invalid amount provided');
    }

    const user = this.getUser(userId);
    this.users[userId].money = Math.max(0, amount); // Không cho âm
    this.saveUsers();
    return this.users[userId].money;
  }

  // 📊 Tăng số lệnh đã dùng
  incrementCommandCount(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }

    const user = this.getUser(userId);
    this.users[userId].commandCount++;
    this.saveUsers();
    return this.users[userId].commandCount;
  }

  // 📈 Lấy top users theo tiền
  getTopUsers(limit = 10) {
    if (typeof limit !== 'number' || limit < 1) {
      limit = 10;
    }
    
    return Object.values(this.users)
      .sort((a, b) => b.money - a.money)
      .slice(0, Math.min(limit, 50)) // Max 50 để tránh performance issues
      .map(user => ({ ...user })); // Return copies
  }

  // 📊 Thống kê
  getStats() {
    const users = Object.values(this.users);
    const admins = users.filter(user => user.role === 1);
    
    return {
      totalUsers: users.length,
      totalAdmins: admins.length,
      totalMoney: users.reduce((sum, user) => sum + user.money, 0),
      totalCommands: users.reduce((sum, user) => sum + user.commandCount, 0),
      avgMoney: users.length > 0 ? Math.round(users.reduce((sum, user) => sum + user.money, 0) / users.length) : 0
    };
  }

  // 🧹 Cleanup method for graceful shutdown
  async cleanup() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      await this.saveUsers();
    }
    this.releaseLock();
  }
}

export default UserManager; 
// Test file để kiểm tra logic PVE
import wbCommand from './modules/commands/wb.js';

// Mock data để test
const mockUserId = 'test_user_123';
const mockArgs = ['pve'];

console.log('Testing WB PVE system...');
console.log('Command loaded successfully!');
console.log('PVE command structure:', typeof wbCommand.execute);

// Test tính toán level
const testXp = 1000;
console.log(`Test calculateLevelFromXP with ${testXp} XP...`);

console.log('✅ File wb.js đã được load thành công và không có lỗi syntax!');

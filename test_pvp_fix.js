// Quick test for PVP nonexistent user fix
import wbCommand from './modules/commands/wb.js';
import UserManager from './modules/userManager.js';

const userManager = UserManager.getInstance();

console.log('🔍 Testing PVP nonexistent user fix...\n');

async function testFix() {
  const testUserId = 'test_fix_user';
  
  // Ensure test user exists
  userManager.getUser(testUserId);
  
  console.log('Testing challenge to nonexistent user...');
  try {
    const result = await wbCommand.execute({ 
      userId: testUserId, 
      args: ['pvp', 'definitely_nonexistent_user_123456'] 
    });
    
    console.log('Result:', result);
    console.log('Fixed:', result.includes('Người chơi không tồn tại') ? '✅ Correctly blocked nonexistent user' : '❌ Still creates new user');
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testFix().catch(console.error);

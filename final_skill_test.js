// Final skill system test
console.log('🔥 FINAL SKILL SYSTEM TEST');

// Provide default environment variables so config can load in test environment
process.env.NODE_ENV = 'test';
process.env.APP_ID = process.env.APP_ID || 'test';
process.env.APP_SECRET = process.env.APP_SECRET || 'test';
process.env.ENCRYPT_KEY = process.env.ENCRYPT_KEY || 'test';
process.env.VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'test';

// Simulate wb command execution
const mockWbCommand = {
  async execute({ userId, args }) {
    const wbCommand = await import('./modules/commands/wb.js');
    return await wbCommand.default.execute({ userId, args });
  }
};

async function runTests() {
  const testUserId = 'skill_test_final';
  
  console.log('\n1. Testing skill command...');
  try {
    const skillResult = await mockWbCommand.execute({ userId: testUserId, args: ['skill'] });
    console.log('✅ wb skill command works');
    console.log('Result preview:', skillResult.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ wb skill command failed:', error.message);
  }
  
  console.log('\n2. Testing skill shop...');
  try {
    const shopResult = await mockWbCommand.execute({ userId: testUserId, args: ['shop'] });
    console.log('✅ wb shop command works');
    console.log('Has skills in shop:', shopResult.includes('🧙‍♂️ **Kỹ năng:**') ? 'Yes' : 'No');
  } catch (error) {
    console.log('❌ wb shop command failed:', error.message);
  }
  
  console.log('\n3. Testing skill buy...');
  try {
    // First give user some money
    const userManager = (await import('./modules/userManager.js')).default.getInstance();
    userManager.updateMoney(testUserId, 1000);
    
    const buyResult = await mockWbCommand.execute({ userId: testUserId, args: ['shop', 'buy', 'double_strike'] });
    console.log('✅ wb shop buy skill works');
    console.log('Buy result:', buyResult);
  } catch (error) {
    console.log('❌ wb shop buy skill failed:', error.message);
  }
  
  console.log('\n4. Testing skill equip...');
  try {
    const equipResult = await mockWbCommand.execute({ userId: testUserId, args: ['skill', 'equip', 'double_strike'] });
    console.log('✅ wb skill equip works');
    console.log('Equip result:', equipResult);
  } catch (error) {
    console.log('❌ wb skill equip failed:', error.message);
  }
  
  console.log('\n5. Testing final skill status...');
  try {
    const finalResult = await mockWbCommand.execute({ userId: testUserId, args: ['skill'] });
    console.log('✅ Final skill status check works');
    console.log('Has equipped skills:', finalResult.includes('[Đã trang bị]') ? 'Yes' : 'No');
  } catch (error) {
    console.log('❌ Final skill status failed:', error.message);
  }
  
  console.log('\n🎉 All skill tests completed!');
}

runTests().catch(console.error);

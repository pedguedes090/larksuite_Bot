// Test PVP System
import wbCommand from './modules/commands/wb.js';
import WB_DataManager from './modules/wbDataManager.js';
import UserManager from './modules/userManager.js';

const wbManager = WB_DataManager.getInstance();
const userManager = UserManager.getInstance();

console.log('⚔️ Testing PVP System...\n');

async function testPvpSystem() {
  const player1Id = 'pvp_test_player1';
  const player2Id = 'pvp_test_player2';
  
  // Setup users in general system
  userManager.getUser(player1Id);
  userManager.getUser(player2Id);
  
  // Setup WB users 
  const wbUser1 = wbManager.getUser(player1Id);
  const wbUser2 = wbManager.getUser(player2Id);
  
  console.log('1. Testing PVP status command...');
  try {
    const pvpStatus = await wbCommand.execute({ userId: player1Id, args: ['pvp'] });
    console.log('✅ PVP status works');
    console.log('Status preview:', pvpStatus.substring(0, 150) + '...');
  } catch (error) {
    console.log('❌ PVP status failed:', error.message);
  }
  
  console.log('\n2. Testing PVP challenge...');
  try {
    const challengeResult = await wbCommand.execute({ 
      userId: player1Id, 
      args: ['pvp', player2Id] 
    });
    console.log('✅ PVP challenge works');
    console.log('Challenge result:', challengeResult);
  } catch (error) {
    console.log('❌ PVP challenge failed:', error.message);
  }
  
  console.log('\n3. Testing challenge status...');
  try {
    const challengeStatus1 = await wbCommand.execute({ userId: player1Id, args: ['pvp'] });
    const challengeStatus2 = await wbCommand.execute({ userId: player2Id, args: ['pvp'] });
    
    console.log('Player 1 status (challenger):');
    console.log(challengeStatus1.includes('Đang chờ') ? '✅ Shows waiting status' : '❌ No waiting status');
    
    console.log('Player 2 status (target):');
    console.log(challengeStatus2.includes('Thách đấu từ') ? '✅ Shows challenge received' : '❌ No challenge notification');
  } catch (error) {
    console.log('❌ Challenge status check failed:', error.message);
  }
  
  console.log('\n4. Testing challenge accept...');
  try {
    const acceptResult = await wbCommand.execute({ 
      userId: player2Id, 
      args: ['pvp', 'ac'] 
    });
    console.log('✅ PVP accept works');
    console.log('Accept result preview:', acceptResult.substring(0, 200) + '...');
    
    // Check if combat result contains expected elements
    const hasWinner = acceptResult.includes('CHIẾN THẮNG') || acceptResult.includes('thắng');
    const hasDamage = acceptResult.includes('dmg');
    const hasTurns = acceptResult.includes('Turn');
    
    console.log(`Combat elements: Winner: ${hasWinner ? '✅' : '❌'}, Damage: ${hasDamage ? '✅' : '❌'}, Turns: ${hasTurns ? '✅' : '❌'}`);
  } catch (error) {
    console.log('❌ PVP accept failed:', error.message);
  }
  
  console.log('\n5. Testing PVP stats update...');
  try {
    const finalStatus1 = await wbCommand.execute({ userId: player1Id, args: ['pvp'] });
    const finalStatus2 = await wbCommand.execute({ userId: player2Id, args: ['pvp'] });
    
    console.log('Player 1 final status:');
    console.log(finalStatus1.includes('W/') && finalStatus1.includes('L') ? '✅ Stats updated' : '❌ Stats not updated');
    
    console.log('Player 2 final status:');
    console.log(finalStatus2.includes('W/') && finalStatus2.includes('L') ? '✅ Stats updated' : '❌ Stats not updated');
  } catch (error) {
    console.log('❌ PVP stats check failed:', error.message);
  }
  
  console.log('\n🎉 PVP system test completed!');
}

testPvpSystem().catch(console.error);

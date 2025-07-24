// Test PVP Edge Cases & Advanced Features
import wbCommand from './modules/commands/wb.js';
import WB_DataManager from './modules/wbDataManager.js';
import UserManager from './modules/userManager.js';

const wbManager = WB_DataManager.getInstance();
const userManager = UserManager.getInstance();

console.log('🔥 Testing PVP Edge Cases & Advanced Features...\n');

async function testPvpAdvanced() {
  const player1Id = 'pvp_advanced_1';
  const player2Id = 'pvp_advanced_2';
  const player3Id = 'pvp_advanced_3';
  
  // Setup users
  userManager.getUser(player1Id);
  userManager.getUser(player2Id);
  userManager.getUser(player3Id);
  
  // Level up player 1 significantly for level difference test
  const wbUser1 = wbManager.getUser(player1Id);
  wbUser1.level = 15;
  wbUser1.maxHp = 380; // Level 15 HP
  wbUser1.hp = 380;
  wbUser1.baseAttack = 52; // Level 15 attack
  wbUser1.baseDefense = 33; // Level 15 defense
  
  console.log('1. Testing level difference restriction...');
  try {
    const challengeResult = await wbCommand.execute({ 
      userId: player1Id, 
      args: ['pvp', player2Id] 
    });
    console.log('Level diff test:', challengeResult.includes('Chênh lệch level quá lớn') ? '✅ Blocked high level diff' : '❌ Allowed high level diff');
  } catch (error) {
    console.log('❌ Level diff test failed:', error.message);
  }
  
  console.log('\n2. Testing self-challenge prevention...');
  try {
    const selfChallengeResult = await wbCommand.execute({ 
      userId: player1Id, 
      args: ['pvp', player1Id] 
    });
    console.log('Self challenge test:', selfChallengeResult.includes('Không thể thách đấu chính mình') ? '✅ Prevented self challenge' : '❌ Allowed self challenge');
  } catch (error) {
    console.log('❌ Self challenge test failed:', error.message);
  }
  
  console.log('\n3. Testing nonexistent user challenge...');
  try {
    const nonExistResult = await wbCommand.execute({ 
      userId: player1Id, 
      args: ['pvp', 'nonexistent_user_12345'] 
    });
    console.log('Nonexistent user test:', nonExistResult.includes('Người chơi không tồn tại') ? '✅ Detected nonexistent user' : '❌ Allowed nonexistent user');
  } catch (error) {
    console.log('❌ Nonexistent user test failed:', error.message);
  }
  
  console.log('\n4. Testing challenge decline...');
  try {
    // Reset level for valid challenge
    wbUser1.level = 3;
    
    // Send challenge
    await wbCommand.execute({ 
      userId: player1Id, 
      args: ['pvp', player2Id] 
    });
    
    // Decline challenge
    const declineResult = await wbCommand.execute({ 
      userId: player2Id, 
      args: ['pvp', 'decline'] 
    });
    console.log('Decline test:', declineResult.includes('ĐÃ TỪ CHỐI THÁCH ĐẤU') ? '✅ Challenge declined' : '❌ Decline failed');
  } catch (error) {
    console.log('❌ Challenge decline test failed:', error.message);
  }
  
  console.log('\n5. Testing challenge cancel...');
  try {
    // Send new challenge
    await wbCommand.execute({ 
      userId: player1Id, 
      args: ['pvp', player2Id] 
    });
    
    // Cancel challenge
    const cancelResult = await wbCommand.execute({ 
      userId: player1Id, 
      args: ['pvp', 'cancel'] 
    });
    console.log('Cancel test:', cancelResult.includes('ĐÃ HỦY THÁCH ĐẤU') ? '✅ Challenge cancelled' : '❌ Cancel failed');
  } catch (error) {
    console.log('❌ Challenge cancel test failed:', error.message);
  }
  
  console.log('\n6. Testing multiple challenges...');
  try {
    // Send challenge to player2
    await wbCommand.execute({ 
      userId: player1Id, 
      args: ['pvp', player2Id] 
    });
    
    // Try to send another challenge to player3
    const multiChallengeResult = await wbCommand.execute({ 
      userId: player1Id, 
      args: ['pvp', player3Id] 
    });
    console.log('Multiple challenge test:', multiChallengeResult.includes('Bạn đã gửi thách đấu rồi') ? '✅ Prevented multiple challenges' : '❌ Allowed multiple challenges');
  } catch (error) {
    console.log('❌ Multiple challenge test failed:', error.message);
  }
  
  console.log('\n7. Testing challenge timeout (simulated)...');
  try {
    // Get user and manually expire challenge
    const wbUser1Updated = wbManager.getUser(player1Id);
    if (wbUser1Updated.pvp?.challenges?.sent) {
      wbUser1Updated.pvp.challenges.sent.timestamp = Date.now() - 70000; // 70 seconds ago
      wbManager.saveUsers();
    }
    
    // Try to send new challenge (should work since old one expired)
    const expiredChallengeResult = await wbCommand.execute({ 
      userId: player1Id, 
      args: ['pvp', player3Id] 
    });
    console.log('Timeout test:', expiredChallengeResult.includes('THÁCH ĐẤU ĐÃ GỬI') ? '✅ Expired challenge cleared' : '❌ Expired challenge still active');
  } catch (error) {
    console.log('❌ Challenge timeout test failed:', error.message);
  }
  
  console.log('\n🎯 PVP edge cases test completed!');
}

testPvpAdvanced().catch(console.error);

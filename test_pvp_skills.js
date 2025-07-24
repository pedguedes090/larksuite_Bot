// Test PVP with Skills
import wbCommand from './modules/commands/wb.js';
import WB_DataManager from './modules/wbDataManager.js';
import UserManager from './modules/userManager.js';

const wbManager = WB_DataManager.getInstance();
const userManager = UserManager.getInstance();

console.log('🧙‍♂️ Testing PVP with Skills...\n');

async function testPvpWithSkills() {
  const player1Id = 'pvp_skill_test1';
  const player2Id = 'pvp_skill_test2';
  
  // Setup users
  userManager.getUser(player1Id);
  userManager.getUser(player2Id);
  userManager.updateMoney(player1Id, 2000);
  userManager.updateMoney(player2Id, 2000);
  
  console.log('1. Setting up players with skills...');
  
  // Player 1: Attack focused
  await wbCommand.execute({ userId: player1Id, args: ['shop', 'buy', 'double_strike'] });
  await wbCommand.execute({ userId: player1Id, args: ['shop', 'buy', 'fireball'] });
  await wbCommand.execute({ userId: player1Id, args: ['skill', 'equip', 'double_strike'] });
  await wbCommand.execute({ userId: player1Id, args: ['skill', 'equip', 'fireball'] });
  
  // Player 2: Balanced (heal + attack)
  await wbCommand.execute({ userId: player2Id, args: ['shop', 'buy', 'heal'] });
  await wbCommand.execute({ userId: player2Id, args: ['shop', 'buy', 'double_strike'] });
  await wbCommand.execute({ userId: player2Id, args: ['skill', 'equip', 'heal'] });
  await wbCommand.execute({ userId: player2Id, args: ['skill', 'equip', 'double_strike'] });
  
  console.log('✅ Players equipped with skills');
  
  console.log('\n2. Checking equipped skills...');
  const skillStatus1 = await wbCommand.execute({ userId: player1Id, args: ['skill'] });
  const skillStatus2 = await wbCommand.execute({ userId: player2Id, args: ['skill'] });
  
  console.log('Player 1 skills:', skillStatus1.includes('[Đã trang bị]') ? '✅ Has equipped skills' : '❌ No equipped skills');
  console.log('Player 2 skills:', skillStatus2.includes('[Đã trang bị]') ? '✅ Has equipped skills' : '❌ No equipped skills');
  
  console.log('\n3. Starting PVP with skills...');
  
  // Challenge
  await wbCommand.execute({ userId: player1Id, args: ['pvp', player2Id] });
  
  // Accept and fight
  const fightResult = await wbCommand.execute({ userId: player2Id, args: ['pvp', 'ac'] });
  
  console.log('✅ PVP with skills completed');
  console.log('\n--- COMBAT RESULT ---');
  console.log(fightResult);
  
  // Check for skill usage indicators
  const hasSkillUsage = fightResult.includes('dùng') || fightResult.includes('🌀') || fightResult.includes('💚') || fightResult.includes('🔥');
  const hasWinner = fightResult.includes('CHIẾN THẮNG');
  const hasSkillTitle = fightResult.includes('WITH SKILLS');
  
  console.log('\n--- ANALYSIS ---');
  console.log(`✅ Has skill title: ${hasSkillTitle ? 'Yes' : 'No'}`);
  console.log(`✅ Skills were used: ${hasSkillUsage ? 'Yes' : 'No'}`);
  console.log(`✅ Has winner: ${hasWinner ? 'Yes' : 'No'}`);
  
  console.log('\n🎉 PVP with skills test completed!');
}

testPvpWithSkills().catch(console.error);

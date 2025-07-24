// Test combat with skills
import WB_DataManager from './modules/wbDataManager.js';
import UserManager from './modules/userManager.js';

const wbManager = WB_DataManager.getInstance();
const userManager = UserManager.getInstance();

console.log('⚔️ Testing Combat with Skills...\n');

const testUserId = 'test_combat_user';

// Setup user cho combat test
console.log('1. Setting up user for combat test...');
const user = wbManager.getUser(testUserId);
console.log(`User level: ${user.level}, HP: ${user.hp}/${user.maxHp}, MP: ${user.mp}/${user.maxMp}`);

// Add some skills
wbManager.addSkillToUser(testUserId, 'double_strike');
wbManager.addSkillToUser(testUserId, 'heal');
wbManager.addSkillToUser(testUserId, 'fireball');

// Equip skills
wbManager.equipSkill(testUserId, 'double_strike');
wbManager.equipSkill(testUserId, 'heal');
wbManager.equipSkill(testUserId, 'fireball');

const userAfterSkills = wbManager.getUser(testUserId);
console.log(`Equipped skills: ${userAfterSkills.equippedSkills?.join(', ') || 'None'}`);

// Test skill cooldowns
console.log('\n2. Testing skill cooldowns...');
wbManager.setSkillCooldown(testUserId, 'double_strike', 3);
console.log(`Double strike cooldown: ${wbManager.getSkillCooldown(testUserId, 'double_strike')}`);

wbManager.decreaseSkillCooldowns(testUserId);
console.log(`After decrease: ${wbManager.getSkillCooldown(testUserId, 'double_strike')}`);

// Test useSkill
console.log('\n3. Testing useSkill function...');
const useResult = wbManager.useSkill(testUserId, 'heal');
console.log(`Use heal skill: ${useResult.success ? 'Success' : 'Failed'} - ${useResult.message}`);

const userAfterUse = wbManager.getUser(testUserId);
console.log(`MP after using heal: ${userAfterUse.mp}/${userAfterUse.maxMp}`);
console.log(`Heal cooldown: ${wbManager.getSkillCooldown(testUserId, 'heal')}`);

console.log('\n✅ Combat skill test completed!');

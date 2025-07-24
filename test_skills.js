// Test file để kiểm tra hệ thống skill
import WB_DataManager from './modules/wbDataManager.js';
import UserManager from './modules/userManager.js';

const wbManager = WB_DataManager.getInstance();
const userManager = UserManager.getInstance();

console.log('🧙‍♂️ Testing Skill System...\n');

const testUserId = 'test_skill_user';

// 1. Test lấy tất cả skills
console.log('1. Testing getAllSkills:');
const allSkills = wbManager.getAllSkills();
console.log(`Found ${allSkills.length} skills:`);
allSkills.forEach(skill => {
  console.log(`  - ${skill.id}: ${skill.name} (${skill.type})`);
});

// 2. Test lấy skill cụ thể
console.log('\n2. Testing getSkill:');
const doubleStrike = wbManager.getSkill('double_strike');
console.log('Double Strike skill:', doubleStrike ? 'Found' : 'Not found');
if (doubleStrike) {
  console.log(`  Name: ${doubleStrike.name}`);
  console.log(`  MP Cost: ${doubleStrike.mp_cost}`);
  console.log(`  Cooldown: ${doubleStrike.cooldown}`);
  console.log(`  Effect: ${doubleStrike.effect}`);
}

// 3. Test thêm skill cho user
console.log('\n3. Testing addSkillToUser:');
const added = wbManager.addSkillToUser(testUserId, 'double_strike');
console.log(`Added double_strike to user: ${added ? 'Success' : 'Failed'}`);

// 4. Test trang bị skill
console.log('\n4. Testing equipSkill:');
const equipResult = wbManager.equipSkill(testUserId, 'double_strike');
console.log(`Equip result: ${equipResult.success ? 'Success' : 'Failed'} - ${equipResult.message}`);

// 5. Test user data
console.log('\n5. Testing user skill data:');
const user = wbManager.getUser(testUserId);
console.log(`User owned skills: ${user.skills?.length || 0}`);
console.log(`User equipped skills: ${user.equippedSkills?.length || 0}`);
if (user.skills) console.log(`  Owned: ${user.skills.join(', ')}`);
if (user.equippedSkills) console.log(`  Equipped: ${user.equippedSkills.join(', ')}`);

// 6. Test passive skill
console.log('\n6. Testing passive skill:');
const addedPassive = wbManager.addSkillToUser(testUserId, 'fury');
const equipPassiveResult = wbManager.equipSkill(testUserId, 'fury');
console.log(`Added passive fury: ${addedPassive ? 'Success' : 'Failed'}`);
console.log(`Equipped passive fury: ${equipPassiveResult.success ? 'Success' : 'Failed'} - ${equipPassiveResult.message}`);

// 7. Test stats với passive
console.log('\n7. Testing stats with passive effects:');
const stats = wbManager.getEquippedStats(testUserId);
console.log(`User stats with passive:`, stats);

console.log('\n✅ Skill system test completed!');

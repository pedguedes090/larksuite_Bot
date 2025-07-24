import fs from 'fs';
import UserManager from './modules/userManager.js';
import WB_DataManager from './modules/wbDataManager.js';

const userManager = new UserManager();
const wbManager = new WB_DataManager();

console.log('🧙‍♂️ Testing PVP Skills in Detail...');

async function testDetailedPvpSkills() {
  // Create test players
  const player1Id = 'skill_test_p1';
  const player2Id = 'skill_test_p2';
  
  // Create new users (will overwrite if exists)
  userManager.getUser(player1Id); // This will create if not exists
  userManager.getUser(player2Id);
  
  console.log('✨ Created test players');
  
  // Add skills to users
  console.log('🔧 Adding skills to users...');
  const addResult1 = wbManager.addSkillToUser(player1Id, 'heal'); // heal_30
  const addResult2 = wbManager.addSkillToUser(player1Id, 'double_strike'); // double_attack
  const addResult3 = wbManager.addSkillToUser(player2Id, 'fireball'); // fireball
  const addResult4 = wbManager.addSkillToUser(player2Id, 'heal'); // heal_30
  
  console.log('Add skill results:', { addResult1, addResult2, addResult3, addResult4 });
  
  // Check user skills before equip
  const p1User = wbManager.getUser(player1Id);
  const p2User = wbManager.getUser(player2Id);
  console.log('Player 1 owned skills:', p1User.skills || []);
  console.log('Player 2 owned skills:', p2User.skills || []);
  
  // Equip skills
  console.log('🔧 Equipping skills...');
  const equipResult1 = wbManager.equipSkill(player1Id, 'heal');
  const equipResult2 = wbManager.equipSkill(player1Id, 'double_strike');
  const equipResult3 = wbManager.equipSkill(player2Id, 'fireball');
  const equipResult4 = wbManager.equipSkill(player2Id, 'heal');
  
  console.log('Equip skill results:', { equipResult1, equipResult2, equipResult3, equipResult4 });
  
  console.log('✅ Players equipped with skills');
  
  // Check equipped skills
  const p1User2 = wbManager.getUser(player1Id);
  const p2User2 = wbManager.getUser(player2Id);
  console.log('Player 1 data after equip:', JSON.stringify(p1User2, null, 2));
  console.log('Player 2 data after equip:', JSON.stringify(p2User2, null, 2));
  
  const p1Skills = p1User2.equippedSkills || []; // Chú ý: equippedSkills chứ không phải equipped_skills
  const p2Skills = p2User2.equippedSkills || [];
  console.log(`Player 1 equipped: ${p1Skills.join(', ')}`);
  console.log(`Player 2 equipped: ${p2Skills.join(', ')}`);
  
  // Test skill data loading
  console.log('\n📋 Available Skills:');
  const allSkills = wbManager.getAllSkills();
  for (const skill of allSkills) {
    console.log(`- ${skill.id}: ${skill.name} (${skill.category}, ${skill.mp_cost} MP, ${skill.effect})`);
  }
  
  // Manually test calculatePvpTurnWithSkills function
  console.log('\n🔧 Testing skill calculation manually...');
  
  // Simulate low HP scenario for player 1 (should trigger heal)
  const p1Stats = { attack: 10, defense: 2 };
  const p2Stats = { attack: 8, defense: 3 };
  
  // Test heal trigger (HP < 40%) - Should use heal skill since HP=30 < 40% of 100
  console.log('\n--- Test 1: Low HP should trigger heal ---');
  const result1 = testSkillFunction(player1Id, p1Stats, p2Stats, 50, 30, 100, ['heal'], {});
  console.log('Result 1:', result1);
  
  // Test normal HP should use attack skill - Should use fireball since HP=80 > 40% of 100  
  console.log('\n--- Test 2: Normal HP should use attack skill ---');
  const result2 = testSkillFunction(player2Id, p2Stats, p1Stats, 50, 80, 100, ['fireball'], {});
  console.log('Result 2:', result2);
  
  // Test with no MP (should fallback to normal attack)
  console.log('\n--- Test 3: No MP should fallback to normal attack ---');
  const result3 = testSkillFunction(player1Id, p1Stats, p2Stats, 0, 80, 100, ['heal'], {});
  console.log('Result 3:', result3);
  
  console.log('\n✅ Detailed PVP skills test completed!');
}

// Copy the calculatePvpTurnWithSkills function for testing
function testSkillFunction(playerId, attackerStats, defenderStats, currentMp, currentHp, maxHp, equippedSkills, skillCooldowns) {
  let usedSkill = null;
  let skillMsg = '';
  let damage = 0;
  let mp = currentMp;
  let hp = currentHp;
  
  console.log(`  Input: MP=${mp}, HP=${hp}/${maxHp}, Skills=[${equippedSkills.join(',')}]`);
  
  // Smart skill selection (similar to PVE auto-combat)
  // Prioritize heal if HP < 40%
  for (const skillId of equippedSkills) {
    const skill = wbManager.getSkill(skillId);
    if (!skill) {
      console.log(`  ❌ Skill ${skillId} not found`);
      continue;
    }
    console.log(`  🔍 Checking heal skill: ${skill.name} (${skill.category}, ${skill.mp_cost} MP)`);
    console.log(`    - HP condition: ${hp} < ${maxHp * 0.4} = ${hp < maxHp * 0.4}`);
    console.log(`    - MP condition: ${mp} >= ${skill.mp_cost} = ${mp >= skill.mp_cost}`);
    console.log(`    - Cooldown condition: ${skillCooldowns[skillId] || 0} <= 0 = ${(skillCooldowns[skillId] || 0) <= 0}`);
    if (skill.category === 'heal' && (skillCooldowns[skillId] || 0) <= 0 && mp >= skill.mp_cost && hp < maxHp * 0.4) {
      usedSkill = skill;
      console.log(`  ✅ Selected heal skill: ${skill.name}`);
      break;
    }
  }
  
  // If no heal needed, prioritize attack skills
  if (!usedSkill) {
    for (const skillId of equippedSkills) {
      const skill = wbManager.getSkill(skillId);
      if (!skill) continue;
      console.log(`  🔍 Checking attack skill: ${skill.name} (${skill.category}, ${skill.mp_cost} MP)`);
      console.log(`    - Category condition: '${skill.category}' === 'attack' = ${skill.category === 'attack'}`);
      console.log(`    - MP condition: ${mp} >= ${skill.mp_cost} = ${mp >= skill.mp_cost}`);
      console.log(`    - Cooldown condition: ${skillCooldowns[skillId] || 0} <= 0 = ${(skillCooldowns[skillId] || 0) <= 0}`);
      if (skill.category === 'attack' && (skillCooldowns[skillId] || 0) <= 0 && mp >= skill.mp_cost) {
        usedSkill = skill;
        console.log(`  ✅ Selected attack skill: ${skill.name}`);
        break;
      }
    }
  }
  
  // If no attack, use buff skills
  if (!usedSkill) {
    for (const skillId of equippedSkills) {
      const skill = wbManager.getSkill(skillId);
      if (!skill) continue;
      console.log(`  🔍 Checking buff skill: ${skill.name} (${skill.category}, ${skill.mp_cost} MP)`);
      if (skill.category === 'buff' && skillCooldowns[skillId] <= 0 && mp >= skill.mp_cost) {
        usedSkill = skill;
        console.log(`  ✅ Selected buff skill: ${skill.name}`);
        break;
      }
    }
  }
  
  if (!usedSkill) {
    console.log(`  ⚔️ No skill selected, using normal attack`);
  }
  
  // Calculate damage based on skill or normal attack
  if (usedSkill) {
    mp -= usedSkill.mp_cost;
    skillCooldowns[usedSkill.id] = usedSkill.cooldown;
    
    switch (usedSkill.effect) {
      case 'double_attack':
        damage = Math.max(1, Math.floor(attackerStats.attack * 0.8) - defenderStats.defense);
        skillMsg = `🌀 ${playerId} dùng ${usedSkill.name}! 2 đòn, mỗi đòn ${damage} sát thương.`;
        damage = damage * 2;
        break;
      case 'heal_30':
        const heal = Math.floor(maxHp * 0.3);
        hp = Math.min(maxHp, hp + heal);
        skillMsg = `💚 ${playerId} dùng ${usedSkill.name}! Hồi ${heal} HP (${hp}/${maxHp})`;
        damage = 0;
        break;
      case 'fireball':
        damage = Math.max(1, Math.floor(attackerStats.attack * 1.5) - Math.floor(defenderStats.defense * 0.8));
        skillMsg = `🔥 ${playerId} dùng ${usedSkill.name}! Gây ${damage} sát thương phép.`;
        break;
      default:
        skillMsg = `${playerId} dùng ${usedSkill.name}!`;
        damage = Math.max(1, attackerStats.attack - defenderStats.defense);
    }
  } else {
    // Normal attack with crit chance
    const baseDamage = Math.max(1, attackerStats.attack - defenderStats.defense);
    const critChance = 0.15;
    const isCrit = Math.random() < critChance;
    damage = isCrit ? Math.floor(baseDamage * 1.5) : baseDamage;
    if (isCrit) skillMsg = `🎯 Critical Hit!`;
  }
  
  return {
    damage: damage,
    mp: mp,
    hp: hp,
    skillMsg: skillMsg,
    usedSkill: usedSkill ? usedSkill.name : 'Normal Attack'
  };
}

testDetailedPvpSkills().catch(console.error);

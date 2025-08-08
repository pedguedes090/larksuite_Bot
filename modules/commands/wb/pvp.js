import { wbManager, userManager } from './utils.js';

export default async function handlePvp({ userId, args }) {
  const subcommand = args[1]?.toLowerCase();
  
  if (!subcommand) {
    const wbUser = wbManager.getUser(userId);
    const stats = wbUser.pvp || { wins: 0, losses: 0, totalFights: 0 };
    
    let statusText = '';
    if (wbUser.pvp?.challenges?.received) {
      const challenge = wbUser.pvp.challenges.received;
      const timeLeft = Math.max(0, 60 - Math.floor((Date.now() - challenge.timestamp) / 1000));
      if (timeLeft > 0) {
        statusText = `\n🔔 **Thách đấu từ ${challenge.from}** (${timeLeft}s còn lại)\n   Dùng \`wb pvp ac\` để chấp nhận!`;
      }
    }
    
    if (wbUser.pvp?.challenges?.sent) {
      const challenge = wbUser.pvp.challenges.sent;
      const timeLeft = Math.max(0, 60 - Math.floor((Date.now() - challenge.timestamp) / 1000));
      if (timeLeft > 0) {
        statusText = `\n⏳ **Đang chờ ${challenge.to} phản hồi** (${timeLeft}s còn lại)`;
      }
    }
    
    if (wbUser.pvp?.inPvP) {
      statusText = `\n⚔️ **Đang trong trận PvP với ${wbUser.pvp.opponent}**\n   Trận đấu đang diễn ra tự động!`;
    }

    return `--- ⚔️ **PVP SYSTEM** ---
📊 **Stats:** ${stats.wins}W/${stats.losses}L (${stats.totalFights} fights)${statusText}

**Commands:**
\`wb pvp <userId>\` - Thách đấu người chơi
\`wb pvp ac\` - Chấp nhận thách đấu (auto combat)
\`wb pvp decline\` - Từ chối thách đấu
\`wb pvp cancel\` - Hủy thách đấu đã gửi`;
  }
  
  // Accept challenge
  if (subcommand === 'ac' || subcommand === 'accept') {
    return await handlePvpAccept(userId);
  }
  
  // Decline challenge
  if (subcommand === 'decline' || subcommand === 'reject') {
    return await handlePvpDecline(userId);
  }
  
  // Cancel sent challenge
  if (subcommand === 'cancel') {
    return await handlePvpCancel(userId);
  }
  
  // No manual attack needed - PvP is auto combat
  
  // Challenge someone
  const targetId = subcommand;
  return await handlePvpChallenge(userId, targetId);
}

async function handlePvpChallenge(challengerId, targetId) {
  // Validate basic conditions
  if (!targetId) return '❌ **Thiếu tham số!** Sử dụng: `wb pvp <userId>`';
  
  const challenger = wbManager.getUser(challengerId);
  
  // Check if target user exists without creating them
  if (!userManager.userExists(targetId)) {
    return '❌ Người chơi không tồn tại!';
  }
  
  if (targetId === challengerId) return '❌ Không thể thách đấu chính mình!';
  
  // Now get target user since we know they exist
  const target = userManager.getUser(targetId);
  
  // Initialize PvP data if not exists
  if (!challenger.pvp) {
    challenger.pvp = {
      challenges: { sent: null, received: null },
      inPvP: false,
      opponent: null,
      stats: { wins: 0, losses: 0, totalFights: 0 }
    };
  }
  
  const targetWbUser = wbManager.getUser(targetId);
  if (!targetWbUser.pvp) {
    targetWbUser.pvp = {
      challenges: { sent: null, received: null },
      inPvP: false,
      opponent: null,
      stats: { wins: 0, losses: 0, totalFights: 0 }
    };
  }
  
  // Check combat states
  if (challenger.combatState.inCombat) return '❌ Bạn đang trong trận chiến PvE!';
  if (targetWbUser.combatState.inCombat) return '❌ Đối thủ đang bận chiến đấu PvE!';
  if (challenger.pvp.inPvP) return '❌ Bạn đang trong trận PvP!';
  if (targetWbUser.pvp.inPvP) return '❌ Đối thủ đang trong trận PvP khác!';
  
  // Check existing challenges
  if (challenger.pvp.challenges.sent) {
    const timeLeft = Math.max(0, 60 - Math.floor((Date.now() - challenger.pvp.challenges.sent.timestamp) / 1000));
    if (timeLeft > 0) {
      return `❌ Bạn đã gửi thách đấu rồi! Còn ${timeLeft}s. Dùng \`wb pvp cancel\` để hủy.`;
    } else {
      // Clean up expired challenge
      challenger.pvp.challenges.sent = null;
    }
  }
  
  if (targetWbUser.pvp.challenges.received) {
    const timeLeft = Math.max(0, 60 - Math.floor((Date.now() - targetWbUser.pvp.challenges.received.timestamp) / 1000));
    if (timeLeft > 0) {
      return '❌ Đối thủ đang có thách đấu khác chờ xử lý!';
    } else {
      // Clean up expired challenge
      targetWbUser.pvp.challenges.received = null;
    }
  }
  
  // Level difference check
  const levelDiff = Math.abs(challenger.level - targetWbUser.level);
  if (levelDiff > 10) {
    return `❌ Chênh lệch level quá lớn! (${levelDiff} levels, tối đa 10)`;
  }
  
  // Send challenge
  const timestamp = Date.now();
  challenger.pvp.challenges.sent = { to: targetId, timestamp };
  targetWbUser.pvp.challenges.received = { from: challengerId, timestamp };
  
  wbManager.saveUsers();
  
  return `⚔️ **THÁCH ĐẤU ĐÃ GỬI!**
Đã thách đấu **${targetId}** (Lv.${targetWbUser.level})
⏰ Thời hạn: 60 giây

Đối thủ sẽ nhận được thông báo khi dùng lệnh wb.`;
}

async function handlePvpAccept(userId) {
  const user = wbManager.getUser(userId);
  
  if (!user.pvp) {
    user.pvp = {
      challenges: { sent: null, received: null },
      inPvP: false,
      opponent: null,
      stats: { wins: 0, losses: 0, totalFights: 0 }
    };
  }
  
  const challenge = user.pvp.challenges.received;
  
  if (!challenge) {
    return '❌ Bạn không có thách đấu nào!';
  }
  
  // Check timeout (1 minute = 60000ms)
  const timeLeft = Math.max(0, 60 - Math.floor((Date.now() - challenge.timestamp) / 1000));
  if (timeLeft <= 0) {
    user.pvp.challenges.received = null;
    wbManager.saveUsers();
    return '⏰ Thách đấu đã hết hạn!';
  }
  
  const challenger = wbManager.getUser(challenge.from);
  if (!challenger.pvp?.challenges?.sent || challenger.pvp.challenges.sent.to !== userId) {
    user.pvp.challenges.received = null;
    wbManager.saveUsers();
    return '❌ Thách đấu đã được hủy!';
  }
  
  // Start PvP
  return await startPvPCombat(challenge.from, userId);
}

async function handlePvpDecline(userId) {
  const user = wbManager.getUser(userId);
  
  if (!user.pvp?.challenges?.received) {
    return '❌ Bạn không có thách đấu nào để từ chối!';
  }
  
  const challengerId = user.pvp.challenges.received.from;
  const challenger = wbManager.getUser(challengerId);
  
  // Clean up challenges
  user.pvp.challenges.received = null;
  if (challenger.pvp?.challenges?.sent) {
    challenger.pvp.challenges.sent = null;
  }
  
  wbManager.saveUsers();
  
  return `❌ **ĐÃ TỪ CHỐI THÁCH ĐẤU**
Bạn đã từ chối thách đấu từ **${challengerId}**.`;
}

async function handlePvpCancel(userId) {
  const user = wbManager.getUser(userId);
  
  if (!user.pvp?.challenges?.sent) {
    return '❌ Bạn không có thách đấu nào để hủy!';
  }
  
  const targetId = user.pvp.challenges.sent.to;
  const target = wbManager.getUser(targetId);
  
  // Clean up challenges
  user.pvp.challenges.sent = null;
  if (target.pvp?.challenges?.received) {
    target.pvp.challenges.received = null;
  }
  
  wbManager.saveUsers();
  
  return `🚫 **ĐÃ HỦY THÁCH ĐẤU**
Đã hủy thách đấu gửi tới **${targetId}**.`;
}

async function startPvPCombat(player1Id, player2Id) {
  const player1 = wbManager.getUser(player1Id);
  const player2 = wbManager.getUser(player2Id);
  
  // Clean up challenges
  player1.pvp.challenges.sent = null;
  player2.pvp.challenges.received = null;
  
  // Reset HP về ban đầu cho fair fight
  const stats1 = wbManager.getEquippedStats(player1Id);
  const stats2 = wbManager.getEquippedStats(player2Id);
  
  const maxHp1 = player1.maxHp + stats1.hpBonus;
  const maxHp2 = player2.maxHp + stats2.hpBonus;
  
  // Set PvP state và reset HP
  player1.pvp.inPvP = true;
  player1.pvp.opponent = player2Id;
  player1.pvp.currentHp = maxHp1;
  player1.hp = maxHp1; // Reset HP in main stats too
  
  player2.pvp.inPvP = true;
  player2.pvp.opponent = player1Id;
  player2.pvp.currentHp = maxHp2;
  player2.hp = maxHp2; // Reset HP in main stats too
  
  wbManager.saveUsers();
  
  // Start auto combat immediately
  return await handlePvpAutoCombat(player1Id, player2Id);
}

async function handlePvpAutoCombat(player1Id, player2Id) {
  const player1 = wbManager.getUser(player1Id);
  const player2 = wbManager.getUser(player2Id);
  
  let combatLog = [];
  let turnCount = 0;
  let currentPlayer1Hp = player1.pvp.currentHp;
  let currentPlayer2Hp = player2.pvp.currentHp;
  let currentPlayer1Mp = player1.mp;
  let currentPlayer2Mp = player2.mp;
  let skillCooldowns1 = { ...(player1.skillCooldowns || {}) };
  let skillCooldowns2 = { ...(player2.skillCooldowns || {}) };
  const maxTurns = 50; // Prevent infinite loops
  
  const stats1 = wbManager.getEquippedStats(player1Id);
  const stats2 = wbManager.getEquippedStats(player2Id);
  const maxHp1 = player1.maxHp + stats1.hpBonus;
  const maxHp2 = player2.maxHp + stats2.hpBonus;
  const equippedSkills1 = player1.equippedSkills || [];
  const equippedSkills2 = player2.equippedSkills || [];
  
  combatLog.push(`⚔️ **PVP AUTO-COMBAT WITH SKILLS** ⚔️`);
  combatLog.push(`**${player1Id}** (Lv.${player1.level}, ${currentPlayer1Hp} HP, ${currentPlayer1Mp} MP) VS **${player2Id}** (Lv.${player2.level}, ${currentPlayer2Hp} HP, ${currentPlayer2Mp} MP)`);
  combatLog.push('');

  while (currentPlayer1Hp > 0 && currentPlayer2Hp > 0 && turnCount < maxTurns) {
    turnCount++;
    
    // Random who attacks first each turn
    const player1AttacksFirst = Math.random() < 0.5;
    
    if (player1AttacksFirst) {
      // Player 1 turn with skills
      const { damage: damage1, mp: newMp1, hp: newHp1, skillMsg: skillMsg1 } = calculatePvpTurnWithSkills(
        player1Id, stats1, stats2, currentPlayer1Mp, currentPlayer1Hp, maxHp1, equippedSkills1, skillCooldowns1
      );
      currentPlayer1Mp = newMp1;
      currentPlayer1Hp = newHp1;
      currentPlayer2Hp = Math.max(0, currentPlayer2Hp - damage1);
      
      if (skillMsg1) combatLog.push(`Turn ${turnCount}A: ${skillMsg1}`);
      combatLog.push(`Turn ${turnCount}A: 💥 ${player1Id} → ${player2Id}: ${damage1} dmg | HP: ${currentPlayer2Hp}/${maxHp2}`);
      
      if (currentPlayer2Hp <= 0) break;
      
      // Player 2 turn with skills
      const { damage: damage2, mp: newMp2, hp: newHp2, skillMsg: skillMsg2 } = calculatePvpTurnWithSkills(
        player2Id, stats2, stats1, currentPlayer2Mp, currentPlayer2Hp, maxHp2, equippedSkills2, skillCooldowns2
      );
      currentPlayer2Mp = newMp2;
      currentPlayer2Hp = newHp2;
      currentPlayer1Hp = Math.max(0, currentPlayer1Hp - damage2);
      
      if (skillMsg2) combatLog.push(`Turn ${turnCount}B: ${skillMsg2}`);
      combatLog.push(`Turn ${turnCount}B: 💥 ${player2Id} → ${player1Id}: ${damage2} dmg | HP: ${currentPlayer1Hp}/${maxHp1}`);
    } else {
      // Player 2 turn with skills
      const { damage: damage2, mp: newMp2, hp: newHp2, skillMsg: skillMsg2 } = calculatePvpTurnWithSkills(
        player2Id, stats2, stats1, currentPlayer2Mp, currentPlayer2Hp, maxHp2, equippedSkills2, skillCooldowns2
      );
      currentPlayer2Mp = newMp2;
      currentPlayer2Hp = newHp2;
      currentPlayer1Hp = Math.max(0, currentPlayer1Hp - damage2);
      
      if (skillMsg2) combatLog.push(`Turn ${turnCount}A: ${skillMsg2}`);
      combatLog.push(`Turn ${turnCount}A: 💥 ${player2Id} → ${player1Id}: ${damage2} dmg | HP: ${currentPlayer1Hp}/${maxHp1}`);
      
      if (currentPlayer1Hp <= 0) break;
      
      // Player 1 turn with skills
      const { damage: damage1, mp: newMp1, hp: newHp1, skillMsg: skillMsg1 } = calculatePvpTurnWithSkills(
        player1Id, stats1, stats2, currentPlayer1Mp, currentPlayer1Hp, maxHp1, equippedSkills1, skillCooldowns1
      );
      currentPlayer1Mp = newMp1;
      currentPlayer1Hp = newHp1;
      currentPlayer2Hp = Math.max(0, currentPlayer2Hp - damage1);
      
      if (skillMsg1) combatLog.push(`Turn ${turnCount}B: ${skillMsg1}`);
      combatLog.push(`Turn ${turnCount}B: 💥 ${player1Id} → ${player2Id}: ${damage1} dmg | HP: ${currentPlayer2Hp}/${maxHp2}`);
    }
    
    // Decrease skill cooldowns
    for (const skillId of equippedSkills1) {
      if (skillCooldowns1[skillId] > 0) skillCooldowns1[skillId]--;
    }
    for (const skillId of equippedSkills2) {
      if (skillCooldowns2[skillId] > 0) skillCooldowns2[skillId]--;
    }
    
    combatLog.push('');
  }
  
  // Determine winner
  let winner, loser;
  if (currentPlayer1Hp <= 0) {
    winner = player2;
    loser = player1;
    combatLog.push(`🎉 **${player2Id} CHIẾN THẮNG!** 🎉`);
  } else if (currentPlayer2Hp <= 0) {
    winner = player1;
    loser = player2;
    combatLog.push(`🎉 **${player1Id} CHIẾN THẮNG!** 🎉`);
  } else {
    // Timeout - determine by remaining HP
    if (currentPlayer1Hp > currentPlayer2Hp) {
      winner = player1;
      loser = player2;
      combatLog.push(`⏰ **TIMEOUT!** ${player1Id} thắng với nhiều HP hơn (${currentPlayer1Hp} vs ${currentPlayer2Hp})`);
    } else if (currentPlayer2Hp > currentPlayer1Hp) {
      winner = player2;
      loser = player1;
      combatLog.push(`⏰ **TIMEOUT!** ${player2Id} thắng với nhiều HP hơn (${currentPlayer2Hp} vs ${currentPlayer1Hp})`);
    } else {
      // Exact tie - random winner
      winner = Math.random() < 0.5 ? player1 : player2;
      loser = winner === player1 ? player2 : player1;
      combatLog.push(`⏰ **TIMEOUT!** Hòa! ${winner === player1 ? player1Id : player2Id} thắng may mắn!`);
    }
  }
  
  // Update stats
  winner.pvp.stats.wins++;
  winner.pvp.stats.totalFights++;
  loser.pvp.stats.losses++;
  loser.pvp.stats.totalFights++;
  
  // Rewards
  const winnerId = winner === player1 ? player1Id : player2Id;
  const xpReward = Math.floor(loser.level * 5 * XP_MULTIPLIER);
  const goldReward = loser.level * 10;
  
  winner.xp += xpReward;
  userManager.updateMoney(winnerId, goldReward);
  
  // Reset PvP state
  player1.pvp.inPvP = false;
  player1.pvp.opponent = null;
  delete player1.pvp.currentHp;
  
  player2.pvp.inPvP = false;
  player2.pvp.opponent = null;
  delete player2.pvp.currentHp;
  
  wbManager.saveUsers();
  
  combatLog.push(`Trận đấu kết thúc sau ${turnCount} turns!`);
  combatLog.push(`🏆 **${winnerId}** nhận được: ${xpReward} XP và ${goldReward} xu`);
  combatLog.push(`📊 PvP Record: ${winner.pvp.stats.wins}W/${winner.pvp.stats.losses}L`);
  
  return combatLog.join('\n');
}

function calculatePvpTurnWithSkills(playerId, attackerStats, defenderStats, currentMp, currentHp, maxHp, equippedSkills, skillCooldowns) {
  let usedSkill = null;
  let skillMsg = '';
  let damage = 0;
  let mp = currentMp;
  let hp = currentHp;
  
  // Smart skill selection (similar to PVE auto-combat)
  // Prioritize heal if HP < 40%
  for (const skillId of equippedSkills) {
    const skill = wbManager.getSkill(skillId);
    if (!skill) continue;
    if (skill.category === 'heal' && skillCooldowns[skillId] <= 0 && mp >= skill.mp_cost && hp < maxHp * 0.4) {
      usedSkill = skill;
      break;
    }
  }
  
  // If no heal needed, prioritize attack skills
  if (!usedSkill) {
    for (const skillId of equippedSkills) {
      const skill = wbManager.getSkill(skillId);
      if (!skill) continue;
      if (skill.category === 'attack' && skillCooldowns[skillId] <= 0 && mp >= skill.mp_cost) {
        usedSkill = skill;
        break;
      }
    }
  }
  
  // If no attack, use buff skills
  if (!usedSkill) {
    for (const skillId of equippedSkills) {
      const skill = wbManager.getSkill(skillId);
      if (!skill) continue;
      if (skill.category === 'buff' && skillCooldowns[skillId] <= 0 && mp >= skill.mp_cost) {
        usedSkill = skill;
        break;
      }
    }
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
      case 'buff_def_40_2':
        // Note: PVP buffs don't persist across turns in this simple system
        skillMsg = `🛡️ ${playerId} dùng ${usedSkill.name}! Tăng phòng thủ.`;
        damage = Math.max(1, attackerStats.attack - defenderStats.defense);
        break;
      case 'fireball':
        damage = Math.max(1, Math.floor(attackerStats.attack * 1.5) - Math.floor(defenderStats.defense * 0.8));
        skillMsg = `🔥 ${playerId} dùng ${usedSkill.name}! Gây ${damage} sát thương phép.`;
        break;
      case 'buff_atk_30_def_-20_3':
        skillMsg = `💢 ${playerId} dùng ${usedSkill.name}! Tăng tấn công, giảm phòng thủ.`;
        damage = Math.max(1, attackerStats.attack - defenderStats.defense);
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
    skillMsg: skillMsg
  };
}

function calculatePvpDamage(attackerStats, defenderStats) {
  const baseDamage = Math.max(1, attackerStats.attack - defenderStats.defense);
  const critChance = 0.15; // 15% crit chance
  const isCrit = Math.random() < critChance;
  const finalDamage = isCrit ? Math.floor(baseDamage * 1.5) : baseDamage;
  
  return {
    amount: finalDamage,
    isCrit: isCrit
  };
}


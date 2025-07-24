// modules/commands/wb.js
import UserManager from '../userManager.js';
import WB_DataManager from '../wbDataManager.js';

const userManager = UserManager.getInstance();
const wbManager = WB_DataManager.getInstance();

// --- Helper Functions ---

const MAX_LEVEL = 50; // Level cap
const XP_MULTIPLIER = 0.4; // Reduce XP gain to 40% of original

function calculateLevelFromXP(xp) {
  // New exponential XP system - all levels 5+ are harder than old linear system
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const requiredXP = getXPRequiredForLevel(level);
    if (xp < requiredXP) {
      return level - 1;
    }
  }
  return MAX_LEVEL; // Cap at maximum level
}

function getXPRequiredForLevel(level) {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) return Infinity;
  
  // New exponential formula: base=90, scale=1.2
  // Level 5: +21% harder, Level 10: +107% harder, Level 20: +632% harder
  const baseXP = 90;
  const scaleFactor = 1.2;
  
  let totalXP = 0;
  for (let i = 2; i <= level; i++) {
    const xpForThisLevel = Math.floor(baseXP * Math.pow(scaleFactor, i - 2));
    totalXP += xpForThisLevel;
  }
  return totalXP;
}

function getXPOverflow(currentXP, level) {
  if (level >= MAX_LEVEL) {
    const maxLevelXP = getXPRequiredForLevel(MAX_LEVEL);
    return Math.max(0, currentXP - maxLevelXP);
  }
  return 0;
}

function getXPRequiredForSingleLevel(level) {
  // XP needed to go from level (N-1) to level N
  if (level <= 1) return 0;
  const baseXP = 90;
  const scaleFactor = 1.2;
  return Math.floor(baseXP * Math.pow(scaleFactor, level - 2));
}

function calculateStatsForLevel(level) {
  const baseHp = 100;
  const baseMp = 50;
  const baseAttack = 10;
  const baseDefense = 5;
  
  return {
    maxHp: baseHp + (level - 1) * 20,
    maxMp: baseMp + (level - 1) * 10,
    baseAttack: baseAttack + (level - 1) * 3,
    baseDefense: baseDefense + (level - 1) * 2
  };
}

function formatTime(hours) {
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} ngày${remainingHours > 0 ? ` ${remainingHours} giờ` : ''}`;
  }
  return `${hours} giờ`;
}

function generateMonsterBuffs(monster) {
  // Random buffs from 0-40% for each stat
  const hpBuff = Math.random() * 0.4; // 0-40%
  const attackBuff = Math.random() * 0.4; // 0-40%  
  const defenseBuff = Math.random() * 0.4; // 0-40%
  
  // Base armor penetration (0-20% of monster's attack as penetration)
  const baseArmorPen = Math.floor((monster.attack || 5) * 0.2); // Base 20% of attack
  const armorPenBuff = Math.random() * 0.4; // 0-40% additional buff
  const armorPenetration = Math.floor(baseArmorPen * (1 + armorPenBuff));
  
  const buffedStats = {
    hp: Math.floor(monster.hp * (1 + hpBuff)),
    attack: Math.floor(monster.attack * (1 + attackBuff)),
    defense: Math.floor(monster.defense * (1 + defenseBuff)),
    armorPenetration: armorPenetration,
    buffs: {
      hp: hpBuff,
      attack: attackBuff,
      defense: defenseBuff,
      armorPenetration: armorPenBuff
    }
  };
  
  return buffedStats;
}

function getBuffMessage(monster, buffedStats) {
  const buffs = buffedStats.buffs;
  let buffMessages = [];
  
  if (buffs.hp > 0.05) { // Only show if >5%
    buffMessages.push(`💪 +${Math.round(buffs.hp * 100)}% HP`);
  }
  if (buffs.attack > 0.05) {
    buffMessages.push(`⚔️ +${Math.round(buffs.attack * 100)}% ATK`);
  }
  if (buffs.defense > 0.05) {
    buffMessages.push(`🛡️ +${Math.round(buffs.defense * 100)}% DEF`);
  }
  if (buffedStats.armorPenetration > 0) {
    buffMessages.push(`🗡️ ${buffedStats.armorPenetration} Xuyên Giáp`);
  }
  
  if (buffMessages.length > 0) {
    return `\n🔥 **${monster.name} được tăng cường!** (${buffMessages.join(', ')})`;
  }
  
  return '';
}

function resetCombatState() {
  return { 
    inCombat: false, 
    monsterId: null, 
    monsterHp: 0, 
    monsterMaxHp: null,
    monsterBuffedAttack: null,
    monsterBuffedDefense: null,
    monsterArmorPenetration: null,
    mapId: null 
  };
}

// --- Sub-command Handlers ---

async function handleInfo({ userId, args }) {
  const generalUser = userManager.getUser(userId);
  const wbUser = wbManager.getUser(userId);
  const stats = wbManager.getEquippedStats(userId);
  const buffs = wbManager.getActiveBuffs(userId);
  
  let buffText = '';
  if (buffs.length > 0) {
    buffText = '\n🔮 **Buff hiện tại:** ' + buffs.map(b => 
      `${b.type === 'attack' ? '⚔️' : b.type === 'defense' ? '🛡️' : '🍀'} +${Math.round(b.amount * 100)}% (${b.turnsRemaining} lượt)`
    ).join(', ');
  }
  
  let equipmentText = '';
  if (wbUser.equipment.weapon || wbUser.equipment.armor) {
    const weapon = wbUser.equipment.weapon ? wbManager.getItem(wbUser.equipment.weapon) : null;
    const armor = wbUser.equipment.armor ? wbManager.getItem(wbUser.equipment.armor) : null;
    
    equipmentText = `\n🎽 **Trang bị:**${weapon ? ` ⚔️ ${weapon.name}` : ''}${armor ? ` 🛡️ ${armor.name}` : ''}`;
  }

  return `--- 🌟 **THÔNG TIN NHÂN VẬT: ${generalUser.userId}** ---
❤️ **HP:** ${wbUser.hp} / ${wbUser.maxHp + stats.hpBonus}
💙 **MP:** ${wbUser.mp} / ${wbUser.maxMp}
⭐ **Level:** ${wbUser.level}/${MAX_LEVEL} (${wbUser.xp}/${getXPRequiredForLevel(wbUser.level + 1)} XP)${wbUser.level >= MAX_LEVEL ? ' 🌟 MAX!' : ''}
⚔️ **Tấn công:** ${stats.attack} (Base: ${wbUser.baseAttack})
🛡️ **Phòng thủ:** ${stats.defense} (Base: ${wbUser.baseDefense})
💰 **Tiền:** ${generalUser.money}${equipmentText}${buffText}
⚔️ **Trạng thái:** ${wbUser.combatState.inCombat ? `Đang chiến đấu với ${wbManager.getMonster(wbUser.combatState.monsterId)?.name || 'Unknown Monster'}` : 'An toàn'}`;
}

async function handleMap({ userId, args }) {
  const safeMaps = wbManager.getMapsByType('safe');
  const normalMaps = wbManager.getMapsByType('normal');
  const dangerousMaps = wbManager.getMapsByType('dangerous');
  const extremeMaps = wbManager.getMapsByType('extreme');
  const bossAreas = wbManager.getMapsByType('boss_area');
  const worldBossAreas = wbManager.getMapsByType('world_boss_area');
  const randomMaps = wbManager.getMapsByType('random');
  const legendaryMaps = wbManager.getMapsByType('legendary');
  
  let mapsList = '';
  
  if (safeMaps.length > 0) {
    mapsList += '\n🌱 **Bản đồ an toàn:**\n' + safeMaps.map(m => ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})`).join('\n');
  }
  if (normalMaps.length > 0) {
    mapsList += '\n🌲 **Bản đồ thường:**\n' + normalMaps.map(m => ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})`).join('\n');
  }
  if (dangerousMaps.length > 0) {
    mapsList += '\n⚠️ **Bản đồ nguy hiểm:**\n' + dangerousMaps.map(m => ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})`).join('\n');
  }
  if (extremeMaps.length > 0) {
    mapsList += '\n🔥 **Bản đồ cực hiểm:**\n' + extremeMaps.map(m => ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})`).join('\n');
  }
  if (bossAreas.length > 0) {
    mapsList += '\n👑 **Khu vực Boss:**\n' + bossAreas.map(m => {
      const cooldownHours = wbManager.getCooldownRemaining(userId, m.id);
      const cooldownText = cooldownHours > 0 ? ` (⏰ ${formatTime(cooldownHours)})` : '';
      return ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})${cooldownText}`;
    }).join('\n');
  }
  if (worldBossAreas.length > 0) {
    mapsList += '\n🐉 **Khu vực World Boss:**\n' + worldBossAreas.map(m => {
      const cooldownHours = wbManager.getCooldownRemaining(userId, m.id);
      const cooldownText = cooldownHours > 0 ? ` (⏰ ${formatTime(cooldownHours)})` : '';
      return ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})${cooldownText}`;
    }).join('\n');
  }
  if (randomMaps.length > 0) {
    mapsList += '\n🎲 **Bản đồ đặc biệt:**\n' + randomMaps.map(m => ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})`).join('\n');
  }
  if (legendaryMaps.length > 0) {
    mapsList += '\n✨ **Bản đồ huyền thoại:**\n' + legendaryMaps.map(m => {
      const cooldownHours = wbManager.getCooldownRemaining(userId, m.id);
      const cooldownText = cooldownHours > 0 ? ` (⏰ ${formatTime(cooldownHours)})` : '';
      return ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})${cooldownText}`;
    }).join('\n');
  }
  
  return `--- 🗺️ **TẤT CẢ BẢN ĐỒ** ---${mapsList}\n\n**Sử dụng:** \`wb hunt <map_id>\` để vào bản đồ`;
}

async function handleHunt({ userId, args }) {
  if (args.length < 2) {
    return `❌ **Thiếu tham số!** Sử dụng: \`wb hunt <map_id>\`
Dùng \`wb map\` để xem danh sách bản đồ có sẵn.`;
  }
  
  const mapId = args[1];
  const wbUser = wbManager.getUser(userId);

  if (wbUser.combatState.inCombat) {
    return `❌ Bạn đang trong một trận chiến! Dùng \`wb pve\` để tiếp tục.`;
  }
  
  const map = wbManager.getMap(mapId);
  if (!map) {
    return `❌ Không tìm thấy bản đồ với ID: \`${mapId}\``;
  }

  if (wbUser.level < map.requiredLevel) {
    return `❌ Bạn cần đạt **Level ${map.requiredLevel}** để vào ${map.name}.`;
  }
  
  // Check cooldown for boss areas
  if (map.bossOnly && wbManager.isOnCooldown(userId, mapId)) {
    const remaining = wbManager.getCooldownRemaining(userId, mapId);
    return `⏰ Bạn cần chờ ${formatTime(remaining)} nữa để vào ${map.name}.`;
  }

  const monsterId = map.monsterIds[Math.floor(Math.random() * map.monsterIds.length)];
  const monster = wbManager.getMonster(monsterId);

  if (!monster) {
    return `❌ Lỗi hệ thống: Không tìm thấy quái vật với ID ${monsterId}`;
  }

  // Set cooldown for boss areas
  if (map.bossOnly) {
    wbManager.setCooldown(userId, mapId);
  }
  
  // Update quest progress
  wbManager.updateQuestProgress(userId, 'explore');

  // Generate random buffs for monster (0-40% each stat)
  const buffedStats = generateMonsterBuffs(monster);
  const buffMessage = getBuffMessage(monster, buffedStats);

  wbManager.updateUser(userId, {
    combatState: {
      inCombat: true,
      monsterId: monster.id,
      monsterHp: buffedStats.hp, // Use buffed HP
      monsterMaxHp: buffedStats.hp, // Store max HP for display
      monsterBuffedAttack: buffedStats.attack, // Store buffed attack
      monsterBuffedDefense: buffedStats.defense, // Store buffed defense
      monsterArmorPenetration: buffedStats.armorPenetration, // Store armor penetration
      mapId: map.id
    }
  });

  const dangerEmoji = monster.type === 'boss' ? '👑' : monster.type === 'world_boss' ? '🐉' : '⚔️';
  return `🌲 Bạn đã tiến vào **${map.name}** và gặp một **${monster.name}**! ${dangerEmoji}
${map.description}${buffMessage}
Dùng lệnh \`wb pve\` để tấn công!`;
}

async function handlePve({ userId, args }) {
    const wbUser = wbManager.getUser(userId);
    if (!wbUser.combatState.inCombat) {
        return `❌ Bạn không ở trong trận chiến nào. Dùng \`wb hunt <map_id>\` để tìm quái vật.`;
    }
    const skillId = args[0] && !['auto', 'safe'].includes(args[0]) ? args[0] : null;
    const mode = args[0]?.toLowerCase();
    if (mode === 'auto') {
        return await handleAutoCombat(userId, false);
    } else if (mode === 'safe') {
        return await handleAutoCombat(userId, true);
    }
    const monster = wbManager.getMonster(wbUser.combatState.monsterId);
    const stats = wbManager.getEquippedStats(userId);
    if (!monster) {
        wbManager.updateUser(userId, { combatState: resetCombatState() });
        return `❌ Lỗi hệ thống: Quái vật không tồn tại. Trận chiến đã được reset.`;
    }
    let combatLog = [];
    let playerDamage = Math.max(1, stats.attack - (wbUser.combatState.monsterBuffedDefense || monster.defense));
    let skillMessage = '';
    // Nếu có skillId, kiểm tra và thực hiện skill
    if (skillId) {
        const skill = wbManager.getSkill(skillId);
        if (!skill) return '❌ Kỹ năng không tồn tại.';
        if (!wbUser.equippedSkills || !wbUser.equippedSkills.includes(skillId)) return '❌ Kỹ năng chưa được trang bị.';
        if (wbUser.skillCooldowns?.[skillId] > 0) return `❌ Kỹ năng đang hồi (${wbUser.skillCooldowns[skillId]} lượt).`;
        if (wbUser.mp < skill.mp_cost) return '❌ Không đủ MP.';
        // Trừ mp, set cooldown
        wbUser.mp -= skill.mp_cost;
        wbUser.skillCooldowns = wbUser.skillCooldowns || {};
        wbUser.skillCooldowns[skillId] = skill.cooldown;
        wbManager.saveUsers();
        // Thực hiện hiệu ứng skill
        switch (skill.effect) {
            case 'double_attack':
                playerDamage = Math.max(1, Math.floor(stats.attack * 0.8) - (wbUser.combatState.monsterBuffedDefense || monster.defense));
                combatLog.push(`🌀 Bạn dùng ${skill.name}! Tấn công 2 lần, mỗi đòn ${playerDamage} sát thương.`);
                combatLog.push(`💥 Đòn 1: ${playerDamage} sát thương.`);
                combatLog.push(`💥 Đòn 2: ${playerDamage} sát thương.`);
                playerDamage = playerDamage * 2;
                skillMessage = ` (Kỹ năng: ${skill.name})`;
                break;
            case 'heal_30':
                const maxHp = wbUser.maxHp + stats.hpBonus;
                const heal = Math.floor(maxHp * 0.3);
                wbUser.hp = Math.min(maxHp, wbUser.hp + heal);
                wbManager.saveUsers();
                combatLog.push(`💚 Bạn dùng ${skill.name}! Hồi ${heal} HP (${wbUser.hp}/${maxHp})`);
                playerDamage = 0;
                skillMessage = ` (Kỹ năng: ${skill.name})`;
                break;
            case 'buff_def_40_2':
                wbManager.addBuff(userId, 'defense', 0.4, 2);
                combatLog.push(`🛡️ Bạn dùng ${skill.name}! Tăng 40% phòng thủ trong 2 lượt.`);
                playerDamage = Math.max(1, stats.attack - (wbUser.combatState.monsterBuffedDefense || monster.defense));
                skillMessage = ` (Kỹ năng: ${skill.name})`;
                break;
            case 'fireball':
                playerDamage = Math.max(1, Math.floor(stats.attack * 1.5) - Math.floor((wbUser.combatState.monsterBuffedDefense || monster.defense) * 0.8));
                combatLog.push(`🔥 Bạn dùng ${skill.name}! Gây ${playerDamage} sát thương phép (bỏ qua 20% phòng thủ).`);
                skillMessage = ` (Kỹ năng: ${skill.name})`;
                break;
            case 'buff_atk_30_def_-20_3':
                wbManager.addBuff(userId, 'attack', 0.3, 3);
                wbManager.addBuff(userId, 'defense', -0.2, 3);
                combatLog.push(`💢 Bạn dùng ${skill.name}! Tăng 30% tấn công, giảm 20% phòng thủ trong 3 lượt.`);
                playerDamage = Math.max(1, stats.attack - (wbUser.combatState.monsterBuffedDefense || monster.defense));
                skillMessage = ` (Kỹ năng: ${skill.name})`;
                break;
            default:
                combatLog.push(`Bạn dùng ${skill.name} nhưng chưa có hiệu ứng!`);
        }
    }
    // Player attacks monster
    const newMonsterHp = wbUser.combatState.monsterHp - playerDamage;
    if (!skillId) combatLog.push(`💥 Bạn tấn công ${monster.name}, gây ${playerDamage} sát thương. HP quái còn: ${Math.max(0, newMonsterHp)}/${wbUser.combatState.monsterMaxHp || monster.hp}`);
    else combatLog.push(`💥 Tổng sát thương lên quái: ${playerDamage}. HP quái còn: ${Math.max(0, newMonsterHp)}/${wbUser.combatState.monsterMaxHp || monster.hp}`);
    // Check if monster is defeated
    if (newMonsterHp <= 0) {
        // === LOGIC CHIẾN THẮNG ===
        const xpGained = Math.floor(monster.xpDrop * XP_MULTIPLIER);
        const newXP = wbUser.xp + xpGained;
        const oldLevel = wbUser.level;
        const newLevel = calculateLevelFromXP(newXP);
        let lootLog = [];
        let goldGained = 0;
        // Handle loot with luck buff
        const luckBuff = wbUser.buffs.find(b => b.type === 'luck');
        const luckMultiplier = luckBuff ? (1 + luckBuff.amount) : 1;
        for (const drop of monster.drops) {
            const adjustedChance = Math.min(1, drop.chance * luckMultiplier);
            if (Math.random() < adjustedChance) {
                const item = wbManager.getItem(drop.itemId);
                if (!item) continue;
                if (drop.itemId === 'gold_coin') {
                    goldGained += drop.quantity;
                } else {
                    wbManager.addItemToInventory(userId, drop.itemId, drop.quantity);
                }
                lootLog.push(`  + ${drop.quantity} ${item.name}`);
            }
        }
        // Update statistics
        wbManager.updateStatistic(userId, 'monstersKilled');
        if (monster.type === 'boss' || monster.type === 'world_boss') {
            wbManager.updateStatistic(userId, 'bossesKilled');
        }
        if (lootLog.length > 0) {
            wbManager.updateStatistic(userId, 'itemsFound', lootLog.length);
        }
        // Update quest progress
        wbManager.updateQuestProgress(userId, 'kill', monster.id);
        wbManager.updateQuestProgress(userId, 'loot', null, lootLog.length);
        let levelUpMessage = '';
        if (newLevel > oldLevel) {
            const newStats = calculateStatsForLevel(newLevel);
            const hpIncrease = newStats.maxHp - wbUser.maxHp;
            const mpIncrease = newStats.maxMp - wbUser.maxMp;
            levelUpMessage = `\n🎊 **LEVEL UP!** Level ${oldLevel} → Level ${newLevel}\n📈 **Tăng thể lực:** +${hpIncrease} HP, +${mpIncrease} MP, +${newStats.baseAttack - wbUser.baseAttack} ATK, +${newStats.baseDefense - wbUser.baseDefense} DEF`;
            if (newLevel >= MAX_LEVEL) {
                const overflow = getXPOverflow(newXP, newLevel);
                levelUpMessage += `\n🌟 **ĐÃ ĐẠT LEVEL TỐI ĐA!** (${overflow} XP thừa sẽ được lưu)`;
            }
            wbManager.updateUser(userId, {
                level: newLevel,
                xp: newXP,
                maxHp: newStats.maxHp,
                maxMp: newStats.maxMp,
                hp: newStats.maxHp,
                mp: newStats.maxMp,
                baseAttack: newStats.baseAttack,
                baseDefense: newStats.baseDefense,
                combatState: resetCombatState()
            });
        } else {
            wbManager.updateUser(userId, {
                xp: newXP,
                hp: currentPlayerHp,
                combatState: resetCombatState()
            });
        }
        if (goldGained > 0) {
            userManager.updateMoney(userId, goldGained);
        }
        combatLog.push('');
        combatLog.push(`🎉 **CHIẾN THẮNG!** 🎉`);
        combatLog.push(`Đã hạ gục ${monster.name} sau ${turnCount} lượt!`);
        combatLog.push(`⭐ **Nhận được:** ${xpGained} XP${goldGained > 0 ? ` và ${goldGained} xu` : ''}`);
        combatLog.push(`🎁 **Vật phẩm rơi:**\n${lootLog.length > 0 ? lootLog.join('\n') : 'Không có gì cả.'}`);
        if (levelUpMessage) combatLog.push(levelUpMessage);
        return combatLog.join('\n');
    }
    // Monster turn: nếu monster có skills, có xác suất dùng skill
    let monsterSkillMsg = '';
    const monsterSkills = monster.skills || [];
    let monsterUsedSkill = null;
    if (monsterSkills.length > 0 && Math.random() < 0.5) { // 50% dùng skill nếu có
        const skillId = monsterSkills[Math.floor(Math.random() * monsterSkills.length)];
        const skill = wbManager.getSkill(skillId);
        if (skill) {
            monsterUsedSkill = skill;
            switch (skill.effect) {
                case 'double_attack':
                    monsterDamage = Math.max(1, Math.floor((wbUser.combatState.monsterBuffedAttack || monster.attack) * 0.8) - stats.defense);
                    monsterSkillMsg = `🌀 ${monster.name} dùng ${skill.name}! Tấn công 2 lần, mỗi đòn ${monsterDamage} sát thương.`;
                    monsterDamage = monsterDamage * 2;
                    break;
                case 'fireball':
                    monsterDamage = Math.max(1, Math.floor((wbUser.combatState.monsterBuffedAttack || monster.attack) * 1.5) - Math.floor(stats.defense * 0.8));
                    monsterSkillMsg = `🔥 ${monster.name} dùng ${skill.name}! Gây ${monsterDamage} sát thương phép (bỏ qua 20% phòng thủ).`;
                    break;
                case 'heal_30':
                    const maxHp = wbUser.combatState.monsterMaxHp || monster.hp;
                    const heal = Math.floor(maxHp * 0.3);
                    wbManager.updateUser(userId, { combatState: { ...wbUser.combatState, monsterHp: Math.min(maxHp, newMonsterHp + heal) } });
                    monsterSkillMsg = `💚 ${monster.name} dùng ${skill.name}! Hồi ${heal} HP.`;
                    break;
                case 'buff_def_40_2':
                    // Không lưu trạng thái buff cho quái, chỉ thông báo
                    monsterSkillMsg = `🛡️ ${monster.name} dùng ${skill.name}! Tăng phòng thủ.`;
                    break;
                case 'buff_atk_30_def_-20_3':
                    monsterSkillMsg = `💢 ${monster.name} dùng ${skill.name}! Tăng tấn công, giảm phòng thủ.`;
                    break;
                default:
                    monsterSkillMsg = `${monster.name} dùng ${skill.name}!`;
            }
        }
    }
    // Monster attacks player
    let monsterDamage = Math.max(1, (wbUser.combatState.monsterBuffedAttack || monster.attack) - stats.defense);
    if (monsterUsedSkill && (monsterUsedSkill.effect === 'double_attack' || monsterUsedSkill.effect === 'fireball')) {
        // monsterDamage đã tính ở trên
    }
    const newPlayerHp = wbUser.hp - monsterDamage;
    if (monsterSkillMsg) combatLog.push(monsterSkillMsg);
    combatLog.push(`🩸 ${monster.name} tấn công bạn, gây ${monsterDamage} sát thương. HP của bạn còn: ${Math.max(0, newPlayerHp)}/${wbUser.maxHp + stats.hpBonus}`);
    // Check if player is defeated
    if (newPlayerHp <= 0) {
        // Check for revival stone with cooldown
        const now = Date.now();
        const revivalCooldown = 60000; // 1 minute cooldown
        
        if (wbManager.hasItem(userId, 'revival_stone') && 
            (!wbUser.lastRevivalUse || now - wbUser.lastRevivalUse >= revivalCooldown)) {
            
            wbManager.removeItemFromInventory(userId, 'revival_stone', 1);
            const reviveHp = Math.floor(wbUser.maxHp * 0.5);
            
            wbManager.updateUser(userId, {
                hp: reviveHp,
                lastRevivalUse: now,
                combatState: {
                    ...wbUser.combatState,
                    monsterHp: newMonsterHp
                }
            });
            
            return `💎 **ĐÁ HỒI SINH KÍCH HOẠT!** 💎
Bạn đã hồi sinh với ${reviveHp} HP! Tiếp tục chiến đấu!

${combatLog.join('\n')}`;
        }
        
        const xpLost = Math.min(Math.floor(wbUser.xp * 0.1), 50); // Cap XP loss at 50
        const newXP = Math.max(0, wbUser.xp - xpLost);
        const newLevel = calculateLevelFromXP(newXP);
        
        let levelDownMessage = '';
        if (newLevel < wbUser.level) {
            const newStats = calculateStatsForLevel(newLevel);
            levelDownMessage = `\n📉 **Xuống cấp:** Level ${wbUser.level} → Level ${newLevel}`;
            
            wbManager.updateUser(userId, {
                level: newLevel,
                xp: newXP,
                maxHp: newStats.maxHp,
                maxMp: newStats.maxMp,
                hp: 1,
                mp: newStats.maxMp,
                baseAttack: newStats.baseAttack,
                baseDefense: newStats.baseDefense,
                combatState: resetCombatState()
            });
        } else {
            wbManager.updateUser(userId, {
                xp: newXP,
                hp: 1,
                combatState: resetCombatState()
            });
        }

        const defeatMessage = `☠️ **THẤT BẠI!** ☠️
Bạn đã bị ${monster.name} hạ gục.
- Bạn bị mất ${xpLost} XP.
- Bạn đã được hồi sinh tại thành với 1 HP.${levelDownMessage}`;

        return defeatMessage;
    }
    // Decrease buff turns after combat turn
    wbManager.decreaseBuffTurns(userId);
    // Giảm cooldown skill
    wbManager.decreaseSkillCooldowns(userId);
    wbManager.updateUser(userId, {
        hp: newPlayerHp,
        mp: wbUser.mp,
        skillCooldowns: wbUser.skillCooldowns,
        combatState: {
            ...wbUser.combatState,
            monsterHp: newMonsterHp
        }
    });
    // Hiển thị buff hiện tại
    const buffs = wbManager.getActiveBuffs(userId);
    if (buffs.length > 0) {
      combatLog.push('🔮 Buff hiện tại: ' + buffs.map(b => `${b.type === 'attack' ? '⚔️' : b.type === 'defense' ? '🛡️' : '🍀'} +${Math.round(b.amount * 100)}% (${b.turnsRemaining} lượt)`).join(', '));
    }
    return combatLog.join('\n');
}

// New auto-combat function
async function handleAutoCombat(userId, safeMode = false) {
    const wbUser = wbManager.getUser(userId);
    const monster = wbManager.getMonster(wbUser.combatState.monsterId);
    if (!monster) {
        wbManager.updateUser(userId, { combatState: resetCombatState() });
        return `❌ Lỗi hệ thống: Quái vật không tồn tại. Trận chiến đã được reset.`;
    }
    let combatLog = [];
    let turnCount = 0;
    let currentMonsterHp = wbUser.combatState.monsterHp;
    let currentPlayerHp = wbUser.hp;
    let currentMp = wbUser.mp;
    let skillCooldowns = { ...(wbUser.skillCooldowns || {}) };
    const maxTurns = 50;
    const equippedSkills = wbUser.equippedSkills || [];
    combatLog.push(`⚔️ **${safeMode ? 'SAFE AUTO-COMBAT' : 'AUTO-COMBAT'}** vs ${monster.name} bắt đầu!`);
    combatLog.push(`Monster HP: ${currentMonsterHp}/${wbUser.combatState.monsterMaxHp || monster.hp} | Your HP: ${currentPlayerHp}/${wbUser.maxHp}`);
    combatLog.push('');
    while (currentMonsterHp > 0 && currentPlayerHp > 0 && turnCount < maxTurns) {
        turnCount++;
        const stats = wbManager.getEquippedStats(userId);
        // --- AUTO SKILL LOGIC ---
        let usedSkill = null;
        let skillMsg = '';
        // Ưu tiên heal nếu HP < 50%
        for (const skillId of equippedSkills) {
            const skill = wbManager.getSkill(skillId);
            if (!skill) continue;
            if (skill.category === 'heal' && skillCooldowns[skillId] <= 0 && currentMp >= skill.mp_cost && currentPlayerHp < wbUser.maxHp * 0.5) {
                usedSkill = skill;
                break;
            }
        }
        // Nếu không có heal, ưu tiên attack
        if (!usedSkill) {
            for (const skillId of equippedSkills) {
                const skill = wbManager.getSkill(skillId);
                if (!skill) continue;
                if (skill.category === 'attack' && skillCooldowns[skillId] <= 0 && currentMp >= skill.mp_cost) {
                    usedSkill = skill;
                    break;
                }
            }
        }
        // Nếu không có attack, ưu tiên buff
        if (!usedSkill) {
            for (const skillId of equippedSkills) {
                const skill = wbManager.getSkill(skillId);
                if (!skill) continue;
                if (skill.category === 'buff' && skillCooldowns[skillId] <= 0 && currentMp >= skill.mp_cost) {
                    usedSkill = skill;
                    break;
                }
            }
        }
        let playerDamage = Math.max(1, stats.attack - (wbUser.combatState.monsterBuffedDefense || monster.defense));
        if (usedSkill) {
            currentMp -= usedSkill.mp_cost;
            skillCooldowns[usedSkill.id] = usedSkill.cooldown;
            switch (usedSkill.effect) {
                case 'double_attack':
                    playerDamage = Math.max(1, Math.floor(stats.attack * 0.8) - (wbUser.combatState.monsterBuffedDefense || monster.defense));
                    skillMsg = `🌀 Dùng ${usedSkill.name}! 2 đòn, mỗi đòn ${playerDamage} sát thương.`;
                    playerDamage = playerDamage * 2;
                    break;
                case 'heal_30':
                    const maxHp = wbUser.maxHp + stats.hpBonus;
                    const heal = Math.floor(maxHp * 0.3);
                    currentPlayerHp = Math.min(maxHp, currentPlayerHp + heal);
                    skillMsg = `💚 Dùng ${usedSkill.name}! Hồi ${heal} HP (${currentPlayerHp}/${maxHp})`;
                    playerDamage = 0;
                    break;
                case 'buff_def_40_2':
                    wbManager.addBuff(userId, 'defense', 0.4, 2);
                    skillMsg = `🛡️ Dùng ${usedSkill.name}! Tăng 40% phòng thủ 2 lượt.`;
                    break;
                case 'fireball':
                    playerDamage = Math.max(1, Math.floor(stats.attack * 1.5) - Math.floor((wbUser.combatState.monsterBuffedDefense || monster.defense) * 0.8));
                    skillMsg = `🔥 Dùng ${usedSkill.name}! Gây ${playerDamage} sát thương phép.`;
                    break;
                case 'buff_atk_30_def_-20_3':
                    wbManager.addBuff(userId, 'attack', 0.3, 3);
                    wbManager.addBuff(userId, 'defense', -0.2, 3);
                    skillMsg = `💢 Dùng ${usedSkill.name}! Tăng 30% tấn công, giảm 20% phòng thủ 3 lượt.`;
                    break;
                default:
                    skillMsg = `Dùng ${usedSkill.name}!`;
            }
        }
        // Luôn log rõ ràng skill hoặc đánh thường
        if (skillMsg) {
            combatLog.push(`Turn ${turnCount}: ${skillMsg}`);
        } else {
            combatLog.push(`Turn ${turnCount}: 💥 Đánh thường!`);
        }
        // Player attacks monster
        currentMonsterHp -= playerDamage;
        combatLog.push(`   💥 Gây ${playerDamage} sát thương. Monster HP: ${Math.max(0, currentMonsterHp)}/${wbUser.combatState.monsterMaxHp || monster.hp}`);
        if (currentMonsterHp <= 0) {
            // ... giữ nguyên logic thắng ...
            // ... existing code ...
        }
        // Monster turn (giữ nguyên logic)
        // ... existing code ...
        // Safe mode HP check
        if (safeMode) {
            const hpPercentage = currentPlayerHp / wbUser.maxHp;
            if (hpPercentage < 0.7) {
                wbManager.updateUser(userId, {
                    hp: currentPlayerHp,
                    mp: currentMp,
                    skillCooldowns,
                    combatState: {
                        ...wbUser.combatState,
                        monsterHp: currentMonsterHp
                    }
                });
                combatLog.push('');
                combatLog.push(`🛡️ **SAFE MODE ACTIVATED!**`);
                combatLog.push(`HP xuống dưới 70% (${currentPlayerHp}/${wbUser.maxHp}). Tạm dừng để bạn dùng thuốc!`);
                combatLog.push(`Monster còn ${currentMonsterHp}/${monster.hp} HP.`);
                combatLog.push('');
                combatLog.push('**Tiếp tục:** `wb pve` | `wb pve auto` | `wb pve safe`');
                combatLog.push('**Dùng thuốc:** `wb use health_potion`');
                return combatLog.join('\n');
            }
        }
        // Giảm cooldown skill
        for (const skillId of equippedSkills) {
            if (skillCooldowns[skillId] > 0) skillCooldowns[skillId]--;
        }
        // Decrease buff turns
        wbManager.decreaseBuffTurns(userId);
        combatLog.push('');
    }
    // Timeout
    if (turnCount >= maxTurns) {
        wbManager.updateUser(userId, {
            hp: currentPlayerHp,
            mp: currentMp,
            skillCooldowns,
            combatState: {
                ...wbUser.combatState,
                monsterHp: currentMonsterHp
            }
        });
        combatLog.push(`⏰ **TIMEOUT!** Trận đấu quá dài (${maxTurns} lượt). Tạm dừng để nghỉ ngơi.`);
    }
    return combatLog.join('\n');
}

async function handleInventory({ userId }) {
    const wbUser = wbManager.getUser(userId);

    if (wbUser.inventory.length === 0) {
        return "🎒 Túi đồ của bạn trống rỗng.";
    }

    const inventoryByType = {};
    
    for (const itemStack of wbUser.inventory) {
        const itemDetails = wbManager.getItem(itemStack.itemId);
        if (!itemDetails) continue;
        
        const type = itemDetails.type || 'other';
        if (!inventoryByType[type]) inventoryByType[type] = [];
        
        inventoryByType[type].push({
            ...itemStack,
            item: itemDetails
        });
    }
    
    let inventoryText = '--- 🎒 **TÚI ĐỒ CỦA BẠN** ---\n';
    
    const typeNames = {
        weapon: '⚔️ **Vũ khí:**',
        armor: '🛡️ **Giáp:**', 
        consumable: '🧪 **Thuốc:**',
        material: '📦 **Nguyên liệu:**',
        special: '✨ **Đặc biệt:**',
        other: '📋 **Khác:**'
    };
    
    for (const [type, items] of Object.entries(inventoryByType)) {
        inventoryText += `\n${typeNames[type] || '📋 **Khác:**'}\n`;
        for (const itemStack of items) {
            const sellPrice = itemStack.item.sellPrice ? ` (${itemStack.item.sellPrice} xu)` : '';
            inventoryText += ` • [${itemStack.item.id}] **${itemStack.item.name}** x${itemStack.quantity}${sellPrice}\n   *${itemStack.item.description}*\n`;
        }
    }

    return inventoryText;
}

async function handleEquipment({ userId, args }) {
    const wbUser = wbManager.getUser(userId);
    
    if (args.length < 2) {
        // Show current equipment if no action specified
    }
    
    const action = args[1]?.toLowerCase();
    
    if (!action) {
        const weapon = wbUser.equipment.weapon ? wbManager.getItem(wbUser.equipment.weapon) : null;
        const armor = wbUser.equipment.armor ? wbManager.getItem(wbUser.equipment.armor) : null;
        
        return `--- 🎽 **TRANG BỊ HIỆN TẠI** ---
⚔️ **Vũ khí:** ${weapon ? `${weapon.name} (+${weapon.attackBonus} ATK)` : 'Không có'}
🛡️ **Giáp:** ${armor ? `${armor.name} (+${armor.defenseBonus} DEF, +${armor.hpBonus || 0} HP)` : 'Không có'}

**Lệnh có sẵn:**
\`wb equip wear <item_id>\` - Trang bị vật phẩm
\`wb equip remove <weapon|armor>\` - Gỡ trang bị`;
    }
    
    if (action === 'wear' || action === 'equip') {
        if (args.length < 3) {
            return '❌ **Thiếu tham số!** Sử dụng: `wb equip wear <item_id>`';
        }
        
        const itemId = args[2];
        if (!itemId) return '❌ Vui lòng chỉ định ID vật phẩm để trang bị.';
        
        const result = wbManager.equipItem(userId, itemId);
        return result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
    }
    
    if (action === 'remove' || action === 'unequip') {
        if (args.length < 3) {
            return '❌ **Thiếu tham số!** Sử dụng: `wb equip remove <weapon|armor>`';
        }
        
        const slot = args[2]?.toLowerCase();
        if (!slot || (slot !== 'weapon' && slot !== 'armor')) {
            return '❌ Vui lòng chỉ định: weapon hoặc armor';
        }
        
        const result = wbManager.unequipItem(userId, slot);
        return result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
    }
    
    return '❌ Lệnh không hợp lệ. Dùng: wear, remove';
}

async function handleShop({ userId, args }) {
    const action = args[1]?.toLowerCase();
    
    if (!action || action === 'list') {
        const items = Object.values(wbManager.items).filter(item => item.buyPrice);
        const skills = wbManager.getAllSkills().filter(skill => skill.buyPrice);
        
        const itemsByType = {};
        for (const item of items) {
            const type = item.type || 'other';
            if (!itemsByType[type]) itemsByType[type] = [];
            itemsByType[type].push(item);
        }
        let shopText = '--- 🏪 **CỬA HÀNG WORLD BOSS** ---\n';
        const typeNames = {
            weapon: '⚔️ **Vũ khí:**',
            armor: '🛡️ **Giáp:**',
            consumable: '🧪 **Thuốc:**',
            special: '✨ **Đặc biệt:**',
            skill: '🧙‍♂️ **Kỹ năng:**'
        };
        for (const [type, items] of Object.entries(itemsByType)) {
            if (type === 'material') continue; // Don't show materials in shop
            shopText += `\n${typeNames[type] || '📋 **Khác:**'}\n`;
            for (const item of items) {
                const levelReq = item.requiredLevel ? ` (Lv.${item.requiredLevel})` : '';
                shopText += ` • \`${item.id}\`: **${item.name}** - ${item.buyPrice} xu${levelReq}\n`;
            }
        }
        // Hiển thị skill
        if (skills.length > 0) {
            shopText += `\n${typeNames.skill}\n`;
            for (const skill of skills) {
                shopText += ` • \`${skill.id}\`: **${skill.name}** - ${skill.buyPrice} xu (MP: ${skill.mp_cost}, CD: ${skill.cooldown})\n   *${skill.description}*\n`;
            }
        }
        shopText += '\n**Lệnh:** `wb shop buy <item_id|skill_id> [số lượng]` | `wb shop sell <item_id> [số lượng]`';
        return shopText;
    }
    if (action === 'buy') {
        if (args.length < 3) {
            return '❌ **Thiếu tham số!** Sử dụng: `wb shop buy <item_id|skill_id> [số_lượng]`';
        }
        const id = args[2];
        const quantity = parseInt(args[3]) || 1;
        if (!id) return '❌ Vui lòng chỉ định ID vật phẩm hoặc kỹ năng.';
        // Ưu tiên item
        let item = wbManager.getItem(id);
        if (item && item.buyPrice) {
            const wbUser = wbManager.getUser(userId);
            const generalUser = userManager.getUser(userId);
            if (item.requiredLevel && wbUser.level < item.requiredLevel) {
                return `❌ Bạn cần đạt Level ${item.requiredLevel} để mua ${item.name}.`;
            }
            const totalCost = item.buyPrice * quantity;
            if (generalUser.money < totalCost) {
                return `❌ Không đủ tiền! Cần ${totalCost} xu để mua ${quantity} ${item.name}.`;
            }
            userManager.updateMoney(userId, -totalCost);
            wbManager.addItemToInventory(userId, id, quantity);
            return `✅ Đã mua ${quantity} **${item.name}** với giá ${totalCost} xu.`;
        }
        // Nếu không phải item, kiểm tra skill
        const skill = wbManager.getSkill(id);
        if (skill && skill.buyPrice) {
            const generalUser = userManager.getUser(userId);
            if (generalUser.money < skill.buyPrice) {
                return `❌ Không đủ tiền! Cần ${skill.buyPrice} xu để mua kỹ năng ${skill.name}.`;
            }
            if (wbManager.getUser(userId).skills?.includes(id)) {
                return '❌ Bạn đã sở hữu kỹ năng này.';
            }
            userManager.updateMoney(userId, -skill.buyPrice);
            wbManager.addSkillToUser(userId, id);
            return `✅ Đã mua kỹ năng **${skill.name}** với giá ${skill.buyPrice} xu.`;
        }
        return '❌ Vật phẩm hoặc kỹ năng này không có bán trong cửa hàng.';
    }
    
    if (action === 'sell') {
        if (args.length < 3) {
            return '❌ **Thiếu tham số!** Sử dụng: `wb shop sell <item_id> [số_lượng]`';
        }
        
        const itemId = args[2];
        const quantity = parseInt(args[3]) || 1;
        
        if (!itemId) return '❌ Vui lòng chỉ định ID vật phẩm.';
        
        const item = wbManager.getItem(itemId);
        if (!item || !item.sellPrice) {
            return '❌ Vật phẩm này không thể bán.';
        }
        
        if (!wbManager.hasItem(userId, itemId, quantity)) {
            return `❌ Bạn không có đủ ${quantity} ${item.name}.`;
        }
        
        const totalEarned = item.sellPrice * quantity;
        wbManager.removeItemFromInventory(userId, itemId, quantity);
        userManager.updateMoney(userId, totalEarned);
        
        return `✅ Đã bán ${quantity} **${item.name}** và nhận ${totalEarned} xu.`;
    }
    
    return '❌ Lệnh không hợp lệ. Dùng: list, buy, sell';
}

async function handleUse({ userId, args }) {
    if (args.length < 2) {
        return '❌ **Thiếu tham số!** Sử dụng: `wb use <item_id>`';
    }
    
    const itemId = args[1];
    if (!itemId) return '❌ Vui lòng chỉ định ID vật phẩm để sử dụng.';
    
    const item = wbManager.getItem(itemId);
    if (!item || item.type !== 'consumable') {
        return '❌ Vật phẩm này không thể sử dụng.';
    }
    
    if (!wbManager.hasItem(userId, itemId)) {
        return `❌ Bạn không có ${item.name}.`;
    }
    
    const wbUser = wbManager.getUser(userId);
    let message = '';
    
    // Health potion
    if (item.healAmount) {
        const stats = wbManager.getEquippedStats(userId);
        const maxHp = wbUser.maxHp + stats.hpBonus;
        const healedAmount = Math.min(item.healAmount, maxHp - wbUser.hp);
        
        if (healedAmount <= 0) {
            return '❌ HP của bạn đã đầy!';
        }
        
        wbManager.updateUser(userId, { hp: wbUser.hp + healedAmount });
        message = `✅ Đã hồi ${healedAmount} HP! (${wbUser.hp + healedAmount}/${maxHp})`;
    }
    
    // Mana potion
    if (item.manaAmount) {
        const healedMp = Math.min(item.manaAmount, wbUser.maxMp - wbUser.mp);
        
        if (healedMp <= 0) {
            return '❌ MP của bạn đã đầy!';
        }
        
        wbManager.updateUser(userId, { mp: wbUser.mp + healedMp });
        message = `✅ Đã hồi ${healedMp} MP! (${wbUser.mp + healedMp}/${wbUser.maxMp})`;
    }
    
    // Buff items
    if (item.buffType) {
        wbManager.addBuff(userId, item.buffType, item.buffAmount, item.duration);
        const buffName = item.buffType === 'attack' ? 'Tấn công' : item.buffType === 'defense' ? 'Phòng thủ' : 'May mắn';
        message = `✅ Đã sử dụng ${item.name}! +${Math.round(item.buffAmount * 100)}% ${buffName} trong ${item.duration} lượt chiến đấu.`;
    }
    
    // XP gem
    if (item.xpBonus) {
        const newXP = wbUser.xp + adjustedXpBonus;
        const oldLevel = wbUser.level;
        const newLevel = calculateLevelFromXP(newXP);
        
        const adjustedXpBonus = Math.floor(item.xpBonus * XP_MULTIPLIER);
        message = `✅ Đã nhận ${adjustedXpBonus} XP!`;
        
        if (newLevel > oldLevel) {
            const newStats = calculateStatsForLevel(newLevel);
            const hpIncrease = newStats.maxHp - wbUser.maxHp;
            const mpIncrease = newStats.maxMp - wbUser.maxMp;
            const atkIncrease = newStats.baseAttack - wbUser.baseAttack;
            const defIncrease = newStats.baseDefense - wbUser.baseDefense;
            
            // Full update with stat increases and heal like combat level up
            wbManager.updateUser(userId, {
                xp: newXP,
                level: newLevel,
                maxHp: newStats.maxHp,
                maxMp: newStats.maxMp,
                hp: newStats.maxHp, // Full heal on level up
                mp: newStats.maxMp,  // Full MP restore
                baseAttack: newStats.baseAttack,
                baseDefense: newStats.baseDefense
            });
            
            message += ` 🎊 **LEVEL UP!** Level ${oldLevel} → Level ${newLevel}
📈 **Tăng thể lực:** +${hpIncrease} HP, +${mpIncrease} MP, +${atkIncrease} ATK, +${defIncrease} DEF
💚 **Full heal!** HP và MP đã được hồi đầy!`;
            
            // Check for max level
            if (newLevel >= MAX_LEVEL) {
                const overflow = getXPOverflow(newXP, newLevel);
                message += `\n🌟 **ĐÃ ĐẠT LEVEL TỐI ĐA!** (${overflow} XP thừa sẽ được lưu)`;
            }
        } else {
            wbManager.updateUser(userId, { xp: newXP });
        }
    }
    
    // Remove item from inventory
    wbManager.removeItemFromInventory(userId, itemId, 1);
    
    return message || `✅ Đã sử dụng ${item.name}.`;
}

async function handleQuests({ userId }) {
    const hasReset = wbManager.checkDailyReset(userId);
    const wbUser = wbManager.getUser(userId);
    const quests = wbUser.dailyQuests.available;
    
    let resetMessage = hasReset ? '🔄 **Daily quests đã được reset!**\n\n' : '';
    
    let questText = '--- 📋 **NHIỆM VỤ HÀNG NGÀY** ---\n';
    
    for (const quest of quests) {
        const progress = `${quest.progress}/${quest.count}`;
        const status = quest.completed ? '✅' : '🔄';
        const reward = `${quest.reward.xp} XP + ${quest.reward.gold} xu`;
        
        questText += `${status} **${quest.description}** (${progress})\n   Thưởng: ${reward}\n\n`;
    }
    
    const completedCount = quests.filter(q => q.completed).length;
    questText += `**Hoàn thành:** ${completedCount}/${quests.length}`;
    
    if (completedCount > 0 && !wbUser.dailyQuests.completed.includes(new Date().toDateString())) {
        questText += '\n\n💡 Dùng \`wb quest claim\` để nhận thưởng!';
    }
    
    return resetMessage + questText;
}

async function handleQuestClaim({ userId }) {
    const wbUser = wbManager.getUser(userId);
    const today = new Date().toDateString();
    
    if (wbUser.dailyQuests.completed.includes(today)) {
        return '❌ Bạn đã nhận thưởng quest hôm nay rồi!';
    }
    
    const completedQuests = wbUser.dailyQuests.available.filter(q => q.completed);
    if (completedQuests.length === 0) {
        return '❌ Bạn chưa hoàn thành quest nào!';
    }
    
    let totalXP = 0;
    let totalGold = 0;
    
    for (const quest of completedQuests) {
        totalXP += quest.reward.xp;
        totalGold += quest.reward.gold;
    }
    
    // Add rewards
    wbManager.updateUser(userId, { xp: wbUser.xp + totalXP });
    userManager.updateMoney(userId, totalGold);
    
    // Mark as claimed
    wbUser.dailyQuests.completed.push(today);
    wbManager.updateStatistic(userId, 'questsCompleted', completedQuests.length);
    wbManager.saveUsers();
    
    return `🎉 **NHẬN THƯỞNG THÀNH CÔNG!**
Đã hoàn thành ${completedQuests.length} quest và nhận được:
⭐ ${totalXP} XP
💰 ${totalGold} xu`;
}

async function handleStats({ userId }) {
    const wbUser = wbManager.getUser(userId);
    const stats = wbUser.statistics;
    
    return `--- 📊 **THỐNG KÊ CỦA BẠN** ---
⚔️ **Quái vật đã tiêu diệt:** ${stats.monstersKilled}
👑 **Boss đã hạ gục:** ${stats.bossesKilled}
🎁 **Vật phẩm đã tìm thấy:** ${stats.itemsFound}
📋 **Quest đã hoàn thành:** ${stats.questsCompleted}

🏆 **Thành tích:**
${stats.bossesKilled >= 10 ? '👑 **Boss Slayer** - Hạ gục 10+ boss' : ''}
${stats.monstersKilled >= 100 ? '⚔️ **Monster Hunter** - Tiêu diệt 100+ quái vật' : ''}
${stats.questsCompleted >= 50 ? '📋 **Quest Master** - Hoàn thành 50+ quest' : ''}`;
}

async function handleRest({ userId }) {
    const wbUser = wbManager.getUser(userId);
    
    if (wbUser.combatState.inCombat) {
        return '❌ Không thể nghỉ ngơi khi đang trong trận chiến!';
    }
    
    const stats = wbManager.getEquippedStats(userId);
    const maxHp = wbUser.maxHp + stats.hpBonus;
    
    if (wbUser.hp >= maxHp) {
        return '❌ HP của bạn đã đầy rồi!';
    }
    
    // Check rest cooldown (5 minutes)
    const now = Date.now();
    const restCooldown = 5 * 60 * 1000; // 5 minutes
    
    if (wbUser.lastRestTime && now - wbUser.lastRestTime < restCooldown) {
        const remainingMs = restCooldown - (now - wbUser.lastRestTime);
        const remainingMin = Math.ceil(remainingMs / 60000);
        return `⏰ Bạn cần chờ ${remainingMin} phút nữa để nghỉ ngơi lại.`;
    }
    
    // Rest healing: 25% of max HP
    const healAmount = Math.floor(maxHp * 0.25);
    const newHp = Math.min(maxHp, wbUser.hp + healAmount);
    const actualHeal = newHp - wbUser.hp;
    
    wbManager.updateUser(userId, {
        hp: newHp,
        lastRestTime: now
    });
    
    return `💤 **NGHỈ NGƠI** 💤
Bạn đã nghỉ ngơi và hồi phục sức lực.
💚 **Hồi HP:** +${actualHeal} HP (${newHp}/${maxHp})

⏰ Có thể nghỉ ngơi lại sau 5 phút.`;
}

async function handlePvp({ userId, args }) {
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
�� **Stats:** ${stats.wins}W/${stats.losses}L (${stats.totalFights} fights)${statusText}

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
  const target = userManager.getUser(targetId); // Check if user exists in general system
  
  if (!target) return '❌ Người chơi không tồn tại!';
  if (targetId === challengerId) return '❌ Không thể thách đấu chính mình!';
  
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
  const maxTurns = 50; // Prevent infinite loops
  
  const stats1 = wbManager.getEquippedStats(player1Id);
  const stats2 = wbManager.getEquippedStats(player2Id);
  const maxHp1 = player1.maxHp + stats1.hpBonus;
  const maxHp2 = player2.maxHp + stats2.hpBonus;
  
  combatLog.push(`⚔️ **PVP AUTO-COMBAT** ⚔️`);
  combatLog.push(`**${player1Id}** (Lv.${player1.level}, ${currentPlayer1Hp} HP) VS **${player2Id}** (Lv.${player2.level}, ${currentPlayer2Hp} HP)`);
  combatLog.push('');

  while (currentPlayer1Hp > 0 && currentPlayer2Hp > 0 && turnCount < maxTurns) {
    turnCount++;
    
    // Random who attacks first each turn
    const player1AttacksFirst = Math.random() < 0.5;
    
    if (player1AttacksFirst) {
      // Player 1 attacks Player 2
      const damage = calculatePvpDamage(stats1, stats2);
      currentPlayer2Hp = Math.max(0, currentPlayer2Hp - damage.amount);
      combatLog.push(`Turn ${turnCount}A: 💥 ${player1Id} → ${player2Id}: ${damage.amount} dmg${damage.isCrit ? ' 🎯' : ''} | HP: ${currentPlayer2Hp}/${maxHp2}`);
      
      if (currentPlayer2Hp <= 0) break;
      
      // Player 2 attacks Player 1
      const damage2 = calculatePvpDamage(stats2, stats1);
      currentPlayer1Hp = Math.max(0, currentPlayer1Hp - damage2.amount);
      combatLog.push(`Turn ${turnCount}B: 💥 ${player2Id} → ${player1Id}: ${damage2.amount} dmg${damage2.isCrit ? ' 🎯' : ''} | HP: ${currentPlayer1Hp}/${maxHp1}`);
    } else {
      // Player 2 attacks Player 1
      const damage = calculatePvpDamage(stats2, stats1);
      currentPlayer1Hp = Math.max(0, currentPlayer1Hp - damage.amount);
      combatLog.push(`Turn ${turnCount}A: 💥 ${player2Id} → ${player1Id}: ${damage.amount} dmg${damage.isCrit ? ' 🎯' : ''} | HP: ${currentPlayer1Hp}/${maxHp1}`);
      
      if (currentPlayer1Hp <= 0) break;
      
      // Player 1 attacks Player 2
      const damage2 = calculatePvpDamage(stats1, stats2);
      currentPlayer2Hp = Math.max(0, currentPlayer2Hp - damage2.amount);
      combatLog.push(`Turn ${turnCount}B: 💥 ${player1Id} → ${player2Id}: ${damage2.amount} dmg${damage2.isCrit ? ' 🎯' : ''} | HP: ${currentPlayer2Hp}/${maxHp2}`);
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

// --- Skill Command Handler ---
async function handleSkill({ userId, args }) {
  const wbUser = wbManager.getUser(userId);
  const sub = args[1]?.toLowerCase();
  if (!sub) {
    // Show owned and equipped skills
    let text = '--- 🧙‍♂️ **KỸ NĂNG CỦA BẠN** ---\n';
    const owned = wbUser.skills || [];
    const equipped = wbUser.equippedSkills || [];
    if (owned.length === 0) return text + 'Bạn chưa sở hữu kỹ năng nào.';
    for (const skillId of owned) {
      const skill = wbManager.getSkill(skillId);
      if (!skill) continue;
      const isEquipped = equipped.includes(skillId) ? ' [Đã trang bị]' : '';
      const cd = wbUser.skillCooldowns?.[skillId] || 0;
      text += `• ${skill.name}${isEquipped} - MP: ${skill.mp_cost}, CD: ${skill.cooldown}, Mô tả: ${skill.description} ${cd > 0 ? `(Hồi: ${cd} lượt)` : ''}\n`;
    }
    return text;
  }
  if (sub === 'equip') {
    const skillId = args[2];
    if (!skillId) return '❌ Thiếu ID kỹ năng.';
    const result = wbManager.equipSkill(userId, skillId);
    return result.success ? '✅ ' + result.message : '❌ ' + result.message;
  }
  if (sub === 'unequip') {
    const skillId = args[2];
    if (!skillId) return '❌ Thiếu ID kỹ năng.';
    const result = wbManager.unequipSkill(userId, skillId);
    return result.success ? '✅ ' + result.message : '❌ ' + result.message;
  }
  if (sub === 'use') {
    const skillId = args[2];
    if (!skillId) return '❌ Thiếu ID kỹ năng.';
    const result = wbManager.useSkill(userId, skillId);
    return result.success ? '✅ ' + result.message : '❌ ' + result.message;
  }
  return '❌ Lệnh skill không hợp lệ.';
}

// --- Main Command Executor ---

export default {
  name: 'wb',
  description: 'Hệ thống World Boss nâng cao (info, hunt, pve, equipment, shop, quest...)',
  usage: '!wb <subcommand> [args...]',
  aliases: ['worldboss'],

  async execute({ userId, args }) {
    userManager.incrementCommandCount(userId);
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
      case 'info':
      case 'i':
        return await handleInfo({ userId, args });
      case 'map':
      case 'maps':
        return await handleMap({ userId, args });
      case 'hunt':
      case 'h':
        return await handleHunt({ userId, args });
      case 'pve':
      case 'attack':
      case 'fight':
        return await handlePve({ userId, args: args.slice(1) });
      case 'inv':
      case 'inventory':
      case 'bag':
        return await handleInventory({ userId });
      case 'eq':
      case 'equip':
      case 'equipment':
        return await handleEquipment({ userId, args });
      case 'shop':
      case 'store':
        return await handleShop({ userId, args });
      case 'use':
      case 'consume':
        return await handleUse({ userId, args });
      case 'quest':
      case 'q':
        if (args[1] === 'claim') {
          return await handleQuestClaim({ userId });
        }
        return await handleQuests({ userId });
      case 'stats':
      case 'statistics':
        return await handleStats({ userId });
      case 'pvp':
        return await handlePvp({ userId, args });
      case 'rest':
      case 'sleep':
        return await handleRest({ userId });
      case 'skill':
        return await handleSkill({ userId, args });
      default:
        return `--- 🌟 **HƯỚNG DẪN WORLD BOSS** ---

**🎮 Lệnh cơ bản:**
\`wb info\` - Xem thông tin nhân vật
\`wb map\` - Xem tất cả bản đồ có sẵn
\`wb hunt <map_id>\` - Vào bản đồ để săn quái
\`wb pve\` - Tấn công từng lượt (cổ điển)
\`wb pve auto\` - ⚡ Auto-combat đến kết thúc
\`wb pve safe\` - 🛡️ Auto-combat với safe stop (HP < 70%)
\`wb rest\` - 💤 Nghỉ ngơi để hồi HP (5 phút cooldown)

**🎒 Quản lý đồ đạc:**
\`wb inventory\` - Xem túi đồ
\`wb equip\` - Quản lý trang bị
\`wb use <item>\` - Sử dụng vật phẩm

**🏪 Mua bán:**
\`wb shop\` - Xem cửa hàng
\`wb shop buy <item>\` - Mua vật phẩm
\`wb shop sell <item>\` - Bán vật phẩm

**📋 Nhiệm vụ & Thống kê:**
\`wb quest\` - Xem nhiệm vụ hàng ngày
\`wb quest claim\` - Nhận thưởng quest
\`wb stats\` - Xem thống kê cá nhân

**⚔️ PvP:**
\`wb pvp\` - Xem hệ thống PvP
\`wb pvp <userId>\` - Thách đấu người chơi  
\`wb pvp ac\` - Chấp nhận (auto combat)

🌟 **Xem bản đồ với \`wb map\`, sau đó bắt đầu hành trình với \`wb hunt <map_id>\`!**`;
    }
  }
};
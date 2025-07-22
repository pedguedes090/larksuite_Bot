// modules/commands/wb.js
import UserManager from '../userManager.js';
import WB_DataManager from '../wbDataManager.js';

const userManager = UserManager.getInstance();
const wbManager = WB_DataManager.getInstance();

// --- Helper Functions ---

const MAX_LEVEL = 50; // Level cap
const XP_MULTIPLIER = 0.6; // Reduce XP gain to 60% of original

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

async function handleHunt({ userId, args }) {
  if (args.length < 2) {
    return `❌ **Thiếu tham số!** Sử dụng: \`wb hunt <map_id>\`
Dùng \`wb hunt\` để xem danh sách bản đồ có sẵn.`;
  }
  
  const mapId = args[1];
  const wbUser = wbManager.getUser(userId);

  if (wbUser.combatState.inCombat) {
    return `❌ Bạn đang trong một trận chiến! Dùng \`wb pve\` để tiếp tục.`;
  }
  
  if (!mapId) {
    const normalMaps = wbManager.getMapsByType('normal');
    const dangerousMaps = wbManager.getMapsByType('dangerous');
    const extremeMaps = wbManager.getMapsByType('extreme');
    const bossAreas = wbManager.getMapsByType('boss_area');
    
    let mapsList = '';
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
    
    return `🗺️ **Chọn một bản đồ để đi săn:**${mapsList}\n\n**Sử dụng:** \`wb hunt <map_id>\``;
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

  wbManager.updateUser(userId, {
    combatState: {
      inCombat: true,
      monsterId: monster.id,
      monsterHp: monster.hp,
      mapId: map.id
    }
  });

  const dangerEmoji = monster.type === 'boss' ? '👑' : monster.type === 'world_boss' ? '🐉' : '⚔️';
  return `🌲 Bạn đã tiến vào **${map.name}** và gặp một **${monster.name}**! ${dangerEmoji}
${map.description}
Dùng lệnh \`wb pve\` để tấn công!`;
}

async function handlePve({ userId, args }) {
    const wbUser = wbManager.getUser(userId);

    if (!wbUser.combatState.inCombat) {
        return `❌ Bạn không ở trong trận chiến nào. Dùng \`wb hunt <map_id>\` để tìm quái vật.`;
    }

    const mode = args[0]?.toLowerCase(); // auto, safe, or default single turn
    
    if (mode === 'auto') {
        return await handleAutoCombat(userId, false); // Full auto
    } else if (mode === 'safe') {
        return await handleAutoCombat(userId, true);  // Safe auto with HP check
    }
    
    // Default single turn combat

    const monster = wbManager.getMonster(wbUser.combatState.monsterId);
    const stats = wbManager.getEquippedStats(userId);
    
    if (!monster) {
        wbManager.updateUser(userId, {
            combatState: { inCombat: false, monsterId: null, monsterHp: 0, mapId: null }
        });
        return `❌ Lỗi hệ thống: Quái vật không tồn tại. Trận chiến đã được reset.`;
    }

    let combatLog = [];

    // Player attacks monster
    const playerDamage = Math.max(1, stats.attack - monster.defense);
    const newMonsterHp = wbUser.combatState.monsterHp - playerDamage;
    combatLog.push(`💥 Bạn tấn công ${monster.name}, gây ${playerDamage} sát thương. HP quái còn: ${Math.max(0, newMonsterHp)}/${monster.hp}`);

            // Check if monster is defeated
        if (newMonsterHp <= 0) {
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
                if (!item) {
                    console.error(`❌ Item ${drop.itemId} not found in database`);
                    continue;
                }
                
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
            
            levelUpMessage = `\n🎊 **LEVEL UP!** Level ${oldLevel} → Level ${newLevel}
📈 **Tăng thể lực:** +${hpIncrease} HP, +${mpIncrease} MP, +${newStats.baseAttack - wbUser.baseAttack} ATK, +${newStats.baseDefense - wbUser.baseDefense} DEF`;
            
            // Check for max level
            if (newLevel >= MAX_LEVEL) {
                const overflow = getXPOverflow(newXP, newLevel);
                levelUpMessage += `\n🌟 **ĐÃ ĐẠT LEVEL TỐI ĐA!** (${overflow} XP thừa sẽ được lưu)`;
            }
            
            wbManager.updateUser(userId, {
                level: newLevel,
                xp: newXP,
                maxHp: newStats.maxHp,
                maxMp: newStats.maxMp,
                hp: newStats.maxHp, // Full heal on level up
                mp: newStats.maxMp,  // Full MP restore
                baseAttack: newStats.baseAttack,
                baseDefense: newStats.baseDefense,
                combatState: { inCombat: false, monsterId: null, monsterHp: 0, mapId: null }
            });
        } else {
            wbManager.updateUser(userId, {
                xp: newXP,
                combatState: { inCombat: false, monsterId: null, monsterHp: 0, mapId: null }
            });
        }

        if (goldGained > 0) {
            userManager.updateMoney(userId, goldGained);
        }

        const victoryMessage = `🎉 **CHIẾN THẮNG!** 🎉
Bạn đã hạ gục ${monster.name}!
⭐ **Nhận được:** ${xpGained} XP${goldGained > 0 ? ` và ${goldGained} xu` : ''}
🎁 **Vật phẩm rơi:**\n${lootLog.length > 0 ? lootLog.join('\n') : 'Không có gì cả.'}${levelUpMessage}

HP của bạn: ${wbManager.getUser(userId).hp}/${wbManager.getUser(userId).maxHp}`;
        
        return victoryMessage;
    }
    
    // Monster attacks player (with special abilities)
    let monsterDamage = Math.max(1, monster.attack - stats.defense);
    let specialMessage = '';
    
    if (monster.specialAbility) {
        switch (monster.specialAbility) {
            case 'freeze':
                if (Math.random() < 0.3) {
                    specialMessage = `\n❄️ ${monster.name} đóng băng bạn! Bạn mất lượt này.`;
                    monsterDamage = 0;
                }
                break;
            case 'fire_breath':
                if (Math.random() < 0.4) {
                    monsterDamage = Math.floor(monsterDamage * 1.5);
                    specialMessage = `\n🔥 ${monster.name} phun lửa! Sát thương tăng 50%!`;
                }
                break;
            case 'life_drain':
                if (Math.random() < 0.25) {
                    const healed = Math.min(monsterDamage, monster.hp - wbUser.combatState.monsterHp);
                    const newMonsterHp = wbUser.combatState.monsterHp + healed;
                    // Update combat state immediately for consistency
                    wbManager.updateUser(userId, {
                        combatState: {
                            ...wbUser.combatState,
                            monsterHp: newMonsterHp
                        }
                    });
                    wbUser.combatState.monsterHp = newMonsterHp; // Update local reference
                    specialMessage = `\n🩸 ${monster.name} hút máu! Hồi ${healed} HP!`;
                }
                break;
        }
    }
    
    const newPlayerHp = wbUser.hp - monsterDamage;
    combatLog.push(`🩸 ${monster.name} tấn công bạn, gây ${monsterDamage} sát thương. HP của bạn còn: ${Math.max(0, newPlayerHp)}/${wbUser.maxHp + stats.hpBonus}${specialMessage}`);
    
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
                combatState: { inCombat: false, monsterId: null, monsterHp: 0, mapId: null }
            });
        } else {
            wbManager.updateUser(userId, {
                xp: newXP,
                hp: 1,
                combatState: { inCombat: false, monsterId: null, monsterHp: 0, mapId: null }
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
    
    wbManager.updateUser(userId, {
        hp: newPlayerHp,
        combatState: {
            ...wbUser.combatState,
            monsterHp: newMonsterHp
        }
    });
    
    return combatLog.join('\n');
}

// New auto-combat function
async function handleAutoCombat(userId, safeMode = false) {
    const wbUser = wbManager.getUser(userId);
    const monster = wbManager.getMonster(wbUser.combatState.monsterId);
    
    if (!monster) {
        wbManager.updateUser(userId, {
            combatState: { inCombat: false, monsterId: null, monsterHp: 0, mapId: null }
        });
        return `❌ Lỗi hệ thống: Quái vật không tồn tại. Trận chiến đã được reset.`;
    }

    let combatLog = [];
    let turnCount = 0;
    let currentMonsterHp = wbUser.combatState.monsterHp;
    let currentPlayerHp = wbUser.hp;
    const maxTurns = 50; // Prevent infinite loops
    
    combatLog.push(`⚔️ **${safeMode ? 'SAFE AUTO-COMBAT' : 'AUTO-COMBAT'}** vs ${monster.name} bắt đầu!`);
    combatLog.push(`Monster HP: ${currentMonsterHp}/${monster.hp} | Your HP: ${currentPlayerHp}/${wbUser.maxHp}`);
    combatLog.push('');

    while (currentMonsterHp > 0 && currentPlayerHp > 0 && turnCount < maxTurns) {
        turnCount++;
        const stats = wbManager.getEquippedStats(userId);
        
        // Player attacks monster
        const playerDamage = Math.max(1, stats.attack - monster.defense);
        currentMonsterHp -= playerDamage;
        combatLog.push(`Turn ${turnCount}: 💥 Bạn tấn công gây ${playerDamage} sát thương. Monster HP: ${Math.max(0, currentMonsterHp)}/${monster.hp}`);

                 // Check if monster is defeated
         if (currentMonsterHp <= 0) {
             // Victory processing (same as original)
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
                
                levelUpMessage = `\n🎊 **LEVEL UP!** Level ${oldLevel} → Level ${newLevel}
📈 **Tăng thể lực:** +${hpIncrease} HP, +${mpIncrease} MP, +${newStats.baseAttack - wbUser.baseAttack} ATK, +${newStats.baseDefense - wbUser.baseDefense} DEF`;
                
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
                    combatState: { inCombat: false, monsterId: null, monsterHp: 0, mapId: null }
                });
            } else {
                wbManager.updateUser(userId, {
                    xp: newXP,
                    combatState: { inCombat: false, monsterId: null, monsterHp: 0, mapId: null }
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
        
        // Monster attacks player
        let monsterDamage = Math.max(1, monster.attack - stats.defense);
        let specialMessage = '';
        
        if (monster.specialAbility) {
            switch (monster.specialAbility) {
                case 'freeze':
                    if (Math.random() < 0.3) {
                        specialMessage = ` ❄️ Freeze!`;
                        monsterDamage = 0;
                    }
                    break;
                case 'fire_breath':
                    if (Math.random() < 0.4) {
                        monsterDamage = Math.floor(monsterDamage * 1.5);
                        specialMessage = ` 🔥 Fire breath!`;
                    }
                    break;
                case 'life_drain':
                    if (Math.random() < 0.25) {
                        const healed = Math.min(monsterDamage, monster.hp - currentMonsterHp);
                        currentMonsterHp += healed;
                        specialMessage = ` 🩸 Life drain +${healed}HP!`;
                    }
                    break;
            }
        }
        
        currentPlayerHp -= monsterDamage;
        combatLog.push(`        🩸 ${monster.name} tấn công gây ${monsterDamage} sát thương.${specialMessage} Your HP: ${Math.max(0, currentPlayerHp)}/${wbUser.maxHp}`);
        
        // Check if player is defeated
        if (currentPlayerHp <= 0) {
            // Check for revival stone
            const now = Date.now();
            const revivalCooldown = 60000;
            
            if (wbManager.hasItem(userId, 'revival_stone') && 
                (!wbUser.lastRevivalUse || now - wbUser.lastRevivalUse >= revivalCooldown)) {
                
                wbManager.removeItemFromInventory(userId, 'revival_stone', 1);
                const reviveHp = Math.floor(wbUser.maxHp * 0.5);
                currentPlayerHp = reviveHp;
                
                wbManager.updateUser(userId, {
                    hp: reviveHp,
                    lastRevivalUse: now,
                    combatState: {
                        ...wbUser.combatState,
                        monsterHp: currentMonsterHp
                    }
                });
                
                combatLog.push(`💎 **ĐÁ HỒI SINH KÍCH HOẠT!** Hồi sinh với ${reviveHp} HP!`);
                continue;
            }
            
            // Player defeat
            const xpLost = Math.min(Math.floor(wbUser.xp * 0.1), 50);
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
                    combatState: { inCombat: false, monsterId: null, monsterHp: 0, mapId: null }
                });
            } else {
                wbManager.updateUser(userId, {
                    xp: newXP,
                    hp: 1,
                    combatState: { inCombat: false, monsterId: null, monsterHp: 0, mapId: null }
                });
            }

            combatLog.push('');
            combatLog.push(`☠️ **THẤT BẠI!** ☠️`);
            combatLog.push(`Bị ${monster.name} hạ gục sau ${turnCount} lượt.`);
            combatLog.push(`- Mất ${xpLost} XP. Hồi sinh tại thành với 1 HP.${levelDownMessage}`);
            
            return combatLog.join('\n');
        }
        
        // Safe mode HP check
        if (safeMode) {
            const hpPercentage = currentPlayerHp / wbUser.maxHp;
            if (hpPercentage < 0.7) { // Stop when HP < 70%
                wbManager.updateUser(userId, {
                    hp: currentPlayerHp,
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
                combatLog.push(`**Tiếp tục:** \`wb pve\` | \`wb pve auto\` | \`wb pve safe\``);
                combatLog.push(`**Dùng thuốc:** \`wb use health_potion\``);
                
                return combatLog.join('\n');
            }
        }

        // Decrease buff turns
        wbManager.decreaseBuffTurns(userId);
        
        combatLog.push('');
    }
    
    // Timeout
    if (turnCount >= maxTurns) {
        wbManager.updateUser(userId, {
            hp: currentPlayerHp,
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
            inventoryText += ` • **${itemStack.item.name}** x${itemStack.quantity}${sellPrice}\n   *${itemStack.item.description}*\n`;
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
            special: '✨ **Đặc biệt:**'
        };
        
        for (const [type, items] of Object.entries(itemsByType)) {
            if (type === 'material') continue; // Don't show materials in shop
            
            shopText += `\n${typeNames[type] || '📋 **Khác:**'}\n`;
            for (const item of items) {
                const levelReq = item.requiredLevel ? ` (Lv.${item.requiredLevel})` : '';
                shopText += ` • \`${item.id}\`: **${item.name}** - ${item.buyPrice} xu${levelReq}\n`;
            }
        }
        
        shopText += '\n**Lệnh:** \`wb shop buy <item_id> [số lượng]\` | \`wb shop sell <item_id> [số lượng]\`';
        return shopText;
    }
    
    if (action === 'buy') {
        if (args.length < 3) {
            return '❌ **Thiếu tham số!** Sử dụng: `wb shop buy <item_id> [số_lượng]`';
        }
        
        const itemId = args[2];
        const quantity = parseInt(args[3]) || 1;
        
        if (!itemId) return '❌ Vui lòng chỉ định ID vật phẩm.';
        
        const item = wbManager.getItem(itemId);
        if (!item || !item.buyPrice) {
            return '❌ Vật phẩm này không có bán trong cửa hàng.';
        }
        
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
        wbManager.addItemToInventory(userId, itemId, quantity);
        
        return `✅ Đã mua ${quantity} **${item.name}** với giá ${totalCost} xu.`;
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

async function handlePvp() {
  return "⚔️ Tính năng PvP (Player vs Player) hiện đang được phát triển và sẽ sớm ra mắt!";
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
        return await handlePvp();
      default:
        return `--- 🌟 **HƯỚNG DẪN WORLD BOSS** ---

**🎮 Lệnh cơ bản:**
\`wb info\` - Xem thông tin nhân vật
\`wb hunt\` - Chọn bản đồ để săn quái
\`wb pve\` - Tấn công từng lượt (cổ điển)
\`wb pve auto\` - ⚡ Auto-combat đến kết thúc
\`wb pve safe\` - 🛡️ Auto-combat với safe stop (HP < 70%)

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

**⚔️ Khác:**
\`wb pvp\` - PvP (sắp ra mắt)

🌟 **Bắt đầu hành trình của bạn với \`wb hunt\`!**`;
    }
  }
};
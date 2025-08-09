import { wbManager, userManager, MAX_LEVEL, XP_MULTIPLIER, resetCombatState, calculateStatsForLevel, calculateLevelFromXP, getXPRequiredForSingleLevel, getXPOverflow } from './utils.js';
import doubleAttack from './skills/double_attack.js';
import heal30 from './skills/heal_30.js';
import buffDef402 from './skills/buff_def_40_2.js';
import fireball from './skills/fireball.js';
import buffAtk30Def20_3 from './skills/buff_atk_30_def_-20_3.js';
import poison from './skills/poison.js';
import paralyze from './skills/paralyze.js';
import burn from './skills/burn.js';
import freeze from './skills/freeze.js';
import stun from './skills/stun.js';
import quicksand from './skills/quicksand.js';
import { applyStatusEffects } from './statusEffects.js';

const skillEffects = {
    double_attack: doubleAttack,
    heal_30: heal30,
    buff_def_40_2: buffDef402,
    fireball: fireball,
    'buff_atk_30_def_-20_3': buffAtk30Def20_3,
    poison: poison,
    paralyze: paralyze,
    burn: burn,
    freeze: freeze,
    stun: stun,
    quicksand: quicksand
};

export default async function handlePve({ userId, args }) {
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

    // Apply status effects
    const playerStatus = applyStatusEffects(wbUser, wbUser.maxHp + stats.hpBonus, combatLog, 'Bạn');
    const monsterState = { hp: wbUser.combatState.monsterHp, statusEffects: wbUser.combatState.monsterStatusEffects };
    const monsterStatus = applyStatusEffects(monsterState, wbUser.combatState.monsterMaxHp || monster.hp, combatLog, monster.name);
    wbUser.combatState.monsterHp = monsterState.hp;
    wbUser.combatState.monsterStatusEffects = monsterState.statusEffects;
    await wbManager.saveUsers();

    let playerDamage = 0;
    let skillMessage = '';
    let newMonsterHp = wbUser.combatState.monsterHp;

    if (!playerStatus.skipTurn) {
        playerDamage = Math.max(1, stats.attack - Math.max(0, (wbUser.combatState.monsterBuffedDefense || monster.defense) - stats.armorPen));
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
            await wbManager.saveUsers();
            // Thực hiện hiệu ứng skill
            const effectFn = skillEffects[skill.effect];
            const effectState = { wbUser, stats, wbManager, combatLog, damage: playerDamage, skill };
            if (effectFn) {
                await effectFn({ userId, monster, state: effectState });
                playerDamage = effectState.damage;
                skillMessage = effectState.skillMessage || '';
            } else {
                combatLog.push(`Bạn dùng ${skill.name} nhưng chưa có hiệu ứng!`);
            }
        }
        newMonsterHp = wbUser.combatState.monsterHp - playerDamage;
        if (!skillId) {
            combatLog.push(`💥 Bạn tấn công ${monster.name}, gây ${playerDamage} sát thương.`);
        } else {
            combatLog.push(`💥 Tổng sát thương lên quái: ${playerDamage}`);
        }
        // Lifesteal
        if (playerDamage > 0 && stats.lifesteal > 0) {
            const heal = Math.floor(playerDamage * stats.lifesteal);
            wbUser.hp = Math.min(wbUser.maxHp + stats.hpBonus, wbUser.hp + heal);
            combatLog.push(`🩸 Hút máu: +${heal} HP`);
        }
        combatLog.push(`🩸 HP quái còn: ${Math.max(0, newMonsterHp)}/${wbUser.combatState.monsterMaxHp || monster.hp}`);

        // Show current MP and skill cooldowns after using skill
        if (skillId) {
            combatLog.push(`💙 MP còn lại: ${wbUser.mp}/${wbUser.maxMp}`);
            const activeCooldowns = Object.entries(wbUser.skillCooldowns || {}).filter(([_, cd]) => cd > 0);
            if (activeCooldowns.length > 0) {
                const cooldownText = activeCooldowns.map(([skill, cd]) => `${skill}(${cd})`).join(', ');
                combatLog.push(`⏳ Cooldown: ${cooldownText}`);
            }
        }
    } else {
        combatLog.push('⛔ Bạn không thể hành động trong lượt này!');
    }

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
                combatState: resetCombatState()
            });
        }
        if (goldGained > 0) {
            userManager.updateMoney(userId, goldGained);
        }
        combatLog.push('');
        combatLog.push(`🎉 **CHIẾN THẮNG!** 🎉`);
        combatLog.push(`Đã hạ gục ${monster.name}!`);
        combatLog.push(`⭐ **Nhận được:** ${xpGained} XP${goldGained > 0 ? ` và ${goldGained} xu` : ''}`);
        combatLog.push(`🎁 **Vật phẩm rơi:**\n${lootLog.length > 0 ? lootLog.join('\n') : 'Không có gì cả.'}`);
        if (levelUpMessage) combatLog.push(levelUpMessage);
        // RETURN NGAY LẬP TỨC, KHÔNG ĐỂ VÒNG LẶP CHẠY TIẾP
        return combatLog.join('\n');
    }
    // Monster turn: nếu monster có skills, có xác suất dùng skill
    if (!monsterStatus.skipTurn) {
        let monsterSkillMsg = '';
        const monsterSkills = monster.skills || [];
        let monsterUsedSkill = null;
        let monsterDamage = Math.max(1, (wbUser.combatState.monsterBuffedAttack || monster.attack) - Math.max(0, stats.defense - (wbUser.combatState.monsterArmorPenetration || 0)));

        if (monsterSkills.length > 0 && Math.random() < 0.5) { // 50% dùng skill nếu có
            const skillId = monsterSkills[Math.floor(Math.random() * monsterSkills.length)];
            const skill = wbManager.getSkill(skillId);
            if (skill) {
                monsterUsedSkill = skill;
                const effectFn = skillEffects[skill.effect];
                const effectState = { wbUser, stats, wbManager, monsterHp: newMonsterHp, damage: monsterDamage, skill, isMonster: true };
                if (effectFn) {
                    await effectFn({ userId, monster, state: effectState });
                    monsterDamage = effectState.damage;
                    newMonsterHp = effectState.monsterHp;
                    monsterSkillMsg = effectState.monsterSkillMsg || '';
                } else {
                    monsterSkillMsg = `${monster.name} dùng ${skill.name}!`;
                }
            }
        }

        if (Math.random() < stats.dodge) {
            monsterDamage = 0;
            combatLog.push(`💨 Bạn né được đòn tấn công của ${monster.name}!`);
        }

        const newPlayerHp = wbUser.hp - monsterDamage;
        if (monsterSkillMsg) combatLog.push(monsterSkillMsg);
        if (monsterDamage > 0) {
            combatLog.push(`🩸 ${monster.name} tấn công bạn, gây ${monsterDamage} sát thương.`);
        }
        combatLog.push(`❤️ HP của bạn còn: ${Math.max(0, newPlayerHp)}/${wbUser.maxHp + stats.hpBonus}`);
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

        const defeatMessage = `☠️ **THẤT BẠI!** ☠️\nBạn đã bị ${monster.name} hạ gục.\n- Bạn bị mất ${xpLost} XP.\n- Bạn đã được hồi sinh tại thành với 1 HP.${levelDownMessage}`;

        return defeatMessage;
        }
        wbUser.hp = newPlayerHp;
    } else {
        combatLog.push(`${monster.name} không thể hành động!`);
    }
    // Decrease buff turns after combat turn
    wbManager.decreaseBuffTurns(userId);
    // Giảm cooldown skill
    wbManager.decreaseSkillCooldowns(userId);
    wbManager.updateUser(userId, {
        hp: wbUser.hp,
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
      const buffText = buffs.map(b => `${b.type === 'attack' ? '⚔️' : b.type === 'defense' ? '🛡️' : '🍀'} +${Math.round(b.amount * 100)}% (${b.turnsRemaining} lượt)`).join(', ');
      combatLog.push(`🔮 **Buff hiện tại:** ${buffText}`);
    }

    // Show current MP if not at max
    if (wbUser.mp < wbUser.maxMp) {
        combatLog.push(`💙 **MP:** ${wbUser.mp}/${wbUser.maxMp}`);
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
            const effectFn = skillEffects[usedSkill.effect];
            const effectState = { wbUser, stats, wbManager, damage: playerDamage, skill: usedSkill, auto: true };
            if (effectFn) {
                await effectFn({ userId, monster, state: effectState });
                playerDamage = effectState.damage;
                skillMsg = effectState.autoMsg || `🔮 Dùng ${usedSkill.name}!`;
            } else {
                skillMsg = `🔮 Dùng ${usedSkill.name}!`;
            }
            if (usedSkill.effect === 'heal_30') {
                currentPlayerHp = wbUser.hp;
            }
            skillMsg += ` [-${usedSkill.mp_cost} MP]`;
        }
        
        // Combat log for turn
        if (skillMsg) {
            combatLog.push(`Turn ${turnCount}: ${skillMsg}`);
        } else {
            combatLog.push(`Turn ${turnCount}: 💥 Đánh thường! Gây ${playerDamage} sát thương`);
        }
        // Player attacks monster
        currentMonsterHp -= playerDamage;
        if (playerDamage > 0) {
            combatLog.push(`   💥 Gây ${playerDamage} sát thương`);
        }
        combatLog.push(`   🩸 Monster HP: ${Math.max(0, currentMonsterHp)}/${wbUser.combatState.monsterMaxHp || monster.hp}`);
        
        if (currentMonsterHp <= 0) {
            // Victory logic
            const xpGained = Math.floor(monster.xpDrop * XP_MULTIPLIER);
            const newXP = wbUser.xp + xpGained;
            const oldLevel = wbUser.level;
            const newLevel = calculateLevelFromXP(newXP);
            let lootLog = [];
            let goldGained = 0;
            
            // Handle loot
            for (const drop of monster.drops) {
                if (Math.random() < drop.chance) {
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
            
            let levelUpMessage = '';
            if (newLevel > oldLevel) {
                const newStats = calculateStatsForLevel(newLevel);
                const hpIncrease = newStats.maxHp - wbUser.maxHp;
                const mpIncrease = newStats.maxMp - wbUser.maxMp;
                levelUpMessage = `\n🎊 **LEVEL UP!** Level ${oldLevel} → Level ${newLevel}\n📈 **Tăng thể lực:** +${hpIncrease} HP, +${mpIncrease} MP, +${newStats.baseAttack - wbUser.baseAttack} ATK, +${newStats.baseDefense - wbUser.baseDefense} DEF`;
                
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
        
        // Monster turn
        let monsterDamage = Math.max(1, (wbUser.combatState.monsterBuffedAttack || monster.attack) - stats.defense);
        let monsterSkillMsg = '';
        
        // Monster skill usage (simplified for auto combat)
        const monsterSkills = monster.skills || [];
        if (monsterSkills.length > 0 && Math.random() < 0.3) { // 30% chance in auto combat
            const skillId = monsterSkills[Math.floor(Math.random() * monsterSkills.length)];
            const skill = wbManager.getSkill(skillId);
            if (skill) {
                const effectFn = skillEffects[skill.effect];
                const effectState = { wbUser, stats, wbManager, monsterHp: currentMonsterHp, damage: monsterDamage, skill, isMonster: true, auto: true };
                if (effectFn) {
                    await effectFn({ userId, monster, state: effectState });
                    monsterDamage = effectState.damage;
                    currentMonsterHp = effectState.monsterHp;
                    monsterSkillMsg = effectState.autoMsg || `🔮 ${skill.name}!`;
                } else {
                    monsterSkillMsg = `🔮 ${skill.name}!`;
                }
            }
        }
        
        currentPlayerHp -= monsterDamage;
        if (monsterSkillMsg) {
            combatLog.push(`   ${monsterSkillMsg} Gây ${monsterDamage} sát thương`);
        } else {
            combatLog.push(`   🩸 Monster tấn công: ${monsterDamage} sát thương`);
        }
        combatLog.push(`   ❤️ Your HP: ${Math.max(0, currentPlayerHp)}/${wbUser.maxHp + stats.hpBonus}`);
        
        // Show MP and important cooldowns every few turns
        if (turnCount % 5 === 0 || currentPlayerHp <= wbUser.maxHp * 0.3) {
            combatLog.push(`   💙 MP: ${currentMp}/${wbUser.maxMp}`);
            const activeCooldowns = Object.entries(skillCooldowns).filter(([_, cd]) => cd > 0);
            if (activeCooldowns.length > 0) {
                const cooldownText = activeCooldowns.map(([skill, cd]) => `${skill}(${cd})`).join(', ');
                combatLog.push(`   ⏳ Cooldowns: ${cooldownText}`);
            }
        }
        
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
                    lastRevivalUse: now
                });
                
                combatLog.push(`💎 **ĐÁ HỒI SINH KÍCH HOẠT!** Hồi sinh với ${reviveHp} HP!`);
            } else {
                // Player died
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
                        combatState: resetCombatState()
                    });
                } else {
                    wbManager.updateUser(userId, {
                        xp: newXP,
                        hp: 1,
                        combatState: resetCombatState()
                    });
                }
                
                combatLog.push('');
                combatLog.push(`☠️ **THẤT BẠI!** ☠️`);
                combatLog.push(`Bạn đã bị ${monster.name} hạ gục sau ${turnCount} lượt.`);
                combatLog.push(`- Bạn bị mất ${xpLost} XP.`);
                combatLog.push(`- Bạn đã được hồi sinh tại thành với 1 HP.${levelDownMessage}`);
                
                return combatLog.join('\n');
            }
        }
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
        
        // Show active buffs occasionally
        if (turnCount % 3 === 0) {
            const buffs = wbManager.getActiveBuffs(userId);
            if (buffs.length > 0) {
                const buffText = buffs.map(b => `${b.type === 'attack' ? '⚔️' : b.type === 'defense' ? '🛡️' : '🍀'} +${Math.round(b.amount * 100)}% (${b.turnsRemaining})`).join(', ');
                combatLog.push(`   🔮 Buffs: ${buffText}`);
            }
        }
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


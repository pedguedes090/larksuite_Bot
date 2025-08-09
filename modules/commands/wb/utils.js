import UserManager from '../../userManager.js';
import WB_DataManager from '../../wbDataManager.js';

export const userManager = UserManager.getInstance();
export const wbManager = WB_DataManager.getInstance();

export const MAX_LEVEL = 50; // Level cap
export const XP_MULTIPLIER = 0.4; // Reduce XP gain to 40% of original

export function calculateLevelFromXP(xp) {
  // New exponential XP system - all levels 5+ are harder than old linear system
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const requiredXP = getXPRequiredForLevel(level);
    if (xp < requiredXP) {
      return level - 1;
    }
  }
  return MAX_LEVEL; // Cap at maximum level
}

export function getXPRequiredForLevel(level) {
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

export function getXPOverflow(currentXP, level) {
  if (level >= MAX_LEVEL) {
    const maxLevelXP = getXPRequiredForLevel(MAX_LEVEL);
    return Math.max(0, currentXP - maxLevelXP);
  }
  return 0;
}

export function getXPRequiredForSingleLevel(level) {
  // XP needed to go from level (N-1) to level N
  if (level <= 1) return 0;
  const baseXP = 90;
  const scaleFactor = 1.2;
  return Math.floor(baseXP * Math.pow(scaleFactor, level - 2));
}

export function calculateStatsForLevel(level) {
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

export function formatTime(hours) {
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} ngày${remainingHours > 0 ? ` ${remainingHours} giờ` : ''}`;
  }
  return `${hours} giờ`;
}

export function generateMonsterBuffs(monster) {
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

export function getBuffMessage(monster, buffedStats) {
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

export function resetCombatState() {
  return {
    inCombat: false,
    monsterId: null,
    monsterHp: 0,
    monsterMaxHp: null,
    monsterBuffedAttack: null,
    monsterBuffedDefense: null,
    monsterArmorPenetration: null,
    mapId: null,
    monsterStatusEffects: []
  };
}

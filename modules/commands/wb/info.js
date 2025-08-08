import { userManager, wbManager, MAX_LEVEL, getXPRequiredForLevel } from './utils.js';

export default async function handleInfo({ userId, args }) {
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


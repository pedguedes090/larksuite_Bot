import { addStatus } from '../statusEffects.js';

export default function apply({ userId, monster, state }) {
  const { wbUser, combatLog = [], skill, isMonster = false, auto = false } = state;
  if (isMonster) {
    addStatus(wbUser, 'burn', 3);
    if (auto) {
      state.autoMsg = `🔥 ${skill.name}! Gây bỏng 3 lượt`;
    } else {
      state.monsterSkillMsg = `🔥 ${monster.name} dùng ${skill.name}!`;
    }
  } else {
    addStatus(wbUser.combatState, 'burn', 3, undefined, 'monsterStatusEffects');
    if (auto) {
      state.autoMsg = `🔥 Dùng ${skill.name}! Gây bỏng 3 lượt`;
    } else {
      combatLog.push(`🔥 Bạn dùng ${skill.name}! Đốt cháy kẻ địch.`);
      state.skillMessage = ` (Kỹ năng: ${skill.name})`;
    }
  }
}

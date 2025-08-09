import { addStatus } from '../statusEffects.js';

export default function apply({ userId, monster, state }) {
  const { wbUser, combatLog = [], skill, isMonster = false, auto = false } = state;
  if (isMonster) {
    addStatus(wbUser, 'stun', 1);
    if (auto) {
      state.autoMsg = `💫 ${skill.name}!`;
    } else {
      state.monsterSkillMsg = `💫 ${monster.name} dùng ${skill.name}!`;
    }
  } else {
    addStatus(wbUser.combatState, 'stun', 1, undefined, 'monsterStatusEffects');
    if (auto) {
      state.autoMsg = `💫 Dùng ${skill.name}!`;
    } else {
      combatLog.push(`💫 Bạn dùng ${skill.name}! Làm choáng kẻ địch.`);
      state.skillMessage = ` (Kỹ năng: ${skill.name})`;
    }
  }
}

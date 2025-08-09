import { addStatus } from '../statusEffects.js';

export default function apply({ userId, monster, state }) {
  const { wbUser, combatLog = [], skill, isMonster = false, auto = false } = state;
  if (isMonster) {
    addStatus(wbUser, 'quicksand', 3);
    if (auto) {
      state.autoMsg = `🕳️ ${skill.name}! Sa lầy 3 lượt`;
    } else {
      state.monsterSkillMsg = `🕳️ ${monster.name} dùng ${skill.name}!`;
    }
  } else {
    addStatus(wbUser.combatState, 'quicksand', 3, undefined, 'monsterStatusEffects');
    if (auto) {
      state.autoMsg = `🕳️ Dùng ${skill.name}! Sa lầy 3 lượt`;
    } else {
      combatLog.push(`🕳️ Bạn dùng ${skill.name}! Làm kẻ địch sa lầy.`);
      state.skillMessage = ` (Kỹ năng: ${skill.name})`;
    }
  }
}

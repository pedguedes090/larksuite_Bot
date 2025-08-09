import { addStatus } from '../statusEffects.js';

export default function apply({ userId, monster, state }) {
  const { wbUser, combatLog = [], skill, isMonster = false, auto = false } = state;
  if (isMonster) {
    addStatus(wbUser, 'paralyze', 2);
    if (auto) {
      state.autoMsg = `⚡ ${skill.name}! Tê liệt 2 lượt`;
    } else {
      state.monsterSkillMsg = `⚡ ${monster.name} dùng ${skill.name}!`;
    }
  } else {
    addStatus(wbUser.combatState, 'paralyze', 2, undefined, 'monsterStatusEffects');
    if (auto) {
      state.autoMsg = `⚡ Dùng ${skill.name}! Tê liệt 2 lượt`;
    } else {
      combatLog.push(`⚡ Bạn dùng ${skill.name}! Tê liệt kẻ địch.`);
      state.skillMessage = ` (Kỹ năng: ${skill.name})`;
    }
  }
}

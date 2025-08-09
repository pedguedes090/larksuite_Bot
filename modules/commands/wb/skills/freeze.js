import { addStatus } from '../statusEffects.js';

export default function apply({ userId, monster, state }) {
  const { wbUser, combatLog = [], skill, isMonster = false, auto = false } = state;
  if (isMonster) {
    addStatus(wbUser, 'freeze', 2);
    if (auto) {
      state.autoMsg = `❄️ ${skill.name}! Đóng băng 2 lượt`;
    } else {
      state.monsterSkillMsg = `❄️ ${monster.name} dùng ${skill.name}!`;
    }
  } else {
    addStatus(wbUser.combatState, 'freeze', 2, undefined, 'monsterStatusEffects');
    if (auto) {
      state.autoMsg = `❄️ Dùng ${skill.name}! Đóng băng 2 lượt`;
    } else {
      combatLog.push(`❄️ Bạn dùng ${skill.name}! Đóng băng kẻ địch.`);
      state.skillMessage = ` (Kỹ năng: ${skill.name})`;
    }
  }
}

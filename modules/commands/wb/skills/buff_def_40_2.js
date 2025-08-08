export default function apply({ userId, monster, state }) {
    const { wbManager, wbUser, stats, combatLog = [], skill, isMonster = false, auto = false } = state;
    if (isMonster) {
        if (auto) {
            state.autoMsg = `🛡️ ${skill.name}!`;
        } else {
            state.monsterSkillMsg = `🛡️ ${monster.name} dùng ${skill.name}! Tăng phòng thủ.`;
        }
    } else {
        wbManager?.addBuff?.(userId, 'defense', 0.4, 2);
        state.damage = Math.max(1, stats.attack - (wbUser.combatState.monsterBuffedDefense || monster.defense));
        if (auto) {
            state.autoMsg = `🛡️ Dùng ${skill.name}!`;
        } else {
            combatLog.push(`🛡️ Bạn dùng ${skill.name}! Tăng 40% phòng thủ trong 2 lượt.`);
            state.skillMessage = ` (Kỹ năng: ${skill.name})`;
        }
    }
}

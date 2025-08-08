export default function apply({ userId, monster, state }) {
    const { wbManager, wbUser, stats, combatLog = [], skill, isMonster = false, auto = false } = state;
    if (isMonster) {
        if (auto) {
            state.autoMsg = `💢 ${skill.name}!`;
        } else {
            state.monsterSkillMsg = `💢 ${monster.name} dùng ${skill.name}! Tăng tấn công, giảm phòng thủ.`;
        }
    } else {
        wbManager?.addBuff?.(userId, 'attack', 0.3, 3);
        wbManager?.addBuff?.(userId, 'defense', -0.2, 3);
        state.damage = Math.max(1, stats.attack - (wbUser.combatState.monsterBuffedDefense || monster.defense));
        if (auto) {
            state.autoMsg = `💢 Dùng ${skill.name}!`;
        } else {
            combatLog.push(`💢 Bạn dùng ${skill.name}! Tăng 30% tấn công, giảm 20% phòng thủ trong 3 lượt.`);
            state.skillMessage = ` (Kỹ năng: ${skill.name})`;
        }
    }
}

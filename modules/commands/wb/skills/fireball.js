export default function apply({ userId, monster, state }) {
    const { wbUser, stats, combatLog = [], skill, isMonster = false, auto = false } = state;
    if (isMonster) {
        state.damage = Math.max(1, Math.floor((wbUser.combatState.monsterBuffedAttack || monster.attack) * 1.5) - Math.floor(stats.defense * 0.8));
        if (auto) {
            state.autoMsg = `🔥 ${skill.name}!`;
        } else {
            state.monsterSkillMsg = `🔥 ${monster.name} dùng ${skill.name}! Gây ${state.damage} sát thương phép (bỏ qua 20% phòng thủ).`;
        }
    } else {
        state.damage = Math.max(1, Math.floor(stats.attack * 1.5) - Math.floor((wbUser.combatState.monsterBuffedDefense || monster.defense) * 0.8));
        if (auto) {
            state.autoMsg = `🔥 Dùng ${skill.name}! Gây ${state.damage} sát thương phép`;
        } else {
            combatLog.push(`🔥 Bạn dùng ${skill.name}! Gây ${state.damage} sát thương phép (bỏ qua 20% phòng thủ).`);
            state.skillMessage = ` (Kỹ năng: ${skill.name})`;
        }
    }
}

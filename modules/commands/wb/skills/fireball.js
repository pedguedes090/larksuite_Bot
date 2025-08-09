export default function apply({ userId, monster, state }) {
    const { wbUser, stats, combatLog = [], skill, isMonster = false, auto = false } = state;
    if (isMonster) {
        const magic = wbUser.combatState.monsterBuffedAttack || monster.magic || monster.attack;
        const targetResist = stats.magicResist || 0;
        state.damage = Math.max(1, Math.floor(magic * 1.5) - Math.floor(Math.max(0, targetResist) * 0.8));
        if (auto) {
            state.autoMsg = `🔥 ${skill.name}! Sát thương phép`;
        } else {
            state.monsterSkillMsg = `🔥 ${monster.name} dùng ${skill.name}! Gây ${state.damage} sát thương phép.`;
        }
    } else {
        const targetResist = wbUser.combatState.monsterBuffedDefense || monster.magicResist || 0;
        const armorPen = stats.armorPen || 0;
        state.damage = Math.max(1, Math.floor(stats.magic * 1.5) - Math.floor(Math.max(0, targetResist - armorPen) * 0.8));
        if (auto) {
            state.autoMsg = `🔥 Dùng ${skill.name}! Sát thương phép`;
        } else {
            combatLog.push(`🔥 Bạn dùng ${skill.name}! Gây ${state.damage} sát thương phép.`);
            state.skillMessage = ` (Kỹ năng: ${skill.name})`;
        }
    }
}

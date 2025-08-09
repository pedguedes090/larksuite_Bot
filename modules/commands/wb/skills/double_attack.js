export default function apply({ userId, monster, state }) {
    const { wbUser, stats, combatLog = [], skill, isMonster = false, auto = false } = state;
    if (isMonster) {
        const baseDamage = Math.max(1, Math.floor((wbUser.combatState.monsterBuffedAttack || monster.attack) * 0.8) - stats.defense);
        state.damage = baseDamage * 2;
        if (auto) {
            state.autoMsg = `🌀 ${skill.name}! Đánh 2 lần`;
        } else {
            state.monsterSkillMsg = `🌀 ${monster.name} dùng ${skill.name}! Tấn công 2 lần, mỗi đòn ${baseDamage} sát thương.`;
        }
    } else {
        const baseDamage = Math.max(1, Math.floor(stats.attack * 0.8) - (wbUser.combatState.monsterBuffedDefense || monster.defense));
        state.damage = baseDamage * 2;
        if (auto) {
            state.autoMsg = `🌀 Dùng ${skill.name}! Đánh 2 lần`;
        } else {
            combatLog.push(`🌀 Bạn dùng ${skill.name}! Tấn công 2 lần, mỗi đòn ${baseDamage} sát thương.`);
            combatLog.push(`💥 Đòn 1: ${baseDamage} sát thương.`);
            combatLog.push(`💥 Đòn 2: ${baseDamage} sát thương.`);
            state.skillMessage = ` (Kỹ năng: ${skill.name})`;
        }
    }
}

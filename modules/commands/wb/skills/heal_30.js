export default async function apply({ userId, monster, state }) {
    const { wbUser, stats, wbManager, combatLog = [], skill, isMonster = false, auto = false } = state;
    if (isMonster) {
        const maxHp = wbUser.combatState.monsterMaxHp || monster.hp;
        const heal = Math.floor(maxHp * 0.3);
        state.monsterHp = Math.min(maxHp, (state.monsterHp || 0) + heal);
        state.damage = 0;
        if (auto) {
            state.autoMsg = `💚 ${skill.name}! (+${heal} HP)`;
        } else {
            state.monsterSkillMsg = `💚 ${monster.name} dùng ${skill.name}! Hồi ${heal} HP.`;
        }
    } else {
        const maxHp = wbUser.maxHp + (stats.hpBonus || 0);
        const heal = Math.floor(maxHp * 0.3);
        wbUser.hp = Math.min(maxHp, wbUser.hp + heal);
        if (wbManager?.saveUsers) {
            await wbManager.saveUsers();
        }
        state.damage = 0;
        if (auto) {
            state.autoMsg = `💚 Dùng ${skill.name}! Hồi ${heal} HP (${wbUser.hp}/${maxHp})`;
        } else {
            combatLog.push(`💚 Bạn dùng ${skill.name}! Hồi ${heal} HP (${wbUser.hp}/${maxHp})`);
            state.skillMessage = ` (Kỹ năng: ${skill.name})`;
        }
    }
}

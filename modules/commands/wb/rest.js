import { wbManager } from './utils.js';

export default async function handleRest({ userId }) {
    const wbUser = wbManager.getUser(userId);
    
    if (wbUser.combatState.inCombat) {
        return '❌ Không thể nghỉ ngơi khi đang trong trận chiến!';
    }
    
    const stats = wbManager.getEquippedStats(userId);
    const maxHp = wbUser.maxHp + stats.hpBonus;
    
    if (wbUser.hp >= maxHp) {
        return '❌ HP của bạn đã đầy rồi!';
    }
    
    // Check rest cooldown (5 minutes)
    const now = Date.now();
    const restCooldown = 5 * 60 * 1000; // 5 minutes
    
    if (wbUser.lastRestTime && now - wbUser.lastRestTime < restCooldown) {
        const remainingMs = restCooldown - (now - wbUser.lastRestTime);
        const remainingMin = Math.ceil(remainingMs / 60000);
        return `⏰ Bạn cần chờ ${remainingMin} phút nữa để nghỉ ngơi lại.`;
    }
    
    // Rest healing: 25% of max HP
    const healAmount = Math.floor(maxHp * 0.25);
    const newHp = Math.min(maxHp, wbUser.hp + healAmount);
    const actualHeal = newHp - wbUser.hp;
    
    wbManager.updateUser(userId, {
        hp: newHp,
        lastRestTime: now
    });
    
    return `💤 **NGHỈ NGƠI** 💤
Bạn đã nghỉ ngơi và hồi phục sức lực.
💚 **Hồi HP:** +${actualHeal} HP (${newHp}/${maxHp})

⏰ Có thể nghỉ ngơi lại sau 5 phút.`;
}


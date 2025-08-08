import { wbManager, MAX_LEVEL, XP_MULTIPLIER, calculateLevelFromXP, calculateStatsForLevel, getXPOverflow } from './utils.js';

export default async function handleUse({ userId, args }) {
    if (args.length < 2) {
        return '❌ **Thiếu tham số!** Sử dụng: `wb use <item_id>`';
    }
    
    const itemId = args[1];
    if (!itemId) return '❌ Vui lòng chỉ định ID vật phẩm để sử dụng.';
    
    const item = wbManager.getItem(itemId);
    if (!item || item.type !== 'consumable') {
        return '❌ Vật phẩm này không thể sử dụng.';
    }
    
    if (!wbManager.hasItem(userId, itemId)) {
        return `❌ Bạn không có ${item.name}.`;
    }
    
    const wbUser = wbManager.getUser(userId);
    let message = '';
    
    // Health potion
    if (item.healAmount) {
        const stats = wbManager.getEquippedStats(userId);
        const maxHp = wbUser.maxHp + stats.hpBonus;
        const healedAmount = Math.min(item.healAmount, maxHp - wbUser.hp);
        
        if (healedAmount <= 0) {
            return '❌ HP của bạn đã đầy!';
        }
        
        wbManager.updateUser(userId, { hp: wbUser.hp + healedAmount });
        message = `✅ Đã hồi ${healedAmount} HP! (${wbUser.hp + healedAmount}/${maxHp})`;
    }
    
    // Mana potion
    if (item.manaAmount) {
        const healedMp = Math.min(item.manaAmount, wbUser.maxMp - wbUser.mp);
        
        if (healedMp <= 0) {
            return '❌ MP của bạn đã đầy!';
        }
        
        wbManager.updateUser(userId, { mp: wbUser.mp + healedMp });
        message = `✅ Đã hồi ${healedMp} MP! (${wbUser.mp + healedMp}/${wbUser.maxMp})`;
    }
    
    // Buff items
    if (item.buffType) {
        wbManager.addBuff(userId, item.buffType, item.buffAmount, item.duration);
        const buffName = item.buffType === 'attack' ? 'Tấn công' : item.buffType === 'defense' ? 'Phòng thủ' : 'May mắn';
        message = `✅ Đã sử dụng ${item.name}! +${Math.round(item.buffAmount * 100)}% ${buffName} trong ${item.duration} lượt chiến đấu.`;
    }
    
    // XP gem
    if (item.xpBonus) {
        const adjustedXpBonus = Math.floor(item.xpBonus * XP_MULTIPLIER);
        const newXP = wbUser.xp + adjustedXpBonus;
        const oldLevel = wbUser.level;
        const newLevel = calculateLevelFromXP(newXP);
        
        message = `✅ Đã nhận ${adjustedXpBonus} XP!`;
        
        if (newLevel > oldLevel) {
            const newStats = calculateStatsForLevel(newLevel);
            const hpIncrease = newStats.maxHp - wbUser.maxHp;
            const mpIncrease = newStats.maxMp - wbUser.maxMp;
            const atkIncrease = newStats.baseAttack - wbUser.baseAttack;
            const defIncrease = newStats.baseDefense - wbUser.baseDefense;
            
            // Full update with stat increases and heal like combat level up
            wbManager.updateUser(userId, {
                xp: newXP,
                level: newLevel,
                maxHp: newStats.maxHp,
                maxMp: newStats.maxMp,
                hp: newStats.maxHp, // Full heal on level up
                mp: newStats.maxMp,  // Full MP restore
                baseAttack: newStats.baseAttack,
                baseDefense: newStats.baseDefense
            });
            
            message += ` 🎊 **LEVEL UP!** Level ${oldLevel} → Level ${newLevel}
📈 **Tăng thể lực:** +${hpIncrease} HP, +${mpIncrease} MP, +${atkIncrease} ATK, +${defIncrease} DEF
💚 **Full heal!** HP và MP đã được hồi đầy!`;
            
            // Check for max level
            if (newLevel >= MAX_LEVEL) {
                const overflow = getXPOverflow(newXP, newLevel);
                message += `\n🌟 **ĐÃ ĐẠT LEVEL TỐI ĐA!** (${overflow} XP thừa sẽ được lưu)`;
            }
        } else {
            wbManager.updateUser(userId, { xp: newXP });
        }
    }
    
    // Remove item from inventory
    wbManager.removeItemFromInventory(userId, itemId, 1);
    
    return message || `✅ Đã sử dụng ${item.name}.`;
}


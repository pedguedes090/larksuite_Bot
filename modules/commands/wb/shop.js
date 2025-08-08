import { wbManager, userManager } from './utils.js';

export default async function handleShop({ userId, args }) {
    const action = args[1]?.toLowerCase();
    
    if (!action || action === 'list') {
        const items = Object.values(wbManager.items).filter(item => item.buyPrice);
        const skills = wbManager.getAllSkills().filter(skill => skill.buyPrice);
        
        const itemsByType = {};
        for (const item of items) {
            const type = item.type || 'other';
            if (!itemsByType[type]) itemsByType[type] = [];
            itemsByType[type].push(item);
        }
        let shopText = '--- 🏪 **CỬA HÀNG WORLD BOSS** ---\n';
        const typeNames = {
            weapon: '⚔️ **Vũ khí:**',
            armor: '🛡️ **Giáp:**',
            consumable: '🧪 **Thuốc:**',
            special: '✨ **Đặc biệt:**',
            skill: '🧙‍♂️ **Kỹ năng:**'
        };
        for (const [type, items] of Object.entries(itemsByType)) {
            if (type === 'material') continue; // Don't show materials in shop
            shopText += `\n${typeNames[type] || '📋 **Khác:**'}\n`;
            for (const item of items) {
                const levelReq = item.requiredLevel ? ` (Lv.${item.requiredLevel})` : '';
                shopText += ` • \`${item.id}\`: **${item.name}** - ${item.buyPrice} xu${levelReq}\n`;
            }
        }
        // Hiển thị skill
        if (skills.length > 0) {
            shopText += `\n${typeNames.skill}\n`;
            for (const skill of skills) {
                shopText += ` • \`${skill.id}\`: **${skill.name}** - ${skill.buyPrice} xu (MP: ${skill.mp_cost}, CD: ${skill.cooldown})\n   *${skill.description}*\n`;
            }
        }
        shopText += '\n**Lệnh:** `wb shop buy <item_id|skill_id> [số lượng]` | `wb shop sell <item_id> [số lượng]`';
        return shopText;
    }
    if (action === 'buy') {
        if (args.length < 3) {
            return '❌ **Thiếu tham số!** Sử dụng: `wb shop buy <item_id|skill_id> [số_lượng]`';
        }
        const id = args[2];
        const quantity = parseInt(args[3]) || 1;
        if (!id) return '❌ Vui lòng chỉ định ID vật phẩm hoặc kỹ năng.';
        // Ưu tiên item
        let item = wbManager.getItem(id);
        if (item && item.buyPrice) {
            const wbUser = wbManager.getUser(userId);
            const generalUser = userManager.getUser(userId);
            if (item.requiredLevel && wbUser.level < item.requiredLevel) {
                return `❌ Bạn cần đạt Level ${item.requiredLevel} để mua ${item.name}.`;
            }
            const totalCost = item.buyPrice * quantity;
            if (generalUser.money < totalCost) {
                return `❌ Không đủ tiền! Cần ${totalCost} xu để mua ${quantity} ${item.name}.`;
            }
            userManager.updateMoney(userId, -totalCost);
            wbManager.addItemToInventory(userId, id, quantity);
            return `✅ Đã mua ${quantity} **${item.name}** với giá ${totalCost} xu.`;
        }
        // Nếu không phải item, kiểm tra skill
        const skill = wbManager.getSkill(id);
        if (skill && skill.buyPrice) {
            const generalUser = userManager.getUser(userId);
            if (generalUser.money < skill.buyPrice) {
                return `❌ Không đủ tiền! Cần ${skill.buyPrice} xu để mua kỹ năng ${skill.name}.`;
            }
            if (wbManager.getUser(userId).skills?.includes(id)) {
                return '❌ Bạn đã sở hữu kỹ năng này.';
            }
            userManager.updateMoney(userId, -skill.buyPrice);
            wbManager.addSkillToUser(userId, id);
            return `✅ Đã mua kỹ năng **${skill.name}** với giá ${skill.buyPrice} xu.`;
        }
        return '❌ Vật phẩm hoặc kỹ năng này không có bán trong cửa hàng.';
    }
    
    if (action === 'sell') {
        if (args.length < 3) {
            return '❌ **Thiếu tham số!** Sử dụng: `wb shop sell <item_id> [số_lượng]`';
        }
        
        const itemId = args[2];
        const quantity = parseInt(args[3]) || 1;
        
        if (!itemId) return '❌ Vui lòng chỉ định ID vật phẩm.';
        
        const item = wbManager.getItem(itemId);
        if (!item || !item.sellPrice) {
            return '❌ Vật phẩm này không thể bán.';
        }
        
        if (!wbManager.hasItem(userId, itemId, quantity)) {
            return `❌ Bạn không có đủ ${quantity} ${item.name}.`;
        }
        
        const totalEarned = item.sellPrice * quantity;
        wbManager.removeItemFromInventory(userId, itemId, quantity);
        userManager.updateMoney(userId, totalEarned);
        
        return `✅ Đã bán ${quantity} **${item.name}** và nhận ${totalEarned} xu.`;
    }
    
    return '❌ Lệnh không hợp lệ. Dùng: list, buy, sell';
}


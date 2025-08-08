import { wbManager } from './utils.js';

export default async function handleInventory({ userId }) {
    const wbUser = wbManager.getUser(userId);

    if (wbUser.inventory.length === 0) {
        return "🎒 Túi đồ của bạn trống rỗng.";
    }

    const inventoryByType = {};
    
    for (const itemStack of wbUser.inventory) {
        const itemDetails = wbManager.getItem(itemStack.itemId);
        if (!itemDetails) continue;
        
        const type = itemDetails.type || 'other';
        if (!inventoryByType[type]) inventoryByType[type] = [];
        
        inventoryByType[type].push({
            ...itemStack,
            item: itemDetails
        });
    }
    
    let inventoryText = '--- 🎒 **TÚI ĐỒ CỦA BẠN** ---\n';
    
    const typeNames = {
        weapon: '⚔️ **Vũ khí:**',
        armor: '🛡️ **Giáp:**', 
        consumable: '🧪 **Thuốc:**',
        material: '📦 **Nguyên liệu:**',
        special: '✨ **Đặc biệt:**',
        other: '📋 **Khác:**'
    };
    
    for (const [type, items] of Object.entries(inventoryByType)) {
        inventoryText += `\n${typeNames[type] || '📋 **Khác:**'}\n`;
        for (const itemStack of items) {
            const sellPrice = itemStack.item.sellPrice ? ` (${itemStack.item.sellPrice} xu)` : '';
            inventoryText += ` • [${itemStack.item.id}] **${itemStack.item.name}** x${itemStack.quantity}${sellPrice}\n   *${itemStack.item.description}*\n`;
        }
    }

    return inventoryText;
}


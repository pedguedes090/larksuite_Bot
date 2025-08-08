import { wbManager } from './utils.js';

export default async function handleEquipment({ userId, args }) {
    const wbUser = wbManager.getUser(userId);
    
    if (args.length < 2) {
        // Show current equipment if no action specified
    }
    
    const action = args[1]?.toLowerCase();
    
    if (!action) {
        const weapon = wbUser.equipment.weapon ? wbManager.getItem(wbUser.equipment.weapon) : null;
        const armor = wbUser.equipment.armor ? wbManager.getItem(wbUser.equipment.armor) : null;
        
        return `--- 🎽 **TRANG BỊ HIỆN TẠI** ---
⚔️ **Vũ khí:** ${weapon ? `${weapon.name} (+${weapon.attackBonus} ATK)` : 'Không có'}
🛡️ **Giáp:** ${armor ? `${armor.name} (+${armor.defenseBonus} DEF, +${armor.hpBonus || 0} HP)` : 'Không có'}

**Lệnh có sẵn:**
\`wb equip wear <item_id>\` - Trang bị vật phẩm
\`wb equip remove <weapon|armor>\` - Gỡ trang bị`;
    }
    
    if (action === 'wear' || action === 'equip') {
        if (args.length < 3) {
            return '❌ **Thiếu tham số!** Sử dụng: `wb equip wear <item_id>`';
        }
        
        const itemId = args[2];
        if (!itemId) return '❌ Vui lòng chỉ định ID vật phẩm để trang bị.';
        
        const result = wbManager.equipItem(userId, itemId);
        return result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
    }
    
    if (action === 'remove' || action === 'unequip') {
        if (args.length < 3) {
            return '❌ **Thiếu tham số!** Sử dụng: `wb equip remove <weapon|armor>`';
        }
        
        const slot = args[2]?.toLowerCase();
        if (!slot || (slot !== 'weapon' && slot !== 'armor')) {
            return '❌ Vui lòng chỉ định: weapon hoặc armor';
        }
        
        const result = wbManager.unequipItem(userId, slot);
        return result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
    }
    
    return '❌ Lệnh không hợp lệ. Dùng: wear, remove';
}


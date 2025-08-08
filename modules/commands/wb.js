import { userManager } from './wb/utils.js';
import handleInfo from './wb/info.js';
import handleMap from './wb/map.js';
import handleHunt from './wb/hunt.js';
import handlePve from './wb/pve.js';
import handleInventory from './wb/inventory.js';
import handleEquipment from './wb/equipment.js';
import handleShop from './wb/shop.js';
import handleUse from './wb/use.js';
import { handleQuests, handleQuestClaim } from './wb/quests.js';
import handleStats from './wb/stats.js';
import handlePvp from './wb/pvp.js';
import handleRest from './wb/rest.js';
import handleSkill from './wb/skill.js';

export default {
  name: 'wb',
  description: 'Hệ thống World Boss nâng cao (info, hunt, pve, equipment, shop, quest...)',
  usage: '!wb <subcommand> [args...]',
  aliases: ['worldboss'],

  async execute({ userId, args }) {
    userManager.incrementCommandCount(userId);
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
      case 'info':
      case 'i':
        return await handleInfo({ userId, args });
      case 'map':
      case 'maps':
        return await handleMap({ userId, args });
      case 'hunt':
      case 'h':
        return await handleHunt({ userId, args });
      case 'pve':
      case 'attack':
      case 'fight':
        return await handlePve({ userId, args: args.slice(1) });
      case 'inv':
      case 'inventory':
      case 'bag':
        return await handleInventory({ userId });
      case 'eq':
      case 'equip':
      case 'equipment':
        return await handleEquipment({ userId, args });
      case 'shop':
      case 'store':
        return await handleShop({ userId, args });
      case 'use':
      case 'consume':
        return await handleUse({ userId, args });
      case 'quest':
      case 'q':
        if (args[1] === 'claim') {
          return await handleQuestClaim({ userId });
        }
        return await handleQuests({ userId });
      case 'stats':
      case 'statistics':
        return await handleStats({ userId });
      case 'pvp':
        return await handlePvp({ userId, args });
      case 'rest':
      case 'sleep':
        return await handleRest({ userId });
      case 'skill':
        return await handleSkill({ userId, args });
      default:
        return `--- 🌟 **HƯỚNG DẪN WORLD BOSS** ---\n\n**🎮 Lệnh cơ bản:**\n\`wb info\` - Xem thông tin nhân vật\n\`wb map\` - Xem tất cả bản đồ có sẵn\n\`wb hunt <map_id>\` - Vào bản đồ để săn quái\n\`wb pve\` - Tấn công từng lượt (cổ điển)\n\`wb pve auto\` - ⚡ Auto-combat đến kết thúc\n\`wb pve safe\` - 🛡️ Auto-combat với safe stop (HP < 70%)\n\`wb pve <skill_id>\` - 🧙‍♂️ Sử dụng skill cụ thể\n\`wb rest\` - 💤 Nghỉ ngơi để hồi HP (5 phút cooldown)\n\n**🎒 Quản lý đồ đạc:**\n\`wb inventory\` - Xem túi đồ\n\`wb equip\` - Quản lý trang bị\n\`wb use <item>\` - Sử dụng vật phẩm\n\n**🏪 Mua bán:**\n\`wb shop\` - Xem cửa hàng\n\`wb shop buy <item>\` - Mua vật phẩm/skill\n\`wb shop sell <item>\` - Bán vật phẩm\n\n**🧙‍♂️ Hệ thống Skill:**\n\`wb skill\` - Xem skills đã sở hữu\n\`wb skill equip <skill_id>\` - Trang bị skill (tối đa 3)\n\`wb skill unequip <skill_id>\` - Gỡ skill\n\n**📋 Nhiệm vụ & Thống kê:**\n\`wb quest\` - Xem nhiệm vụ hàng ngày\n\`wb quest claim\` - Nhận thưởng quest\n\`wb stats\` - Xem thống kê cá nhân\n\n**⚔️ PvP:**\n\`wb pvp\` - Xem hệ thống PvP\n\`wb pvp <userId>\` - Thách đấu người chơi\n\`wb pvp ac\` - Chấp nhận (auto combat)\n\n🌟 **Xem bản đồ với \`wb map\`, sau đó bắt đầu hành trình với \`wb hunt <map_id>\`!**`;
    }
  }
};

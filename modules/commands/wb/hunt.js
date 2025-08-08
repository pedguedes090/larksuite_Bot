import { wbManager, formatTime, generateMonsterBuffs, getBuffMessage, resetCombatState } from './utils.js';

export default async function handleHunt({ userId, args }) {
  if (args.length < 2) {
    return `❌ **Thiếu tham số!** Sử dụng: \`wb hunt <map_id>\`
Dùng \`wb map\` để xem danh sách bản đồ có sẵn.`;
  }
  
  const mapId = args[1];
  const wbUser = wbManager.getUser(userId);

  if (wbUser.combatState.inCombat) {
    return `❌ Bạn đang trong một trận chiến! Dùng \`wb pve\` để tiếp tục.`;
  }
  
  const map = wbManager.getMap(mapId);
  if (!map) {
    return `❌ Không tìm thấy bản đồ với ID: \`${mapId}\``;
  }

  if (wbUser.level < map.requiredLevel) {
    return `❌ Bạn cần đạt **Level ${map.requiredLevel}** để vào ${map.name}.`;
  }
  
  // Check cooldown for boss areas
  if (map.bossOnly && wbManager.isOnCooldown(userId, mapId)) {
    const remaining = wbManager.getCooldownRemaining(userId, mapId);
    return `⏰ Bạn cần chờ ${formatTime(remaining)} nữa để vào ${map.name}.`;
  }

  const monsterId = map.monsterIds[Math.floor(Math.random() * map.monsterIds.length)];
  const monster = wbManager.getMonster(monsterId);

  if (!monster) {
    return `❌ Lỗi hệ thống: Không tìm thấy quái vật với ID ${monsterId}`;
  }

  // Set cooldown for boss areas
  if (map.bossOnly) {
    wbManager.setCooldown(userId, mapId);
  }
  
  // Update quest progress
  wbManager.updateQuestProgress(userId, 'explore');

  // Generate random buffs for monster (0-40% each stat)
  const buffedStats = generateMonsterBuffs(monster);
  const buffMessage = getBuffMessage(monster, buffedStats);

  wbManager.updateUser(userId, {
    combatState: {
      inCombat: true,
      monsterId: monster.id,
      monsterHp: buffedStats.hp, // Use buffed HP
      monsterMaxHp: buffedStats.hp, // Store max HP for display
      monsterBuffedAttack: buffedStats.attack, // Store buffed attack
      monsterBuffedDefense: buffedStats.defense, // Store buffed defense
      monsterArmorPenetration: buffedStats.armorPenetration, // Store armor penetration
      mapId: map.id
    }
  });

  const dangerEmoji = monster.type === 'boss' ? '👑' : monster.type === 'world_boss' ? '🐉' : '⚔️';
  return `🌲 Bạn đã tiến vào **${map.name}** và gặp một **${monster.name}**! ${dangerEmoji}
${map.description}${buffMessage}
Dùng lệnh \`wb pve\` để tấn công!`;
}


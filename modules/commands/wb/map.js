import { wbManager, formatTime } from './utils.js';

export default async function handleMap({ userId, args }) {
  const safeMaps = wbManager.getMapsByType('safe');
  const normalMaps = wbManager.getMapsByType('normal');
  const dangerousMaps = wbManager.getMapsByType('dangerous');
  const extremeMaps = wbManager.getMapsByType('extreme');
  const bossAreas = wbManager.getMapsByType('boss_area');
  const worldBossAreas = wbManager.getMapsByType('world_boss_area');
  const randomMaps = wbManager.getMapsByType('random');
  const legendaryMaps = wbManager.getMapsByType('legendary');
  
  let mapsList = '';
  
  if (safeMaps.length > 0) {
    mapsList += '\n🌱 **Bản đồ an toàn:**\n' + safeMaps.map(m => ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})`).join('\n');
  }
  if (normalMaps.length > 0) {
    mapsList += '\n🌲 **Bản đồ thường:**\n' + normalMaps.map(m => ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})`).join('\n');
  }
  if (dangerousMaps.length > 0) {
    mapsList += '\n⚠️ **Bản đồ nguy hiểm:**\n' + dangerousMaps.map(m => ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})`).join('\n');
  }
  if (extremeMaps.length > 0) {
    mapsList += '\n🔥 **Bản đồ cực hiểm:**\n' + extremeMaps.map(m => ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})`).join('\n');
  }
  if (bossAreas.length > 0) {
    mapsList += '\n👑 **Khu vực Boss:**\n' + bossAreas.map(m => {
      const cooldownHours = wbManager.getCooldownRemaining(userId, m.id);
      const cooldownText = cooldownHours > 0 ? ` (⏰ ${formatTime(cooldownHours)})` : '';
      return ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})${cooldownText}`;
    }).join('\n');
  }
  if (worldBossAreas.length > 0) {
    mapsList += '\n🐉 **Khu vực World Boss:**\n' + worldBossAreas.map(m => {
      const cooldownHours = wbManager.getCooldownRemaining(userId, m.id);
      const cooldownText = cooldownHours > 0 ? ` (⏰ ${formatTime(cooldownHours)})` : '';
      return ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})${cooldownText}`;
    }).join('\n');
  }
  if (randomMaps.length > 0) {
    mapsList += '\n🎲 **Bản đồ đặc biệt:**\n' + randomMaps.map(m => ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})`).join('\n');
  }
  if (legendaryMaps.length > 0) {
    mapsList += '\n✨ **Bản đồ huyền thoại:**\n' + legendaryMaps.map(m => {
      const cooldownHours = wbManager.getCooldownRemaining(userId, m.id);
      const cooldownText = cooldownHours > 0 ? ` (⏰ ${formatTime(cooldownHours)})` : '';
      return ` • \`${m.id}\`: ${m.name} (Lv.${m.requiredLevel})${cooldownText}`;
    }).join('\n');
  }
  
  return `--- 🗺️ **TẤT CẢ BẢN ĐỒ** ---${mapsList}\n\n**Sử dụng:** \`wb hunt <map_id>\` để vào bản đồ`;
}


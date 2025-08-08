import { wbManager } from './utils.js';

export default async function handleStats({ userId }) {
    const wbUser = wbManager.getUser(userId);
    const stats = wbUser.statistics;
    
    return `--- 📊 **THỐNG KÊ CỦA BẠN** ---
⚔️ **Quái vật đã tiêu diệt:** ${stats.monstersKilled}
👑 **Boss đã hạ gục:** ${stats.bossesKilled}
🎁 **Vật phẩm đã tìm thấy:** ${stats.itemsFound}
📋 **Quest đã hoàn thành:** ${stats.questsCompleted}

🏆 **Thành tích:**
${stats.bossesKilled >= 10 ? '👑 **Boss Slayer** - Hạ gục 10+ boss' : ''}
${stats.monstersKilled >= 100 ? '⚔️ **Monster Hunter** - Tiêu diệt 100+ quái vật' : ''}
${stats.questsCompleted >= 50 ? '📋 **Quest Master** - Hoàn thành 50+ quest' : ''}`;
}


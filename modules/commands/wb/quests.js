import { wbManager, userManager } from './utils.js';

export async function handleQuests({ userId }) {
    const hasReset = wbManager.checkDailyReset(userId);
    const wbUser = wbManager.getUser(userId);
    const quests = wbUser.dailyQuests.available;
    
    let resetMessage = hasReset ? '🔄 **Daily quests đã được reset!**\n\n' : '';
    
    let questText = '--- 📋 **NHIỆM VỤ HÀNG NGÀY** ---\n';
    
    for (const quest of quests) {
        const progress = `${quest.progress}/${quest.count}`;
        const status = quest.completed ? '✅' : '🔄';
        const reward = `${quest.reward.xp} XP + ${quest.reward.gold} xu`;
        
        questText += `${status} **${quest.description}** (${progress})\n   Thưởng: ${reward}\n\n`;
    }
    
    const completedCount = quests.filter(q => q.completed).length;
    questText += `**Hoàn thành:** ${completedCount}/${quests.length}`;
    
    if (completedCount > 0 && !wbUser.dailyQuests.completed.includes(new Date().toDateString())) {
        questText += '\n\n💡 Dùng \`wb quest claim\` để nhận thưởng!';
    }
    
    return resetMessage + questText;
}

export async function handleQuestClaim({ userId }) {
    const wbUser = wbManager.getUser(userId);
    const today = new Date().toDateString();
    
    if (wbUser.dailyQuests.completed.includes(today)) {
        return '❌ Bạn đã nhận thưởng quest hôm nay rồi!';
    }
    
    const completedQuests = wbUser.dailyQuests.available.filter(q => q.completed);
    if (completedQuests.length === 0) {
        return '❌ Bạn chưa hoàn thành quest nào!';
    }
    
    let totalXP = 0;
    let totalGold = 0;
    
    for (const quest of completedQuests) {
        totalXP += quest.reward.xp;
        totalGold += quest.reward.gold;
    }
    
    // Add rewards
    wbManager.updateUser(userId, { xp: wbUser.xp + totalXP });
    userManager.updateMoney(userId, totalGold);
    
    // Mark as claimed
    wbUser.dailyQuests.completed.push(today);
    wbManager.updateStatistic(userId, 'questsCompleted', completedQuests.length);
    await wbManager.saveUsers();
    
    return `🎉 **NHẬN THƯỞNG THÀNH CÔNG!**
Đã hoàn thành ${completedQuests.length} quest và nhận được:
⭐ ${totalXP} XP
💰 ${totalGold} xu`;
}


// modules/commands/daily.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'daily',
  description: 'Nhận tiền thưởng hàng ngày',
  usage: '!daily',
  aliases: ['d'],

  async execute({ userId, args }) {
    const user = userManager.getUser(userId);
    userManager.incrementCommandCount(userId);

    // Kiểm tra đã claim hôm nay chưa
    const today = new Date().toDateString();
    const lastDaily = user.lastDaily ? new Date(user.lastDaily).toDateString() : null;

    if (lastDaily === today) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const timeLeft = tomorrow.getTime() - Date.now();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      return `⏰ **Bạn đã nhận daily hôm nay rồi!**
🕐 Còn **${hoursLeft}h ${minutesLeft}m** nữa để nhận tiếp`;
    }

    // Tính tiền thưởng (random 100-500)
    const reward = Math.floor(Math.random() * 401) + 100;
    
    // Bonus streak
    let streak = user.dailyStreak || 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastDaily === yesterday.toDateString()) {
      streak += 1; // Tiếp tục streak
    } else {
      streak = 1; // Reset streak
    }

    const bonusMultiplier = Math.min(streak * 0.1, 2); // Max 2x bonus
    const totalReward = Math.floor(reward * (1 + bonusMultiplier));

    // Cập nhật user
    user.lastDaily = new Date().toISOString();
    user.dailyStreak = streak;
    userManager.updateMoney(userId, totalReward);

    return `🎁 **Daily Reward!**
💰 **Tiền thưởng:** ${reward.toLocaleString('vi-VN')} xu
🔥 **Streak:** ${streak} ngày (x${(1 + bonusMultiplier).toFixed(1)})
💎 **Tổng nhận:** ${totalReward.toLocaleString('vi-VN')} xu
💰 **Số dư mới:** ${userManager.getUser(userId).money.toLocaleString('vi-VN')} xu`;
  }
}; 
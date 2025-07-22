// modules/commands/top.js
import UserManager from '../userManager.js';

const userManager = UserManager.getInstance();

export default {
  name: 'top',
  description: 'Bảng xếp hạng người giàu nhất',
  usage: '!top [số_lượng]',
  aliases: ['leaderboard', 'rich'],

  async execute({ userId, args }) {
    userManager.incrementCommandCount(userId);
    
    const limit = args[0] ? Math.min(parseInt(args[0]) || 10, 20) : 10;
    const topUsers = userManager.getTopUsers(limit);
    
    if (topUsers.length === 0) {
      return '📊 **Chưa có dữ liệu người dùng nào!**';
    }
    
    let result = `🏆 **Top ${limit} người giàu nhất**\n\n`;
    
    topUsers.forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const money = user.money.toLocaleString('vi-VN');
      const isCurrentUser = user.userId === userId ? ' ← **Bạn**' : '';
      
      result += `${medal} **${user.userId}** - ${money} xu${isCurrentUser}\n`;
    });
    
    // Tìm vị trí của user hiện tại nếu không trong top
    const currentUserRank = Object.values(userManager.users)
      .sort((a, b) => b.money - a.money)
      .findIndex(user => user.userId === userId) + 1;
    
    if (currentUserRank > limit) {
      const currentUser = userManager.getUser(userId);
      result += `\n📍 **Vị trí của bạn:** #${currentUserRank} - ${currentUser.money.toLocaleString('vi-VN')} xu`;
    }
    
    return result;
  }
}; 
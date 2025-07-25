// modules/commands/taxiu.js
import UserManager from '../userManager.js';
import EventManager from '../eventManager.js';

// --- Cấu hình Game ---
const TAI_THRESHOLD = 10; // Tổng điểm từ 11 trở lên là Tài
const WIN_MULTIPLIER = 0.95; // Người chơi nhận 95% tiền thắng (nhà cái thu 5% phí)
const MIN_BET = 100; // Mức cược tối thiểu
const eventManager = EventManager.getInstance();

// --- Hàm hỗ trợ ---
const rollDice = () => Math.floor(Math.random() * 6) + 1;

export default {
  name: 'taxiu',
  description: 'Chơi game Tài Xỉu, cược tiền và thử vận may.',
  usage: '!taxiu <tài|xỉu> <số tiền|all>',
  aliases: ['tx'],
  adminOnly: false,

  async execute({ userId, args, prefix }) {
    const userManager = UserManager.getInstance();
    
    // Tăng bộ đếm lệnh cho người dùng
    userManager.incrementCommandCount(userId);
    const user = userManager.getUser(userId);

    // --- 1. Validate Input ---
    const [choice, betAmountStr] = args;
    const usageMessage = `💡 **Sử dụng lệnh:**\n\`${prefix}taxiu <tài|xỉu> <số tiền|all>\`\n\nVí dụ:\n • \`${prefix}taxiu tài 5000\`\n • \`${prefix}taxiu xỉu all\``;

    if (!choice || !betAmountStr) {
      return usageMessage;
    }

    const normalizedChoice = choice.toLowerCase();
    if (normalizedChoice !== 'tài' && normalizedChoice !== 'xỉu') {
      return `❌ **Lựa chọn không hợp lệ!** Vui lòng chọn "tài" hoặc "xỉu".\n\n${usageMessage}`;
    }

    let betAmount;
    if (['all', 'tất', 'tấtcả', 'tattay'].includes(betAmountStr.toLowerCase())) {
        betAmount = user.money;
    } else {
        betAmount = parseInt(betAmountStr, 10);
    }

    if (isNaN(betAmount) || betAmount <= 0) {
      return '❌ **Số tiền cược không hợp lệ!** Vui lòng nhập một số dương.';
    }
    
    if (betAmount < MIN_BET) {
        return `❌ **Mức cược tối thiểu là ${MIN_BET.toLocaleString('vi-VN')} xu!**`;
    }

    if (betAmount > user.money) {
      return `😥 **Không đủ tiền!**\n💰 Bạn chỉ có **${user.money.toLocaleString('vi-VN')} xu** để cược.`;
    }

    // --- 2. Game Logic ---
    try {
      // Trừ tiền cược ngay lập tức để tránh gian lận
      userManager.updateMoney(userId, -betAmount);

      const dice = [rollDice(), rollDice(), rollDice()];
      const sum = dice.reduce((a, b) => a + b, 0);

      // Kiểm tra "Bão" (bộ ba đồng nhất), nếu có nhà cái thắng
      const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
      const result = sum > TAI_THRESHOLD ? 'tài' : 'xỉu';
      
      let win = false;
      let winnings = 0;

      if (isTriple) {
        // Nhà cái thắng khi có bão
        win = false;
      } else if (normalizedChoice === result) {
        // Người chơi thắng
        win = true;
        
        // Kiểm tra sự kiện
        let eventMultiplier = 1.0;
        let eventMessage = '';
        
        if (eventManager.isEventActive('happy_hour_taxiu')) {
          eventMultiplier = eventManager.getMultiplier('taxiu');
          const event = eventManager.getEvent('happy_hour_taxiu');
          const timeLeft = eventManager.getTimeRemaining('happy_hour_taxiu');
          const timeStr = eventManager.formatTimeRemaining(timeLeft);
          eventMessage = `\n🎉 **${event.title}** - ${timeStr} còn lại!`;
        } else if (eventManager.isEventActive('happy_hour_taxiu_morning')) {
          eventMultiplier = eventManager.getMultiplier('taxiu');
          const event = eventManager.getEvent('happy_hour_taxiu_morning');
          const timeLeft = eventManager.getTimeRemaining('happy_hour_taxiu_morning');
          const timeStr = eventManager.formatTimeRemaining(timeLeft);
          eventMessage = `\n🎉 **${event.title}** - ${timeStr} còn lại!`;
        } else if (eventManager.isEventActive('gold_rush')) {
          eventMultiplier = eventManager.getMultiplier('global_gold');
          const event = eventManager.getEvent('gold_rush');
          const timeLeft = eventManager.getTimeRemaining('gold_rush');
          const timeStr = eventManager.formatTimeRemaining(timeLeft);
          eventMessage = `\n💰 **${event.title}** - ${timeStr} còn lại!`;
        } else if (eventManager.isEventActive('gold_rush_morning')) {
          eventMultiplier = eventManager.getMultiplier('global_gold');
          const event = eventManager.getEvent('gold_rush_morning');
          const timeLeft = eventManager.getTimeRemaining('gold_rush_morning');
          const timeStr = eventManager.formatTimeRemaining(timeLeft);
          eventMessage = `\n💰 **${event.title}** - ${timeStr} còn lại!`;
        }
        
        const adjustedMultiplier = WIN_MULTIPLIER * eventMultiplier;
        winnings = betAmount + Math.floor(betAmount * adjustedMultiplier);
      }
      // Nếu thua, winnings vẫn là 0

      if (win) {
        userManager.updateMoney(userId, winnings);
      }
      
      const newUser = userManager.getUser(userId);

      // --- 3. Format Response ---
      let response = `🎲 **KẾT QUẢ TÀI XỈU** 🎲${eventMessage}\n\n`;
      response += `• Xúc xắc: **[ ${dice.join(' ] - [ ')} ]**\n`;
      response += `• Tổng: **${sum}** nút ➠ **${result.toUpperCase()}**\n\n`;

      if (isTriple) {
          response += `🌪️ **BÃO!** Rất tiếc, nhà cái đã thắng. Bạn mất số tiền đã cược.\n`;
      } else if (win) {
        response += `🎉 **CHÚC MỪNG! BẠN THẮNG**\n`;
        response += `• Bạn đã cược **${betAmount.toLocaleString('vi-VN')} xu** vào **${normalizedChoice.toUpperCase()}**.\n`;
        const multiplierText = eventMultiplier > 1.0 ? ` (x${eventMultiplier.toFixed(1)} sự kiện)` : '';
        response += `• Tiền thắng (đã bao gồm 5% phí${multiplierText}): **+${(winnings - betAmount).toLocaleString('vi-VN')} xu** 💰\n`;
      } else {
        response += `😥 **RẤT TIẾC! BẠN THUA**\n`;
        response += `• Bạn đã cược **${betAmount.toLocaleString('vi-VN')} xu** vào **${normalizedChoice.toUpperCase()}** nhưng kết quả là **${result.toUpperCase()}**.\n`;
      }

      response += `\n📊 Số dư mới của bạn: **${newUser.money.toLocaleString('vi-VN')} xu**`;

      return response;

    } catch (error) {
        console.error('❌ Lỗi trong lệnh taxiu:', error);
        // Hoàn lại tiền nếu có lỗi xảy ra
        userManager.updateMoney(userId, betAmount);
        return `❌ Đã xảy ra lỗi hệ thống khi xử lý lệnh. Tiền cược của bạn đã được hoàn lại.`;
    }
  }
};
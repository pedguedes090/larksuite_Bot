// modules/commands/slot.js
import UserManager from '../userManager.js';

// --- Cấu hình Game Slot ---
const MIN_BET = 100; // Mức cược tối thiểu
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];
const SYMBOL_WEIGHTS = {
  '🍒': 30, // Cherry - phổ biến nhất
  '🍋': 25, // Lemon 
  '🍊': 20, // Orange
  '🍇': 15, // Grape
  '🔔': 6,  // Bell
  '⭐': 3,  // Star
  '💎': 1,  // Diamond - hiếm nhất
  '7️⃣': 0.5 // Lucky 7 - siêu hiếm
};

// Bảng trả thưởng (multiplier)
const PAYOUTS = {
  // Ba symbols giống nhau
  '🍒🍒🍒': 2,    // x2
  '🍋🍋🍋': 3,    // x3
  '🍊🍊🍊': 4,    // x4
  '🍇🍇🍇': 5,    // x5
  '🔔🔔🔔': 10,   // x10
  '⭐⭐⭐': 25,   // x25
  '💎💎💎': 50,   // x50
  '7️⃣7️⃣7️⃣': 100, // x100 - JACKPOT!
  
  // Hai symbols giống nhau
  '🍒🍒': 1.2,   // x1.2
  '🍋🍋': 1.3,   // x1.3
  '🍊🍊': 1.4,   // x1.4
  '🍇🍇': 1.5,   // x1.5
  '🔔🔔': 2,     // x2
  '⭐⭐': 3,     // x3
  '💎💎': 5,     // x5
  '7️⃣7️⃣': 10   // x10
};

// --- Hàm hỗ trợ ---
function getRandomSymbol() {
  const totalWeight = Object.values(SYMBOL_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [symbol, weight] of Object.entries(SYMBOL_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return symbol;
    }
  }
  return '🍒'; // fallback
}

function spinReels() {
  return [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
}

function checkWin(reels) {
  const [reel1, reel2, reel3] = reels;
  const reelString = reels.join('');
  
  // Kiểm tra ba giống nhau
  if (reel1 === reel2 && reel2 === reel3) {
    return {
      type: 'triple',
      symbols: reel1,
      multiplier: PAYOUTS[reelString] || 1,
      description: `Ba ${reel1} - JACKPOT!`
    };
  }
  
  // Kiểm tra hai giống nhau
  if (reel1 === reel2) {
    const key = reel1 + reel1;
    return {
      type: 'double',
      symbols: reel1,
      multiplier: PAYOUTS[key] || 1,
      description: `Hai ${reel1}`
    };
  }
  
  if (reel2 === reel3) {
    const key = reel2 + reel2;
    return {
      type: 'double',
      symbols: reel2,
      multiplier: PAYOUTS[key] || 1,
      description: `Hai ${reel2}`
    };
  }
  
  if (reel1 === reel3) {
    const key = reel1 + reel1;
    return {
      type: 'double',
      symbols: reel1,
      multiplier: PAYOUTS[key] || 1,
      description: `Hai ${reel1}`
    };
  }
  
  return null; // No win
}

function getSlotAnimation() {
  const frames = [
    '[ 🎰 | 🎰 | 🎰 ]',
    '[ 🎲 | 🎲 | 🎲 ]',
    '[ ⚡ | ⚡ | ⚡ ]'
  ];
  return frames[Math.floor(Math.random() * frames.length)];
}

export default {
  name: 'slot',
  description: 'Chơi game Slot Machine - quay bánh xe may mắn!',
  usage: '!slot <số tiền|all>',
  aliases: ['s', 'quay'],
  adminOnly: false,

  async execute({ userId, args, prefix }) {
    const userManager = UserManager.getInstance();
    
    // Tăng bộ đếm lệnh cho người dùng
    userManager.incrementCommandCount(userId);
    const user = userManager.getUser(userId);

    // --- 1. Validate Input ---
    const [betAmountStr] = args;
    const usageMessage = `🎰 **Cách chơi Slot Machine:**\n\`${prefix}slot <số tiền|all>\`\n\n**Ví dụ:**\n • \`${prefix}slot 1000\`\n • \`${prefix}slot all\`\n\n**Mức cược tối thiểu:** ${MIN_BET.toLocaleString('vi-VN')} xu`;

    if (!betAmountStr) {
      return usageMessage + '\n\n' + getPayoutTable();
    }

    let betAmount;
    if (['all', 'tất', 'tấtcả', 'tattca'].includes(betAmountStr.toLowerCase())) {
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

      // Hiệu ứng spinning
      const animation = getSlotAnimation();
      
      // Quay bánh xe
      const reels = spinReels();
      const win = checkWin(reels);
      
      let winnings = 0;
      let totalReturn = 0;

      if (win) {
        winnings = Math.floor(betAmount * win.multiplier);
        totalReturn = winnings;
        userManager.updateMoney(userId, totalReturn);
      }
      
      const newUser = userManager.getUser(userId);

      // --- 3. Format Response ---
      let response = `🎰 **SLOT MACHINE** 🎰\n\n`;
      response += `${animation}\n`;
      response += `**Đang quay...**\n\n`;
      response += `┌─────────────────┐\n`;
      response += `│  ${reels[0]}  │  ${reels[1]}  │  ${reels[2]}  │\n`;
      response += `└─────────────────┘\n\n`;

      if (win) {
        response += `🎉 **CHÚC MỪNG! BẠN THẮNG!** 🎉\n`;
        response += `🏆 **${win.description}** (x${win.multiplier})\n`;
        response += `💰 **Tiền cược:** ${betAmount.toLocaleString('vi-VN')} xu\n`;
        response += `🎁 **Tiền thắng:** +${winnings.toLocaleString('vi-VN')} xu\n`;
        response += `💵 **Lãi:** +${(winnings - betAmount).toLocaleString('vi-VN')} xu\n`;
        
        // Thêm hiệu ứng đặc biệt cho jackpot
        if (win.multiplier >= 50) {
          response += `\n🌟 **MEGA JACKPOT!** 🌟\n`;
        } else if (win.multiplier >= 25) {
          response += `\n⭐ **SUPER WIN!** ⭐\n`;
        } else if (win.multiplier >= 10) {
          response += `\n🔥 **BIG WIN!** 🔥\n`;
        }
      } else {
        response += `😥 **CHÚC BẠN MAY MẮN LẦN SAU!** 😥\n`;
        response += `💸 **Tiền đã mất:** -${betAmount.toLocaleString('vi-VN')} xu\n`;
      }

      response += `\n📊 **Số dư hiện tại:** ${newUser.money.toLocaleString('vi-VN')} xu`;

      return response;

    } catch (error) {
      console.error('❌ Lỗi trong lệnh slot:', error);
      // Hoàn lại tiền nếu có lỗi xảy ra
      userManager.updateMoney(userId, betAmount);
      return `❌ Đã xảy ra lỗi hệ thống khi xử lý lệnh. Tiền cược của bạn đã được hoàn lại.`;
    }
  }
};

function getPayoutTable() {
  return `\n📋 **BẢNG TRẢ THƯỞNG:**
  
**Ba symbols giống nhau:**
🍒🍒🍒 → x2   |  🍋🍋🍋 → x3   |  🍊🍊🍊 → x4   |  🍇🍇🍇 → x5
🔔🔔🔔 → x10  |  ⭐⭐⭐ → x25  |  💎💎💎 → x50  |  7️⃣7️⃣7️⃣ → x100

**Hai symbols giống nhau:**
🍒🍒 → x1.2  |  🍋🍋 → x1.3  |  🍊🍊 → x1.4  |  🍇🍇 → x1.5
🔔🔔 → x2    |  ⭐⭐ → x3    |  💎💎 → x5    |  7️⃣7️⃣ → x10`;
} 
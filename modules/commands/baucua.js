import UserManager from '../userManager.js';
import EventManager from '../eventManager.js';

const MIN_BET = 100;
const eventManager = EventManager.getInstance();
const FACES = [
  { name: 'bầu', emoji: '🍐' },
  { name: 'cua', emoji: '🦀' },
  { name: 'tôm', emoji: '🦞' },
  { name: 'cá', emoji: '🐟' },
  { name: 'gà', emoji: '🐓' },
  { name: 'nai', emoji: '🦌' }
];
const FACE_NAMES = FACES.map(f => f.name);

function getFaceEmoji(name) {
  const f = FACES.find(f => f.name === name);
  return f ? f.emoji : name;
}

function randomFaces() {
  // Random 3 mặt
  return [0, 1, 2].map(() => FACES[Math.floor(Math.random() * FACES.length)].name);
}

function parseBets(args, userMoney) {
  // Cho phép: !baucua bầu 1000 cua 500 cá 2000
  // hoặc !baucua bầu cua cá 1000
  let bets = {};
  let i = 0;
  let lastBet = null;
  while (i < args.length) {
    const arg = args[i].toLowerCase();
    if (FACE_NAMES.includes(arg)) {
      // Nếu sau mặt là số thì lấy số, không thì lấy lastBet
      let bet = lastBet;
      if (i + 1 < args.length && !isNaN(args[i + 1])) {
        bet = parseInt(args[i + 1], 10);
        i++;
      }
      bets[arg] = bet;
      lastBet = bet;
    } else if (!isNaN(arg)) {
      lastBet = parseInt(arg, 10);
    }
    i++;
  }
  // Nếu chỉ có 1 số tiền và nhiều mặt, áp dụng cho tất cả mặt
  if (Object.values(bets).every(v => v == null) && lastBet) {
    bets = {};
    args.forEach(arg => {
      if (FACE_NAMES.includes(arg.toLowerCase())) bets[arg.toLowerCase()] = lastBet;
    });
  }
  // Lọc các cược hợp lệ
  let totalBet = 0;
  for (const [face, bet] of Object.entries(bets)) {
    if (!FACE_NAMES.includes(face) || !bet || isNaN(bet) || bet < MIN_BET) {
      delete bets[face];
    } else {
      totalBet += bet;
    }
  }
  if (totalBet > userMoney) return { error: 'Không đủ tiền để đặt cược tổng cộng ' + totalBet.toLocaleString('vi-VN') + ' xu.' };
  if (Object.keys(bets).length === 0) return { error: 'Cú pháp sai hoặc số tiền cược không hợp lệ.' };
  return { bets, totalBet };
}

export default {
  name: 'baucua',
  description: 'Chơi game Bầu Cua Tôm Cá, cược nhiều mặt cùng lúc!',
  usage: '!baucua <bầu/cua/tôm/cá/gà/nai> <số tiền> [<bầu/cua/tôm/cá/gà/nai> <số tiền2> ...] hoặc !baucua bầu cua cá 1000',
  aliases: ['bctc', 'bau', 'cua', 'tom', 'ca', 'ga', 'nai'],
  adminOnly: false,

  async execute({ userId, args, prefix }) {
    const userManager = UserManager.getInstance();
    userManager.incrementCommandCount(userId);
    const user = userManager.getUser(userId);

    if (!args || args.length === 0) {
      return `🎲 **Cách chơi Bầu Cua:**\n\`${prefix}baucua <bầu/cua/tôm/cá/gà/nai> <số tiền> [<bầu/cua/tôm/cá/gà/nai> <số tiền2> ...]\`\nVD: \`${prefix}baucua bầu 1000 cua 500 cá 2000\`\nHoặc: \`${prefix}baucua tôm 1000\`\n\nCác mặt: ${FACES.map(f => `${f.emoji} ${f.name}`).join(', ')}\nMức cược tối thiểu: ${MIN_BET.toLocaleString('vi-VN')} xu.`;
    }

    const { bets, totalBet, error } = parseBets(args, user.money);
    if (error) return '❌ ' + error;
    if (totalBet < MIN_BET) return `❌ Tổng cược tối thiểu là ${MIN_BET.toLocaleString('vi-VN')} xu.`;

    // Trừ tiền cược
    userManager.updateMoney(userId, -totalBet);

    // Lắc xúc xắc
    const result = randomFaces();
    // Đếm số lần mỗi mặt xuất hiện
    const counts = {};
    result.forEach(face => { counts[face] = (counts[face] || 0) + 1; });

    // Tính tiền thắng với sự kiện
    let totalWin = 0;
    let detail = '';
    let eventMultiplier = 1.0;
    let eventMessage = '';
    
    // Kiểm tra sự kiện
    if (eventManager.isEventActive('happy_hour_baucua')) {
      eventMultiplier = eventManager.getMultiplier('baucua');
      const event = eventManager.getEvent('happy_hour_baucua');
      const timeLeft = eventManager.getTimeRemaining('happy_hour_baucua');
      const timeStr = eventManager.formatTimeRemaining(timeLeft);
      eventMessage = `\n🎉 **${event.title}** - ${timeStr} còn lại!`;
    } else if (eventManager.isEventActive('happy_hour_baucua_morning')) {
      eventMultiplier = eventManager.getMultiplier('baucua');
      const event = eventManager.getEvent('happy_hour_baucua_morning');
      const timeLeft = eventManager.getTimeRemaining('happy_hour_baucua_morning');
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
    
    const PAYOUT = 1.9 * eventMultiplier;
    
    for (const [face, bet] of Object.entries(bets)) {
      const winCount = counts[face] || 0;
      if (winCount > 0) {
        const win = Math.floor(bet * PAYOUT * winCount);
        totalWin += win;
        const multiplierText = eventMultiplier > 1.0 ? ` × ${eventMultiplier.toFixed(1)}` : '';
        detail += `• ${getFaceEmoji(face)} **${face}**: Đặt ${bet.toLocaleString('vi-VN')} × ${winCount} × 1.9${multiplierText} = +${win.toLocaleString('vi-VN')} xu\n`;
      } else {
        detail += `• ${getFaceEmoji(face)} **${face}**: Đặt ${bet.toLocaleString('vi-VN')} × 0 = -${bet.toLocaleString('vi-VN')} xu\n`;
      }
    }
    if (totalWin > 0) userManager.updateMoney(userId, totalWin);
    const newUser = userManager.getUser(userId);

    // Hiển thị kết quả
    let response = `🎲 **KẾT QUẢ BẦU CUA** 🎲${eventMessage}\n\n`;
    response += `Kết quả: ${result.map(f => getFaceEmoji(f)).join('  ')}\n\n`;
    response += detail;
    if (totalWin === totalBet) {
      response += `\n😐 **Bạn hòa tiền, nhận lại số đã cược!**`;
    } else if (totalWin > totalBet) {
      response += `\n🎉 **Bạn thắng tổng cộng: +${(totalWin - totalBet).toLocaleString('vi-VN')} xu!**`;
    } else {
      response += `\n😥 **Bạn thua -${(totalBet - totalWin).toLocaleString('vi-VN')} xu!**`;
    }
    response += `\n\n💰 **Số dư hiện tại:** ${newUser.money.toLocaleString('vi-VN')} xu`;
    return response;
  }
};

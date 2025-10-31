import UserManager from '../userManager.js';

const MIN_BET = 50;

export default {
  name: 'coinflip',
  description: 'Lật đồng xu và nhân đôi số tiền của bạn!',
  usage: '!coinflip <sấp/ngửa> <số tiền>',
  aliases: ['cf', 'latxu'],
  adminOnly: false,

  async execute({ userId, args }) {
    const userManager = UserManager.getInstance();
    userManager.incrementCommandCount(userId);
    const user = userManager.getUser(userId);

    if (args.length < 2) {
      return `Vui lòng nhập mặt và số tiền cược (ví dụ: !coinflip sấp 100).`;
    }

    const choice = args[0].toLowerCase();
    if (choice !== 'sấp' && choice !== 'ngửa') {
      return 'Vui lòng chọn sấp hoặc ngửa.';
    }

    const bet = parseInt(args[1], 10);
    if (isNaN(bet) || bet < MIN_BET) {
      return `Số tiền cược không hợp lệ. Mức cược tối thiểu là ${MIN_BET}.`;
    }

    if (user.money < bet) {
      return 'Bạn không đủ tiền để đặt cược.';
    }

    userManager.updateMoney(userId, -bet);

    const result = Math.random() < 0.5 ? 'sấp' : 'ngửa';
    const won = choice === result;

    let response = `**Kết quả:** ${result === 'sấp' ? 'Sấp' : 'Ngửa'}!\n\n`;

    if (won) {
      const winnings = bet * 2;
      userManager.updateMoney(userId, winnings);
      response += `Chúc mừng! Bạn đã thắng ${winnings.toLocaleString('vi-VN')} xu.`;
    } else {
      response += `Rất tiếc, bạn đã thua ${bet.toLocaleString('vi-VN')} xu.`;
    }

    const newUser = userManager.getUser(userId);
    response += `\n**Số dư hiện tại:** ${newUser.money.toLocaleString('vi-VN')} xu.`;

    return response;
  }
};

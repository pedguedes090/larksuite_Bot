import UserManager from '../userManager.js';

const MIN_BET = 100;
const MAX_BET = 10000;
const MAX_NUMBER = 100;
const PAYOUT = 80;

export default {
  name: 'luckynumber',
  description: 'Chọn một con số may mắn từ 1 đến 100 để có cơ hội thắng lớn!',
  usage: '!luckynumber <số> <số tiền>',
  aliases: ['ln', 'somayman'],
  adminOnly: false,

  async execute({ userId, args }) {
    const userManager = UserManager.getInstance();
    userManager.incrementCommandCount(userId);
    const user = userManager.getUser(userId);

    if (args.length < 2) {
      return `Vui lòng nhập số và số tiền cược (ví dụ: !luckynumber 7 500).`;
    }

    const number = parseInt(args[0], 10);
    if (isNaN(number) || number < 1 || number > MAX_NUMBER) {
      return `Vui lòng chọn một số từ 1 đến ${MAX_NUMBER}.`;
    }

    const bet = parseInt(args[1], 10);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      return `Số tiền cược không hợp lệ. Mức cược từ ${MIN_BET} đến ${MAX_BET}.`;
    }

    if (user.money < bet) {
      return 'Bạn không đủ tiền để đặt cược.';
    }

    userManager.updateMoney(userId, -bet);

    const winningNumber = Math.floor(Math.random() * MAX_NUMBER) + 1;

    let response = `**Số may mắn là:** ${winningNumber}!\n\n`;

    if (number === winningNumber) {
      const winnings = bet * PAYOUT;
      userManager.updateMoney(userId, winnings);
      response += `🎉 Chúc mừng! Bạn đã đoán đúng và thắng ${winnings.toLocaleString('vi-VN')} xu!`;
    } else {
      response += `😢 Rất tiếc, bạn đã đoán sai. Chúc bạn may mắn lần sau!`;
    }

    const newUser = userManager.getUser(userId);
    response += `\n**Số dư hiện tại:** ${newUser.money.toLocaleString('vi-VN')} xu.`;

    return response;
  }
};

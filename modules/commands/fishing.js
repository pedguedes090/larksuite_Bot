import UserManager from '../userManager.js';

const COOLDOWN = 60 * 1000; // 1 minute
const FISHING_ROD_PRICE = 500;

const FISH = [
    { name: 'Cá hề', emoji: '🐠', rarity: 0.3, value: 50 },
    { name: 'Cá nóc', emoji: '🐡', rarity: 0.25, value: 100 },
    { name: 'Cá nhiệt đới', emoji: '🐟', rarity: 0.15, value: 250 },
    { name: 'Bạch tuộc', emoji: '🐙', rarity: 0.1, value: 500 },
    { name: 'Cá voi', emoji: '🐳', rarity: 0.04, value: 2000 },
    { name: 'Cá sấu', emoji: '🐊', rarity: 0.01, value: 10000 },
    { name: 'Rác', emoji: '🗑️', rarity: 0.15, value: 10 }
];

function getRandomFish() {
  const rand = Math.random();
  let cumulative = 0;
  for (const fish of FISH) {
    cumulative += fish.rarity;
    if (rand < cumulative) {
      return fish;
    }
  }
  return FISH[FISH.length - 1]; // Should not happen
}

export default {
  name: 'fishing',
  description: 'Câu cá để kiếm tiền!',
  usage: '!fishing',
  aliases: ['cauca', 'fish'],
  adminOnly: false,

  async execute({ userId }) {
    const userManager = UserManager.getInstance();
    userManager.incrementCommandCount(userId);
    const user = userManager.getUser(userId);

    const lastFishing = user.lastFishing || 0;
    const now = Date.now();

    if (now - lastFishing < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (now - lastFishing)) / 1000);
      return `Bạn cần đợi ${remaining} giây nữa để câu cá tiếp.`;
    }

    if (!user.hasFishingRod) {
        if (user.money < FISHING_ROD_PRICE) {
            return `Bạn cần mua cần câu với giá ${FISHING_ROD_PRICE.toLocaleString('vi-VN')} xu.`;
        }
        userManager.updateMoney(userId, -FISHING_ROD_PRICE);
        userManager.setFishingRod(userId, true);
        return `Bạn đã mua cần câu với giá ${FISHING_ROD_PRICE.toLocaleString('vi-VN')} xu! Bây giờ bạn có thể câu cá.`;
    }

    userManager.setLastFishing(userId, now);

    const fish = getRandomFish();
    userManager.updateMoney(userId, fish.value);

    const newUser = userManager.getUser(userId);

    let response = `**${user.name} đã câu được một con ${fish.name} ${fish.emoji}!**\n`;
    response += `Bạn nhận được ${fish.value.toLocaleString('vi-VN')} xu.\n`;
    response += `**Số dư hiện tại:** ${newUser.money.toLocaleString('vi-VN')} xu.`;

    return response;
  }
};

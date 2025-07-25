// modules/commands/blackjack.js
import UserManager from '../userManager.js';
import EventManager from '../eventManager.js';

// --- Cấu hình Game ---
const MIN_BET = 100;
const BLACKJACK_MULTIPLIER = 1.5; // Blackjack pays 3:2
const GAME_TIMEOUT = 300000; // 5 minutes
const eventManager = EventManager.getInstance();

// --- Bộ bài ---
const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Game states storage (temporary in-memory)
const gameStates = new Map();

// --- Hàm hỗ trợ ---
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return shuffleDeck(deck);
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getCardValue(card) {
  if (card.rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return parseInt(card.rank);
}

function calculateHandValue(hand) {
  let value = 0;
  let aces = 0;
  
  for (const card of hand) {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  }
  
  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  
  return value;
}

function formatCard(card) {
  return `${card.rank}${card.suit}`;
}

function formatHand(hand, hideFirst = false) {
  if (hideFirst && hand.length > 0) {
    const visible = hand.slice(1);
    return `🂠 ${visible.map(formatCard).join(' ')}`;
  }
  return hand.map(formatCard).join(' ');
}

function isBlackjack(hand) {
  return hand.length === 2 && calculateHandValue(hand) === 21;
}

function createGameState(userId, betAmount) {
  const deck = createDeck();
  const playerHand = [deck.pop(), deck.pop()];
  const dealerHand = [deck.pop(), deck.pop()];
  
  return {
    userId,
    betAmount,
    deck,
    playerHand,
    dealerHand,
    gameOver: false,
    result: null,
    timestamp: Date.now()
  };
}

function cleanupExpiredGames() {
  const now = Date.now();
  for (const [userId, game] of gameStates.entries()) {
    if (now - game.timestamp > GAME_TIMEOUT) {
      gameStates.delete(userId);
    }
  }
}

function dealerPlay(game) {
  let dealerValue = calculateHandValue(game.dealerHand);
  
  while (dealerValue < 17) {
    game.dealerHand.push(game.deck.pop());
    dealerValue = calculateHandValue(game.dealerHand);
  }
  
  return dealerValue;
}

function determineWinner(game) {
  const playerValue = calculateHandValue(game.playerHand);
  const dealerValue = calculateHandValue(game.dealerHand);
  
  const playerBlackjack = isBlackjack(game.playerHand);
  const dealerBlackjack = isBlackjack(game.dealerHand);
  
  // Player bust
  if (playerValue > 21) {
    return { result: 'lose', reason: 'Bạn bị quá 21!', multiplier: 0 };
  }
  
  // Both blackjack
  if (playerBlackjack && dealerBlackjack) {
    return { result: 'push', reason: 'Cả hai đều có Blackjack!', multiplier: 1 };
  }
  
  // Player blackjack only
  if (playerBlackjack) {
    return { result: 'blackjack', reason: 'BLACKJACK!', multiplier: 1 + BLACKJACK_MULTIPLIER };
  }
  
  // Dealer blackjack only
  if (dealerBlackjack) {
    return { result: 'lose', reason: 'Dealer có Blackjack!', multiplier: 0 };
  }
  
  // Dealer bust
  if (dealerValue > 21) {
    return { result: 'win', reason: 'Dealer bị quá 21!', multiplier: 2 };
  }
  
  // Compare values
  if (playerValue > dealerValue) {
    return { result: 'win', reason: `Bạn thắng ${playerValue} vs ${dealerValue}!`, multiplier: 2 };
  } else if (dealerValue > playerValue) {
    return { result: 'lose', reason: `Dealer thắng ${dealerValue} vs ${playerValue}!`, multiplier: 0 };
  } else {
    return { result: 'push', reason: `Hòa ${playerValue} vs ${dealerValue}!`, multiplier: 1 };
  }
}

export default {
  name: 'blackjack',
  description: 'Chơi game Blackjack - Thử thách 21 điểm!',
  usage: '!blackjack <số tiền|hit|stand|quit>',
  aliases: ['bj', '21'],
  adminOnly: false,

  async execute({ userId, args, prefix }) {
    const userManager = UserManager.getInstance();
    userManager.incrementCommandCount(userId);
    
    // Cleanup expired games
    cleanupExpiredGames();
    
    const user = userManager.getUser(userId);
    const action = args[0]?.toLowerCase();
    
    // --- Show game rules ---
    if (!action) {
      const currentGame = gameStates.get(userId);
      let gameStatus = '';
      
      if (currentGame) {
        gameStatus = '\n⚠️ **Bạn đang có game đang chơi!**\nDùng `!blackjack hit`, `!blackjack stand` hoặc `!blackjack quit`';
      }
      
      return `🃏 **BLACKJACK - 21 ĐIỂM** 🃏

**📋 Luật chơi:**
• Mục tiêu: Đạt 21 điểm hoặc gần nhất mà không vượt quá
• A = 1 hoặc 11 điểm | J,Q,K = 10 điểm | Số = điểm tương ứng
• Blackjack (21 với 2 lá) = x1.5 tiền thắng
• Dealer phải rút bài khi ≤16, dừng khi ≥17

**🎮 Cách chơi:**
\`${prefix}blackjack <số_tiền>\` - Bắt đầu game mới
\`${prefix}blackjack hit\` - Rút thêm lá bài
\`${prefix}blackjack stand\` - Dừng lại, để dealer chơi
\`${prefix}blackjack quit\` - Thoát game (mất tiền cược)

**Mức cược tối thiểu:** ${MIN_BET.toLocaleString('vi-VN')} xu${gameStatus}`;
    }
    
    // --- Handle game actions ---
    const currentGame = gameStates.get(userId);
    
    if (action === 'hit') {
      if (!currentGame || currentGame.gameOver) {
        return '❌ **Bạn không có game nào đang chơi!** Dùng `!blackjack <số_tiền>` để bắt đầu.';
      }
      
      // Player hits
      currentGame.playerHand.push(currentGame.deck.pop());
      const playerValue = calculateHandValue(currentGame.playerHand);
      
      let response = `🃏 **HIT!** 🃏\n\n`;
      response += `👤 **Bài của bạn:** ${formatHand(currentGame.playerHand)} = **${playerValue}**\n`;
      response += `🤖 **Bài Dealer:** ${formatHand(currentGame.dealerHand, true)} = **?**\n\n`;
      
      if (playerValue > 21) {
        // Player busts
        currentGame.gameOver = true;
        const outcome = determineWinner(currentGame);
        // Không cộng lại tiền vì đã trừ khi bắt đầu
        const newBalance = userManager.getUser(userId).money;
        
        response += `💥 **QUÁ 21! BẠN THUA!** 💥\n`;
        response += `💸 **Tiền mất:** -${currentGame.betAmount.toLocaleString('vi-VN')} xu\n`;
        response += `📊 **Số dư:** ${newBalance.toLocaleString('vi-VN')} xu`;
        
        gameStates.delete(userId);
        return response;
      }
      
      response += `**Tiếp tục:** \`${prefix}blackjack hit\` | \`${prefix}blackjack stand\``;
      return response;
    }
    
    if (action === 'stand') {
      if (!currentGame || currentGame.gameOver) {
        return '❌ **Bạn không có game nào đang chơi!** Dùng `!blackjack <số_tiền>` để bắt đầu.';
      }
      
      // Player stands - dealer plays
      const dealerFinalValue = dealerPlay(currentGame);
      const playerValue = calculateHandValue(currentGame.playerHand);
      
      currentGame.gameOver = true;
      const outcome = determineWinner(currentGame);
      
      // Kiểm tra sự kiện
      let eventMultiplier = 1.0;
      let eventMessage = '';
      
      if (eventManager.isEventActive('lucky_blackjack')) {
        eventMultiplier = eventManager.getMultiplier('blackjack');
        const event = eventManager.getEvent('lucky_blackjack');
        const timeLeft = eventManager.getTimeRemaining('lucky_blackjack');
        const timeStr = eventManager.formatTimeRemaining(timeLeft);
        eventMessage = `\n🃏 **${event.title}** - ${timeStr} còn lại!`;
      } else if (eventManager.isEventActive('lucky_blackjack_evening')) {
        eventMultiplier = eventManager.getMultiplier('blackjack');
        const event = eventManager.getEvent('lucky_blackjack_evening');
        const timeLeft = eventManager.getTimeRemaining('lucky_blackjack_evening');
        const timeStr = eventManager.formatTimeRemaining(timeLeft);
        eventMessage = `\n🃏 **${event.title}** - ${timeStr} còn lại!`;
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
      
      let payout = 0;
      if (outcome.result === 'blackjack' || outcome.result === 'win') {
        const basePayout = Math.floor(currentGame.betAmount * outcome.multiplier);
        payout = Math.floor(basePayout * eventMultiplier);
        userManager.updateMoney(userId, payout); // Cộng lại toàn bộ tiền thắng (bao gồm cả tiền cược)
      } else if (outcome.result === 'push') {
        userManager.updateMoney(userId, currentGame.betAmount); // Hoàn lại tiền cược
      } // Nếu thua thì không cộng lại gì
      const newBalance = userManager.getUser(userId).money;
      
      let response = `🃏 **STAND - KẾT QUẢ CUỐI** 🃏${eventMessage}\n\n`;
      response += `👤 **Bài của bạn:** ${formatHand(currentGame.playerHand)} = **${playerValue}**\n`;
      response += `🤖 **Bài Dealer:** ${formatHand(currentGame.dealerHand)} = **${dealerFinalValue}**\n\n`;
      
      if (outcome.result === 'blackjack') {
        response += `🌟 **${outcome.reason}** 🌟\n`;
        const multiplierText = eventMultiplier > 1.0 ? ` (x${eventMultiplier.toFixed(1)} sự kiện)` : '';
        response += `🎁 **Tiền thắng:** +${(payout - currentGame.betAmount).toLocaleString('vi-VN')} xu (x1.5${multiplierText})\n`;
      } else if (outcome.result === 'win') {
        response += `🎉 **${outcome.reason}** 🎉\n`;
        const multiplierText = eventMultiplier > 1.0 ? ` (x${eventMultiplier.toFixed(1)} sự kiện)` : '';
        response += `💰 **Tiền thắng:** +${(payout - currentGame.betAmount).toLocaleString('vi-VN')} xu${multiplierText}\n`;
      } else if (outcome.result === 'push') {
        response += `🤝 **${outcome.reason}** 🤝\n`;
        response += `↩️ **Hoàn tiền:** ${currentGame.betAmount.toLocaleString('vi-VN')} xu\n`;
      } else {
        response += `😥 **${outcome.reason}** 😥\n`;
        response += `💸 **Tiền mất:** -${currentGame.betAmount.toLocaleString('vi-VN')} xu\n`;
      }
      
      response += `📊 **Số dư:** ${newBalance.toLocaleString('vi-VN')} xu`;
      
      gameStates.delete(userId);
      return response;
    }
    
    if (action === 'quit') {
      if (!currentGame) {
        return '❌ **Bạn không có game nào để thoát!**';
      }
      
      gameStates.delete(userId);
      return `🚪 **Đã thoát game!** Bạn mất ${currentGame.betAmount.toLocaleString('vi-VN')} xu tiền cược.`;
    }
    
    // --- Start new game ---
    if (currentGame && !currentGame.gameOver) {
      return `⚠️ **Bạn đang có game chưa hoàn thành!**
Dùng \`${prefix}blackjack hit\`, \`${prefix}blackjack stand\` hoặc \`${prefix}blackjack quit\``;
    }
    
    // Parse bet amount
    let betAmount;
    if (['all', 'tất', 'tấtcả'].includes(action)) {
      betAmount = user.money;
    } else {
      betAmount = parseInt(action, 10);
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
    
    // Start new game
    try {
      userManager.updateMoney(userId, -betAmount);
      const newGame = createGameState(userId, betAmount);
      gameStates.set(userId, newGame);
      
      // Kiểm tra sự kiện
      let eventMultiplier = 1.0;
      let eventMessage = '';
      
      if (eventManager.isEventActive('lucky_blackjack')) {
        eventMultiplier = eventManager.getMultiplier('blackjack');
        const event = eventManager.getEvent('lucky_blackjack');
        const timeLeft = eventManager.getTimeRemaining('lucky_blackjack');
        const timeStr = eventManager.formatTimeRemaining(timeLeft);
        eventMessage = `\n🃏 **${event.title}** - ${timeStr} còn lại!`;
      } else if (eventManager.isEventActive('lucky_blackjack_evening')) {
        eventMultiplier = eventManager.getMultiplier('blackjack');
        const event = eventManager.getEvent('lucky_blackjack_evening');
        const timeLeft = eventManager.getTimeRemaining('lucky_blackjack_evening');
        const timeStr = eventManager.formatTimeRemaining(timeLeft);
        eventMessage = `\n🃏 **${event.title}** - ${timeStr} còn lại!`;
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
      
      const playerValue = calculateHandValue(newGame.playerHand);
      const dealerUpCard = calculateHandValue([newGame.dealerHand[1]]);
      
      let response = `🃏 **BLACKJACK GAME STARTED** 🃏${eventMessage}\n\n`;
      response += `💰 **Tiền cược:** ${betAmount.toLocaleString('vi-VN')} xu\n\n`;
      response += `👤 **Bài của bạn:** ${formatHand(newGame.playerHand)} = **${playerValue}**\n`;
      response += `🤖 **Bài Dealer:** ${formatHand(newGame.dealerHand, true)} = **${dealerUpCard}+?**\n\n`;
      
      // Check for immediate blackjack
      if (isBlackjack(newGame.playerHand)) {
        newGame.gameOver = true;
        
        // Dealer also check for blackjack
        if (isBlackjack(newGame.dealerHand)) {
          // Push
          userManager.updateMoney(userId, betAmount); // Return bet
          response += `🤝 **PUSH!** Cả hai đều có Blackjack!\n`;
          response += `↩️ **Hoàn tiền:** ${betAmount.toLocaleString('vi-VN')} xu`;
        } else {
          // Player blackjack wins
          const basePayout = Math.floor(betAmount * (1 + BLACKJACK_MULTIPLIER));
          const payout = Math.floor(basePayout * eventMultiplier);
          userManager.updateMoney(userId, payout); // Cộng lại toàn bộ tiền thắng (bao gồm cả tiền cược)
          response += `🌟 **BLACKJACK! BẠN THẮNG!** 🌟\n`;
          const multiplierText = eventMultiplier > 1.0 ? ` (x${eventMultiplier.toFixed(1)} sự kiện)` : '';
          response += `🎁 **Tiền thắng:** +${(payout - betAmount).toLocaleString('vi-VN')} xu (x1.5${multiplierText})`;
        }
        
        const newBalance = userManager.getUser(userId).money;
        response += `\n📊 **Số dư:** ${newBalance.toLocaleString('vi-VN')} xu`;
        
        gameStates.delete(userId);
        return response;
      }
      
      response += `**Lựa chọn:** \`${prefix}blackjack hit\` | \`${prefix}blackjack stand\``;
      return response;
      
    } catch (error) {
      console.error('❌ Lỗi trong lệnh blackjack:', error);
      userManager.updateMoney(userId, betAmount); // Hoàn tiền
      return `❌ Đã xảy ra lỗi hệ thống. Tiền cược đã được hoàn lại.`;
    }
  }
}; 
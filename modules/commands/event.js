// modules/commands/event.js
import EventManager from '../eventManager.js';

const eventManager = EventManager.getInstance();

export default {
  name: 'event',
  description: 'Quản lý và xem sự kiện thời gian thực',
  usage: '!event [subcommand] [args...]',
  aliases: ['events', 'evt'],
  adminOnly: false,

  async execute({ userId, args, prefix, userManager }) {
    userManager.incrementCommandCount(userId);
    const isAdmin = userManager.isAdmin(userId);
    const subcommand = args[0]?.toLowerCase();

    // Lệnh cho tất cả người dùng
    if (!subcommand || subcommand === 'list' || subcommand === 'ls') {
      return await handleListEvents();
    }

    if (subcommand === 'active' || subcommand === 'current') {
      return await handleActiveEvents();
    }

    if (subcommand === 'upcoming' || subcommand === 'next') {
      return await handleUpcomingEvents();
    }

    if (subcommand === 'info') {
      const eventName = args[1];
      if (!eventName) {
        return '❌ **Thiếu tham số!** Sử dụng: `!event info <tên_sự_kiện>`';
      }
      return await handleEventInfo(eventName);
    }

    // Lệnh chỉ dành cho admin
    if (!isAdmin) {
      return '🔒 **Quyền hạn không đủ!** Lệnh này chỉ dành cho Admin.';
    }

    switch (subcommand) {
      case 'start':
        return await handleStartEvent(args.slice(1));
      case 'stop':
      case 'end':
        return await handleEndEvent(args.slice(1));
      case 'stats':
        return await handleEventStats();
      case 'schedule':
        return await handleScheduleEvent(args.slice(1));
      default:
        return getHelpMessage(prefix, isAdmin);
    }
  }
};

async function handleListEvents() {
  const activeEvents = eventManager.getActiveEvents();
  const upcomingEvents = eventManager.getUpcomingEvents();
  
  let response = '--- ⏳ **SỰ KIỆN THỜI GIAN THỰC** ---\n\n';
  
  // Sự kiện đang diễn ra
  if (Object.keys(activeEvents).length > 0) {
    response += '🎉 **ĐANG DIỄN RA:**\n';
    for (const [name, event] of Object.entries(activeEvents)) {
      const timeLeft = eventManager.getTimeRemaining(name);
      const timeStr = eventManager.formatTimeRemaining(timeLeft);
      response += `• **${event.title}** - ${timeStr} còn lại\n`;
    }
    response += '\n';
  } else {
    response += '😴 **Không có sự kiện nào đang diễn ra.**\n\n';
  }
  
  // Sự kiện sắp tới
  if (upcomingEvents.length > 0) {
    response += '📅 **SẮP TỚI:**\n';
    for (const event of upcomingEvents.slice(0, 5)) { // Chỉ hiện 5 sự kiện gần nhất
      const timeStr = event.hoursUntil > 0 
        ? `${event.hoursUntil}h ${event.minutesUntil}m` 
        : `${event.minutesUntil}m`;
      response += `• **${event.title}** - ${timeStr} nữa (${event.startHour}:${event.startMinute.toString().padStart(2, '0')})\n`;
    }
  }
  
  response += '\n💡 **Dùng:** `!event active` để xem chi tiết sự kiện đang diễn ra';
  
  return response;
}

async function handleActiveEvents() {
  const activeEvents = eventManager.getActiveEvents();
  
  if (Object.keys(activeEvents).length === 0) {
    return '😴 **Không có sự kiện nào đang diễn ra.**\n\n💡 Dùng `!event` để xem sự kiện sắp tới!';
  }
  
  let response = '--- 🎉 **SỰ KIỆN ĐANG DIỄN RA** ---\n\n';
  
  for (const [name, event] of Object.entries(activeEvents)) {
    const timeLeft = eventManager.getTimeRemaining(name);
    const timeStr = eventManager.formatTimeRemaining(timeLeft);
    
    response += `🎉 **${event.title}**\n`;
    response += `📝 ${event.description}\n`;
    response += `⏰ **Thời gian còn lại:** ${timeStr}\n`;
    response += `💰 **Tỷ lệ thưởng:** x${event.multiplier}\n`;
    response += `🎮 **Áp dụng cho:** ${getEventTypeDescription(event.type)}\n\n`;
  }
  
  return response;
}

async function handleUpcomingEvents() {
  const upcomingEvents = eventManager.getUpcomingEvents();
  
  if (upcomingEvents.length === 0) {
    return '📅 **Không có sự kiện nào sắp tới.**';
  }
  
  let response = '--- 📅 **SỰ KIỆN SẮP TỚI** ---\n\n';
  
  for (const event of upcomingEvents) {
    const timeStr = event.hoursUntil > 0 
      ? `${event.hoursUntil}h ${event.minutesUntil}m` 
      : `${event.minutesUntil}m`;
    const timeDisplay = `${event.startHour}:${event.startMinute.toString().padStart(2, '0')}`;
    
    response += `📅 **${event.title}**\n`;
    response += `📝 ${event.description}\n`;
    response += `⏰ **Bắt đầu:** ${timeDisplay} (${timeStr} nữa)\n`;
    response += `💰 **Tỷ lệ thưởng:** x${event.multiplier}\n`;
    response += `🎮 **Áp dụng cho:** ${getEventTypeDescription(event.type)}\n\n`;
  }
  
  return response;
}

async function handleEventInfo(eventName) {
  const event = eventManager.getEvent(eventName);
  
  if (!event) {
    return `❌ **Không tìm thấy sự kiện:** ${eventName}\n\n💡 Dùng \`!event\` để xem danh sách sự kiện.`;
  }
  
  const timeLeft = eventManager.getTimeRemaining(eventName);
  const timeStr = eventManager.formatTimeRemaining(timeLeft);
  
  let response = `--- 📋 **THÔNG TIN SỰ KIỆN** ---\n\n`;
  response += `🎉 **${event.title}**\n`;
  response += `📝 **Mô tả:** ${event.description}\n`;
  response += `⏰ **Thời gian còn lại:** ${timeStr}\n`;
  response += `💰 **Tỷ lệ thưởng:** x${event.multiplier}\n`;
  response += `🎮 **Áp dụng cho:** ${getEventTypeDescription(event.type)}\n`;
  response += `📊 **Loại:** ${event.scheduled ? 'Tự động' : 'Thủ công'}\n`;
  
  if (event.manual) {
    response += `👤 **Khởi tạo bởi:** Admin\n`;
  }
  
  return response;
}

async function handleStartEvent(args) {
  if (args.length < 2) {
    return '❌ **Thiếu tham số!** Sử dụng: `!event start <tên> <thời_gian_phút> [mô_tả]`\n\n**Ví dụ:**\n`!event start test_event 30 "Sự kiện test 30 phút"`';
  }
  
  const eventName = args[0];
  const durationMinutes = parseInt(args[1]);
  const description = args.slice(2).join(' ') || 'Sự kiện thủ công';
  
  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    return '❌ **Thời gian không hợp lệ!** Vui lòng nhập số phút dương.';
  }
  
  if (eventManager.isEventActive(eventName)) {
    return `❌ **Sự kiện đã tồn tại:** ${eventName}`;
  }
  
  const event = eventManager.startManualEvent(eventName, durationMinutes, {
    title: `🎉 ${eventName.replace(/_/g, ' ').toUpperCase()}`,
    description: description,
    type: 'manual',
    multiplier: 1.5
  });
  
  return `✅ **Sự kiện đã bắt đầu!**\n\n${eventManager.getEventNotification(event)}`;
}

async function handleEndEvent(args) {
  if (args.length < 1) {
    return '❌ **Thiếu tham số!** Sử dụng: `!event stop <tên_sự_kiện>`';
  }
  
  const eventName = args[0];
  
  if (!eventManager.isEventActive(eventName)) {
    return `❌ **Sự kiện không tồn tại hoặc đã kết thúc:** ${eventName}`;
  }
  
  const event = eventManager.endManualEvent(eventName);
  
  return `⏰ **Sự kiện đã kết thúc!**\n\n🎉 **${event.title}**\n📝 ${event.description}\n✅ Đã dừng thủ công bởi Admin.`;
}

async function handleEventStats() {
  const stats = eventManager.getEventStats();
  const activeEvents = eventManager.getActiveEvents();
  const upcomingEvents = eventManager.getUpcomingEvents();
  
  let response = '--- 📊 **THỐNG KÊ SỰ KIỆN** ---\n\n';
  response += `🎉 **Sự kiện đang diễn ra:** ${stats.activeCount}\n`;
  response += `📅 **Sự kiện sắp tới:** ${stats.upcomingCount}\n`;
  response += `📋 **Tổng lịch sử:** ${stats.totalHistory}\n`;
  response += `✅ **Đã hoàn thành:** ${stats.completedEvents}\n\n`;
  
  if (Object.keys(activeEvents).length > 0) {
    response += '**Đang diễn ra:**\n';
    for (const [name, event] of Object.entries(activeEvents)) {
      const timeLeft = eventManager.getTimeRemaining(name);
      const timeStr = eventManager.formatTimeRemaining(timeLeft);
      response += `• ${event.title} - ${timeStr}\n`;
    }
  }
  
  if (upcomingEvents.length > 0) {
    response += '\n**Sắp tới:**\n';
    for (const event of upcomingEvents.slice(0, 3)) {
      const timeStr = event.hoursUntil > 0 
        ? `${event.hoursUntil}h ${event.minutesUntil}m` 
        : `${event.minutesUntil}m`;
      response += `• ${event.title} - ${timeStr} nữa\n`;
    }
  }
  
  return response;
}

async function handleScheduleEvent(args) {
  return '📅 **Tính năng lập lịch sự kiện tùy chỉnh đang phát triển!**\n\nHiện tại chỉ hỗ trợ sự kiện tự động theo giờ cố định.';
}

function getEventTypeDescription(type) {
  const descriptions = {
    'world_boss': 'Boss thế giới đặc biệt',
    'taxiu': 'Game Tài Xỉu',
    'baucua': 'Game Bầu Cua',
    'world_boss_xp': 'XP World Boss',
    'slot': 'Slot Machine',
    'global_gold': 'Tất cả game (thưởng tiền)',
    'manual': 'Sự kiện thủ công'
  };
  
  return descriptions[type] || type;
}

function getHelpMessage(prefix, isAdmin) {
  let response = '--- ⏳ **HƯỚNG DẪN SỰ KIỆN** ---\n\n';
  
  response += '**👤 Lệnh cho mọi người:**\n';
  response += `\`${prefix}event\` - Xem sự kiện đang diễn ra và sắp tới\n`;
  response += `\`${prefix}event active\` - Xem chi tiết sự kiện đang diễn ra\n`;
  response += `\`${prefix}event upcoming\` - Xem sự kiện sắp tới\n`;
  response += `\`${prefix}event info <tên>\` - Xem thông tin sự kiện cụ thể\n\n`;
  
  if (isAdmin) {
    response += '**🔐 Lệnh Admin:**\n';
    response += `\`${prefix}event start <tên> <phút> [mô_tả]\` - Bắt đầu sự kiện thủ công\n`;
    response += `\`${prefix}event stop <tên>\` - Kết thúc sự kiện\n`;
    response += `\`${prefix}event stats\` - Xem thống kê sự kiện\n\n`;
  }
  
  response += '**📅 Sự kiện tự động hàng ngày:**\n';
  response += '• 18:00 - Double XP World Boss (30 phút)\n';
  response += '• 19:00 - Happy Hour Tài Xỉu (15 phút)\n';
  response += '• 20:00 - Boss Thế Giới (5 phút)\n';
  response += '• 21:00 - Happy Hour Bầu Cua (15 phút)\n';
  response += '• 22:00 - Lucky Slot (20 phút)\n';
  response += '• 23:00 - Gold Rush (25 phút)\n';
  
  return response;
} 
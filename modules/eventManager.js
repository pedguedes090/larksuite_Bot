// modules/eventManager.js
import fs from 'fs';
import path from 'path';

class EventManager {
  static instance = null;
  
  constructor() {
    if (EventManager.instance) {
      return EventManager.instance;
    }
    
    this.dataFile = path.join(process.cwd(), 'data', 'events.json');
    this.ensureDataDirectory();
    this.activeEvents = {};
    this.eventHistory = [];
    this.scheduledEvents = [];
    
    // Load dữ liệu từ file
    this.loadData();
    
    // Khởi tạo các sự kiện tự động theo giờ
    this.initializeScheduledEvents();
    
    // Bắt đầu timer để kiểm tra sự kiện
    this.startEventTimer();
    
    EventManager.instance = this;
  }

  static getInstance() {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Đã tạo thư mục data/ cho events');
    }
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.activeEvents = data.activeEvents || {};
        this.eventHistory = data.eventHistory || [];
        this.scheduledEvents = data.scheduledEvents || [];
        console.log(`📖 Loaded ${Object.keys(this.activeEvents).length} active events`);
      }
    } catch (err) {
      console.error('❌ Lỗi đọc file events.json:', err.message);
    }
  }

  saveData() {
    try {
      const data = {
        activeEvents: this.activeEvents,
        eventHistory: this.eventHistory,
        scheduledEvents: this.scheduledEvents
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('❌ Lỗi ghi file events.json:', err.message);
    }
  }

  // Khởi tạo các sự kiện tự động theo giờ
  initializeScheduledEvents() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Sự kiện hàng ngày
    const dailyEvents = [
      // Buổi tối (giữ nguyên)
      {
        name: 'world_boss',
        title: '🐉 Boss Thế Giới Xuất Hiện',
        description: 'Boss thế giới xuất hiện! Tham gia ngay trong 5 phút!',
        startHour: 20, // 20:00
        startMinute: 0,
        duration: 5 * 60 * 1000, // 5 phút
        type: 'world_boss',
        multiplier: 2.0,
        autoStart: true
      },
      // Buổi sáng
      {
        name: 'world_boss_morning',
        title: '🐉 Boss Thế Giới Xuất Hiện (Sáng)',
        description: 'Boss thế giới xuất hiện buổi sáng! Tham gia ngay trong 5 phút!',
        startHour: 8, // 08:00
        startMinute: 0,
        duration: 5 * 60 * 1000,
        type: 'world_boss',
        multiplier: 2.0,
        autoStart: true
      },
      {
        name: 'happy_hour_taxiu',
        title: '🎉 Happy Hour Tài Xỉu',
        description: 'Tài xỉu gấp đôi thưởng trong 15 phút!',
        startHour: 19, // 19:00
        startMinute: 0,
        duration: 15 * 60 * 1000, // 15 phút
        type: 'taxiu',
        multiplier: 2.0,
        autoStart: true
      },
      {
        name: 'happy_hour_taxiu_morning',
        title: '🎉 Happy Hour Tài Xỉu (Sáng)',
        description: 'Tài xỉu gấp đôi thưởng buổi sáng trong 15 phút!',
        startHour: 10, // 10:00
        startMinute: 0,
        duration: 15 * 60 * 1000,
        type: 'taxiu',
        multiplier: 2.0,
        autoStart: true
      },
      {
        name: 'happy_hour_baucua',
        title: '🎲 Happy Hour Bầu Cua',
        description: 'Bầu cua gấp đôi thưởng trong 15 phút!',
        startHour: 21, // 21:00
        startMinute: 0,
        duration: 15 * 60 * 1000, // 15 phút
        type: 'baucua',
        multiplier: 2.0,
        autoStart: true
      },
      {
        name: 'happy_hour_baucua_morning',
        title: '🎲 Happy Hour Bầu Cua (Sáng)',
        description: 'Bầu cua gấp đôi thưởng buổi sáng trong 15 phút!',
        startHour: 11,
        startMinute: 30,
        duration: 15 * 60 * 1000,
        type: 'baucua',
        multiplier: 2.0,
        autoStart: true
      },
      {
        name: 'double_xp_worldboss',
        title: '⭐ Double XP World Boss',
        description: 'Nhận gấp đôi XP khi đánh quái trong 30 phút!',
        startHour: 18, // 18:00
        startMinute: 0,
        duration: 30 * 60 * 1000, // 30 phút
        type: 'world_boss_xp',
        multiplier: 2.0,
        autoStart: true
      },
      {
        name: 'double_xp_worldboss_morning',
        title: '⭐ Double XP World Boss (Sáng)',
        description: 'Nhận gấp đôi XP khi đánh quái buổi sáng trong 30 phút!',
        startHour: 6,
        startMinute: 0,
        duration: 30 * 60 * 1000,
        type: 'world_boss_xp',
        multiplier: 2.0,
        autoStart: true
      },
      {
        name: 'lucky_slot',
        title: '🎰 Lucky Slot Machine',
        description: 'Slot machine có tỷ lệ trúng cao hơn trong 20 phút!',
        startHour: 22, // 22:00
        startMinute: 0,
        duration: 20 * 60 * 1000, // 20 phút
        type: 'slot',
        multiplier: 1.5,
        autoStart: true
      },
      {
        name: 'lucky_slot_morning',
        title: '🎰 Lucky Slot Machine (Sáng)',
        description: 'Slot machine có tỷ lệ trúng cao hơn buổi sáng trong 20 phút!',
        startHour: 9,
        startMinute: 0,
        duration: 20 * 60 * 1000,
        type: 'slot',
        multiplier: 1.5,
        autoStart: true
      },
      {
        name: 'gold_rush',
        title: '💰 Gold Rush',
        description: 'Tất cả game đều có thưởng tiền gấp 1.5 lần trong 25 phút!',
        startHour: 23, // 23:00
        startMinute: 0,
        duration: 25 * 60 * 1000, // 25 phút
        type: 'global_gold',
        multiplier: 1.5,
        autoStart: true
      },
      {
        name: 'gold_rush_morning',
        title: '💰 Gold Rush (Sáng)',
        description: 'Tất cả game đều có thưởng tiền gấp 1.5 lần buổi sáng trong 25 phút!',
        startHour: 7,
        startMinute: 30,
        duration: 25 * 60 * 1000,
        type: 'global_gold',
        multiplier: 1.5,
        autoStart: true
      },
      {
        name: 'lucky_blackjack',
        title: '🃏 Lucky Blackjack',
        description: 'Blackjack có tỷ lệ thắng cao hơn trong 20 phút!',
        startHour: 16, // 16:00
        startMinute: 0,
        duration: 20 * 60 * 1000, // 20 phút
        type: 'blackjack',
        multiplier: 1.3,
        autoStart: true
      },
      {
        name: 'lucky_blackjack_evening',
        title: '🃏 Lucky Blackjack (Tối)',
        description: 'Blackjack có tỷ lệ thắng cao hơn buổi tối trong 20 phút!',
        startHour: 21,
        startMinute: 30,
        duration: 20 * 60 * 1000,
        type: 'blackjack',
        multiplier: 1.3,
        autoStart: true
      }
    ];

    this.scheduledEvents = dailyEvents;
    this.saveData();
  }

  // Bắt đầu timer kiểm tra sự kiện
  startEventTimer() {
    // Kiểm tra mỗi phút
    setInterval(() => {
      this.checkScheduledEvents();
      this.cleanupExpiredEvents();
    }, 60 * 1000); // 1 phút

    // Kiểm tra ngay lập tức
    this.checkScheduledEvents();
  }

  // Kiểm tra và khởi động sự kiện theo lịch
  checkScheduledEvents() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    for (const event of this.scheduledEvents) {
      if (!event.autoStart) continue;
      
      // Kiểm tra xem sự kiện có nên bắt đầu không
      if (event.startHour === currentHour && event.startMinute === currentMinute) {
        // Kiểm tra xem sự kiện đã tồn tại chưa
        if (!this.isEventActive(event.name)) {
          this.startEvent(event.name, event.duration, {
            title: event.title,
            description: event.description,
            type: event.type,
            multiplier: event.multiplier,
            scheduled: true
          });
          
          console.log(`🎉 Sự kiện tự động bắt đầu: ${event.title}`);
        }
      }
    }
  }

  // Dọn dẹp sự kiện hết hạn
  cleanupExpiredEvents() {
    const now = Date.now();
    const expiredEvents = [];
    
    for (const [eventName, event] of Object.entries(this.activeEvents)) {
      if (now >= event.end) {
        expiredEvents.push(eventName);
      }
    }
    
    for (const eventName of expiredEvents) {
      this.endEvent(eventName);
    }
  }

  // Bắt đầu sự kiện
  startEvent(name, durationMs, data = {}) {
    const now = Date.now();
    const event = {
      name,
      start: now,
      end: now + durationMs,
      ...data
    };
    
    this.activeEvents[name] = event;
    
    // Thêm vào lịch sử
    this.eventHistory.push({
      ...event,
      ended: false
    });
    
    // Giới hạn lịch sử 100 sự kiện gần nhất
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-100);
    }
    
    this.saveData();
    
    console.log(`🎉 Sự kiện bắt đầu: ${name} (${Math.floor(durationMs / 60000)} phút)`);
    
    return event;
  }

  // Kết thúc sự kiện
  endEvent(name) {
    if (this.activeEvents[name]) {
      const event = this.activeEvents[name];
      
      // Cập nhật lịch sử
      const historyEvent = this.eventHistory.find(h => h.name === name && !h.ended);
      if (historyEvent) {
        historyEvent.ended = true;
        historyEvent.actualEnd = Date.now();
      }
      
      delete this.activeEvents[name];
      this.saveData();
      
      console.log(`⏰ Sự kiện kết thúc: ${name}`);
      
      return event;
    }
    return null;
  }

  // Kiểm tra sự kiện có đang hoạt động không
  isEventActive(name) {
    const event = this.activeEvents[name];
    return event && Date.now() < event.end;
  }

  // Lấy thông tin sự kiện
  getEvent(name) {
    return this.activeEvents[name];
  }

  // Lấy tất cả sự kiện đang hoạt động
  getActiveEvents() {
    const now = Date.now();
    const active = {};
    
    for (const [name, event] of Object.entries(this.activeEvents)) {
      if (now < event.end) {
        active[name] = event;
      }
    }
    
    return active;
  }

  // Lấy multiplier cho loại sự kiện cụ thể
  getMultiplier(eventType) {
    const activeEvents = this.getActiveEvents();
    
    for (const event of Object.values(activeEvents)) {
      if (event.type === eventType || event.type === 'global_gold') {
        return event.multiplier || 1.0;
      }
    }
    
    return 1.0;
  }

  // Lấy thời gian còn lại của sự kiện (tính bằng giây)
  getTimeRemaining(name) {
    const event = this.activeEvents[name];
    if (!event) return 0;
    
    const remaining = event.end - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }

  // Format thời gian còn lại
  formatTimeRemaining(seconds) {
    if (seconds <= 0) return 'Đã kết thúc';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  }

  // Tạo thông báo sự kiện
  getEventNotification(event) {
    const timeLeft = this.getTimeRemaining(event.name);
    const timeStr = this.formatTimeRemaining(timeLeft);
    
    return `🎉 **${event.title}** 🎉
${event.description}
⏰ **Thời gian còn lại:** ${timeStr}
💰 **Tỷ lệ thưởng:** x${event.multiplier}`;
  }

  // Lấy danh sách sự kiện sắp tới
  getUpcomingEvents() {
    const now = new Date();
    const upcoming = [];
    
    for (const event of this.scheduledEvents) {
      if (!event.autoStart) continue;
      
      const eventTime = new Date();
      eventTime.setHours(event.startHour, event.startMinute, 0, 0);
      
      // Nếu sự kiện hôm nay đã qua, tính cho ngày mai
      if (eventTime <= now) {
        eventTime.setDate(eventTime.getDate() + 1);
      }
      
      const timeUntilEvent = eventTime.getTime() - now.getTime();
      const hoursUntil = Math.floor(timeUntilEvent / (1000 * 60 * 60));
      const minutesUntil = Math.floor((timeUntilEvent % (1000 * 60 * 60)) / (1000 * 60));
      
      upcoming.push({
        ...event,
        nextStart: eventTime,
        timeUntil: timeUntilEvent,
        hoursUntil,
        minutesUntil
      });
    }
    
    return upcoming.sort((a, b) => a.timeUntil - b.timeUntil);
  }

  // Lệnh admin để bắt đầu sự kiện thủ công
  startManualEvent(name, durationMinutes, data = {}) {
    const durationMs = durationMinutes * 60 * 1000;
    return this.startEvent(name, durationMs, {
      ...data,
      manual: true
    });
  }

  // Lệnh admin để kết thúc sự kiện thủ công
  endManualEvent(name) {
    return this.endEvent(name);
  }

  // Lấy thống kê sự kiện
  getEventStats() {
    const activeCount = Object.keys(this.getActiveEvents()).length;
    const totalHistory = this.eventHistory.length;
    const completedEvents = this.eventHistory.filter(e => e.ended).length;
    
    return {
      activeCount,
      totalHistory,
      completedEvents,
      upcomingCount: this.getUpcomingEvents().length
    };
  }
}

export default EventManager; 
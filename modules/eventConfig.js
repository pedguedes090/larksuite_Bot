// modules/eventConfig.js
import fs from 'fs';
import path from 'path';

class EventConfig {
  constructor() {
    this.configPath = path.join(process.cwd(), 'data', 'event_config.json');
    this.defaultConfig = {
      events: {
        'im.message.receive_v1': {
          enabled: true,
          description: 'Handle incoming messages',
          rateLimitMs: 1000
        },
        'im.chat.member.user.added_v1': {
          enabled: true,
          description: 'Handle users joining chat',
          rateLimitMs: 5000,
          sendWelcome: true
        },
        'im.chat.member.user.deleted_v1': {
          enabled: true,
          description: 'Handle users leaving chat',
          rateLimitMs: 5000
        },
        'im.message.message_read_v1': {
          enabled: false, // Disabled by default to reduce noise
          description: 'Track message read events',
          rateLimitMs: 500
        },
        'application.bot.menu_v6': {
          enabled: true,
          description: 'Handle bot menu interactions',
          rateLimitMs: 2000
        },
        'contact.user.created_v3': {
          enabled: true,
          description: 'Handle new user creation',
          rateLimitMs: 10000
        }
      },
      general: {
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        enableStatistics: true,
        cleanupIntervalMs: 300000, // 5 minutes
        maxHandledMessages: 10000
      }
    };
    this.config = this.loadConfig();
  }

  // Load configuration from file
  loadConfig() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.configPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        const savedConfig = JSON.parse(fileContent);
        
        // Merge with defaults to ensure all fields exist
        return this.mergeWithDefaults(savedConfig);
      } else {
        // Create default config file
        this.saveConfig(this.defaultConfig);
        return { ...this.defaultConfig };
      }
    } catch (error) {
      console.error('❌ Error loading event config:', error.message);
      return { ...this.defaultConfig };
    }
  }

  // Merge saved config with defaults
  mergeWithDefaults(savedConfig) {
    const merged = { ...this.defaultConfig };
    
    // Merge events
    if (savedConfig.events) {
      for (const [eventType, eventConfig] of Object.entries(savedConfig.events)) {
        if (merged.events[eventType]) {
          merged.events[eventType] = { ...merged.events[eventType], ...eventConfig };
        }
      }
    }
    
    // Merge general settings
    if (savedConfig.general) {
      merged.general = { ...merged.general, ...savedConfig.general };
    }
    
    return merged;
  }

  // Save configuration to file
  saveConfig(config = null) {
    try {
      const configToSave = config || this.config;
      fs.writeFileSync(this.configPath, JSON.stringify(configToSave, null, 2));
      console.log('💾 Event configuration saved');
      return true;
    } catch (error) {
      console.error('❌ Error saving event config:', error.message);
      return false;
    }
  }

  // Check if an event is enabled
  isEventEnabled(eventType) {
    return this.config.events[eventType]?.enabled || false;
  }

  // Enable/disable an event
  setEventEnabled(eventType, enabled) {
    if (this.config.events[eventType]) {
      this.config.events[eventType].enabled = enabled;
      this.saveConfig();
      return true;
    }
    return false;
  }

  // Get rate limit for an event
  getEventRateLimit(eventType) {
    return this.config.events[eventType]?.rateLimitMs || 1000;
  }

  // Set rate limit for an event
  setEventRateLimit(eventType, rateLimitMs) {
    if (this.config.events[eventType]) {
      this.config.events[eventType].rateLimitMs = rateLimitMs;
      this.saveConfig();
      return true;
    }
    return false;
  }

  // Get welcome message setting for user join events
  getSendWelcome() {
    return this.config.events['im.chat.member.user.added_v1']?.sendWelcome || false;
  }

  // Set welcome message setting
  setSendWelcome(enabled) {
    if (this.config.events['im.chat.member.user.added_v1']) {
      this.config.events['im.chat.member.user.added_v1'].sendWelcome = enabled;
      this.saveConfig();
      return true;
    }
    return false;
  }

  // Get all event configurations
  getAllEventConfigs() {
    return { ...this.config.events };
  }

  // Get general settings
  getGeneralSettings() {
    return { ...this.config.general };
  }

  // Update general settings
  updateGeneralSettings(settings) {
    this.config.general = { ...this.config.general, ...settings };
    this.saveConfig();
  }

  // Get cleanup interval
  getCleanupInterval() {
    return this.config.general.cleanupIntervalMs;
  }

  // Get max handled messages
  getMaxHandledMessages() {
    return this.config.general.maxHandledMessages;
  }

  // Reset to defaults
  resetToDefaults() {
    this.config = { ...this.defaultConfig };
    this.saveConfig();
    console.log('🔄 Event configuration reset to defaults');
  }

  // Get configuration summary
  getConfigSummary() {
    const events = this.config.events;
    const enabledCount = Object.values(events).filter(e => e.enabled).length;
    const totalCount = Object.keys(events).length;
    
    return {
      enabledEvents: enabledCount,
      totalEvents: totalCount,
      statisticsEnabled: this.config.general.enableStatistics,
      logLevel: this.config.general.logLevel,
      cleanupInterval: this.config.general.cleanupIntervalMs,
      maxHandledMessages: this.config.general.maxHandledMessages
    };
  }
}

// Singleton instance
let instance = null;

export function getEventConfig() {
  if (!instance) {
    instance = new EventConfig();
  }
  return instance;
}

export default EventConfig;
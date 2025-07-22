// modules/wbDataManager.js
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'worldboss_data');
const userFile = path.join(dataDir, 'wbUsers.json');
const itemFile = path.join(dataDir, 'items.json');
const monsterFile = path.join(dataDir, 'monsters.json');
const mapFile = path.join(dataDir, 'maps.json');

class WB_DataManager {
  static instance = null;

  constructor() {
    if (WB_DataManager.instance) {
      return WB_DataManager.instance;
    }

    this.ensureDataFiles();
    this.users = this.loadJson(userFile, {});
    this.items = this.loadJson(itemFile, {});
    this.monsters = this.loadJson(monsterFile, {});
    this.maps = this.loadJson(mapFile, {});
    this.saveTimeout = null;

    WB_DataManager.instance = this;
  }

  static getInstance() {
    if (!WB_DataManager.instance) {
      WB_DataManager.instance = new WB_DataManager();
    }
    return WB_DataManager.instance;
  }
  
  ensureDataFiles() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const files = {
        [userFile]: '{}',
        [itemFile]: '{}',
        [monsterFile]: '{}',
        [mapFile]: '{}'
    };
    for (const [file, content] of Object.entries(files)) {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, content, 'utf8');
        }
    }
  }

  loadJson(filePath, defaultValue) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error(`❌ Lỗi đọc file ${path.basename(filePath)}:`, err.message);
    }
    return defaultValue;
  }
  
  saveUsers() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    
    this.saveTimeout = setTimeout(() => {
        try {
            fs.writeFileSync(userFile, JSON.stringify(this.users, null, 2), 'utf8');
        } catch (err) {
            console.error('❌ Lỗi ghi file wbUsers.json:', err.message);
        }
    }, 100);
  }
  
  getUser(userId) {
    if (!this.users[userId]) {
        // Generate daily quests separately to avoid potential recursion
        const dailyQuests = this.generateDailyQuests();
        
        this.users[userId] = {
            userId,
            level: 1,
            xp: 0,
            maxHp: 100,
            hp: 100,
            maxMp: 50,
            mp: 50,
            baseAttack: 10,
            baseDefense: 5,
            inventory: [], // [{ itemId: 'string', quantity: number }]
            equipment: {
                weapon: null,    // itemId or null
                armor: null      // itemId or null
            },
            buffs: [], // [{ type: 'attack'|'defense'|'luck', amount: 0.2, turnsRemaining: 5 }]
            combatState: {
                inCombat: false,
                monsterId: null,
                monsterHp: 0,
                mapId: null
            },
            cooldowns: {}, // { mapId: timestamp }
            dailyQuests: {
                lastReset: new Date().toDateString(),
                completed: [],
                available: dailyQuests
            },
            statistics: {
                monstersKilled: 0,
                bossesKilled: 0,
                itemsFound: 0,
                questsCompleted: 0
            },
            lastRevivalUse: 0  // Timestamp for revival stone cooldown
        };
        this.saveUsers();
    }
    
    // Clean expired buffs
    this.cleanExpiredBuffs(userId);
    
    return this.users[userId];
  }

  updateUser(userId, data) {
    if (!this.users[userId]) {
      this.getUser(userId); // This will create the user if it doesn't exist
    }
    Object.assign(this.users[userId], data);
    this.saveUsers();
    return this.users[userId];
  }

  // === EQUIPMENT SYSTEM ===
  
  getEquippedStats(userId) {
    const user = this.getUser(userId);
    let totalAttack = user.baseAttack;
    let totalDefense = user.baseDefense;
    let totalHp = 0;
    
    // Add weapon stats
    if (user.equipment.weapon) {
      const weapon = this.getItem(user.equipment.weapon);
      if (weapon && weapon.attackBonus) {
        totalAttack += weapon.attackBonus;
      }
    }
    
    // Add armor stats
    if (user.equipment.armor) {
      const armor = this.getItem(user.equipment.armor);
      if (armor) {
        if (armor.defenseBonus) totalDefense += armor.defenseBonus;
        if (armor.hpBonus) totalHp += armor.hpBonus;
      }
    }
    
    // Add buff effects
    for (const buff of user.buffs) {
      if (buff.type === 'attack') {
        totalAttack = Math.floor(totalAttack * (1 + buff.amount));
      } else if (buff.type === 'defense') {
        totalDefense = Math.floor(totalDefense * (1 + buff.amount));
      }
    }
    
    return {
      attack: totalAttack,
      defense: totalDefense,
      hpBonus: totalHp
    };
  }
  
  canEquipItem(userId, itemId) {
    const user = this.getUser(userId);
    const item = this.getItem(itemId);
    
    if (!item || (item.type !== 'weapon' && item.type !== 'armor')) {
      return { canEquip: false, reason: 'Vật phẩm này không thể trang bị.' };
    }
    
    if (item.requiredLevel && user.level < item.requiredLevel) {
      return { canEquip: false, reason: `Cần đạt Level ${item.requiredLevel} để trang bị.` };
    }
    
    return { canEquip: true };
  }
  
  equipItem(userId, itemId) {
    const user = this.getUser(userId);
    const canEquip = this.canEquipItem(userId, itemId);
    
    if (!canEquip.canEquip) {
      return { success: false, message: canEquip.reason };
    }
    
    const item = this.getItem(itemId);
    const equipSlot = item.type; // 'weapon' or 'armor'
    
    // Remove item from inventory
    const itemIndex = user.inventory.findIndex(i => i.itemId === itemId);
    if (itemIndex === -1) {
      return { success: false, message: 'Bạn không có vật phẩm này trong túi đồ.' };
    }
    
    // Unequip current item if any
    let unequippedItem = null;
    if (user.equipment[equipSlot]) {
      unequippedItem = user.equipment[equipSlot];
      this.addItemToInventory(userId, unequippedItem, 1);
    }
    
    // Equip new item
    user.equipment[equipSlot] = itemId;
    
    // Remove from inventory
    if (user.inventory[itemIndex].quantity === 1) {
      user.inventory.splice(itemIndex, 1);
    } else {
      user.inventory[itemIndex].quantity--;
    }
    
    this.saveUsers();
    
    return {
      success: true,
      message: `Đã trang bị ${item.name}.${unequippedItem ? ` ${this.getItem(unequippedItem).name} đã được trả về túi đồ.` : ''}`,
      unequipped: unequippedItem
    };
  }
  
  unequipItem(userId, slot) {
    const user = this.getUser(userId);
    
    if (!user.equipment[slot]) {
      return { success: false, message: 'Không có vật phẩm nào được trang bị ở vị trí này.' };
    }
    
    const itemId = user.equipment[slot];
    const item = this.getItem(itemId);
    
    // Add back to inventory
    this.addItemToInventory(userId, itemId, 1);
    
    // Remove from equipment
    user.equipment[slot] = null;
    this.saveUsers();
    
    return {
      success: true,
      message: `Đã gỡ ${item.name} và trả về túi đồ.`
    };
  }

  // === BUFF SYSTEM ===
  
  addBuff(userId, buffType, amount, turns) {
    const user = this.getUser(userId);
    
    // Remove existing buff of same type
    user.buffs = user.buffs.filter(buff => buff.type !== buffType);
    
    // Add new buff
    user.buffs.push({
      type: buffType,
      amount: amount,
      turnsRemaining: turns
    });
    
    this.saveUsers();
  }
  
  cleanExpiredBuffs(userId) {
    // Don't call getUser() here to avoid recursion
    if (!this.users[userId]) return; // User doesn't exist yet
    
    const user = this.users[userId];
    
    // Remove buffs with 0 or negative turns remaining
    user.buffs = user.buffs.filter(buff => buff.turnsRemaining > 0);
    
    this.saveUsers();
  }
  
  getActiveBuffs(userId) {
    const user = this.getUser(userId);
    // Don't call cleanExpiredBuffs here since getUser already calls it
    return user.buffs;
  }
  
  // Decrease buff turns remaining after each combat turn
  decreaseBuffTurns(userId) {
    if (!this.users[userId]) return;
    
    const user = this.users[userId];
    for (const buff of user.buffs) {
      buff.turnsRemaining = Math.max(0, buff.turnsRemaining - 1);
    }
    
    this.cleanExpiredBuffs(userId);
  }

  // === COOLDOWN SYSTEM ===
  
  isOnCooldown(userId, mapId) {
    const user = this.getUser(userId);
    const map = this.getMap(mapId);
    
    if (!map || !map.cooldown) return false;
    
    const lastUsed = user.cooldowns[mapId] || 0;
    const now = Date.now();
    const cooldownMs = map.cooldown * 60 * 60 * 1000; // hours to ms
    
    return (now - lastUsed) < cooldownMs;
  }
  
  getCooldownRemaining(userId, mapId) {
    const user = this.getUser(userId);
    const map = this.getMap(mapId);
    
    if (!map || !map.cooldown) return 0;
    
    const lastUsed = user.cooldowns[mapId] || 0;
    const now = Date.now();
    const cooldownMs = map.cooldown * 60 * 60 * 1000;
    const remaining = cooldownMs - (now - lastUsed);
    
    return Math.max(0, Math.ceil(remaining / (60 * 60 * 1000))); // hours
  }
  
  setCooldown(userId, mapId) {
    const user = this.getUser(userId);
    user.cooldowns[mapId] = Date.now();
    this.saveUsers();
  }

  // === DAILY QUEST SYSTEM ===
  
  generateDailyQuests() {
    const quests = [
      { id: 'kill_monsters', type: 'kill', target: 'any', count: 5, reward: { xp: 5, gold: 100 }, description: 'Tiêu diệt 5 quái vật bất kỳ' },
      { id: 'kill_goblins', type: 'kill', target: 'goblin', count: 3, reward: { xp: 3, gold: 75 }, description: 'Tiêu diệt 3 Yêu Tinh Xanh' },
      { id: 'visit_maps', type: 'explore', count: 3, reward: { xp: 4, gold: 80 }, description: 'Khám phá 3 bản đồ khác nhau' },
      { id: 'collect_items', type: 'loot', count: 10, reward: { xp: 2, gold: 60 }, description: 'Thu thập 10 vật phẩm bất kỳ' }
    ];
    
    // Return 3 random quests
    const shuffled = quests.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map(quest => ({
      ...quest,
      progress: 0,
      completed: false
    }));
  }
  
  checkDailyReset(userId) {
    const user = this.getUser(userId);
    const today = new Date().toDateString();
    
    if (user.dailyQuests.lastReset !== today) {
      user.dailyQuests = {
        lastReset: today,
        completed: [],
        available: this.generateDailyQuests()
      };
      this.saveUsers();
      return true;
    }
    return false;
  }
  
  updateQuestProgress(userId, type, target = null, amount = 1) {
    const user = this.getUser(userId);
    
    for (const quest of user.dailyQuests.available) {
      if (quest.completed) continue;
      
      let shouldUpdate = false;
      
      if (quest.type === type) {
        if (type === 'kill' && (quest.target === 'any' || quest.target === target)) {
          shouldUpdate = true;
        } else if (type === 'explore' || type === 'loot') {
          shouldUpdate = true;
        }
      }
      
      if (shouldUpdate) {
        quest.progress = Math.min(quest.progress + amount, quest.count);
        if (quest.progress >= quest.count) {
          quest.completed = true;
        }
      }
    }
    
    this.saveUsers();
  }

  // === HELPER FUNCTIONS ===
  getItem(itemId) { return this.items[itemId] || null; }
  getMonster(monsterId) { return this.monsters[monsterId] || null; }
  getMap(mapId) { return this.maps[mapId] || null; }
  getAllMaps() { return Object.values(this.maps); }
  
  getMapsByType(type) {
    if (!this.maps || typeof this.maps !== 'object') {
      return [];
    }
    return Object.values(this.maps).filter(m => m && m.type === type);
  }

  // Inventory management
  addItemToInventory(userId, itemId, quantity = 1) {
    const user = this.getUser(userId);
    const itemIndex = user.inventory.findIndex(i => i.itemId === itemId);

    if (itemIndex > -1) {
        user.inventory[itemIndex].quantity += quantity;
    } else {
        user.inventory.push({ itemId, quantity });
    }
    this.saveUsers();
    return user.inventory;
  }
  
  removeItemFromInventory(userId, itemId, quantity = 1) {
    const user = this.getUser(userId);
    const itemIndex = user.inventory.findIndex(i => i.itemId === itemId);
    
    if (itemIndex === -1) return false;
    
    if (user.inventory[itemIndex].quantity <= quantity) {
      user.inventory.splice(itemIndex, 1);
    } else {
      user.inventory[itemIndex].quantity -= quantity;
    }
    
    this.saveUsers();
    return true;
  }
  
  hasItem(userId, itemId, quantity = 1) {
    const user = this.getUser(userId);
    const item = user.inventory.find(i => i.itemId === itemId);
    return item && item.quantity >= quantity;
  }
  
  // Statistics
  updateStatistic(userId, stat, amount = 1) {
    const user = this.getUser(userId);
    if (user.statistics[stat] !== undefined) {
      user.statistics[stat] += amount;
      this.saveUsers();
    }
  }
}

export default WB_DataManager;
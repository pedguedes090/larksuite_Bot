import { wbManager } from './utils.js';

export default async function handleSkill({ userId, args }) {
  const wbUser = wbManager.getUser(userId);
  const sub = args[1]?.toLowerCase();
  if (!sub) {
    // Show owned and equipped skills
    let text = '--- 🧙‍♂️ **KỸ NĂNG CỦA BẠN** ---\n';
    const owned = wbUser.skills || [];
    const equipped = wbUser.equippedSkills || [];
    if (owned.length === 0) return text + 'Bạn chưa sở hữu kỹ năng nào.';
    for (const skillId of owned) {
      const skill = wbManager.getSkill(skillId);
      if (!skill) continue;
      const isEquipped = equipped.includes(skillId) ? ' [Đã trang bị]' : '';
      const cd = wbUser.skillCooldowns?.[skillId] || 0;
      text += `• ${skill.name}${isEquipped} - MP: ${skill.mp_cost}, CD: ${skill.cooldown}, Mô tả: ${skill.description} ${cd > 0 ? `(Hồi: ${cd} lượt)` : ''}\n`;
    }
    return text;
  }
  if (sub === 'equip') {
    const skillId = args[2];
    if (!skillId) return '❌ Thiếu ID kỹ năng.';
    const result = wbManager.equipSkill(userId, skillId);
    return result.success ? '✅ ' + result.message : '❌ ' + result.message;
  }
  if (sub === 'unequip') {
    const skillId = args[2];
    if (!skillId) return '❌ Thiếu ID kỹ năng.';
    const result = wbManager.unequipSkill(userId, skillId);
    return result.success ? '✅ ' + result.message : '❌ ' + result.message;
  }
  if (sub === 'use') {
    const skillId = args[2];
    if (!skillId) return '❌ Thiếu ID kỹ năng.';
    const result = wbManager.useSkill(userId, skillId);
    return result.success ? '✅ ' + result.message : '❌ ' + result.message;
  }
  return '❌ Lệnh skill không hợp lệ.';
}


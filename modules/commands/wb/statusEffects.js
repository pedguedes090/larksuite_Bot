export function applyStatusEffects(entity, maxHp, combatLog = [], name = '') {
  let skipTurn = false;
  entity.statusEffects = entity.statusEffects || [];
  const remaining = [];
  for (const effect of entity.statusEffects) {
    switch (effect.type) {
      case 'poison': {
        const dmg = Math.floor(maxHp * 0.05);
        entity.hp = Math.max(0, entity.hp - dmg);
        combatLog.push(`${name} ☠️ chịu ${dmg} sát thương độc.`);
        break;
      }
      case 'burn': {
        const dmg = Math.floor(maxHp * 0.1);
        entity.hp = Math.max(0, entity.hp - dmg);
        combatLog.push(`${name} 🔥 bị bỏng mất ${dmg} HP.`);
        break;
      }
      case 'freeze':
        combatLog.push(`${name} ❄️ bị đóng băng và bỏ lượt!`);
        skipTurn = true;
        break;
      case 'stun':
        combatLog.push(`${name} 💫 bị choáng và bỏ lượt!`);
        skipTurn = true;
        break;
      case 'paralyze':
        if (Math.random() < 0.5) {
          combatLog.push(`${name} ⚡ bị tê liệt và bỏ lượt!`);
          skipTurn = true;
        }
        break;
      case 'quicksand':
        combatLog.push(`${name} 🕳️ bị sa lầy, giảm tốc độ.`);
        entity.speed = Math.max(0, (entity.speed || 0) - (effect.value || 1));
        break;
    }
    effect.turns--;
    if (effect.turns > 0) remaining.push(effect);
  }
  entity.statusEffects = remaining;
  return { skipTurn };
}

export function addStatus(target, type, turns = 2, value, key = 'statusEffects') {
  target[key] = target[key] || [];
  target[key].push({ type, turns, value });
}

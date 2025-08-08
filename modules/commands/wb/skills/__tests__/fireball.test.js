import test from 'node:test';
import assert from 'node:assert/strict';
import apply from '../fireball.js';

test('fireball deals magic damage', () => {
    const monster = { defense: 10, attack: 5, name: 'Slime' };
    const wbUser = { combatState: {} };
    const stats = { attack: 20 };
    const combatLog = [];
    const state = { wbUser, stats, combatLog, skill: { name: 'Fireball' }, damage: Math.max(1, stats.attack - monster.defense) };
    apply({ userId: 'u1', monster, state });
    const expected = Math.max(1, Math.floor(stats.attack * 1.5) - Math.floor(monster.defense * 0.8));
    assert.equal(state.damage, expected);
    assert.ok(combatLog[0].includes('Gây'));
});

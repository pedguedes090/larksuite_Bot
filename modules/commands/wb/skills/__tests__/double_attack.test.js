import test from 'node:test';
import assert from 'node:assert/strict';
import apply from '../double_attack.js';

test('double_attack doubles damage', () => {
    const monster = { defense: 5, attack: 10, name: 'Goblin' };
    const wbUser = { combatState: {} };
    const stats = { attack: 20, defense: 5 };
    const combatLog = [];
    const state = { wbUser, stats, combatLog, skill: { name: 'Double Attack' }, damage: Math.max(1, stats.attack - monster.defense) };
    apply({ userId: 'u1', monster, state });
    const expected = Math.max(1, Math.floor(stats.attack * 0.8) - monster.defense) * 2;
    assert.equal(state.damage, expected);
    assert.ok(combatLog[0].includes('Double Attack'));
});

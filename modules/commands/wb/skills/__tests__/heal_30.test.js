import test from 'node:test';
import assert from 'node:assert/strict';
import apply from '../heal_30.js';

test('heal_30 restores 30% HP', async () => {
    const monster = { hp: 100 };
    const wbManager = { saveUsers: async () => {} };
    const wbUser = { maxHp: 100, hp: 50 };
    const stats = { hpBonus: 0 };
    const combatLog = [];
    const state = { wbUser, stats, combatLog, wbManager, skill: { name: 'Heal' }, damage: 10 };
    await apply({ userId: 'u1', monster, state });
    assert.equal(state.damage, 0);
    assert.equal(wbUser.hp, 80);
    assert.ok(combatLog[0].includes('Hồi'));
});

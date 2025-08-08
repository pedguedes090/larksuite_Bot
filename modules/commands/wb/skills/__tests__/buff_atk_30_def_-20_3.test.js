import test from 'node:test';
import assert from 'node:assert/strict';
import apply from '../buff_atk_30_def_-20_3.js';

test('buff_atk_30_def_-20_3 adds attack and defense buffs', () => {
    const added = [];
    const wbManager = { addBuff: (uid, type, amount, turns) => added.push({ type, amount, turns }) };
    const wbUser = { combatState: {} };
    const stats = { attack: 20 };
    const monster = { defense: 5 };
    const combatLog = [];
    const state = { wbUser, stats, combatLog, wbManager, skill: { name: 'Rage' }, damage: Math.max(1, stats.attack - monster.defense) };
    apply({ userId: 'u1', monster, state });
    assert.equal(added.length, 2);
    assert.equal(added[0].type, 'attack');
    assert.equal(added[1].type, 'defense');
    assert.ok(combatLog[0].includes('Tăng 30%'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import apply from '../buff_def_40_2.js';

test('buff_def_40_2 adds defense buff', () => {
    const added = [];
    const wbManager = { addBuff: (uid, type, amount, turns) => added.push({ type, amount, turns }) };
    const wbUser = { combatState: {} };
    const stats = { attack: 20 };
    const monster = { defense: 5 };
    const combatLog = [];
    const state = { wbUser, stats, combatLog, wbManager, skill: { name: 'Buff Def' }, damage: Math.max(1, stats.attack - monster.defense) };
    apply({ userId: 'u1', monster, state });
    assert.equal(added.length, 1);
    assert.equal(added[0].type, 'defense');
    assert.ok(combatLog[0].includes('Tăng 40%'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, runLines } from '../assets/tools/lib/mathexpr.js';

test('math evaluator', () => {
  assert.equal(evaluate('2 + 3 * 4'), 14);
  assert.equal(evaluate('2^3^2'), 512);
  assert.equal(evaluate('-2^2'), -4);
  assert.equal(evaluate('(1+2)*3'), 9);
  assert.equal(evaluate('10 % 3 + 3!'), 7);
  assert.equal(evaluate('2pi'), 2 * Math.PI);
  assert.equal(evaluate('2pi^2'), 2 * Math.PI ** 2);
  assert.equal(evaluate('hypot(3, 4)'), 5);
  assert.equal(evaluate('round(pi, 2)'), 3.14);
  assert.equal(evaluate('log(1000) + ln(e^2)'), 5);
  assert.throws(() => evaluate('constructor'));
  assert.throws(() => evaluate('constructor(1)'));
  assert.throws(() => evaluate('alert(1)'));
  assert.throws(() => evaluate('2 +'));
  const r = runLines('r = 2\narea = pi * r^2\nans / pi\nfoo(');
  assert.equal(r[2].value, 4);
  assert.ok(r[3].error);
});

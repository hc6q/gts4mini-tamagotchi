import test from 'node:test'
import assert from 'node:assert/strict'

import {
  EVENT,
  MAX_DIARY_EVENTS,
  MAX_SAVE_BYTES,
  STAGE,
  addEvent,
  applyElapsed,
  createSave,
  performAction,
  sanitizeSave,
  syncSensors,
  updateEvolution,
} from '../utils/game.js'

test('diary never grows beyond its explicit cap', () => {
  const save = createSave(100)
  for (let index = 0; index < 50; index += 1) {
    addEvent(save, 101 + index, EVENT.PLAYED, index)
  }
  assert.equal(save.d.length, MAX_DIARY_EVENTS)
  assert.equal(save.d[0][2], 35)
  assert.equal(save.d[MAX_DIARY_EVENTS - 1][2], 49)
})

test('elapsed time drains awake needs and restores sleeping energy', () => {
  const awake = createSave(0)
  applyElapsed(awake, 3600)
  assert.equal(awake.h, 80)
  assert.equal(awake.m, 81)
  assert.equal(awake.e, 81)

  const sleeping = createSave(0)
  sleeping.e = 50
  sleeping.sl = 1
  applyElapsed(sleeping, 3600)
  assert.equal(sleeping.e, 54)
  assert.equal(sleeping.h, 81)
})

test('sleep is reduced to one daily score and aggregate counters', () => {
  const save = createSave(100)
  const snapshot = {
    date: 20260816,
    steps: 8421,
    sleepScore: 82,
    heartRate: 64,
  }
  syncSensors(save, snapshot, 200)
  syncSensors(save, snapshot, 300)

  assert.equal(save.ss, 82)
  assert.equal(save.gd, 1)
  assert.equal(save.bd, 0)
  assert.equal(save.st, 8421)
  assert.equal(save.hr, 64)
  assert.equal(save.d.filter((item) => item[1] === EVENT.GOOD_SLEEP).length, 1)
})

test('adult athlete evolution uses the compact maximum-step aggregate', () => {
  const save = createSave(0)
  save.mx = 9000
  assert.equal(updateEvolution(save, 72 * 3600), true)
  assert.equal(save.x, STAGE.ADULT_ATHLETE)
})

test('actions stay blocked while the pet sleeps', () => {
  const save = createSave(0)
  performAction(save, 'sleep', 10, 23)
  const hunger = save.h
  const result = performAction(save, 'feed', 20, 23)
  assert.equal(result.changed, false)
  assert.equal(save.h, hunger)
})

test('sanitization clamps corrupt values and bounds collections', () => {
  const raw = createSave(100)
  raw.h = 999
  raw.m = -20
  raw.d = Array.from({ length: 50 }, (_, index) => [index, 2, index])
  const clean = sanitizeSave(raw, 200)
  assert.equal(clean.h, 100)
  assert.equal(clean.m, 0)
  assert.equal(clean.d.length, MAX_DIARY_EVENTS)
})

test('worst-case current save remains below the internal 10 KB target', () => {
  const save = createSave(1786921200)
  save.n = 'ABCDEFGHIJKL'
  save.f = 1000000
  save.p = 1000000
  save.na = 1000000
  save.st = 1000000
  save.mx = 1000000
  save.gd = 1000000
  save.bd = 1000000
  save.d = Array.from({ length: MAX_DIARY_EVENTS }, (_, index) => [
    2147483000 + index,
    255,
    2147483647,
  ])
  assert.ok(Buffer.byteLength(JSON.stringify(save)) < MAX_SAVE_BYTES)
})

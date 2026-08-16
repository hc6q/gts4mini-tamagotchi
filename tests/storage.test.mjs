import test from 'node:test'
import assert from 'node:assert/strict'

import { createSave, performAction } from '../utils/game.js'

function createMockFs() {
  const files = new Map()
  const handles = new Map()
  let nextHandle = 1
  const api = {
    O_RDONLY: 1,
    O_RDWR: 2,
    O_CREAT: 4,
    O_TRUNC: 8,
    SEEK_SET: 0,
    files,
    failWritesFor: new Set(),
    stat(path) {
      const data = files.get(path)
      return data ? [{ size: data.length, mtime: 0 }, 0] : [null, -1]
    },
    open(path, flags) {
      if (!files.has(path) && (flags & api.O_CREAT)) {
        files.set(path, new Uint8Array())
      }
      if (!files.has(path)) return -1
      if (flags & api.O_TRUNC) files.set(path, new Uint8Array())
      const id = nextHandle
      nextHandle += 1
      handles.set(id, { path, position: 0 })
      return id
    },
    close(id) {
      handles.delete(id)
      return 0
    },
    seek(id, position) {
      handles.get(id).position = position
    },
    read(id, buffer, offset, length) {
      const handle = handles.get(id)
      const source = files.get(handle.path)
      new Uint8Array(buffer).set(
        source.slice(handle.position, handle.position + length),
        offset,
      )
      handle.position += length
      return 0
    },
    write(id, buffer, offset, length) {
      const handle = handles.get(id)
      if (api.failWritesFor.has(handle.path)) return -1
      const source = new Uint8Array(buffer).slice(offset, offset + length)
      files.set(handle.path, source)
      handle.position += length
      return 0
    },
    remove(path) {
      return files.delete(path) ? 0 : -1
    },
    rename(oldPath, newPath) {
      throw new Error(`rename must not be used: ${oldPath} -> ${newPath}`)
    },
  }
  return api
}

function bytes(text) {
  const units = Uint16Array.from(text, (character) => character.charCodeAt(0))
  return new Uint8Array(units.buffer)
}

test('safe write validates temporary and principal files without rename', async () => {
  globalThis.hmFS = createMockFs()
  const storage = await import('../utils/storage.js?write-test')
  const save = createSave(1000)
  performAction(save, 'feed', 1010, 12)

  assert.equal(storage.savePet(save), true)
  assert.ok(hmFS.files.has('pet.dat'))
  assert.equal(
    hmFS.files.get('pet.dat').length,
    JSON.stringify(save).length * 2,
  )
  assert.equal(hmFS.files.has('pet.tmp'), false)
  assert.equal(hmFS.files.has('pet.bak'), false)

  const loaded = storage.loadPet(1020)
  assert.equal(loaded.f, 1)
  assert.equal(loaded.n, 'Milo')
})

test('startup recovers a valid backup when the principal file is corrupt', async () => {
  globalThis.hmFS = createMockFs()
  const expected = createSave(2000)
  expected.m = 44
  hmFS.files.set('pet.dat', bytes('{corrupt'))
  hmFS.files.set('pet.bak', bytes(JSON.stringify(expected)))

  const storage = await import('../utils/storage.js?recovery-test')
  const recovered = storage.loadPet(2010)
  assert.equal(recovered.m, 44)
  assert.ok(hmFS.files.has('pet.dat'))
  assert.equal(hmFS.files.has('pet.tmp'), false)
})

test('needs survive diary navigation and a fresh app runtime', async () => {
  globalThis.hmFS = createMockFs()
  const mainPage = await import('../utils/storage.js?main-page')
  const save = createSave(3000)
  save.h = 31
  save.m = 47
  save.e = 59

  assert.equal(mainPage.savePet(save), true)

  const diaryPage = await import('../utils/storage.js?diary-page')
  const inDiary = diaryPage.loadPet(3010)
  assert.deepEqual([inDiary.h, inDiary.m, inDiary.e], [31, 47, 59])

  const reopenedApp = await import('../utils/storage.js?reopened-app')
  const afterReopen = reopenedApp.loadPet(3020)
  assert.deepEqual([afterReopen.h, afterReopen.m, afterReopen.e], [31, 47, 59])
})

test('a valid temporary file recovers a failed principal write', async () => {
  globalThis.hmFS = createMockFs()
  const firstRuntime = await import('../utils/storage.js?failed-write')
  const save = createSave(4000)
  save.h = 22
  save.m = 33
  save.e = 44
  hmFS.failWritesFor.add('pet.dat')

  assert.equal(firstRuntime.savePet(save), false)
  assert.ok(hmFS.files.has('pet.tmp'))
  assert.equal(hmFS.files.has('pet.dat'), false)

  hmFS.failWritesFor.delete('pet.dat')
  const nextRuntime = await import('../utils/storage.js?temp-recovery')
  const recovered = nextRuntime.loadPet(4010)
  assert.deepEqual([recovered.h, recovered.m, recovered.e], [22, 33, 44])
  assert.ok(hmFS.files.has('pet.dat'))
  assert.equal(hmFS.files.has('pet.tmp'), false)
})

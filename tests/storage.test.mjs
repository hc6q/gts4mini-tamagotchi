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
      const source = new Uint8Array(buffer).slice(offset, offset + length)
      files.set(handle.path, source)
      handle.position += length
      return 0
    },
    remove(path) {
      return files.delete(path) ? 0 : -1
    },
    rename(oldPath, newPath) {
      if (!files.has(oldPath) || files.has(newPath)) return -1
      files.set(newPath, files.get(oldPath))
      files.delete(oldPath)
      return 0
    },
  }
  return api
}

function bytes(text) {
  return Uint8Array.from(text, (character) => character.charCodeAt(0) & 0xff)
}

test('safe write validates then atomically promotes the temporary save', async () => {
  globalThis.hmFS = createMockFs()
  const storage = await import('../utils/storage.js?write-test')
  const save = createSave(1000)
  performAction(save, 'feed', 1010, 12)

  assert.equal(storage.savePet(save), true)
  assert.ok(hmFS.files.has('pet.dat'))
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

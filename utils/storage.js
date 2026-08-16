import { createSave, MAX_SAVE_BYTES, sanitizeSave } from './game.js'

const SAVE_FILE = 'pet.dat'
const TEMP_FILE = 'pet.tmp'
const BACKUP_FILE = 'pet.bak'
let lastWrittenText = ''
let lastError = 0

function exists(path) {
  const result = hmFS.stat(path)
  return result[1] === 0
}

function remove(path) {
  if (!exists(path)) return true
  hmFS.remove(path)
  return !exists(path)
}

function encode(text) {
  const units = new Uint16Array(text.length)
  for (let index = 0; index < text.length; index += 1) {
    units[index] = text.charCodeAt(index)
  }
  return units
}

function decode(units) {
  let text = ''
  for (let index = 0; index < units.length; index += 1) {
    text += String.fromCharCode(units[index])
  }
  return text
}

function readText(path) {
  const statResult = hmFS.stat(path)
  if (statResult[1] !== 0) return ''

  const size = statResult[0].size
  if (size < 2 || size > MAX_SAVE_BYTES || size % 2 !== 0) return ''

  const units = new Uint16Array(new ArrayBuffer(size))
  const file = hmFS.open(path, hmFS.O_RDONLY)
  if (file < 0) return ''

  hmFS.seek(file, 0, hmFS.SEEK_SET)
  hmFS.read(file, units.buffer, 0, size)
  hmFS.close(file)
  return decode(units)
}

function readSave(path, nowSec) {
  const text = readText(path)
  if (!text) return null
  try {
    const raw = JSON.parse(text)
    if (!raw || raw.v !== 1) return null
    return sanitizeSave(raw, nowSec)
  } catch (error) {
    return null
  }
}

function writeText(path, text) {
  const units = encode(text)
  if (units.byteLength > MAX_SAVE_BYTES) return 1
  if (!remove(path)) return 2

  const flags = [
    hmFS.O_RDWR | hmFS.O_CREAT,
    hmFS.O_RDWR | hmFS.O_TRUNC,
  ]
  let opened = false
  let writeResult
  let closeResult

  for (let index = 0; index < flags.length; index += 1) {
    const file = hmFS.open(path, flags[index])
    if (file < 0) continue
    opened = true
    writeResult = hmFS.write(
      file,
      units.buffer,
      0,
      units.byteLength,
    )
    closeResult = hmFS.close(file)
    if (readText(path) === text) return 0
  }

  if (!opened) return 3
  if (typeof writeResult === 'number' && writeResult !== 0) return 4
  if (typeof closeResult === 'number' && closeResult !== 0) return 5
  return 6
}

export function getStorageError() {
  return lastError
}

export function savePet(save) {
  const text = JSON.stringify(save)
  lastError = 0
  if (text === lastWrittenText) return true

  const tempResult = writeText(TEMP_FILE, text)
  if (tempResult !== 0) {
    lastError = 10 + tempResult
    remove(TEMP_FILE)
    return false
  }

  const mainResult = writeText(SAVE_FILE, text)
  if (mainResult !== 0) {
    lastError = 20 + mainResult
    remove(SAVE_FILE)
    return false
  }

  remove(TEMP_FILE)
  remove(BACKUP_FILE)
  lastWrittenText = text
  return true
}

export function loadPet(nowSec) {
  const temporary = readSave(TEMP_FILE, nowSec)
  if (temporary) {
    savePet(temporary)
    return temporary
  }

  const main = readSave(SAVE_FILE, nowSec)
  if (main) {
    lastWrittenText = JSON.stringify(main)
    return main
  }

  const backup = readSave(BACKUP_FILE, nowSec)
  if (backup) {
    savePet(backup)
    return backup
  }

  return createSave(nowSec)
}

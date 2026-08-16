import { createSave, MAX_SAVE_BYTES, sanitizeSave } from './game.js'

const SAVE_FILE = 'pet.dat'
const TEMP_FILE = 'pet.tmp'
const BACKUP_FILE = 'pet.bak'
let lastWrittenText = ''

function exists(path) {
  const result = hmFS.stat(path)
  return result[1] === 0
}

function remove(path) {
  if (exists(path)) hmFS.remove(path)
}

function encode(text) {
  const bytes = new Uint8Array(text.length)
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 0xff
  }
  return bytes
}

function decode(bytes) {
  let text = ''
  for (let index = 0; index < bytes.length; index += 1) {
    text += String.fromCharCode(bytes[index])
  }
  return text
}

function readText(path) {
  const statResult = hmFS.stat(path)
  if (statResult[1] !== 0) return ''

  const size = statResult[0].size
  if (size < 2 || size > MAX_SAVE_BYTES) return ''

  const bytes = new Uint8Array(new ArrayBuffer(size))
  const file = hmFS.open(path, hmFS.O_RDONLY)
  if (file < 0) return ''

  hmFS.seek(file, 0, hmFS.SEEK_SET)
  const result = hmFS.read(file, bytes.buffer, 0, size)
  hmFS.close(file)
  return result === 0 ? decode(bytes) : ''
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

function writeTemp(text) {
  const bytes = encode(text)
  const file = hmFS.open(
    TEMP_FILE,
    hmFS.O_RDWR | hmFS.O_CREAT | hmFS.O_TRUNC,
  )
  if (file < 0) return false

  const result = hmFS.write(file, bytes.buffer, 0, bytes.byteLength)
  hmFS.close(file)
  return result === 0
}

export function savePet(save) {
  const text = JSON.stringify(save)
  if (text === lastWrittenText) return true
  if (text.length > MAX_SAVE_BYTES || !writeTemp(text)) {
    remove(TEMP_FILE)
    return false
  }

  const check = readText(TEMP_FILE)
  if (check !== text) {
    remove(TEMP_FILE)
    return false
  }

  try {
    JSON.parse(check)
  } catch (error) {
    remove(TEMP_FILE)
    return false
  }

  remove(BACKUP_FILE)
  if (exists(SAVE_FILE) && hmFS.rename(SAVE_FILE, BACKUP_FILE) !== 0) {
    remove(TEMP_FILE)
    return false
  }

  if (hmFS.rename(TEMP_FILE, SAVE_FILE) === 0) {
    remove(BACKUP_FILE)
    lastWrittenText = text
    return true
  }

  if (exists(BACKUP_FILE)) hmFS.rename(BACKUP_FILE, SAVE_FILE)
  remove(TEMP_FILE)
  return false
}

export function loadPet(nowSec) {
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

  const temporary = readSave(TEMP_FILE, nowSec)
  if (temporary) {
    savePet(temporary)
    return temporary
  }

  return createSave(nowSec)
}

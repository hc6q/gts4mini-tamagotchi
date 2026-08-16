export const MAX_DIARY_EVENTS = 15
export const MAX_SAVE_BYTES = 10 * 1024

export const STAGE = {
  EGG: 0,
  BABY: 1,
  CHILD: 2,
  TEEN: 3,
  ADULT_NORMAL: 4,
  ADULT_ATHLETE: 5,
  ADULT_NIGHT: 6,
  ADULT_FRIENDLY: 7,
  ADULT_CHAOTIC: 8,
}

export const EVENT = {
  BORN: 1,
  FED: 2,
  PLAYED: 3,
  SLEPT: 4,
  WOKE: 5,
  EVOLVED: 6,
  GOOD_SLEEP: 7,
  BAD_SLEEP: 8,
  USER_SLEEP: 9,
  ACHIEVEMENT: 10,
}

export const ACHIEVEMENT = {
  FIRST_FEED: 0,
  FIRST_PLAY: 1,
  STEPS_1000: 2,
  STEPS_8000: 3,
  GOOD_SLEEP: 4,
  ADULT: 5,
}

export const ACHIEVEMENT_TOTAL = 6
const SLEEP_ENERGY_SECONDS = 8 * 3600 / 100

const STAGE_NAMES = [
  'Ovo',
  'Bebê',
  'Criança',
  'Jovem',
  'Adulto',
  'Atleta',
  'Noturno',
  'Amigável',
  'Caótico',
]

const ACHIEVEMENT_NAMES = [
  'Primeira comida',
  'Primeira brincadeira',
  '1.000 passos',
  '8.000 passos',
  'Sono 75+',
  'Forma adulta',
]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function safeInt(value, fallback, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return clamp(Math.floor(value), min, max)
}

function cleanDiary(value) {
  if (!Array.isArray(value)) return []

  return value
    .filter((item) => {
      return (
        Array.isArray(item) &&
        item.length === 3 &&
        typeof item[0] === 'number' &&
        typeof item[1] === 'number' &&
        typeof item[2] === 'number'
      )
    })
    .slice(-MAX_DIARY_EVENTS)
    .map((item) => [
      safeInt(item[0], 0, 0, 2147483647),
      safeInt(item[1], 0, 0, 255),
      safeInt(item[2], 0, -2147483648, 2147483647),
    ])
}

export function createSave(nowSec) {
  const now = safeInt(nowSec, 0, 0, 2147483647)
  return {
    v: 1,
    n: 'Milo',
    b: now,
    u: now,
    x: STAGE.EGG,
    h: 82,
    m: 82,
    e: 82,
    sl: 0,
    f: 0,
    p: 0,
    na: 0,
    st: 0,
    td: 0,
    mx: 0,
    ss: 0,
    sp: 0,
    gd: 0,
    bd: 0,
    hr: 0,
    a: 0,
    d: [[now, EVENT.BORN, 0]],
  }
}

export function sanitizeSave(raw, nowSec) {
  const clean = createSave(nowSec)
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return clean

  clean.n =
    typeof raw.n === 'string' && raw.n.length > 0 && raw.n.length <= 12
      ? raw.n
      : clean.n
  clean.b = safeInt(raw.b, clean.b, 0, 2147483647)
  clean.u = safeInt(raw.u, clean.u, clean.b, 2147483647)
  clean.x = safeInt(raw.x, clean.x, STAGE.EGG, STAGE.ADULT_CHAOTIC)
  clean.h = safeInt(raw.h, clean.h, 0, 100)
  clean.m = safeInt(raw.m, clean.m, 0, 100)
  clean.e = safeInt(raw.e, clean.e, 0, 100)
  clean.sl = raw.sl === 1 ? 1 : 0
  clean.f = safeInt(raw.f, 0, 0, 1000000)
  clean.p = safeInt(raw.p, 0, 0, 1000000)
  clean.na = safeInt(raw.na, 0, 0, 1000000)
  clean.st = safeInt(raw.st, 0, 0, 1000000)
  clean.td = safeInt(raw.td, 0, 0, 99999999)
  clean.mx = safeInt(raw.mx, 0, 0, 1000000)
  clean.ss = safeInt(raw.ss, 0, 0, 100)
  clean.sp = safeInt(raw.sp, 0, 0, 99999999)
  clean.gd = safeInt(raw.gd, 0, 0, 1000000)
  clean.bd = safeInt(raw.bd, 0, 0, 1000000)
  clean.hr = safeInt(raw.hr, 0, 0, 300)
  clean.a = safeInt(raw.a, 0, 0, (1 << ACHIEVEMENT_TOTAL) - 1)
  clean.d = cleanDiary(raw.d)
  return clean
}

export function addEvent(save, nowSec, type, value = 0) {
  save.d.push([
    safeInt(nowSec, 0, 0, 2147483647),
    safeInt(type, 0, 0, 255),
    safeInt(value, 0, -2147483648, 2147483647),
  ])
  if (save.d.length > MAX_DIARY_EVENTS) {
    save.d.splice(0, save.d.length - MAX_DIARY_EVENTS)
  }
}

export function unlockAchievement(save, nowSec, achievement) {
  const id = safeInt(achievement, -1, 0, ACHIEVEMENT_TOTAL - 1)
  if (id < 0) return false
  const bit = 1 << id
  if ((save.a & bit) !== 0) return false
  save.a |= bit
  addEvent(save, nowSec, EVENT.ACHIEVEMENT, id)
  return true
}

export function achievementCount(save) {
  let bits = save.a || 0
  let count = 0
  while (bits > 0) {
    count += bits & 1
    bits >>= 1
  }
  return count
}

export function stageName(stage) {
  return STAGE_NAMES[stage] || STAGE_NAMES[STAGE.EGG]
}

export function eventText(event, name = 'Milo') {
  if (!Array.isArray(event)) return `${name} chegou.`
  switch (event[1]) {
    case EVENT.BORN:
      return `${name} nasceu.`
    case EVENT.FED:
      return `${name} comeu.`
    case EVENT.PLAYED:
      return `${name} brincou.`
    case EVENT.SLEPT:
      return `${name} foi dormir.`
    case EVENT.WOKE:
      return `${name} acordou.`
    case EVENT.EVOLVED:
      return `Evoluiu: ${stageName(event[2])}.`
    case EVENT.GOOD_SLEEP:
      return `Sono bom: ${event[2]}.`
    case EVENT.BAD_SLEEP:
      return `Sono baixo: ${event[2]}.`
    case EVENT.USER_SLEEP: {
      const hours = Math.floor(event[2] / 60)
      const minutes = event[2] % 60
      return `Dormiram ${hours}h${minutes < 10 ? '0' : ''}${minutes}.`
    }
    case EVENT.ACHIEVEMENT:
      return `Conq: ${ACHIEVEMENT_NAMES[event[2]] || 'desconhecida'}.`
    default:
      return `${name} está por aqui.`
  }
}

function adultStage(save) {
  if (save.mx >= 8000) return STAGE.ADULT_ATHLETE
  if (save.na >= 5) return STAGE.ADULT_NIGHT
  if (save.p >= 8 && save.p > save.f) return STAGE.ADULT_FRIENDLY
  if (Math.min(save.h, save.m, save.e) <= 20) return STAGE.ADULT_CHAOTIC
  return STAGE.ADULT_NORMAL
}

export function updateEvolution(save, nowSec) {
  if (save.x >= STAGE.ADULT_NORMAL) return false

  const age = Math.max(0, nowSec - save.b)
  let next = STAGE.EGG
  if (age >= 72 * 3600) next = adultStage(save)
  else if (age >= 24 * 3600) next = STAGE.TEEN
  else if (age >= 6 * 3600) next = STAGE.CHILD
  else if (age >= 15 * 60) next = STAGE.BABY

  if (next === save.x) return false
  save.x = next
  addEvent(save, nowSec, EVENT.EVOLVED, next)
  if (next >= STAGE.ADULT_NORMAL) {
    unlockAchievement(save, nowSec, ACHIEVEMENT.ADULT)
  }
  return true
}

export function sleepCreditSeconds(save, snapshot, nowSec) {
  const date = safeInt(snapshot.date, 0, 0, 99999999)
  const minutes = safeInt(snapshot.sleepMinutes, 0, 0, 1440)
  if (date === 0 || minutes === 0 || save.sp === date) return 0
  const elapsed = clamp(Math.floor(nowSec - save.u), 0, 30 * 86400)
  const age = clamp(Math.floor(nowSec - save.b), 0, 30 * 86400)
  return Math.min(minutes * 60, elapsed, age)
}

export function applyElapsed(save, nowSec, userSleepSeconds = 0) {
  const elapsed = clamp(Math.floor(nowSec - save.u), 0, 30 * 86400)
  if (elapsed < 60) return updateEvolution(save, nowSec)

  const sleeping = save.sl === 1
    ? elapsed
    : clamp(Math.floor(userSleepSeconds), 0, elapsed)
  const awake = elapsed - sleeping

  if (awake > 0) {
    save.h = clamp(save.h - Math.floor(awake / 1800), 0, 100)
    save.m = clamp(save.m - Math.floor(awake / 3600), 0, 100)
    save.e = clamp(save.e - Math.floor(awake / 2700), 0, 100)
  }
  if (sleeping > 0) {
    save.h = clamp(save.h - Math.floor(sleeping / 2700), 0, 100)
    save.m = clamp(save.m - Math.floor(sleeping / 7200), 0, 100)
    save.e = clamp(
      save.e + Math.floor(sleeping / SLEEP_ENERGY_SECONDS),
      0,
      100,
    )
  }
  save.u = safeInt(nowSec, save.u, save.u, 2147483647)
  return updateEvolution(save, nowSec)
}

export function syncSensors(save, snapshot, nowSec) {
  let changed = false
  const date = safeInt(snapshot.date, 0, 0, 99999999)
  const steps = safeInt(snapshot.steps, 0, 0, 1000000)

  if (date > 0 && (save.td !== date || save.st !== steps)) {
    save.td = date
    save.st = steps
    save.mx = Math.max(save.mx, steps)
    if (steps >= 1000) {
      unlockAchievement(save, nowSec, ACHIEVEMENT.STEPS_1000)
    }
    if (steps >= 8000) {
      unlockAchievement(save, nowSec, ACHIEVEMENT.STEPS_8000)
    }
    changed = true
  }

  const sleepScore = safeInt(snapshot.sleepScore, 0, 0, 100)
  const sleepMinutes = safeInt(snapshot.sleepMinutes, 0, 0, 1440)
  if (
    date > 0 &&
    sleepMinutes > 0 &&
    save.sp !== date
  ) {
    save.sp = date
    if (sleepScore > 0) save.ss = sleepScore
    addEvent(save, nowSec, EVENT.USER_SLEEP, sleepMinutes)
    if (sleepScore >= 75) {
      save.gd += 1
      addEvent(save, nowSec, EVENT.GOOD_SLEEP, sleepScore)
      unlockAchievement(save, nowSec, ACHIEVEMENT.GOOD_SLEEP)
    } else if (sleepScore > 0) {
      save.bd += 1
      addEvent(save, nowSec, EVENT.BAD_SLEEP, sleepScore)
    }
    changed = true
  }

  const heartRate = safeInt(snapshot.heartRate, 0, 0, 300)
  if (heartRate > 0 && save.hr !== heartRate) {
    save.hr = heartRate
    changed = true
  }

  return updateEvolution(save, nowSec) || changed
}

export function performAction(save, action, nowSec, hour) {
  applyElapsed(save, nowSec)

  if (save.sl === 1 && action !== 'sleep') {
    return { changed: false, message: `${save.n} está dormindo.` }
  }

  const isNight = hour >= 22 || hour < 6
  if (action === 'feed') {
    save.h = clamp(save.h + 25, 0, 100)
    save.m = clamp(save.m + 3, 0, 100)
    save.f += 1
    if (isNight) save.na += 1
    addEvent(save, nowSec, EVENT.FED)
    unlockAchievement(save, nowSec, ACHIEVEMENT.FIRST_FEED)
  } else if (action === 'play') {
    save.m = clamp(save.m + 25, 0, 100)
    save.e = clamp(save.e - 12, 0, 100)
    save.h = clamp(save.h - 5, 0, 100)
    save.p += 1
    if (isNight) save.na += 1
    addEvent(save, nowSec, EVENT.PLAYED)
    unlockAchievement(save, nowSec, ACHIEVEMENT.FIRST_PLAY)
  } else if (action === 'sleep') {
    save.sl = save.sl === 1 ? 0 : 1
    addEvent(save, nowSec, save.sl === 1 ? EVENT.SLEPT : EVENT.WOKE)
  } else {
    return { changed: false, message: 'Ação inválida.' }
  }

  updateEvolution(save, nowSec)
  return {
    changed: true,
    message: eventText(save.d[save.d.length - 1], save.n),
  }
}

export function contextText(save, hour, nowSec) {
  const latest = save.d[save.d.length - 1]
  if (latest && nowSec - latest[0] < 8) {
    return eventText(latest, save.n)
  }
  if (save.sl === 1) return `${save.n}: zZ...`
  if (save.h <= 15) return `${save.n}: comida. agora.`
  if (save.e <= 15) return `${save.n}: preciso dormir.`
  if (save.m <= 15) return `${save.n}: vamos brincar?`
  if (save.h <= 35) return `${save.n} está com fome.`
  if (save.e <= 35) return `${save.n} está cansado.`
  if (save.m <= 35) return `${save.n} quer atenção.`
  if (hour < 6) return `${save.n}: por que acordados?`
  if (hour >= 22) return `${save.n}: já está tarde.`
  if (save.st >= 8000) return `${save.n}: caminhamos muito.`
  if (Math.min(save.h, save.m, save.e) >= 85) {
    return `${save.n} está muito bem.`
  }
  return `${save.n} observa você.`
}

export function ageText(save, nowSec) {
  const hours = Math.max(0, Math.floor((nowSec - save.b) / 3600))
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d ${hours % 24}h`
}

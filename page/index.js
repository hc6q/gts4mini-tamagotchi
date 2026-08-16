import {
  ageText,
  applyElapsed,
  eventText,
  performAction,
  stageName,
  syncSensors,
} from '../utils/game.js'
import { getStorageError, loadPet, savePet } from '../utils/storage.js'

const WIDTH = 336
const BG = 0x030604
const TEXT = 0xe7ffed
const GREEN = 0x8bf0a8
const DIM = 0x4e8b60
const AMBER = 0xffcf70
const PRESSED = 0x102a18

const TEXT_FACES = [
  '(._.)',
  'ʕ•ᴥ•ʔ',
  '(•ω•)',
  '(¬‿¬)',
  '(｡◕‿◕｡)',
  'ᕦ(ò_óˇ)ᕤ',
  '(─‿‿─)',
  '☜(⌒▽⌒)☞',
  "(ʘᗩʘ')",
]

const SLEEP_FACE = '(─‿‿─) zZ'

function textProps(x, y, w, h, size, color, align) {
  return {
    x,
    y,
    w,
    h,
    color,
    text_size: size,
    align_h: align,
    align_v: hmUI.align.CENTER_V,
    text_style: hmUI.text_style.NONE,
    text: '',
  }
}

function buttonProps(x, y, text) {
  return {
    x,
    y,
    w: 142,
    h: 30,
    radius: 0,
    normal_color: BG,
    press_color: PRESSED,
    color: GREEN,
    text_size: 15,
    text: `[ ${text} ]`,
  }
}

function meter(label, value) {
  const filled = Math.max(0, Math.min(8, Math.round(value / 12.5)))
  let cells = ''
  for (let index = 0; index < 8; index += 1) {
    cells += index < filled ? '#' : '.'
  }
  return `${label} [${cells}] ${value}`
}

function petFace(stage, sleeping) {
  if (sleeping) return SLEEP_FACE
  return TEXT_FACES[stage] || TEXT_FACES[0]
}

Page({
  state: {
    save: null,
    sensors: {},
    widgets: {},
    timerId: 0,
  },

  onInit() {
    this.state.sensors.time = hmSensor.createSensor(hmSensor.id.TIME)
    this.state.sensors.step = hmSensor.createSensor(hmSensor.id.STEP)
    this.state.sensors.heart = hmSensor.createSensor(hmSensor.id.HEART)
    this.state.sensors.sleep = hmSensor.createSensor(hmSensor.id.SLEEP)

    const snapshot = this.readSnapshot()
    this.state.save = loadPet(snapshot.now)
    applyElapsed(this.state.save, snapshot.now)
    syncSensors(this.state.save, snapshot, snapshot.now)
  },

  readSnapshot() {
    const sensors = this.state.sensors
    const clock = sensors.time
    let sleepScore = 0
    try {
      const basic = sensors.sleep.getBasicInfo()
      sleepScore = basic && basic.score ? basic.score : 0
    } catch (error) {
      sleepScore = 0
    }

    const utc = clock && clock.utc ? clock.utc : new Date().getTime()
    const date = clock
      ? clock.year * 10000 + clock.month * 100 + clock.day
      : 0
    return {
      now: Math.floor(utc / 1000),
      date,
      hour: clock ? clock.hour : 12,
      steps: sensors.step.current || 0,
      heartRate: sensors.heart.last || 0,
      sleepScore,
    }
  },

  build() {
    hmUI.setStatusBarVisible(false)
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 336,
      h: 384,
      color: BG,
    })

    const widgets = this.state.widgets
    widgets.header = hmUI.createWidget(
      hmUI.widget.TEXT,
      textProps(18, 7, 220, 25, 17, TEXT, hmUI.align.LEFT),
    )
    widgets.age = hmUI.createWidget(
      hmUI.widget.TEXT,
      textProps(238, 7, 80, 25, 16, DIM, hmUI.align.RIGHT),
    )
    this.createDivider(33)

    widgets.hunger = hmUI.createWidget(
      hmUI.widget.TEXT,
      textProps(24, 43, 288, 22, 16, GREEN, hmUI.align.LEFT),
    )
    widgets.mood = hmUI.createWidget(
      hmUI.widget.TEXT,
      textProps(24, 68, 288, 22, 16, GREEN, hmUI.align.LEFT),
    )
    widgets.energy = hmUI.createWidget(
      hmUI.widget.TEXT,
      textProps(24, 93, 288, 22, 16, GREEN, hmUI.align.LEFT),
    )
    widgets.pet = hmUI.createWidget(hmUI.widget.TEXT, {
      ...textProps(18, 132, 300, 76, 30, GREEN, hmUI.align.CENTER_H),
      align_v: hmUI.align.CENTER_V,
    })

    widgets.message = hmUI.createWidget(
      hmUI.widget.TEXT,
      textProps(18, 218, 300, 24, 16, AMBER, hmUI.align.CENTER_H),
    )
    widgets.meta = hmUI.createWidget(
      hmUI.widget.TEXT,
      textProps(18, 250, 300, 20, 14, DIM, hmUI.align.CENTER_H),
    )
    this.createDivider(280)

    widgets.feed = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...buttonProps(18, 301, 'COMER'),
      click_func: () => this.handleAction('feed'),
    })
    widgets.play = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...buttonProps(176, 301, 'BRINCAR'),
      click_func: () => this.handleAction('play'),
    })
    widgets.sleep = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...buttonProps(18, 344, 'SONO'),
      click_func: () => this.handleAction('sleep'),
    })
    widgets.diary = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...buttonProps(176, 344, 'DIARIO'),
      click_func: () => {
        if (!this.persist()) {
          widgets.message.setProperty(hmUI.prop.MORE, {
            text: `> SAVE E${getStorageError()}`,
          })
          return
        }
        hmApp.gotoPage({ url: 'page/diary' })
      },
    })

    this.render()
    this.state.timerId = timer.createTimer(
      4000,
      4000,
      () => this.tick(),
      {},
    )
  },

  createDivider(y) {
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...textProps(18, y, 300, 12, 12, DIM, hmUI.align.CENTER_H),
      text: '--------------------------------',
    })
  },

  renderPet() {
    const save = this.state.save
    this.state.widgets.pet.setProperty(hmUI.prop.MORE, {
      text: petFace(save.x, save.sl === 1),
      color: save.sl === 1 ? DIM : GREEN,
    })
  },

  render() {
    const save = this.state.save
    const snapshot = this.readSnapshot()
    const widgets = this.state.widgets
    const latest = save.d[save.d.length - 1]

    widgets.header.setProperty(hmUI.prop.MORE, {
      text: `> ${save.n.toUpperCase()} [${stageName(save.x).toUpperCase()}]`,
    })
    widgets.age.setProperty(hmUI.prop.MORE, {
      text: ageText(save, snapshot.now),
    })
    widgets.hunger.setProperty(hmUI.prop.MORE, {
      text: meter('FOME ', save.h),
    })
    widgets.mood.setProperty(hmUI.prop.MORE, {
      text: meter('HUMOR', save.m),
    })
    widgets.energy.setProperty(hmUI.prop.MORE, {
      text: meter('ENERG', save.e),
    })
    widgets.message.setProperty(hmUI.prop.MORE, {
      text: `> ${eventText(latest, save.n)}`,
    })
    widgets.meta.setProperty(hmUI.prop.MORE, {
      text: `PASSOS:${save.st}  SONO:${save.ss || '--'}  FC:${save.hr || '--'}`,
    })
    widgets.sleep.setProperty(
      hmUI.prop.MORE,
      buttonProps(18, 344, save.sl === 1 ? 'ACORDAR' : 'SONO'),
    )
    this.renderPet()
  },

  handleAction(action) {
    const snapshot = this.readSnapshot()
    const result = performAction(
      this.state.save,
      action,
      snapshot.now,
      snapshot.hour,
    )
    if (!result.changed) {
      this.state.widgets.message.setProperty(hmUI.prop.MORE, {
        text: `> ${result.message}`,
      })
      return
    }
    syncSensors(this.state.save, snapshot, snapshot.now)
    const saved = this.persist()
    this.render()
    if (!saved) {
      this.state.widgets.message.setProperty(hmUI.prop.MORE, {
        text: `> SAVE E${getStorageError()}`,
      })
    }
  },

  tick() {
    const snapshot = this.readSnapshot()
    applyElapsed(this.state.save, snapshot.now)
    syncSensors(this.state.save, snapshot, snapshot.now)
    this.render()
  },

  persist() {
    return this.state.save ? savePet(this.state.save) : false
  },

  onHide() {
    this.persist()
  },

  onDestroy() {
    if (this.state.timerId) timer.stopTimer(this.state.timerId)
    this.persist()
  },
})

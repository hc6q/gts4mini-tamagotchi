import {
  STAGE,
  ageText,
  applyElapsed,
  eventText,
  performAction,
  stageName,
  syncSensors,
} from '../utils/game.js'
import { loadPet, savePet } from '../utils/storage.js'

const WIDTH = 336
const BG = 0x0b1118
const TEXT = 0xf4f7fb
const MUTED = 0x93a4b8
const TRACK = 0x253140

const BODY_COLORS = [
  0xf4dfad,
  0x87d7a6,
  0x58c69a,
  0x4ca8e8,
  0xf0a64b,
  0xe85d56,
  0x7d62c7,
  0xe978a1,
  0xf06d45,
]

function textWidget(y, size, color = TEXT) {
  return {
    x: 12,
    y,
    w: WIDTH - 24,
    h: size + 10,
    color,
    text_size: size,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
    text_style: hmUI.text_style.ELLIPSIS,
    text: '',
  }
}

function buttonProps(x, y, text) {
  return {
    x,
    y,
    w: 150,
    h: 38,
    radius: 10,
    normal_color: 0x26384b,
    press_color: 0x3b5874,
    color: TEXT,
    text_size: 17,
    text,
  }
}

function petMetrics(stage) {
  if (stage === STAGE.EGG) return { x: 137, y: 122, w: 62, h: 98 }
  if (stage === STAGE.BABY) return { x: 127, y: 132, w: 82, h: 80 }
  if (stage === STAGE.CHILD) return { x: 120, y: 126, w: 96, h: 88 }
  return { x: 114, y: 120, w: 108, h: 96 }
}

Page({
  state: {
    save: null,
    sensors: {},
    widgets: {},
    pet: null,
    timerId: 0,
    frame: 0,
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
    return {
      now: Math.floor(utc / 1000),
      date: clock.year * 10000 + clock.month * 100 + clock.day,
      hour: clock.hour,
      steps: sensors.step.current || 0,
      heartRate: sensors.heart.last || 0,
      sleepScore,
    }
  },

  build() {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 336,
      h: 384,
      color: BG,
    })

    this.state.widgets.header = hmUI.createWidget(
      hmUI.widget.TEXT,
      textWidget(6, 20),
    )
    this.createBar('Fome', 43, 0xffc857, 'h')
    this.createBar('Humor', 66, 0xe978a1, 'm')
    this.createBar('Energia', 89, 0x65c7f2, 'e')
    this.createPet()

    this.state.widgets.message = hmUI.createWidget(
      hmUI.widget.TEXT,
      textWidget(239, 17),
    )
    this.state.widgets.meta = hmUI.createWidget(
      hmUI.widget.TEXT,
      textWidget(266, 14, MUTED),
    )

    this.state.widgets.feed = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...buttonProps(12, 296, 'ALIMENTAR'),
      click_func: () => this.handleAction('feed'),
    })
    this.state.widgets.play = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...buttonProps(174, 296, 'BRINCAR'),
      click_func: () => this.handleAction('play'),
    })
    this.state.widgets.sleep = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...buttonProps(12, 339, 'DORMIR'),
      click_func: () => this.handleAction('sleep'),
    })
    this.state.widgets.diary = hmUI.createWidget(hmUI.widget.BUTTON, {
      ...buttonProps(174, 339, 'DIÁRIO'),
      click_func: () => {
        this.persist()
        hmApp.gotoPage({ url: 'page/diary' })
      },
    })

    this.render()
    this.state.timerId = timer.createTimer(
      500,
      500,
      () => this.tick(),
      {},
    )
  },

  createBar(label, y, color, key) {
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 12,
      y: y - 6,
      w: 58,
      h: 22,
      color: MUTED,
      text_size: 15,
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      text: label,
    })
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 74,
      y,
      w: 250,
      h: 10,
      radius: 5,
      color: TRACK,
    })
    this.state.widgets[`bar_${key}`] = hmUI.createWidget(
      hmUI.widget.FILL_RECT,
      {
        x: 74,
        y,
        w: 1,
        h: 10,
        radius: 5,
        color,
      },
    )
  },

  createPet() {
    const widgets = this.state.widgets
    widgets.shadow = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 112,
      y: 222,
      w: 112,
      h: 8,
      radius: 4,
      color: 0x17212c,
    })
    widgets.earLeft = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      color: BG,
    })
    widgets.earRight = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      color: BG,
    })
    widgets.body = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 137,
      y: 122,
      w: 62,
      h: 98,
      radius: 28,
      color: BODY_COLORS[0],
    })
    widgets.accessory = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      color: BG,
    })
    widgets.eyeLeft = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      color: BG,
    })
    widgets.eyeRight = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      color: BG,
    })
    widgets.mouth = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      color: BG,
    })
    widgets.blushLeft = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      color: BG,
    })
    widgets.blushRight = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      color: BG,
    })
    widgets.footLeft = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      color: BG,
    })
    widgets.footRight = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      color: BG,
    })
  },

  setRect(widget, x, y, w, h, color, radius = 0) {
    widget.setProperty(hmUI.prop.MORE, { x, y, w, h, color, radius })
  },

  renderPet() {
    const stage = this.state.save.x
    const bodyColor = BODY_COLORS[stage]
    const metrics = petMetrics(stage)
    const visible = stage !== STAGE.EGG
    const ink = visible ? 0x13202a : BG
    const partColor = visible ? bodyColor : BG
    const widgets = this.state.widgets
    this.state.pet = metrics

    this.setRect(
      widgets.shadow,
      metrics.x - 4,
      222,
      metrics.w + 8,
      8,
      0x17212c,
      4,
    )
    this.setRect(
      widgets.earLeft,
      metrics.x - 6,
      metrics.y + 8,
      20,
      30,
      partColor,
      8,
    )
    this.setRect(
      widgets.earRight,
      metrics.x + metrics.w - 14,
      metrics.y + 8,
      20,
      30,
      partColor,
      8,
    )
    this.setRect(
      widgets.body,
      metrics.x,
      metrics.y,
      metrics.w,
      metrics.h,
      bodyColor,
      Math.min(30, Math.floor(metrics.w / 3)),
    )

    let accessoryColor = BG
    if (stage === STAGE.ADULT_ATHLETE) accessoryColor = 0xffe066
    else if (stage === STAGE.ADULT_NIGHT) accessoryColor = 0x232640
    else if (stage === STAGE.ADULT_CHAOTIC) accessoryColor = 0x8d221f
    this.setRect(
      widgets.accessory,
      metrics.x + 14,
      metrics.y + 15,
      metrics.w - 28,
      7,
      accessoryColor,
      3,
    )

    this.setRect(
      widgets.eyeLeft,
      metrics.x + 24,
      metrics.y + 37,
      9,
      this.state.save.sl ? 3 : 11,
      ink,
      3,
    )
    this.setRect(
      widgets.eyeRight,
      metrics.x + metrics.w - 33,
      metrics.y + 37,
      9,
      this.state.save.sl ? 3 : 11,
      ink,
      3,
    )
    this.setRect(
      widgets.mouth,
      metrics.x + Math.floor(metrics.w / 2) - 9,
      metrics.y + 61,
      18,
      5,
      ink,
      2,
    )

    const blush = stage === STAGE.ADULT_FRIENDLY ? 0xffb3c7 : BG
    this.setRect(
      widgets.blushLeft,
      metrics.x + 10,
      metrics.y + 57,
      12,
      5,
      blush,
      2,
    )
    this.setRect(
      widgets.blushRight,
      metrics.x + metrics.w - 22,
      metrics.y + 57,
      12,
      5,
      blush,
      2,
    )
    this.setRect(
      widgets.footLeft,
      metrics.x + 18,
      metrics.y + metrics.h - 2,
      22,
      10,
      partColor,
      5,
    )
    this.setRect(
      widgets.footRight,
      metrics.x + metrics.w - 40,
      metrics.y + metrics.h - 2,
      22,
      10,
      partColor,
      5,
    )
  },

  animatePet() {
    const save = this.state.save
    const metrics = this.state.pet
    if (!metrics || save.x === STAGE.EGG) return

    const ink = 0x13202a
    const blink = save.sl === 1 || this.state.frame === 0
    const eyeHeight = blink ? 3 : 11
    const step = save.sl === 1 ? 0 : this.state.frame % 2
    const widgets = this.state.widgets

    this.setRect(
      widgets.eyeLeft,
      metrics.x + 24,
      metrics.y + 37,
      9,
      eyeHeight,
      ink,
      3,
    )
    this.setRect(
      widgets.eyeRight,
      metrics.x + metrics.w - 33,
      metrics.y + 37,
      9,
      eyeHeight,
      ink,
      3,
    )
    this.setRect(
      widgets.footLeft,
      metrics.x + 18,
      metrics.y + metrics.h - 2 + step,
      22,
      10,
      BODY_COLORS[save.x],
      5,
    )
    this.setRect(
      widgets.footRight,
      metrics.x + metrics.w - 40,
      metrics.y + metrics.h - 1 - step,
      22,
      10,
      BODY_COLORS[save.x],
      5,
    )
  },

  renderBars() {
    const save = this.state.save
    const values = [
      ['h', save.h, 43, 0xffc857],
      ['m', save.m, 66, 0xe978a1],
      ['e', save.e, 89, 0x65c7f2],
    ]
    values.forEach((item) => {
      this.setRect(
        this.state.widgets[`bar_${item[0]}`],
        74,
        item[2],
        Math.max(1, Math.floor((250 * item[1]) / 100)),
        10,
        item[3],
        5,
      )
    })
  },

  render() {
    const save = this.state.save
    const snapshot = this.readSnapshot()
    const latest = save.d[save.d.length - 1]
    this.state.widgets.header.setProperty(hmUI.prop.MORE, {
      text: `${save.n} · ${stageName(save.x)} · ${ageText(save, snapshot.now)}`,
    })
    this.state.widgets.message.setProperty(hmUI.prop.MORE, {
      text: eventText(latest, save.n),
    })
    this.state.widgets.meta.setProperty(hmUI.prop.MORE, {
      text: `Passos ${save.st}  ·  Sono ${save.ss || '--'}  ·  FC ${save.hr || '--'}`,
    })
    this.state.widgets.sleep.setProperty(
      hmUI.prop.MORE,
      buttonProps(12, 339, save.sl === 1 ? 'ACORDAR' : 'DORMIR'),
    )
    this.renderBars()
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
        text: result.message,
      })
      return
    }
    syncSensors(this.state.save, snapshot, snapshot.now)
    this.persist()
    this.render()
  },

  tick() {
    this.state.frame = (this.state.frame + 1) % 8
    this.animatePet()
    if (this.state.frame !== 0) return

    const snapshot = this.readSnapshot()
    applyElapsed(this.state.save, snapshot.now)
    syncSensors(this.state.save, snapshot, snapshot.now)
    this.render()
  },

  persist() {
    if (this.state.save) savePet(this.state.save)
  },

  onHide() {
    this.persist()
  },

  onDestroy() {
    if (this.state.timerId) timer.stopTimer(this.state.timerId)
    this.persist()
  },
})

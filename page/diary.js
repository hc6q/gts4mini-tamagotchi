import { eventText, MAX_DIARY_EVENTS } from '../utils/game.js'
import { loadPet } from '../utils/storage.js'

const BG = 0x030604
const TEXT = 0xe7ffed
const GREEN = 0x8bf0a8
const DIM = 0x4e8b60
const PRESSED = 0x102a18

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
    text_style: hmUI.text_style.ELLIPSIS,
    text: '',
  }
}

Page({
  state: {
    save: null,
  },

  onInit() {
    const clock = hmSensor.createSensor(hmSensor.id.TIME)
    const utc = clock && clock.utc ? clock.utc : new Date().getTime()
    this.state.save = loadPet(Math.floor(utc / 1000))
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
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...textProps(18, 10, 300, 27, 18, TEXT, hmUI.align.LEFT),
      text: '> DIARIO.LOG',
    })
    hmUI.createWidget(hmUI.widget.TEXT, {
      ...textProps(18, 38, 300, 12, 12, DIM, hmUI.align.CENTER_H),
      text: '--------------------------------',
    })

    const diary = this.state.save.d.slice(-7).reverse()
    if (diary.length === 0) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...textProps(18, 150, 300, 30, 17, DIM, hmUI.align.CENTER_H),
        text: '> SEM EVENTOS',
      })
    }

    diary.forEach((item, index) => {
      const number = index < 9 ? `0${index + 1}` : `${index + 1}`
      hmUI.createWidget(hmUI.widget.TEXT, {
        ...textProps(18, 57 + index * 36, 300, 30, 15, index === 0 ? GREEN : DIM, hmUI.align.LEFT),
        text: `${number}> ${eventText(item, this.state.save.n)}`,
      })
    })

    hmUI.createWidget(hmUI.widget.TEXT, {
      ...textProps(18, 310, 300, 20, 13, DIM, hmUI.align.CENTER_H),
      text: `EVENTOS:${this.state.save.d.length}/${MAX_DIARY_EVENTS}`,
    })
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: 88,
      y: 344,
      w: 160,
      h: 30,
      radius: 0,
      normal_color: BG,
      press_color: PRESSED,
      color: GREEN,
      text_size: 15,
      text: '[ VOLTAR ]',
      click_func: () => hmApp.goBack(),
    })
  },
})

import { eventText } from '../utils/game.js'
import { loadPet } from '../utils/storage.js'

const BG = 0x0b1118
const TEXT = 0xf4f7fb
const MUTED = 0x93a4b8

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
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 336,
      h: 384,
      color: BG,
    })
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 48,
      y: 7,
      w: 240,
      h: 30,
      color: TEXT,
      text_size: 21,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      text: 'Diário compacto',
    })

    const diary = this.state.save.d.slice(-10).reverse()
    if (diary.length === 0) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 24,
        y: 120,
        w: 288,
        h: 40,
        color: MUTED,
        text_size: 18,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
        text_style: hmUI.text_style.NONE,
        text: 'Nenhum evento ainda.',
      })
    }

    diary.forEach((item, index) => {
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 18,
        y: 43 + index * 28,
        w: 300,
        h: 26,
        color: index === 0 ? TEXT : MUTED,
        text_size: 16,
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.CENTER_V,
        text_style: hmUI.text_style.ELLIPSIS,
        text: `${index + 1}. ${eventText(item, this.state.save.n)}`,
      })
    })

    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: 70,
      y: 337,
      w: 196,
      h: 39,
      radius: 10,
      normal_color: 0x26384b,
      press_color: 0x3b5874,
      color: TEXT,
      text_size: 17,
      text: 'VOLTAR',
      click_func: () => hmApp.goBack(),
    })
  },
})

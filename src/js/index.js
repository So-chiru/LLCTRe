let requestAudioSync
let requestAudioVolume = null

let LLCTLayers = ['setting_layer', 'switch_layer', 'call_layer']

dataYosoro.set('devMode', popsHeart.get('dev') != '')

let LLCT = {
  __pkg_callLists: [],
  __cur_filterLists: [],
  __playPointer: null,
  hideLayer: i => {
    document.querySelector('.contents_collection').classList.remove('overlayed')
    document.getElementById(LLCTLayers[i]).classList.remove('show')
    document.getElementById(LLCTLayers[i]).classList.add('hide')
    document.querySelector(
      '#' + LLCTLayers[i] + ' .layerContent'
    ).style.transform = 'scale(1.2)'

    if (!yohaneNoDOM.noPLUI && !dataYosoro.get('doNotUseMusicPlayer')) {
      yohaneNoDOM.shokan(true)
    }
  },
  showLayer: i => {
    document.querySelector('.contents_collection').classList.add('overlayed')
    document.getElementById(LLCTLayers[i]).classList.remove('hide')
    document.getElementById(LLCTLayers[i]).classList.add('show')
    document.querySelector(
      '#' + LLCTLayers[i] + ' .layerContent'
    ).style.transform = 'scale(1.0)'
    if (!yohaneNoDOM.noPLUI) yohaneNoDOM.giran(true)
  },
  clearCache: () => {
    navigator.serviceWorker.controller.postMessage({ cmd: '_clrs' })
  },
  jumpToPageDialog: () => {
    var __askd_result = prompt(
      '이동 할 페이지를 입력 해 주세요. ( ' +
        (pageAdjust.currentPage + 1) +
        ' / ' +
        pageAdjust.lists.length +
        ' )',
      pageAdjust.currentPage + 1
    )
    if (typeof __askd_result === 'undefined' || isNaN(__askd_result)) return 0
    pageAdjust.setPage(Number(__askd_result) - 1)
  },
  setTitleTo: t => {
    document.getElementById('p_title').innerHTML = t
  },
  /**
   * selectGroup: 리스트에 표시할 그룹을 표시합니다.
   * @param {String} i 그룹의 Index. 0: 뮤즈, 1: 아쿠아, 2: 니지가사키
   * @param {Boolean} notLayer 레이어가 아닌지에 대한 여부
   * @param {Boolean} auto 자동으로 실행되었는지 (pid에 따른 자동 그룹 선택 방지)
   */
  selectGroup: (i, notLayer, auto) => {
    LLCT.__cur_selectedGroup = Object.keys(LLCT.fullMetaData)[i]
    LLCT.__pkg_callLists =
      LLCT.fullMetaData[LLCT.__cur_selectedGroup].collection
    LLCT.__playPointer = null
    LLCT.__cur_filterLists =
      LLCT.fullMetaData[LLCT.__cur_selectedGroup].collection

    var groupSelection = document.getElementById('group_selection_btn')
    groupSelection.innerHTML = LLCT.__cur_selectedGroup
    groupSelection.dataset.group = LLCT.__cur_selectedGroup

    pageAdjust.buildPage()

    if (!auto) {
      dataYosoro.set('lastGroup', i)
    }
    if (!notLayer) {
      LLCT.hideLayer(1)
    }
  },
  currentPage: 0,
  openCall: id => {
    var currentCall = LLCT.getFromLists(id)

    if (typeof currentCall[1] === 'undefined') {
      Popup.show(null, '해당 곡은 콜표가 존재하지 않습니다.')

      return false
    }

    if (currentCall[1].karaoke) {
      return LLCT.openKaraokePopup(id)
    }

    return LLCT.openCallImage(id)
  },
  openKaraokePopup: (id, call_object) => {
    if (typeof call_object !== 'object') {
      call_object = LLCT.getFromLists(id)
    }

    document.getElementById('popup_kara_title').innerHTML = call_object[0]

    var popupKaraInstance = new Karaoke(
      document.getElementById('popup_karaoke')
    )

    fetch('./data/' + id + '/karaoke.json')
      .then(res => {
        res.json().then(v => {
          popupKaraInstance.karaokeData = v
          popupKaraInstance.RenderDOM(dataYosoro.get('romaji'))
        })
      })
      .catch(e => {
        return logger.error(2, 'r', 'Failed to load karaoke file. : ' + e.stack)
      })

    LLCT.showLayer(2)
  },
  openCallImage: id => {
    var pElement = document.getElementById('ps_wp')
    var webpI = webpSupports() ? 'webp' : 'png'

    // TODO : 반응형 이미지 크기
    var items = [
      {
        src: './data/' + id + '/call.' + webpI,
        w: 3232,
        h: 2100
      }
    ]
    window.DCGall = new PhotoSwipe(pElement, PhotoSwipeUI_Default, items, {
      index: 0
    })
    window.DCGall.init()
    window.DCGall.listen('destroy', () => {
      popsHeart.set('pid', '')
    })
  },
  loadCallImage: id => {
    yohaneNoDOM.hideLyrics()
    var webpI = webpSupports() ? 'webp' : 'png'

    var callImage = document.createElement('img')
    callImage.className = 'call_img'
    callImage.onclick = () => {
      LLCT.openCallImage(id)
    }
    callImage.src = './data/' + id + '/call.' + webpI
    callImage.onload = () => {
      yohaneNoDOM.showLyrics()
    }
    callImage.onerror = e => {
      yohaneNoDOM.showError(e)
      callImage.style.display = 'none'
    }

    document.getElementById('karaoke').appendChild(callImage)
    yohaneNoDOM.shokan()
  },
  loadLyrics: (id, use_local_data) => {
    yohaneNoDOM.hideLyrics()
    yohaneNoDOM.shokan()

    if (use_local_data) {
      KaraokeInstance.karaokeData = JSON.parse(dataYosoro.get('previewSync'))
      KaraokeInstance.RenderDOM(dataYosoro.get('romaji'))
      yohaneNoDOM.showLyrics()
      return
    }

    fetch('./data/' + id + '/karaoke.json')
      .then(res => {
        if (!res.ok) throw new Error('Fetch Failed.')
        res.json().then(v => {
          KaraokeInstance.karaokeData = v
          KaraokeInstance.RenderDOM(dataYosoro.get('romaji'))
          yohaneNoDOM.showLyrics()
        })
      })
      .catch(e => {
        yohaneNoDOM.showError()
        return logger.error(2, 'r', 'Failed to load karaoke file. : ' + e.stack)
      })
  },
  loadLists: () => {
    fetch('./data/lists.json').then(res => {
      res.json().then(v => {
        LLCT.fullMetaData = v
        document.getElementById('loading_spin_ctlst').classList.add('done')
        if (popsHeart.get('pid') !== null && popsHeart.get('pid') !== '') {
          LLCT.selectGroup(popsHeart.get('pid').substring(0, 1), true, true)
          yohane.initialize(popsHeart.get('pid'))

          if (!dataYosoro.get('doNotUseMusicPlayer')) {
            yohaneNoDOM.dekakuni()
          }
          return
        } else if (
          popsHeart.get('preview-sync') !== null &&
          popsHeart.get('preview-sync') !== ''
        ) {
          LLCT.selectGroup(
            popsHeart.get('preview-sync').substring(0, 1),
            true,
            true
          )
          yohane.initialize(popsHeart.get('preview-sync'), true)
          yohaneNoDOM.dekakuni()
          return
        }
        // 마지막으로 선택한 그룹이 있는지에 대한 여부입니다.
        var NoLastGroup =
          dataYosoro.get('lastGroup') == null ||
          typeof dataYosoro.get('lastGroup') === 'undefined'
        LLCT.selectGroup(NoLastGroup ? 1 : dataYosoro.get('lastGroup'), true)
      })
    })
  },
  getFromLists: id => {
    let len = LLCT.__pkg_callLists.length
    for (var i = 0; len; i++) {
      var vi = LLCT.__pkg_callLists[i]
      if (vi.id != id) continue

      return [vi.title, vi, i]
    }
  }
}

let yohaneNoDOM = {
  kaizu: false,
  noPLUI: true,
  shokan: ui_only => {
    yohaneNoDOM.noPLUI = false
    var playerElement = document.querySelector('llct-pl')
    playerElement.style.transition = 'all 0.7s cubic-bezier(0.19, 1, 0.22, 1)'
    playerElement.classList.remove('hide')
    playerElement.classList.add('show')
    if (yohaneNoDOM.kaizu) {
      yohaneNoDOM.dekakuni()
    }
  },
  giran: ui_only => {
    var playerElement = document.querySelector('llct-pl')
    playerElement.style.transition =
      'all 0.7s cubic-bezier(0.165, 0.84, 0.44, 1)'
    playerElement.classList.remove('show')
    playerElement.classList.add('hide')
    if (yohaneNoDOM.kaizu) {
      yohaneNoDOM.chiisakuni()
    }

    yohane.currentSong = null

    if (!ui_only) {
      if (popsHeart.get('preview-sync')) {
        popsHeart.set('preview-sync', '')
      }

      popsHeart.set('pid', '')
      document.title = 'LLCT'
    }
  },
  __cachedElement: {},
  end: () => yohaneNoDOM.pause(),
  registerBufferBar: () => {
    yohaneNoDOM.__cachedElement['bar_eventListen'].classList.add('__buf')
    Sakurauchi.delisten('canplaythrough', 'a', yohane.player())
    Sakurauchi.listen(
      'canplaythrough',
      () => {
        yohaneNoDOM.__cachedElement['bar_eventListen'].classList.remove('__buf')
      },
      yohane.player()
    )
  },
  dekakuOnce: target => {
    if (
      /material\-icons/g.test(target.className) ||
      /__progress/g.test(target.className)
    ) {
      return 0
    }
    if (!yohaneNoDOM.kaizu) {
      yohaneNoDOM.dekakuni()
    }
  },
  toggleKaizu: () => {
    yohaneNoDOM.kaizu ? yohaneNoDOM.chiisakuni() : yohaneNoDOM.dekakuni()
  },
  dekakuni: () => {
    var pl_bg = document.getElementById('pl_bg')
    pl_bg.classList.add('show')
    yohaneNoDOM.noPLUI = false
    document.querySelector('llct-pl').classList.add('dekai')
    yohaneNoDOM.kaizu = true
    document.getElementsByTagName('body')[0].style.overflow = 'hidden'
    pl_bg.style.opacity = 1
    KaraokeInstance.clearSync()
    try {
      KaraokeInstance.AudioSync(yohane.timecode(), true)
    } catch (e) {
      logger.warn(1, 'r', 'AudioSync failed. might timeline data is not ready?')
    }
    Sakurauchi.run('LLCTPlayerDekaku')
  },
  hideLyrics: () => {
    document.getElementById('lyrics_wrap').classList.add('hiddenCurtain')
    document.getElementById('lyrics_wrap_inner').classList.add('hiddenCurtain')
  },
  showLyrics: () => {
    document.getElementById('lyrics_wrap').classList.remove('hiddenCurtain')
    document
      .getElementById('lyrics_wrap_inner')
      .classList.remove('hiddenCurtain')
  },
  showError: () => {
    yohaneNoDOM.showLyrics()
    document.getElementById('_of_ric').style.display = 'block'
  },

  chiisakuni: () => {
    var pl_bg = document.querySelector('llct-pl-bg')
    pl_bg.classList.remove('show')
    pl_bg.style.opacity = '0'
    document.querySelector('llct-pl').classList.remove('dekai')
    yohaneNoDOM.kaizu = false
    document.getElementsByTagName('body')[0].style.overflow = 'auto'
  },
  play: () => {
    anime({
      targets: '#pp_btn',
      rotate: 60,
      opacity: 0,
      delay: 0,
      duration: 150,
      easing: 'easeInExpo',
      begin: a => {},
      complete: a => {
        document.getElementById('pp_btn').innerHTML = 'pause'
        yohaneNoDOM.play_seqT()
      }
    })
  },
  play_seqT: () => {
    anime({
      targets: '#pp_btn',
      rotate: 360,
      opacity: 1,
      delay: 0,
      duration: 200,
      easing: 'easeOutExpo',
      begin: a => {
        a.seek(0.3)
      },
      complete: a => {
        document.getElementById('pp_btn').style.transform = 'rotate(0deg);'
      }
    })
  },
  __pzAnime: null,
  pause: () => {
    if (yohaneNoDOM.__pzAnime != null) return 0
    yohaneNoDOM.__pzAnime = anime({
      targets: '#pp_btn',
      rotate: -60,
      opacity: 0,
      delay: 0,
      duration: 150,
      easing: 'easeInExpo',
      begin: a => {},
      complete: a => {
        document.getElementById('pp_btn').innerHTML = 'play_arrow'
        yohaneNoDOM.pause_seqT()
      }
    })
  },
  pause_seqT: () => {
    yohaneNoDOM.__pzAnime = anime({
      targets: '#pp_btn',
      rotate: 360,
      opacity: 1,
      delay: 0,
      duration: 100,
      easing: 'easeOutExpo',
      begin: a => {
        a.seek(0.3)
      },
      complete: a => {
        yohaneNoDOM.__pzAnime = null
        document.getElementById('pp_btn').style.transform = 'rotate(0deg);'
      }
    })
  },
  tickIcon: v => {
    var is_dark = /dark/.test(
      document.getElementsByTagName('body')[0].className
    )
    anime({
      targets: '#tick_btn',
      keyframes: [
        { translateX: 2, rotate: '-10deg' },
        { translateX: -2, rotate: '10deg' },
        { translateX: 2, rotate: '-10deg' },
        { translateX: -2, rotate: '10deg' },
        { translateX: 0, rotate: '0deg' }
      ],
      color: v
        ? is_dark
          ? '#ddd'
          : '#737373'
        : is_dark
        ? '#6b6b6b'
        : '#c4c4c4',
      delay: 0,
      duration: 300,
      easing: 'easeOutExpo'
    })
  },
  load: () => {},
  loadDone: () => {},
  loopToggle: () => {
    if (yohane.is_repeat) {
      document.getElementById('pl_loop').innerHTML = 'loop'
    }
    document
      .getElementById('pl_loop')
      .classList[yohane.is_shuffle || yohane.is_repeat ? 'remove' : 'add'](
        'in_active'
      )
  },
  playingNextToggle: () => {
    if (yohane.is_shuffle) {
      document.getElementById('pl_loop').innerHTML = 'shuffle'
    }
    document
      .getElementById('pl_loop')
      .classList[yohane.is_shuffle || yohane.is_repeat ? 'remove' : 'add'](
        'in_active'
      )
  },
  noLoopIcon: () => {
    document.getElementById('pl_loop').innerHTML = 'loop'
    document.getElementById('pl_loop').classList.add('in_active')
  },
  initialize: (id, use_local_data) => {
    if (popsHeart.get('pid') !== id.toString() && !use_local_data) {
      popsHeart.set('pid', id)
    }
    document.getElementById('_of_ric').style.display = window.navigator.onLine
      ? 'none'
      : 'block'
    if (dataYosoro.get('notUsingMP')) return 0
    ;[
      'played_time',
      'left_time',
      'bar_eventListen',
      'psd_times',
      '__current_thumb'
    ].forEach(v => {
      yohaneNoDOM.__cachedElement[v] = document.getElementById(v)
    })
    yohaneNoDOM.__cachedElement['psd_times'].style.width = '0px'
    yohaneNoDOM.__cachedElement['__current_thumb'].style.transform = 0
    yohaneNoDOM.load()
    yohaneNoDOM.registerBufferBar()
    document.getElementById('karaoke').innerHTML = ''
    var meta = LLCT.getFromLists(id)

    var album_meta = document.getElementById('album_meta')
    webpSupports().then(v => {
      var webpSp = v ? 'webp' : 'png'

      if (dataYosoro.get('sakana') === true) {
        album_meta.src = './data/' + id + '/bg.' + webpSp
      } else {
        album_meta.src = '/live_assets/1px.png'
        album_meta.style.backgroundColor = dataYosoro.get('yohane')
          ? '#323232'
          : '#D0D0D0'
      }
    })

    var artistText =
      LLCT.fullMetaData[LLCT.__cur_selectedGroup].meta.artists[
        meta[1].artist != null ? meta[1].artist : 0
      ]
    document.getElementById('title_meta').innerText = dataYosoro.get('devMode')
      ? '#' + id
      : dataYosoro.get('mikan') === true
      ? meta[1].translated || meta[0]
      : meta[0]
    document.getElementById('artist_meta').innerText = artistText
    document.getElementById('artist_meta').title = artistText

    document.getElementById('blade_color').innerText =
      meta[1].bladeColor || '자유'

    var _hx = meta[1].bladeColorHEX
    document.getElementById('blade_color').style.backgroundColor =
      _hx != null && _hx != 'null' && _hx != '#000000' && _hx != ''
        ? _hx + '55'
        : dataYosoro.get('yohane')
        ? '#FFFFFF55'
        : '#00000055'

    document
      .getElementById('prv_warn')
      .classList[popsHeart.get('preview-sync') ? 'add' : 'remove'](
        'llct-pl-infdp'
      )
    document
      .getElementById('sing_tg')
      .classList[meta[1].singAlong ? 'add' : 'remove']('llct-pl-infdp')
    document
      .getElementById('furicopy_tg')
      .classList[meta[1].furiCopy ? 'add' : 'remove']('llct-pl-infdp')
    document
      .getElementById('performed_tg')
      .classList[meta[1].notPerformed ? 'add' : 'remove']('llct-pl-infdp')
    document.title = meta[1].kr || meta[0] || '제목 미 지정'

    Sakurauchi.run('audioLoadStart', [
      meta[1].kr || meta[0],
      artistText,
      meta[1]
    ])

    Sakurauchi.run('audioInit', [meta[1].kr || meta[0], artistText, meta[1]])

    LLCT[
      (meta[1].karaoke && dataYosoro.get('interactiveCall') != false) ||
      use_local_data
        ? 'loadLyrics'
        : 'loadCallImage'
    ](id, use_local_data)
  }
}

let yohane = {
  shokan: () => {
    yohaneNoDOM.shokan(ui_only)
    if (!ui_only) {
      yohane.play()
    }
  },
  giran: ui_only => {
    yohaneNoDOM.giran(ui_only)
    if (!ui_only) {
      yohane.pause()
    }
  },
  volumeStore: null,
  currentSong: null,
  prev: skipDekaku => {
    if (!LLCT.__playPointer) {
      LLCT.__playPointer = LLCT.__cur_filterLists.length - 1
    }
    LLCT.__playPointer =
      (LLCT.__playPointer - 1 + LLCT.__cur_filterLists.length) %
      LLCT.__cur_filterLists.length
    yohane.loadPlay(LLCT.__cur_filterLists[LLCT.__playPointer].id, skipDekaku)
  },
  next: skipDekaku => {
    if (!LLCT.__playPointer) {
      LLCT.__playPointer = 0
    }
    LLCT.__playPointer =
      (LLCT.__playPointer + 1) % LLCT.__cur_filterLists.length
    yohane.loadPlay(LLCT.__cur_filterLists[LLCT.__playPointer].id, skipDekaku)
  },
  shuffle: skipDekaku => {
    var id = (Math.random() * LLCT.__cur_filterLists.length) << 0
    LLCT.__playPointer = id

    yohane.loadPlay(LLCT.__cur_filterLists[id].id, skipDekaku)
  },
  setVolume: v => {
    yohane.volumeStore = v
    yohane.player().volume = v
  },
  pl_cc: null,
  player: () => {
    if (!yohane.pl_cc) {
      yohane.pl_cc = document.getElementById('kara_audio')
    }
    return yohane.pl_cc
  },
  is_repeat: false,
  is_shuffle: false,
  repeatToggle: () => {
    yohane.is_repeat = !yohane.is_repeat
    yohaneNoDOM.loopToggle()
  },
  playNextToggle: () => {
    yohane.is_shuffle = !yohane.is_shuffle
    yohaneNoDOM.playingNextToggle()
  },
  toggleLoops: () => {
    if (!yohane.is_repeat && !yohane.is_shuffle) {
      anime({
        targets: '#pl_loop',
        rotate: '-360deg',
        delay: 0,
        duration: 600,
        easing: 'easeOutExpo',
        complete: a => {
          document.getElementById('pl_loop').style.transform = ''
        }
      })
      yohane.repeatToggle()
      return
    }
    if (yohane.is_repeat && !yohane.is_shuffle) {
      yohane.repeatToggle()
      yohane.playNextToggle()

      anime({
        targets: '#pl_loop',
        rotate: '360deg',
        delay: 0,
        duration: 600,
        easing: 'easeOutExpo',
        complete: a => {
          document.getElementById('pl_loop').style.transform = ''
        }
      })
      return
    }
    if (!yohane.is_repeat && yohane.is_shuffle) {
      yohane.playNextToggle()
      yohaneNoDOM.noLoopIcon()
      anime({
        targets: '#pl_loop',
        rotate: '0deg',
        delay: 0,
        duration: 600,
        easing: 'easeOutExpo'
      })
    }
  },
  __vAnimeFunc: () => {},
  fade: (from, to, duration, start, cb) => {
    if (requestAudioVolume !== null) cancelAnimationFrame(requestAudioVolume)
    var oncdPrevVolume = yohane.player().volume / 2
    yohane.__vAnimeFunc = force_stop => {
      if (
        start + duration <= performance.now() ||
        force_stop === true ||
        oncdPrevVolume === yohane.player().volume ||
        document.hidden
      ) {
        cancelAnimationFrame(requestAudioVolume)
        if (typeof cb === 'function') cb()
        return
      }
      requestAudioVolume = requestAnimationFrame(yohane.__vAnimeFunc)
      var t = (start + duration - performance.now()) / duration
      if (from > to) {
        yohane.player().volume = from * t
      } else {
        yohane.player().volume = to * (1 - t)
      }
    }
    yohane.__vAnimeFunc()
  },
  toggle: () => {
    yohane[!yohane.playing() ? 'play' : 'pause']()
  },
  playing: () => !yohane.player().paused,
  timecode: () => yohane.player().currentTime * 100,
  seekTo: zto => {
    if (yohane.playing()) yohane.pause(false, true)
    yohane.player().currentTime = yohane.player().duration * (zto / 100)
    yohane.player().volume = yohane.volumeStore
    yohane.play(true)
  },
  seekPrev: s => {
    yohane.player().currentTime =
      yohane.player().currentTime - s < 0 ? 0 : yohane.player().currentTime - s
  },
  seekNext: s => {
    yohane.player().currentTime =
      yohane.player().currentTime + s > yohane.player().duration
        ? (yohane.player().duration - yohane.player().currentTime) / 2
        : yohane.player().currentTime + s
  },
  volumeDown: s =>
    yohane.setVolume(
      yohane.player().volume - s < 0 ? 0 : yohane.player().volume - s
    ),
  volumeUp: s =>
    yohane.setVolume(
      yohane.player().volume + s > 1 ? 1 : yohane.player().volume + s
    ),
  play: force => {
    if (navigator.mediaSession) {
      var meta = LLCT.getFromLists(
        popsHeart.get('preview-sync') || popsHeart.get('pid')
      )
      LLCT.__playPointer = meta[2]
      var artistText =
        LLCT.fullMetaData[LLCT.__cur_selectedGroup].meta.artists[
          meta[1].artist != null ? meta[1].artist : 0
        ]
      navigator.mediaSession.playbackState = 'playing'
      Sakurauchi.run('audioLoadStart', [
        meta[1].kr || meta[0],
        artistText,
        meta[1]
      ])
    }

    yohane.player().play()

    if (force) return 0
    yohane.fade(0, yohane.volumeStore, 150, performance.now(), () => {})
  },
  pause: (returnZero, force) => {
    yohaneNoDOM.pause()
    if (navigator.mediaSession) {
      navigator.mediaSession.playbackState = 'paused'
    }
    if (force) return yohane.player()[returnZero ? 'stop' : 'pause']()
    yohane.fade(yohane.player().volume, 0, 150, performance.now(), () => {
      yohane.player()[returnZero ? 'stop' : 'pause']()
    })
  },
  tick: _ => {
    if (!yohane.playing()) {
      cancelAnimationFrame(requestAudioSync)
      return
    }
    requestAudioSync = requestAnimationFrame(yohane.tick)
    if (
      yohaneNoDOM.kaizu &&
      typeof KaraokeInstance.karaokeData !== 'undefined' &&
      KaraokeInstance.karaokeData !== null &&
      KaraokeInstance.karaokeData.timeline
    ) {
      KaraokeInstance.AudioSync(yohane.timecode())
    }
    var _ct = yohane.player().currentTime
    var _dr = yohane.player().duration
    if (yohane.tickVal % 2 === 0) {
      var calc_t = _ct / _dr
      yohaneNoDOM.__cachedElement.psd_times.style.width = calc_t * 100 + '%'
      yohaneNoDOM.__cachedElement.__current_thumb.style.transform =
        'translateX(' + yohane.__tickCaching._clw * calc_t + 'px)'
    }
    if (yohane.tickVal == null || yohane.tickVal > 16) {
      yohane.tickVal = 0
      yohane.deferTick(_ct, _dr)
    }
    yohane.tickVal++
  },
  __tickCaching: {},
  deferTick: (_ct, _dr) => {
    if (yohane.__tickCaching._clw == null) {
      yohane.__tickCaching._clw =
        yohaneNoDOM.__cachedElement.bar_eventListen.clientWidth
    }
    yohaneNoDOM.__cachedElement['played_time'].innerHTML = numToTS(_ct) || '??'
    yohaneNoDOM.__cachedElement['left_time'].innerHTML =
      '-' + (numToTS(_dr - _ct) || '??')
  },
  initialize: (id, use_local_data) => {
    if (id === yohane.currentSong) {
      yohaneNoDOM.dekakuni()
      return false
    }

    yohane.currentSong = id
    KaraokeInstance.karaokeData = null
    yohaneNoDOM.initialize(id, use_local_data)

    if (dataYosoro.get('notUsingMP')) {
      LLCT.openCall(id)
      return false
    }

    try {
      yohane.player().src = './data/' + id + '/audio.mp3'
      yohane.setVolume(yohane.volumeStore !== null ? yohane.volumeStore : 0.5)
    } catch (e) {
      return logger.error(2, 'r', e.message)
    }

    if (yohane.player().playbackRate) {
      yohane.player().playbackRate =
        dataYosoro.get('fastCall') == true ? 1.5 : 1
    }

    yohane.__tickCaching = {}
    return true
  },
  loadPlay: (id, skipDekaku) => {
    if (yohane.initialize(id)) {
      yohane.play()

      if (dataYosoro.get('doNotUseMusicPlayer') !== true && !skipDekaku) {
        yohaneNoDOM.dekakuni()
      }
    }
  }
}
let pageAdjust = {
  lists: [],
  onePageItems: 12,
  currentPage: 0,
  clis_elem: null,
  add: item => {
    if (pageAdjust.lists.length === 0) {
      pageAdjust.lists[0] = [item]
      return
    }
    for (var i = 0; i < pageAdjust.lists.length; i++) {
      if (typeof pageAdjust.lists[i] === 'undefined') {
        pageAdjust.lists[i] = []
        continue
      }
      if (pageAdjust.lists[i].length >= pageAdjust.onePageItems) {
        if (typeof pageAdjust.lists[i + 1] === 'undefined') {
          pageAdjust.lists[i + 1] = []
        }
        continue
      }
      pageAdjust.lists[i].push(item)
    }
  },
  render: pg => {
    if (!pageAdjust.clis_elem) {
      pageAdjust.clis_elem = document.getElementById('card_lists')
    }
    pageAdjust.clis_elem.innerHTML = ''
    if (!pg) pg = 0
    var docFrag = document.createDocumentFragment()
    for (var i = 0, ls = pageAdjust.lists[pg].length; i <= ls; i++) {
      if (typeof pageAdjust.lists[pg][i] !== 'undefined') {
        var pgI = pageAdjust.lists[pg][i]
        docFrag.appendChild(pgI)
        pgI.style.animationDelay = (i + 1) * 25 + 'ms'
      }
    }
    pageAdjust.clis_elem.appendChild(docFrag)
    if (window.LazyLoad) {
      window.nLazy = new LazyLoad({
        elements_selector: '.lazy',
        class_loaded: 'llct_loaded'
      })
    }
    document.getElementById('totalPage').innerHTML = pageAdjust.lists.length
  },
  buildPage: () => {
    var webpI = webpSupports() ? 'webp' : 'png'
    pageAdjust.lists = []

    let filterLen = LLCT.__cur_filterLists.length
    for (var i = 0; i < filterLen; i++) {
      var curObj = LLCT.__cur_filterLists[i]
      var baseElement = document.createElement('llct-card')
      baseElement.className = 'slide-right'
      baseElement.setAttribute(
        'onclick',
        'yohane.loadPlay("' + curObj.id + '")'
      )
      var c = document.createDocumentFragment()
      if (dataYosoro.get('sakana') === true) {
        var artImage = document.createElement('img')
        artImage.style = 'background-color: #323232;'
        artImage.id = curObj.id + '_bgimg'
        artImage.alt = curObj.title
        artImage.className = 'lazy card_bg'
        artImage.dataset.src = dataYosoro.get('devMode')
          ? 'data/10001/bg.' + webpI
          : './data/' + curObj.id + '/bg.' + webpI
        c.appendChild(artImage)
      } else {
        baseElement.style.backgroundColor = dataYosoro.get('yoshiko')
          ? '#000'
          : '#323232'
      }

      var in_text = dataYosoro.get('devMode')
        ? '#' + curObj.id + '_DEV'
        : dataYosoro.get('mikan') === true
        ? curObj.translated || curObj.title
        : curObj.title
      var titleText = document.createElement('h3')
      titleText.className = 'txt'
      titleText.innerText = in_text
      c.appendChild(titleText)
      baseElement.appendChild(c)
      pageAdjust.add(baseElement)
    }
    pageAdjust.setPage(0)
  },
  setPage: s => {
    if (s >= pageAdjust.lists.length || s < 0) {
      return 0
    }
    pageAdjust.currentPage = s
    pageAdjust.render(pageAdjust.currentPage)
    document.getElementById('currentPage').innerHTML =
      pageAdjust.currentPage + 1
  },
  nextPage: () => {
    return pageAdjust.setPage(pageAdjust.currentPage + 1)
  },
  prevPage: () => {
    return pageAdjust.setPage(pageAdjust.currentPage - 1)
  }
}
const resizeItemsCheck = () => {
  if (window.matchMedia('(min-width: 1501px)').matches) return 12
  if (window.matchMedia('(max-width: 1500px) and (min-width: 801px)').matches) {
    return 8
  }
  if (window.matchMedia('(max-width: 800px)').matches) return 6

  return 4
}
// 키를 누를때 동작할 함수들을 미리 지정합니다.
const keys = {
  27: [e => yohaneNoDOM.chiisakuni(), false],
  32: [e => yohane.toggle(), true],
  37: [e => yohane.seekPrev(5), true],
  38: [e => yohane.volumeUp(0.05), true],
  39: [e => yohane.seekNext(5), true],
  40: [e => yohane.volumeDown(0.05), true]
}
// 키가 입력 되었을 때 키를 입력합니다.
Sakurauchi.listen('keydown', ev => {
  if (typeof keys[ev.keyCode] === 'undefined') return 0
  keys[ev.keyCode][0](ev)
  if (keys[ev.keyCode][1]) ev.preventDefault()
})
// Karaoke 관련 Initialize
Sakurauchi.add('LLCTDOMLoad', () => {
  try {
    window.KaraokeInstance = new Karaoke(document.getElementById('karaoke'))
    document.querySelector('llct-pl').onclick = ev => {
      yohaneNoDOM.dekakuOnce(ev.target)
    }
    KaraokeInstance.ListenClickEvent(function (instance, e) {
      document.getElementById('kara_audio').currentTime =
        instance.karaokeData.timeline[e.detail.posX].collection[e.detail.posY]
          .start_time /
          100 -
        0.03
    })
    Sakurauchi.listen(
      ['seeking', 'seeked'],
      () => {
        KaraokeInstance.tickSoundsCache = {}
        KaraokeInstance.clearSync(() => {
          KaraokeInstance.AudioSync(Math.floor(yohane.timecode()), true)
        })
      },
      yohane.player()
    )
    KaraokeInstance.tickSoundEnable =
      dataYosoro.get('biTick') == null ||
      typeof dataYosoro.get('biTick') === 'undefined'
        ? true
        : !!dataYosoro.get('biTick')
    yohane.player().onplay = () => {
      yohaneNoDOM.play()
      requestAnimationFrame(yohane.tick)
    }
    yohane.player().onended = () => {
      if (yohane.is_repeat) {
        yohane.seekTo(0)
        yohane.play()
        return
      }
      yohaneNoDOM.end()
      if (yohane.is_shuffle) {
        yohane.next(!yohane.kaizu)
      }
    }
    yohane.player().onpause = () => {
      yohaneNoDOM.pause(true)
      cancelAnimationFrame(yohane.tick)
    }
  } catch (e) {
    gtag('event', 'exception', {
      exDescription: e.message,
      exFatal: true
    })

    console.error(e)
  }
})
// 플레이어 관련
Sakurauchi.add('LLCTDOMLoad', () => {
  window.playerHammer = new Hammer(document.getElementById('dash_wrp_ham'))
  playerHammer.get('swipe').set({ direction: Hammer.DIRECTION_VERTICAL })
  playerHammer.get('pinch').set({ enable: true })
  playerHammer.on('swipe', ev => {
    if (ev.direction === 16) {
      yohaneNoDOM.kaizu ? yohaneNoDOM.chiisakuni() : yohane.giran()
    } else if (ev.direction === 8) {
      yohaneNoDOM.dekakuni()
    }
    document.querySelector('llct-pl').style.transform = null
  })
  var closeVal = 0
  var closeDir = 0
  var originCalc = null
  var domGPLBg = document.getElementById('pl_bg')
  var domGPLKa = document.querySelector('llct-pl')
  var __bak_style = 'all 0.7s cubic-bezier(0.19, 1, 0.22, 1) 0s'
  playerHammer.on('panstart', ev => {
    __bak_style = domGPLKa.style.transition
    domGPLKa.style.transition = 'unset'
    domGPLBg.classList.add('show')
    yohaneNoDOM.hideLyrics()
  })
  playerHammer.on('panend', ev => {
    yohaneNoDOM.showLyrics()
    domGPLKa.style.transition = __bak_style
    if (closeVal < -250) {
      yohaneNoDOM.dekakuni(true)
    } else if (closeVal > 250 && !closeDir) {
      yohaneNoDOM.chiisakuni(true)
    }
    domGPLKa.style.transform = null
    closeVal = 0
    closeDir = 0
    originCalc = null
    !yohaneNoDOM.kaizu && domGPLBg.classList.remove('show')
  })
  playerHammer.on('pan', ev => {
    if (!originCalc) {
      originCalc = domGPLKa.clientHeight
    }
    closeVal = ev.deltaY
    closeDir = ev.additionalEvent === 'panup'
    if (ev.additionalEvent == 'panup' || ev.additionalEvent == 'pandown') {
      var get_delta = (ev.deltaY < 0 ? window.innerHeight : 0) + ev.deltaY
      domGPLKa.style.transform =
        'translateY(' +
        (ev.deltaY < 0 ? Math.max(0, get_delta) : get_delta) +
        'px)'

      domGPLBg.style.opacity = yohaneNoDOM.kaizu
        ? 1 - ev.deltaY / window.innerHeight
        : 1 - (ev.deltaY / window.innerHeight + 1)
    }
  })
})

Sakurauchi.add('LLCTDOMLoad', () => {
  window.vertialMenusContext = new HugContext(
    document.getElementById('more_vertical_options')
  )
  document
    .getElementById('more_vertical_options')
    .addEventListener('click', ev => {
      vertialMenusContext.openContext(ev, true)
    })
  vertialMenusContext.addAction('openSettings', ev => {
    LLCT.showLayer(0)
  })
  vertialMenusContext.addAction('openCalendar', ev => {
    window.location.href = 'https://all.lovelivec.kr'
  })
  vertialMenusContext.addAction('shuffleMusic', ev => {
    yohane.shuffle()
  })

  window.addEventListener('popstate', ev => {
    if (!ev.state || !ev.state.pid) {
      return yohane.giran()
    }

    yohaneNoDOM.dekakuni()
    yohane.initialize(ev.state.pid)
  })
})

const search = keyword => {
  let lists = []

  document.getElementById('search_keyword').innerHTML = keyword

  if (keyword == '') {
    lists = LLCT.__pkg_callLists
  } else {
    keyword = keyword.toLowerCase().replace(/\s/g, '')
    LLCT.__pkg_callLists.forEach((obj, index) => {
      let score = 0

      let title = obj.title.toLowerCase().replace(/\s/g, '')
      if ((title.match(keyword) || []).length / title.length > 0) {
        score += 10 * ((title.match(keyword) || []).length / title.length)
      }

      let translated = (obj.translated || '__').toLowerCase().replace(/\s/g, '')
      if (
        translated !== '__' &&
        (translated.match(keyword) || []).length / translated.length > 0
      ) {
        score +=
          10 * ((translated.match(keyword) || []).length / translated.length)
      }

      let short_kr = (obj.short_kr || '__').toLowerCase().replace(/\s/g, '')
      if (
        short_kr !== '__' &&
        (short_kr.match(keyword) || []).length / short_kr.length > 0
      ) {
        score += 7 * ((short_kr.match(keyword) || []).length / short_kr.length)
      }

      if (obj.tags) {
        obj.tags.forEach(tag => {
          tag = tag.toLowerCase().replace(/\s/g, '')
          if ((tag.match(keyword) || []).length / tag.length > 0) {
            score += 5 * ((tag.match(keyword) || []).length / tag.length)
          }
        })
      }

      if (score > 0) {
        lists.push({
          ...obj,
          score
        })
      }
    })

    lists.sort((a, b) => b.score - a.score)
  }

  if (
    lists.length &&
    document.querySelector('.search_blank').className.indexOf('show') != -1
  ) {
    document.querySelector('.search_blank').classList.remove('show')
  }

  if (JSON.stringify(LLCT.__cur_filterLists) == JSON.stringify(lists)) {
    return
  }

  if (!lists.length) {
    document.querySelector('.search_blank').classList.add('show')
  }

  LLCT.__cur_filterLists = lists
  pageAdjust.buildPage()
}

// Tether 사용
document.addEventListener('DOMContentLoaded', () => {
  new Tether({
    element: document.getElementById('__context_frame'),
    target: document.getElementById('more_vertical_options'),
    attachment: 'top right',
    targetAttachment: 'top left'
  })

  // 검색 버튼
  document.querySelector('#search_btn').addEventListener('click', () => {
    document.querySelector('.search_container').classList.toggle('show')

    if (
      document.querySelector('.search_container').className.indexOf('show') !==
      -1
    ) {
      document.querySelector('#search_box').focus()
    }
  })
})
Sakurauchi.add('LLCTPGLoad', () => {
  // 카드 형 곡 선택 화면의 Swipe 감지
  window.selectorHammer = new Hammer(document.getElementById('fp_ct'))
  selectorHammer.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL })
  selectorHammer.on('swipe', ev => {
    pageAdjust[ev.direction === 2 ? 'nextPage' : 'prevPage']()
  })

  LLCT.loadLists()

  if (!window.navigator.onLine) {
    Popup.show(
      'offline_bolt',
      '오프라인 상태입니다. 미리 저장된 데이터를 사용합니다.'
    )
  }
  document.getElementById('genki_year').innerText = new Date().getFullYear()
  document.getElementById('zenkai_month').innerText = new Date().getMonth() + 1
  document.getElementById('day_day').innerText = new Date().getDate()
  document.getElementById('day').innerText = [
    '일',
    '월',
    '화',
    '수',
    '목',
    '금',
    '토'
  ][new Date().getDay()]
  Sakurauchi.add('tickSounds', vol_d => {
    var tickSound = document.getElementById('tick_sounds')
    tickSound.currentTime = 0
    tickSound.play()

    tickSound.volume = vol_d || 1
  })
  Sakurauchi.add('tickSoundChanged', v => {
    document
      .getElementById('tick_btn')
      .classList[v ? 'remove' : 'add']('in_active')

    yohaneNoDOM.tickIcon(v)

    dataYosoro.set('biTick', v)
  })
  Sakurauchi.run('tickSoundChanged', KaraokeInstance.tickSoundEnable)

  Sakurauchi.listen('audioInit', data => {
    gtag('event', 'play song', {
      event_category: 'audio',
      event_label: data[2].id
    })
  })

  Sakurauchi.listen('searched', data => {
    gtag('event', 'search', {
      search_term: data
    })
  })

  Sakurauchi.listen('audioLoadStart', data => {
    if (!navigator.mediaSession) return 0
    let titleData =
      dataYosoro.get('mikan') === true &&
      data[2].translated &&
      data[2].translated != data[0]
        ? data[2].translated + ' (' + data[0] + ')'
        : data[0]
    navigator.mediaSession.metadata = new MediaMetadata({
      title: titleData,
      artist: data[1],
      album: data[2].album || 'Single',
      artwork: [
        {
          src: 'https://lovelivec.kr/data/' + data[2].id + '/bg.png'
        }
      ]
    })
  })
  Sakurauchi.listen(
    'click',
    ev => {
      var vp = document
        .getElementById('bar_eventListen')
        .getBoundingClientRect()
      yohane.seekTo(((ev.clientX - vp.left) / vp.width) * 100)
    },
    document.getElementById('ctrl_times')
  )
  Sakurauchi.listen(
    'touchstart',
    () => {
      document.querySelector('llct-pl').className += ' hover'
    },
    document.querySelector('llct-pl'),
    { passive: true }
  )
  Sakurauchi.listen(
    'touchend',
    () => {
      document.querySelector('llct-pl').classList.remove('hover')
    },
    document.querySelector('llct-pl')
  )
  Sakurauchi.listen('focus', () => {
    if (!yohane.playing()) return 0
    KaraokeInstance.clearSync()
    KaraokeInstance.AudioSync(yohane.timecode(), true)
  })
  document.getElementById('lyrics_wrap').addEventListener(
    'scroll',
    () => {
      KaraokeInstance.autoScroll.update()
    },
    false
  )
  Sakurauchi.listen('blur', () => {
    if (yohane.__vAnimeFunc !== null && requestAudioVolume !== null) {
      yohane.__vAnimeFunc(true)
    }
  })
  Sakurauchi.listen('resize', resizeFunctions, window)
  pageAdjust.onePageItems = resizeItemsCheck()

  if (dataYosoro.get('piigi') && dataYosoro.get('sakana')) {
    var colorTheif = new ColorThief()
    var album_meta = document.getElementById('album_meta')
    album_meta.crossOrigin = 'Anonymous'
    var __cf_ng = ['217deg', '127deg', '336deg']
    album_meta.addEventListener('load', () => {
      var paletteData = colorTheif.getPalette(album_meta, 4)
      var fn_background = ''
      for (var i = 0; i < 3; i++) {
        if (paletteData == null) break
        var c = paletteData[i]
        fn_background +=
          'linear-gradient(' +
          __cf_ng[i] +
          ',rgba(' +
          c[0] +
          ', ' +
          c[1] +
          ',' +
          c[2] +
          ',0.8),rgba(0,0,0,0) 70.71%)' +
          (i < 2 ? ',' : '')
      }
      document.getElementById(
        'cl_layer_player'
      ).style.background = fn_background
    })
  }

  document.getElementById('curt').style.opacity = 0
  document.getElementById('curt').style.visibility = 'none'
  document.getElementById('curt').style.pointerEvents = 'none'
  document.getElementById('curt').style.zIndex = '-1'
})
let resizeFunctions = () => {
  var reszCk = resizeItemsCheck()
  if (pageAdjust.onePageItems !== reszCk) {
    pageAdjust.onePageItems = reszCk
    pageAdjust.buildPage()
  }
  pageAdjust.onePageItems = reszCk
  yohane.__tickCaching._clw = null
}
if (navigator.mediaSession) {
  navigator.mediaSession.setActionHandler('play', () => {
    yohane.play()
  })
  navigator.mediaSession.setActionHandler('pause', () => {
    yohane.pause()
  })
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    yohane.prev()
  })
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    yohane[yohane.is_shuffle ? 'shuffle' : 'next']()
  })
  navigator.mediaSession.setActionHandler('seekbackward', () => {
    yohane.seekPrev(5)
  })
  navigator.mediaSession.setActionHandler('seekforward', () => {
    yohane.seekNext(5)
  })
}

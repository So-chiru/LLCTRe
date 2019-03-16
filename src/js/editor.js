/* global WaveSurfer, $, Blob, location, FileReader, lastSaved, CustomEvent, selectWords, wavesurfer, logger, karaokeData, Karaoke, songID */
var wavTime
var flrsd
var audioSyncSleep = 0

var convertTime = function (input, separator) {
  var pad = function (input) {
    return input < 10 ? '0' + input : input
  }
  return [
    pad(Math.floor(input / 3600)),
    pad(Math.floor((input % 3600) / 60)),
    pad(Math.floor(input % 60))
  ].join(typeof separator !== 'undefined' ? separator : ':')
}

// 전부다 document.ready 이후 일어나야 할 일인가?
$(document).ready(() => {
  logger(1, 'r', 'event : document.ready', 'i')
  window.wavesurfer = WaveSurfer.create({
    container: '#waveform',
    plugins: [WaveSurfer.cursor.create({}), WaveSurfer.regions.create({})]
  })

  wavesurfer.on('ready', () => {
    logger(1, 'r', 'event : wavesurfer_ready', 'i')
    $('#duration').html(convertTime(wavesurfer.getDuration()))
    wavesurfer.toggleScroll()
    wavesurfer.zoom(20)
  })

  wavesurfer.on('audioprocess', () => {
    wavTime = wavesurfer.getCurrentTime()
    flrsd = Math.floor(wavTime * 100)
    $('#current_time').html(convertTime(wavTime))
    $('#frame_tick').html(flrsd)

    // TODO : 더 좋은 방식은 없을까?
    // CPU 사용량 제한
    if (audioSyncSleep < 14) {
      audioSyncSleep++
      return
    }
    audioSyncSleep = 0

    Karaoke.AudioSync(flrsd, true)
  })

  wavesurfer.on('seek', () => {
    Karaoke.AudioSync(Math.floor(wavesurfer.getCurrentTime() * 100), true)
  })

  var prv = false
  $(document).keydown(e => {
    logger(1, 's', 'KeyDown event : ' + e.which, 'i')
    var onceUpdated = false
    $('input[type="text"], input[type="number"], textarea').each((i, v) => {
      if (!onceUpdated) onceUpdated = $(v).is(':focus')
    })
    if (onceUpdated) return 0
    prv = false

    // TODO : Switch 리펙토링 (이: 구조가 마음에 안듬)
    switch (e.which) {
      case 32:
        prv = true
        wavesurfer.playPause()
        break
      case 37:
        prv = true
        wavesurfer.skip(-0.2)
        break
      case 87:
        KaraokeEditor.EditVal(
          'end_time',
          Math.floor(wavesurfer.getCurrentTime() * 100) +
            karaokeData.metadata.correction_time,
          e.altKey,
          e.shiftKey,
          true
        )
        break
      case 80:
        KaraokeEditor.EditVal(
          'pronunciation_time',
          Math.floor(wavesurfer.getCurrentTime() * 100) +
            karaokeData.metadata.correction_time,
          e.altKey,
          e.shiftKey,
          true
        )
        break
      case 83:
        KaraokeEditor.EditVal(
          'start_time',
          Math.floor(wavesurfer.getCurrentTime() * 100) +
            karaokeData.metadata.correction_time,
          e.altKey,
          e.shiftKey,
          true
        )
        break
      case 77:
        AudioMute()
        break
      case 39:
        prv = true
        wavesurfer.skip(0.2)
        break
      case 33:
        prv = true
        wavesurfer.skip(-30)
        break
      case 34:
        prv = true
        wavesurfer.skip(30)
        break
      case 36:
        prv = true
        wavesurfer.seekAndCenter(0)
        break
      case 18:
        prv = true
        Karaoke.startEndOpti()
        break
      case 35:
        prv = true
        wavesurfer.seekAndCenter(1)
        break
      default:
        break
    }

    if (prv) e.preventDefault()
  })

  wavesurfer.on('play', () => {
    logger(1, 'r', 'event : wavesurfer_play', 'i')
    $('#playpause_audio').html('<i class="material-icons ds">pause_arrow</i>')
  })

  wavesurfer.on('pause', () => {
    logger(1, 'r', 'event : wavesurfer_pause', 'i')
    $('#playpause_audio').html('<i class="material-icons">play_arrow</i>')
  })

  wavesurfer.on('mute', isMute => {
    logger(1, 'r', 'event : wavesurfer_mute > ' + isMute, 'i')
    $('#mute_indi').html(
      '<i class="material-icons">' +
        (isMute ? 'volume_off' : 'volume_up') +
        '</i>'
    )
  })

  $('#stop_audio').click(() => {
    wavesurfer.stop()
  })

  $('#fInput').on('change', () => {
    KaraokeEditor.Import()
  })

  if (urlQueryParams('id') !== 'undefined') {
    window.songID = urlQueryParams('id')

    wavesurfer.load(
      (urlQueryParams('local') !== null ? './' : 'https://cdn.lovelivec.kr/') +
        'data/' +
        songID +
        '/audio.mp3'
    )
    wavesurfer.play()
  }

  window.karaokeData = { metadata: { correction_time: -10 }, timeline: [] }
  window.lastSaved = JSON.stringify(karaokeData.timeline)
  window.selectWords = []
  var valElementObject = {
    '#start_time_val': 'start_time',
    '#end_time_val': 'end_time',
    '#pron_time_val': 'pronunciation_time',
    '#type_val': 'type',
    '#ruby_text_val': 'ruby_text'
  }

  Sakurauchi.add('KaraokeLoaded', () => {
    if (typeof karaokeData.metadata.correction_time === 'undefined') {
      karaokeData.metadata.correction_time = -10
    }
  })

  Sakurauchi.add('KaraokeSelection', e => {
    var alreadyExists = false
    selectWords.forEach((v, i) => {
      if (JSON.stringify(v) === JSON.stringify(e.detail)) {
        alreadyExists = true
        selectWords.splice(i, 1)
      }
    })

    if (!alreadyExists) {
      selectWords.push(e.detail)
    }

    if (selectWords.length > 0) {
      Object.keys(valElementObject).forEach(_ =>
        $(_).val(
          karaokeData.timeline[e.detail.posX].collection[e.detail.posY][
            valElementObject[_]
          ]
        )
      )
    }

    $(e.detail.element).toggleClass('WordSelected', !alreadyExists)

    Object.keys(valElementObject).forEach(_ =>
      $(_).attr('disabled', selectWords.length < 1)
    )
  })
})

$(window).bind('beforeunload', () => {
  if (lastSaved !== JSON.stringify(karaokeData.timeline)) {
    return 'Export 하지 못한 데이터가 있습니다. 그래도 나갈까요?'
  }
})

var urlQueryParams = function (name) {
  name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]')
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)')
  var results = regex.exec(location.search)
  return results === null
    ? ''
    : decodeURIComponent(results[1].replace(/\+/g, ' '))
}

var _c = {
  start_time: '#start_time_val',
  end_time: '#end_time_val',
  pronunciation_time: '#pron_time_val',
  type: '#type_val',
  ruby_text: '#ruby_text_val'
}

const KaraokeEditor = {
  EditVal: (key, value, altMode, shiftMode, NonwipingMode) => {
    $(_c[key]).val(value)
    selectWords.forEach((details, index) => {
      var selectedObject =
        karaokeData.timeline[details.posX].collection[details.posY]

      selectedObject[key] = value

      if (!shiftMode && altMode && index === selectWords.length - 1) {
        $(selectWords[0].element).toggleClass('WordSelected')
        selectWords.splice(0, 1)
      }
    })

    if (shiftMode && !altMode) KaraokeEditor.clearSelection()
    if (!NonwipingMode) {
      Karaoke.RenderDOM()
      KaraokeEditor.clearSelection()
    }
  },
  clearSelection: () => {
    selectWords.forEach(v => {
      $(v.element).toggleClass('WordSelected', false)
    })

    selectWords = []
  },
  Import: () => {
    if (
      !window.File ||
      !window.FileReader ||
      !window.FileList ||
      !window.Blob
    ) {
      throw Error('Required APIs are not supported in this browser.')
    }

    var readInput = document.getElementById('fInput').files
    var fReader = new FileReader()
    var readJSON = null

    fReader.readAsText(readInput[0])
    fReader.onload = () => {
      try {
        readJSON = JSON.parse(fReader.result)
      } catch (e) {
        throw Error('Requested file type is not JSON.')
      }

      window.karaokeData = readJSON
      $('#kashi_type').val(karaokeData.metadata.lyrics)
      $('#writter_meta').val(karaokeData.metadata.writter)
      $('#blade_hex_meta').val(karaokeData.metadata.bladeColorHEX)
      $('#blade_name_meta').val(karaokeData.metadata.bladeColorMember)

      window.lastSaved = JSON.stringify(karaokeData.timeline)
      Karaoke.RenderDOM()
      Sakurauchi.run('KaraokeLoaded')
      logger(0, 'r', 'Karaoke Data Loaded.', 'i')
    }
  },
  Export: customData => {
    if (typeof window.Blob === 'undefined') {
      throw Error('Blob API is not supported in this browser.')
    }
    if (typeof window.karaokeData === 'undefined') {
      throw Error('karaokeData is not defined. is the page loaded correctly?')
    }
    var aDownload = document.createElement('a')
    $('body').append(aDownload)

    var blobData = new Blob(
      [
        JSON.stringify(
          typeof customData !== 'undefined' ? customData : window.karaokeData,
          null,
          2
        )
      ],
      {
        type: 'application/json'
      }
    )
    var url = URL.createObjectURL(blobData)

    aDownload.href = url
    aDownload.download = songID + '.json'
    aDownload.click()
    window.URL.revokeObjectURL(url)

    window.lastSaved = JSON.stringify(karaokeData)
  },

  setLyrics: data => {
    window.karaokeData.metadata.lyrics = data
  }
}

const AudioMute = () => {
  wavesurfer.setMute(!wavesurfer.getMute())
  $('#mute_btn').html(
    wavesurfer.getMute()
      ? '<i class="material-icons">volume_off</i>'
      : '<i class="material-icons">volume_up</i>'
  )
}

var pageBtnLists = ['#metadata_select', '#timeline_select']
var pageLists = ['#metadata_editor', '#timeline_editor']
var currentPage = pageLists[0]
var currentPageBtn = pageBtnLists[0]

const switchTab = tab => {
  $(currentPage).removeClass('currentPage')
  $(currentPage).addClass('notCurrentpage')
  $(currentPageBtn).removeClass('selected_btn')

  $(pageLists[tab]).removeClass('notCurrentpage')
  $(pageLists[tab]).addClass('currentPage')
  $(pageBtnLists[tab]).addClass('selected_btn')

  currentPage = pageLists[tab]
  currentPageBtn = pageBtnLists[tab]
}

window.KaraokeEditor = KaraokeEditor

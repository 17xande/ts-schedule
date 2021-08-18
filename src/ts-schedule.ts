// Author: Alexandre Figueiredo
// Source: github.com/17xande/ts-schedule

import moment from 'moment'

// Scheduler defines all the functionality of this program.
interface Scheduler {
  readonly endOfTime: moment.Moment
  debug: boolean
  logging: boolean
  selector: string
  timerID: number
  days: string[]
  containers: Container[]

  start(): void
  stop(): void
  getSheetContainers(selector: string): HTMLDivElement[]
  updateSheetContainers(sheetContainers: HTMLDivElement[]): void
  getContainers(selector: string): Container[]
  getScheduleType(container: Container): string
  getNextTime(container: Container): { show: moment.Moment, hide: moment.Moment }
  getDayDifference(day: string) : number
  showHide(container: Container): void
  clockCalc(container: Container): string
  timeLoop(containers: Container[]): void
  padZero(num: number): string
  insertVideo(container: HTMLDivElement): void
  insertChat(container: HTMLDivElement): void
  insertSheetLookup(container: HTMLDivElement): Promise<any>
  insertScript(src: string): void
  vidResize(): void
}

// Container defines the object that holds the reference to the HTML container
// for the different elements that will be scheduled, as well as some properties
// to facilitate the handling of the schedule.
interface Container {
  div: HTMLDivElement
  hasVideo: boolean
  hasChat: boolean
  hasClock: boolean
  schedule: {
    type: string
    show: string
    hide: string
    showHide: string
    timezone: string
    next: { show: moment.Moment, hide: moment.Moment }
  }
}

export const scheduler: Scheduler = {
  endOfTime: moment(32503672800000),
  debug: true,
  logging: true,
  selector: 'div.riversschedule',
  timerID: 0,
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  containers: [],

  // start finds the containers on the page and initialises them.
  async start() {
    if (scheduler.debug) scheduler.logging = true
    // stop previous timeLoop, if there is one running
    scheduler.stop()
    const sheetContainers = scheduler.getSheetContainers(scheduler.selector)
    await scheduler.updateSheetContainers(sheetContainers)
    scheduler.containers = scheduler.getContainers(scheduler.selector)
    scheduler.containers.forEach(container => scheduler.showHide(container))
    scheduler.timeLoop(scheduler.containers)
  },

  // stop cancels the loops in timers. Mostly used if the loops need to be restarted.
  stop() {
    if (scheduler.timerID != 0) {
      if (scheduler.logging) console.log(`stopping timeLoop: ${scheduler.timerID}`)
      clearInterval(scheduler.timerID)
    }
  },

  // getSheetContainers returns all elements that match the selector,
  // and that have the data-sheetLookup attribute.
  getSheetContainers(selector) {
    const els = document.querySelectorAll(selector)
    const sheetContainers = Array.from(els).map(e => <HTMLDivElement>e).filter(d => {
      const sheetLookup = d.dataset.sheetLookup ?? ''
      if (sheetLookup == '') return false
      return true
    })
    return sheetContainers
  },

  // updateSheetContainers changes the sheet containers to regular containers,
  // with show and hide dates and times from a google spreadsheet.
  async updateSheetContainers(sheetContainers) {
    interface sheet {
      lookup: string[], value: any
    }

    if (sheetContainers.length == 0) return
    let sheets = new Map<string, sheet>()

    // Loop through the containers and create a map of each sheet ID
    // and each lookup address for each sheet.
    for (let i = 0; i < sheetContainers.length; i++) {
      const c = sheetContainers[i]
      const id = c.dataset.sheetId ?? ''
      const lookup = c.dataset.sheetLookup ?? ''
      if (id == '') return
      let sheet = sheets.get(id) ?? <sheet>{}
      if (!sheet.lookup) sheet.lookup = []
      sheet.lookup.push(lookup)
      // sheets = sheets.set(id, o)
      sheets.set(id, sheet)

      if (!sheet.value) {
        const url = `https://spreadsheets.google.com/feeds/list/${id}/od6/public/values?alt=json`
        const res = await fetch(url)
        const json = await res.json()
        sheet.value = json
      }

      const entries = sheet.value.feed.entry
      const rows = entries.filter((e: any) => e.gsx$key?.$t === lookup)
      if (rows.length === 0) {
        console.error(`key ${lookup} not found in sheet.`)
        return Promise.reject()
      }
      const row = rows[0]

      c.dataset.show = row.gsx$show?.$t ?? ''
      c.dataset.hide = row.gsx$hide?.$t ?? ''
      c.dataset.videoUrl = row.gsx$videourl?.$t ?? ''
      c.dataset.sheetId = ''
      c.dataset.sheetLookup = ''
    }

    // Loop through the map and request each sheet.
    // Store the JSON response in the sheets map.
    // for (let i = 0; i < sheets.keys.length; i++) {
    //   const url = `https://spreadsheets.google.com/feeds/list/${id}/od6/public/values?alt=json`
    //   const res = await fetch(url)
    //   const json = await res.json()
    //   sheets[i].value = json
    // }
    // sheets.forEach(async (sheet, id) => {
    //   const url = `https://spreadsheets.google.com/feeds/list/${id}/od6/public/values?alt=json`
    //   const res = await fetch(url)
    //   const json = await res.json()
    //   sheet.value = json
    // })
  },

  // getContainers returns all elements that match the selector.
  getContainers(selector) {
    const divs = document.querySelectorAll(selector)
    // If targeting > ES5:
    // const arrDivs = <HTMLDivElement[]>Array.from(divs)
    let containers: Container[] = []
    
    for (let i = 0; i < divs.length; i++) {
      const div = <HTMLDivElement>divs[i]
      const chatUrl = div.dataset.chatUrl ?? ''
      const chatRoom = div.dataset.chatRoom ?? ''
      const videoUrl = div.dataset.videoUrl ?? ''
      const clockEnd = div.dataset.clockend ?? ''

      let container: Container = {
        div: div,
        hasVideo: div.dataset.embedId?.length === 36 || videoUrl != '',
        hasChat: chatUrl != '' || chatRoom != '',
        hasClock: clockEnd != '',
        schedule: {
          type: '',
          show: div.dataset.show ?? '',
          hide: div.dataset.hide ?? '',
          showHide: div.dataset.showHide ?? '',
          timezone: div.dataset.timezone ?? '+02:00', // Default to +02:00 timezone.
          next: { show: moment(0), hide: moment(scheduler.endOfTime) }
        },
      }

      container.schedule.type = scheduler.getScheduleType(container)
      let sh = scheduler.getNextTime(container)
      container.schedule.next = sh
      containers.push(container)
    }
    //TODO: this is a test
    
    if (scheduler.logging) console.log(`containers found: ${containers.length}.`)
    return containers
  },

  // getScheduleType returns the schedule type based on the other properties of the schedule.
  getScheduleType(container) {
    const showDate = moment(container.schedule.show)
    const hideDate = moment(container.schedule.hide)

    // First we need to figure out what type of date strings we'll be working with.
    if (container.schedule.showHide) {
      // Only the 'recurringMultipleRange' type has the showHide dataset attribute.
      container.schedule.type = 'recurringMultipleRange'
    } else if (container.schedule.show || container.schedule.hide) {
      // This means it's either 'recurringSingle' or 'onceOff'
      if (!showDate.isValid() && !hideDate.isValid()) {
        // If both the show and hide are invalid dates, then it's a recurringSingle type.
        container.schedule.type = 'recurringSingle'
      } else {
        // If either show or hide are valid dates, then it's a 'onceOff' type.
        container.schedule.type = 'onceOff'
      }
    } else {
      // Otherwise the schedule in this div is invalid.
      container.schedule.type = 'invalid'

      if (scheduler.logging) {
        console.warn("Invalid schedule:\n", container.div)
      }
    }

    return container.schedule.type
  },

  // getNextTime gets the next show and hide times.
  getNextTime(container) {
    const now = moment()
    const showHide = container.schedule.showHide.split('|')

    let ts = now.clone()
    let th = now.clone()

    switch (container.schedule.type) {
      case 'onceOff':
          ts = moment(container.schedule.show)
          
          // Use default value if it's missing or invalid.
          if (!ts.isValid()) {
            ts = moment(0)
          }
        
          th = moment(container.schedule.hide)
          
          // Use default value if it's missing or invalid.
          if (!th.isValid()) {
            th = scheduler.endOfTime
          }
        
        break

      case 'recurringSingle':
        const arrS = container.schedule.show.split('|')
        const arrH = container.schedule.hide.split('|')
        const timeS = arrS[1].split(':')
        const timeH = arrH[1].split(':')

        // Find how many days till the next show day that was specified.
        let daysAdded = this.getDayDifference(arrS[0])
        // Add those days to the show date.
        // ts.add(daysAdded, 'days')
        // Set the time of the show date.
        ts.hours(parseInt(timeS[0], 10))
        ts.minutes(parseInt(timeS[1], 10))
        ts.seconds(parseInt(timeS[2], 10))
        
        // Do the same for the hide day.
        daysAdded = this.getDayDifference(arrH[0])
        // Add those days to the show date.
        th.add(daysAdded, 'days')
        // Set the time of the show date.
        th.hours(parseInt(timeH[0], 10))
        th.minutes(parseInt(timeH[1], 10))
        th.seconds(parseInt(timeH[2], 10))
        
        // If it's today, but past the hide time, add a week to the moment.
        if (daysAdded === 0 && now.isAfter(th)) {
          ts.add(7, 'days')
          th.add(7, 'days')
        }
        break

      case 'recurringMultipleRange':
        const daysStr = showHide[0].split(',')
        const timesStr = showHide[1].split(',')

        let dist = daysStr.map(d => scheduler.getDayDifference(d)).sort()

        if (dist[0] !== 0) {
          // If today is not one of the days to show.
          // Add the number of days till the next show day.
          ts.add(dist[0], 'days')
          th.add(dist[0], 'days')
          let timesArr = timesStr[0].split('-')
          let time = timesArr[0].split(':')
          // Set the time to the first time of the day.
          ts.hour(parseInt(time[0], 10))
          ts.minute(parseInt(time[1], 10))
          ts.second(0)

          // repeat for the hide time.
          time = timesArr[1].split(':')
          // Set the time to the first time of the day.
          th.hour(parseInt(time[0], 10))
          th.minute(parseInt(time[1], 10))
          th.second(0)

        } else {
          // If today is one of the days, find the next hide time.
          for (let i = 0; i < timesStr.length; i++) {
            const ti = timesStr[i].split('-')[1].split(':')
            let d = now.clone()
            d.hour(parseInt(ti[0], 10))
            d.minute(parseInt(ti[1], 10))
            
            if (d.isAfter(now)) {
              const tih = timesStr[i].split('-')[0].split(':')
              ts.hour(parseInt(tih[0], 10)).minute(parseInt(tih[1], 10)).second(0)
              th.hour(d.hour()).minute(d.minute()).second(0)
              break
            }

            if (i === timesStr.length - 1) {
              // If we're on the last iteration of this loop, it means that
              // we're past the last slot for today, so we have to use the first slot of the next day.
              // Add the number of days till the next show day.
              ts.add(dist[1], 'days')
              th.add(dist[1], 'days')
              const times = timesStr[0].split('-')
              // Set the time to the first time of the day.
              ts.hour(parseInt(times[0].split(':')[0], 10))
              ts.minute(parseInt(times[0].split(':')[1], 10))
              ts.second(0)
              th.hour(parseInt(times[1].split(':')[0], 10))
              th.minute(parseInt(times[1].split(':')[1], 10))
              th.second(0)
            }
          }
        }

        break

      default:
        if (scheduler.logging) {
          console.warn(`Invalid schedule type:\n`, container.div)
        }
        break
    }

    // Set the timezone/offset.
    ts.utcOffset(container.schedule.timezone)
    th.utcOffset(container.schedule.timezone)
    return { show: ts, hide: th}
  },

  // getDayDifference returns the length of days till the supplied day.
  getDayDifference(day) {
    const now = moment()
    // Get the index of the day in the show attribute.
    let dayIndex = scheduler.days.indexOf(day)
    if (dayIndex === -1) {
      // If it's an invalid day, set the default to today.
      // TODO: this is a bad idea. If there is an invalid day we should return an error and never show.
      dayIndex = now.day()
      if (scheduler.logging) {
        console.warn(`Invalid day in 'show' attribute:\n`, day)
      }
    }

    // Find how many days till the next day that was specified.
    const daysAdded = (dayIndex + 7 - now.day()) % 7

    return daysAdded
  },

  // showHide shows or hides the containers. It also inserts and removes additional
  // elements like iFrames if necessary.
  showHide(container) {
    // Ignore invalid containers.
    if (container.schedule.type === 'invalid') return
    const now = moment()

    if (now.isBetween(container.schedule.next.show, container.schedule.next.hide)) {
      if (container.hasVideo) {
        scheduler.insertVideo(container.div)
      }
      if (container.hasChat) {
        scheduler.insertChat(container.div)
      }

      // This container should be shown at this time.
      // If the container is already showing, just move on.
      if (!container.div.classList.contains('hidden')) return

      if (scheduler.logging) console.log(`showing container.`)
      container.div.classList.remove('hidden')
      
      return
    }
    
    // This container should be hidden at this time.
    // If the container is already hidden, just move on
    if (container.div.classList.contains('hidden')) return
    
    if (scheduler.logging) console.log(`hiding container.`)
    container.div.classList.add('hidden')
    // Get the next show and hide times.
    const sche = scheduler.getNextTime(container)
    container.schedule.next = { show: sche.show, hide: sche.hide }
    if (container.hasVideo || container.hasChat) {
      // Clear out the contents of the container.
      // Not sure if this is the best approach, but it works for now.
      container.div.querySelectorAll('.containerVideo, .containerChat, .arena--initial-loading').forEach(e => e.remove())
      // This is assuming that there will ever only be one video and one chat per page.
      // window.removeEventListener('resize', scheduler.vidResize)
    }
  },

  // timeLoop runs a `setInterval` loop to check if containers need to
  // be shown or hidden.
  timeLoop(containers) {
    let that = this
    scheduler.timerID = window.setInterval(() => {
      containers.forEach(container => {
        that.showHide(container)

        if (container.hasClock) {
          const time = that.clockCalc(container)
          const el = container.div.querySelector('.rivTime')
          if (el) {
            el.textContent = time
          } else {
            container.div.innerHTML = `<p>${time}</p>`
          }
        }
      })
    }, 1000)
    if (scheduler.logging) console.log(`timeLoop started.`)
  },

  // clockCalc calculates what to set a timer to.
  clockCalc(container) {
    const now = moment()
    const clockEnd = (container.div.dataset.clockend || "00:00").split(':')
    const endTime = container.schedule.next.hide
    const dur = moment.duration(endTime.diff(now)).add(clockEnd[0], 'minutes').add(clockEnd[1], 'seconds')
    const days = dur.days()
    let sDays = ''
    if (days === 1) {
      sDays = 'Day'
    } else if (days > 1) {
      sDays = 'Days'
    }
    const clock = `${days || ''} ${sDays} ${scheduler.padZero(dur.hours())}:${scheduler.padZero(dur.minutes())}:${scheduler.padZero(dur.seconds())}`
    return clock
  },

  // padZero returns a single zero padded number as a string.
  padZero(num) {
    let s = num.toString()
    if (s.length === 1) s = '0' + s
    return s
  },

  // insertVideo inserts the <div> and <script> elements to create the
  // Resi video experience.
  insertVideo(container) {
    if (container.querySelector('.containerVideo') != null) {
      // video already there, do nothing.
      return
    }

    const videoUrl = container.dataset.videoUrl
    const embedID = container.dataset.embedId
    let template = ''

    if (videoUrl) {
      template = `<div class="containerVideo"><iframe src="${videoUrl}" scrolling="no" allowfullscreen="true" allow="fullscreen" frameborder="0"></iframe></div>`
      container.insertAdjacentHTML('afterbegin', template)
    }
    else if (embedID) {
      template = `<div id="resi-video-player" class="containerVideo" data-embed-id="${embedID}"></div>`
      container.insertAdjacentHTML('afterbegin', template)
      scheduler.insertScript('https://control.resi.io/webplayer/loader.min.js')
      
      // @ts-ignore
      window.la1InitWebPlayer?.()
    } else {
      console.warn(`invalid video embed parameters.`)
      return
    }
    if (scheduler.logging) console.log(`video inserted.`)
  },

  // insertChat inserts a chat embed code based on the chat URL provided.
  insertChat(container) {
    if (container.querySelector('.containerChat') != null) {
      // chat already there, do nothing.
      return
    }

    const chatUrl = container.dataset.chatUrl
    const chatPublisher = container.dataset.chatPublisher
    const chatRoom = container.dataset.chatRoom
    let template = ''

    if (chatUrl) {
      template = `<div class="containerChat"><iframe src="${chatUrl}"></iframe></div>`
      container.insertAdjacentHTML('beforeend', template)
    } else if (chatPublisher) {
      template = `<div class="arena-chat containerChat" data-publisher="${chatPublisher}" data-chatroom="${chatRoom}" data-position="in-page"></div>`
      container.insertAdjacentHTML('beforeend', template)
      const scriptSrc = `https://go.arena.im/public/js/arenachatlib.js?p=${chatPublisher}&e=${chatRoom}`
      this.insertScript(scriptSrc)

      // @ts-ignore
      window.arenaChat?.reset?.()
    } else {
      console.warn(`incorrect dataset parameters for chat embedding.`)
    }
    if (this.logging) console.log(`chat inserted.`)
  },

  // insertSheetLookup gets a url from a google sheet and inserts an iframe with its source set to that url.
  insertSheetLookup(container) {
    if (container.querySelector('.containerVideo') != null) {
      return Promise.resolve()
    }

    const sheetId = container.dataset.sheetId
    const sheetLookup = container.dataset.sheetLookup
    const url = `https://spreadsheets.google.com/feeds/list/${sheetId}/od6/public/values?alt=json`
    // const res = await fetch(url)
    // const data = await res.json()
    // const entries = data.feed.entry

    const p = fetch(url)
      .then(res => res.json())
      .then(data => {
        const entries = data.feed.entry
        const f = entries.filter((e: any) => e.gsx$key.$t === sheetLookup)
        if (f.length === 0) return Promise.reject()
        const src = f[0]?.gsx$link?.$t ?? ''
        if (src === '') return Promise.reject()
        const template = `<div class="containerVideo"><iframe src=${src}></iframe></div>`
        container.insertAdjacentHTML('afterbegin', template)
        return src
      })
      
    return p
  },

  // insertScript inserts a script tag with a source if it isn't already inserted.
  insertScript(src) {
    // skip if script is already inserted.
    if (document.querySelector(`script[src="${src}"]`)) return

    const s = document.createElement('script')
    s.setAttribute('src', src)
    document.body.appendChild(s)
  },

  // vidResize resizes a video iframe to a 16:9 ratio.
  // Hopefully we won't need to use this anymore.
  // Never mind, we will need to use this for the iFrame injection logic, because iFrames are jerks.
  vidResize() {
    let cv = <HTMLDivElement>document.querySelector('div.containerVideo')
    cv.style.height = cv.clientWidth * 9 / 16 + 'px'
  }
}

scheduler.start()

// not standard debugging
// try {
// 	scheduler.start(); // @ts-ignore
// } catch(err) {
//   scheduler.containers[0].div.parentElement.innerHTML = '<h3>' + err.toString() + '</h3><p>' + err.stack + '</p>';
//   // console.log(err);
//   // alert(err);
// }

// @ts-ignore
window.scheduler = scheduler
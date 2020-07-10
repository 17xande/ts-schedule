// Author: Alexandre Figueiredo
// Source: github.com/17xande/JSchedule

// /// <reference path="../node_modules/moment/moment.d.ts"/>
import moment from '../node_modules/moment/moment.js';

// Scheduler defines all the functionality of this program.
interface Scheduler {
  readonly version: string;
  readonly endOfTime: moment.Moment;
  debug: boolean;
  logging: boolean;
  selector: string;
  timerID: number;
  days: string[];
  containers: Container[];

  start(): void;
  stop(): void;
  getContainers(selector: string): Container[];
  getScheduleType(container: Container): string;
  getNextTime(container: Container, sh: string): moment.Moment;
  showHide(container: Container): void;
  clockCalc(container: Container): string;
  timeLoop(containers: Container[]): void;
  padZero(num: number): string;
  insertVideo(container: HTMLDivElement): void;
  insertChat(container: HTMLDivElement): void;
  insertScript(src: string): void;
  vidResize(): void;
}

// Container defines the object that holds the reference to the HTML container
// for the different elements that will be scheduled, as well as some properties
// to facilitate the handling of the schedule.
interface Container {
  div: HTMLDivElement;
  hasVideo: boolean;
  hasChat: boolean;
  schedule: {
    type: string
    show: string
    hide: string
    showHide: string
    timezone: string
    nextShow: moment.Moment
    nextHide: moment.Moment
  }
}

export const scheduler: Scheduler = {
  version: "0.4.0",
  endOfTime: moment(8640000000000000),
  debug: true,
  logging: true,
  selector: 'div.riversschedule',
  timerID: 0,
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  containers: [],

  // start finds the containers on the page and initialised them.
  start() {
    if (scheduler.debug) scheduler.logging = true;
    // stop previous timeLoop, if there is one running;
    scheduler.stop();
    scheduler.containers = scheduler.getContainers(scheduler.selector);
    scheduler.containers.forEach(container => scheduler.showHide(container));
    scheduler.timeLoop(scheduler.containers);
  },

  // stop cancels the loops in timers. Mostly used if the loops need to be restarted.
  stop() {
    if (scheduler.timerID != 0) {
      if (scheduler.logging) console.log(`stopping timeLoop: ${scheduler.timerID}`);
      clearInterval(scheduler.timerID);
    }
  },

  // getContainers returns all elements that match the selector.
  // Default selector: `div.alexcustomscript`.
  getContainers(selector) {
    const divs = document.querySelectorAll(selector);
    // If targeting > ES5:
    // const arrDivs = <HTMLDivElement[]>Array.from(divs);
    let containers: Container[] = [];
    
    for (let i = 0; i < divs.length; i++) {
      const div = <HTMLDivElement>divs[i];
      const chatUrl = div.dataset.chatUrl ?? '';
      
      let container: Container = {
        div: div,
        hasVideo: div.dataset.embedId?.length === 36,
        hasChat: chatUrl.length > 5,
        schedule: {
          type: '',
          show: div.dataset.show ?? '',
          hide: div.dataset.hide ?? '',
          showHide: div.dataset.showHide ?? '',
          timezone: div.dataset.timezone ?? '+02:00', // Default to +02:00 timezone.
          nextShow: moment(),
          nextHide: moment(),
        },
      };


      container.schedule.type = scheduler.getScheduleType(container);
      container.schedule.nextShow = scheduler.getNextTime(container, 'show');
      container.schedule.nextHide = scheduler.getNextTime(container, 'hide');
      containers.push(container);
    }
    
    if (scheduler.logging) console.log(`containers found: ${containers.length}.`);
    return containers;
  },

  // getScheduleType returns the schedule type based on the other properties of the schedule.
  getScheduleType(container) {
    const showDate = moment(container.schedule.show);
    const hideDate = moment(container.schedule.hide);

    // First we need to figure out what type of date strings we'll be working with.
    if (container.schedule.showHide) {
      // Only the 'recurringMultipleRange' type has the showHide dataset attribute.
      container.schedule.type = 'recurringMultipleRange';
    } else if (container.schedule.show || container.schedule.hide) {
      // This means it's either 'recurringSingle' or 'onceOff'
      if (!showDate.isValid() && !hideDate.isValid()) {
        // If both the show and hide are invalid dates, then it's a recurringSingle type.
        container.schedule.type = 'recurringSingle';
      } else {
        // If either show or hide are valid dates, then it's a 'onceOff' type.
        container.schedule.type = 'onceOff';
      }
    } else {
      // Otherwise the schedule in this div is invalid.
      container.schedule.type = 'invalid';

      if (scheduler.logging) {
        console.warn("Invalid schedule:\n", container.div);
      }
    }

    return container.schedule.type;
  },

  // getNextTime encapsulates the common logic of getNextShow() and getNextHide().
  getNextTime(container, sh) {
    const now = moment();
    const showHide = container.schedule.showHide.split('|');

    let t = now.clone();

    switch (container.schedule.type) {
      case 'onceOff':
        if (sh === 'show') {
          t = moment(container.schedule.show);
          
          // Use default value if it's missing or invalid.
          if (!t.isValid()) {
            t = moment(0);
          }
        } else {
          t = moment(container.schedule.hide);
          
          // Use default value if it's missing or invalid.
          if (!t.isValid()) {
            t = scheduler.endOfTime;
          }
        }
        break;

      case 'recurringSingle':
        let arrSH: string[];
        if (sh === "show") {
          arrSH = container.schedule.show.split('|');
        } else {
          arrSH = container.schedule.hide.split('|');
        }

        const time = arrSH[1].split(':');
        // Get the index of the day in the show attribute.
        let dayIndex = scheduler.days.indexOf(arrSH[0]);
        if (dayIndex === -1) {
          // If it's an invalid day, set the default to today.
          dayIndex = now.day();
          if (scheduler.logging) {
            console.warn(`Invalid day in 'show' attribute:\n`, container.div);
          }
        }

        // Find how many days till the next day that was specified.
        const daysAdded = (dayIndex + 7 - now.day()) % 7;
        // Add those days to the show date.
        t.add(daysAdded, 'days');
        t.hours(parseInt(time[0], 10));
        t.minutes(parseInt(time[1], 10));
        t.seconds(parseInt(time[2], 10));
        
        // If it's today, but past the time, add a week to the moment.
        if (daysAdded === 0 && now.isAfter(t)) {
          t.add(7, 'days');
        }
        break;

      case 'recurringMultipleRange':
        const daysStr = showHide[0].split(',');
        const timesStr = showHide[1].split(',');

        // Store the index of each day in an array and sort it.
        let daysArr = daysStr.map(day => scheduler.days.indexOf(day)).sort();
        if (daysArr[0] === -1) {
          if (scheduler.logging) {
            console.warn(`Invalid day in 'show-hide' attribute:\n`, container.div);
          }
          break;
        }

        // Store the showtimes of each time slot. Would a sort() work here?
        let i = 0;
        if (sh === 'hide') i = 1;
        let timesArr = timesStr.map(times => times.split('-')[i]);

        // Store the distance of each day from today, and sort it.
        let dist = daysArr.map(e => (e + 7 + now.day()) % 7).sort();

        if (dist[0] !== 0) {
          // If today is not one of the days to show.
          // Add the number of days till the next show day.
          t.add(dist[0], 'days');
          const time = timesArr[0].split(':');
          // Set the time to the first time of the day.
          t.hour(parseInt(time[0], 10));
          t.minute(parseInt(time[1], 10));
          t.second(0);
        } else {
          // If today is one of the days, find the next time.
          for (let i = 0; i < timesArr.length; i++) {
            const ti = timesArr[i].split(':');
            let d = now.clone();
            d.hour(parseInt(ti[0], 10));
            d.minute(parseInt(ti[1], 10));
            
            if (d.isAfter(now)) {
              t.hour(d.hour()).minute(d.minute()).second(0);
              break;
            }

            if (i === timesArr.length - 1) {
              // If we're on the last iteration of this loop, it means that
              // we're past the last slot for today, so we have to use the first slot of the next day.
              // Add the number of days till the next show day.
              t.add(dist[1], 'days');
              const time = timesArr[0].split(':');
              // Set the time to the first time of the day.
              t.hour(parseInt(time[0], 10));
              t.minute(parseInt(time[1], 10));
              t.second(0);
            }
          }
        }

        break;

      default:
        if (scheduler.logging) {
          console.warn(`Invalid schedule type:\n`, container.div);
        }
        break;
    }

    // Set the timezone/offset.
    t.utcOffset(container.schedule.timezone);
    return t;
  },

  // showHide shows or hides the containers. It also inserts and removes additional
  // elements like iFrames if necessary.
  showHide(container) {
    // Ignore invalid containers.
    if (container.schedule.type === 'invalid') return;
    // Ignore clock type containers. They're doing their thing somewhere else.
    if (container.div.dataset.clock) return;
    const now = moment();

    if (now.isBetween(container.schedule.nextShow, container.schedule.nextHide)) {
      // This container should be shown at this time.
      // If the container is already showing, just move on.
      if (!container.div.classList.contains('hidden')) return;

      if (scheduler.logging) console.log(`showing container.`);
      container.div.classList.remove('hidden');
      if (container.hasVideo) {
        scheduler.insertVideo(container.div);
      }
      if (container.hasChat) {
        scheduler.insertChat(container.div);
      }
      
      return;
    }
    
    // This container should be hidden at this time.
    // If the container is already hidden, just move on
    if (container.div.classList.contains('hidden')) return;
    
    if (scheduler.logging) console.log(`hiding container.`);
    container.div.classList.add('hidden');
    // Get the next show and hide times.
    container.schedule.nextShow = scheduler.getNextTime(container, 'show');
    container.schedule.nextHide = scheduler.getNextTime(container, 'hide');
    if (container.hasVideo || container.hasChat) {
      // Clear out the contents of the container.
      // Not sure if this is the best approach, but it works for now.
      container.div.innerHTML = "";
      // This is assuming that there will ever only be one video and one chat per page.
      // window.removeEventListener('resize', scheduler.vidResize);
    }
  },

  // timeLoop runs a `setInterval` loop to check if containers need to
  // be shown or hidden.
  timeLoop(containers) {
    let that = this;
    scheduler.timerID = window.setInterval(() => {
      containers.forEach(container => {
        if (!container.div.dataset.clock) {
          that.showHide(container);
          return;
        }

        const time = that.clockCalc(container);
        const children = container.div.children;
        if (children.length > 0) {
          children[0].textContent = time;
        } else {
          container.div.innerHTML = `<p>${time}</p>`;
        }
      });
    }, 1000);
    if (scheduler.logging) console.log(`timeLoop started.`);
  },

  // clockCalc calculates what to set a timer to.
  clockCalc(container) {
    // const now = new Date(),
    //       end = (container.div.dataset.clockend || "00:00").split(':');
    let clock = "";
    console.log(container)
    // for (let i = 0; i < container.schedule.length; i++){
    //   for (let i = 0; i < container.schedule.length; i++){
    //   const schedule = container.schedule[i];
    //   if (now > schedule.show) continue;

    //   let diff = Math.floor((schedule.show.getTime() - now.getTime()) / 1000);
    //   diff += parseInt(end[0]) * 60 + parseInt(end[1]);

    //   const days = Math.floor(diff / (24 * 60 * 60)),
    //         hours = scheduler.padZero(Math.floor(diff % (24 * 60 * 60) / (60 * 60))),
    //         minutes = scheduler.padZero(Math.floor(diff % (60 * 60) / 60)),
    //         seconds = scheduler.padZero(Math.floor(diff % 60));

    //   clock = `${days} days ${hours}:${minutes}:${seconds}`;
    //   break;
    // }

    return clock;
  },

  // padZero returns a single zero padded number as a string.
  padZero(num) {
    let s = num.toString();
    if (s.length === 1) s = '0' + s;
    return s;
  },

  // insertVideo inserts the <div> and <script> elements to create the
  // LA1 video experience.
  insertVideo(container) {
    if (container.querySelector('.containerVideo') != null) {
      // video already there, do nothing.
      return;
    }

    const videoUrl = container.dataset.videoUrl;
    const embedID = container.dataset.embedId;
    let template = '';

    if (videoUrl) {
      template = `<div class="containerVideo"><iframe src="${videoUrl}" scrolling="no" allowfullscreen="true" allow="fullscreen" frameborder="0"></iframe></div>`;
      container.insertAdjacentHTML('afterbegin', template);
      this.insertScript('https://control.livingasone.com/webplayer/loader.min.js');
    }
    else if (embedID) {
      template = `<div id="la1-video-player" class="containerVideo" data-embed-id="${embedID}"></div>`;
    } else {
      console.warn(`invalid video embed parameters.`);
    }
    if (this.logging) console.log(`video inserted.`);
  },

  // insertChat inserts a chat embed code based on the chat URL provided.
  insertChat(container) {
    if (container.querySelector('.containerChat') != null) {
      // chat already there, do nothing.
      return;
    }

    const chatUrl = container.dataset.chatUrl;
    const chatPublisher = container.dataset.chatPublisher;
    const chatRoom = container.dataset.chatRoom;
    let template = '';

    if (chatUrl) {
      template = `<div class="containerChat"><iframe src="${chatUrl}"></iframe></div>`;
      container.insertAdjacentHTML('beforeend', template);
    } else if (chatPublisher) {
      template = `<div class="arena-chat containerChat" data-publisher="${chatPublisher}" data-chatroom="${chatRoom}" data-position="in-page"></div>`;
      container.insertAdjacentHTML('beforeend', template);
      const scriptSrc = `https://go.arena.im/public/js/arenachatlib.js?p=${chatPublisher}&e=${chatRoom}`;
      this.insertScript(scriptSrc);
    } else {
      console.warn(`incorrect dataset parameters for chat embedding.`);
    }
    if (this.logging) console.log(`chat inserted.`);
  },

  // insertScript inserts a script tag with a source if it isn't already inserted.
  insertScript(src) {
    // skip if script is already inserted.
    if (document.querySelector(`script[src="${src}"]`)) return;

    const s = document.createElement('script');
    s.setAttribute('src', src);
    document.body.appendChild(s);
  },

  // vidResize resizes a video iframe to a 16:9 ratio.
  // Hopefully we won't need to use this anymore.
  vidResize() {
    let cv = <HTMLDivElement>document.querySelector('div.containerVideo');
    cv.style.height = cv.clientWidth * 9 / 16 + 'px';
  }
};

scheduler.start();

// @ts-ignore
window.scheduler = scheduler;
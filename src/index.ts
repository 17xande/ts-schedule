// Author: Alexandre Figueiredo
// Source: github.com/17xande/JSchedule

import * as moment from 'moment-timezone';

// Scheduler defines all the functionality of this program.
interface Scheduler {
  readonly version: string;
  readonly endOfTime: Date;
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
  getDates(container: Container): Container;
  getNextShow(container: Container): Date;
  getNextHide(container: Container): Date;
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
  }
}

const scheduler: Scheduler = {
  version: "0.4.1",
  endOfTime: new Date(8640000000000000),
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
    const containers = scheduler.getContainers(scheduler.selector);
    containers.forEach(container => scheduler.showHide(container));
    scheduler.timeLoop(containers);
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
          timezone: div.dataset.timezone ?? 'Africa/Johannesburg'
        },
      };

      container.schedule.type = scheduler.getScheduleType(container)

      container = scheduler.getDates(container);
      containers.push(container);
    }
    
    if (scheduler.logging) console.log(`containers found: ${containers.length}.`);
    return containers;
  },

  // getScheduleType returns the schedule type based on the other properties of the schedule.
  getScheduleType(container) {
    const inv = 'Invalid Date';
    const showDate = new Date(container.schedule.show);
    const hideDate = new Date(container.schedule.hide);

    let scheduleType = 'invalid';

    // First we need to figure out what type of date strings we'll be working with.
    if (container.schedule.showHide) {
      // Only the 'recurringMultipleRange' type has the showHide dataset attribute.
      container.schedule.type = 'recurringMultipleRange';
    } else if (container.schedule.show || container.schedule.hide) {
      // This means it's either 'recurringSingle' or 'onceOff'
      if (showDate.toString() == inv && hideDate.toString() == inv) {
        // If both the show and hide are invalid dates, then it's a recurringSingle type.
        container.schedule.type = 'recurringSingle';
      } else {
        // If either show or hide are valid dates, then it's a 'onceOff' type.
        container.schedule.type = 'onceOff';
      }
    } else {
      // Otherwise the schedule in this div is invalid.
      scheduleType = 'invalid';

      if (scheduler.logging) {
        console.warn("Invalid schedule:\n", container.div);
      }
    }

    return scheduleType;
  },

  // getNextShow returns the date of the next show.
  getNextShow(container) {
    const inv = 'Invalid Date';
    const now = new Date();
    const day = scheduler.padZero(now.getDate());
    const month = scheduler.padZero(now.getMonth() + 1);
    const year = now.getFullYear();
    const showHide = container.schedule.showHide.split('|');

    let show = new Date();
    let mShow: moment.Moment;

    switch (container.schedule.type) {
      case 'onceOff':
        show = new Date(container.schedule.show);
        mShow = moment.tz(container.schedule.show, container.schedule.timezone);
        console.log(mShow);

        // Use default show value if it's missing or invalid.
        if (show.toString() === inv) {
          show = new Date(0);
        }
        break;

      case 'recurringSingle':
        const arrShow = container.schedule.show.split('|');
        // const time = arrShow[1];
        // Get the index of the day in the show attribute.
        let dayIndex = scheduler.days.indexOf(arrShow[0]);
        if (dayIndex === -1) {
          // If it's an invalid day, set the default to today.
          dayIndex = now.getDay();
          if (scheduler.logging) {
            console.warn(`Invalid day in 'show' attribute:\n${container.div}`);
          }
        }

        // Find how many days till the next day that was specified.
        const daysAdded = (dayIndex + (7 - now.getDay())) % 7;
        // Add those days to the show date.
        show.setDate(daysAdded);
        // Create a completely new date based on a date string.
        // We have to keep recreating the date like this (from a string template) for one reason:
        // It's the only way that I know of to make sure that the right timezone is used.
        // Otherwise it will default to the timezone of the browser...
        // Because JavaScript dates are from the devil.
        // const dateString = `${year}-${month}-${day}T${time}${container.schedule.timezone}`;


        break;

      case 'recurringMultipleRange':
        // const days = showHide[0].split(',');
        const timeSlots = showHide[1].split(',');

        for (let i = 0; i < timeSlots.length; i++) {
          // Get the show time for this slot.
          const time = timeSlots[i].split('-')[0];
          // Build a date string with today's date.
          const dateString = `${year}-${month}-${day}T${time}${container.schedule.timezone}`;
          show = new Date(dateString);
        }

        break;
    }

    return show;
  },

  // getNextHide returns the date of the next hide.
  getNextHide(container) {
    let hide = new Date(container.schedule.hide);

    return hide;
  },

  // getDate parses the times supplied and returns the full `show` and `hide` dates.
  getDates(container) {
    const timezone = container.div.dataset.timezone || "+02:00";
    let now = new Date();
    const month = scheduler.padZero(now.getMonth() + 1);
    const day = scheduler.padZero(now.getDate());

    let schedule = '';
    let days: string[];

      
    // let di = scheduler.days.indexOf(day);
    // if (di === -1) di = 0;

    // If we're past the last show schedule, add a week to the date.
    // now.setDate(now.getDate() + (di + (7 - now.getDay())) % 7);
    const timeSlots = schedule.split(',');
    if (new Date() > parseDate(timeSlots[timeSlots.length - 1]).hide) {
      now = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    
    // container.schedule = timeSlots.map(parseDate);    

    function parseDate(timeSlots: string) {
      const times = timeSlots.split('-');
      const date = `${now.getFullYear()}-${month}-${day}T`;
      const show = `${date}${times[0]}:00${timezone}`;
      const hide = `${date}${times[1]}:00${timezone}`;

      return {
        show: new Date(show),
        hide: new Date(hide),
        days: days
      }
    };

    return container;
  },

  // showHide sets the `hidden` attribute of the containers
  // based on their schedules.
  showHide(container) {
    if (container.div.dataset.clock) return;
    // const now = new Date();
    // for (let i = 0; i < container.schedule.length; i++) {
    //   const time = container.schedule[i];
    //   if (now > time.show && now < time.hide) {
    //     if (!container.div.classList.contains('hidden')) return;
    //     if (scheduler.logging) console.log(`showing container.`);
    //     container.div.classList.remove('hidden');
    //     if (container.hasVideo) {
    //       scheduler.insertVideo(container.div);
    //     }
    //     if (container.hasChat) {
    //       scheduler.insertChat(container.div);
    //     }
    //     return;
    //   }
    // }

    if (container.div.classList.contains('hidden')) return;
    if (scheduler.logging) console.log(`hiding container.`);
    container.div.classList.add('hidden');
    if (container.hasVideo || container.hasChat) {
      container.div.innerHTML = "";
      // This is assuming that there will ever only be one video and one chat per page.
      window.removeEventListener('resize', scheduler.vidResize);
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
// import moment from '../node_modules/moment/moment.js';
export const scheduler = {
    version: "0.4.0",
    endOfTime: moment(8640000000000000),
    debug: true,
    logging: true,
    selector: 'div.riversschedule',
    timerID: 0,
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    containers: [],
    start() {
        if (scheduler.debug)
            scheduler.logging = true;
        scheduler.stop();
        scheduler.containers = scheduler.getContainers(scheduler.selector);
        scheduler.containers.forEach(container => scheduler.showHide(container));
        scheduler.timeLoop(scheduler.containers);
    },
    stop() {
        if (scheduler.timerID != 0) {
            if (scheduler.logging)
                console.log(`stopping timeLoop: ${scheduler.timerID}`);
            clearInterval(scheduler.timerID);
        }
    },
    getContainers(selector) {
        const divs = document.querySelectorAll(selector);
        let containers = [];
        for (let i = 0; i < divs.length; i++) {
            const div = divs[i];
            const chatUrl = div.dataset.chatUrl ?? '';
            let container = {
                div: div,
                hasVideo: div.dataset.embedId?.length === 36,
                hasChat: chatUrl.length > 5,
                schedule: {
                    type: '',
                    show: div.dataset.show ?? '',
                    hide: div.dataset.hide ?? '',
                    showHide: div.dataset.showHide ?? '',
                    timezone: div.dataset.timezone ?? '+02:00',
                    nextShow: moment(),
                    nextHide: moment(),
                },
            };
            container.schedule.type = scheduler.getScheduleType(container);
            container.schedule.nextShow = scheduler.getNextTime(container, 'show');
            container.schedule.nextHide = scheduler.getNextTime(container, 'hide');
            containers.push(container);
        }
        if (scheduler.logging)
            console.log(`containers found: ${containers.length}.`);
        return containers;
    },
    getScheduleType(container) {
        const showDate = moment(container.schedule.show);
        const hideDate = moment(container.schedule.hide);
        if (container.schedule.showHide) {
            container.schedule.type = 'recurringMultipleRange';
        }
        else if (container.schedule.show || container.schedule.hide) {
            if (!showDate.isValid() && !hideDate.isValid()) {
                container.schedule.type = 'recurringSingle';
            }
            else {
                container.schedule.type = 'onceOff';
            }
        }
        else {
            container.schedule.type = 'invalid';
            if (scheduler.logging) {
                console.warn("Invalid schedule:\n", container.div);
            }
        }
        return container.schedule.type;
    },
    getNextTime(container, sh) {
        const now = moment();
        const showHide = container.schedule.showHide.split('|');
        let t = now.clone();
        switch (container.schedule.type) {
            case 'onceOff':
                if (sh === 'show') {
                    t = moment(container.schedule.show);
                    if (!t.isValid()) {
                        t = moment(0);
                    }
                }
                else {
                    t = moment(container.schedule.hide);
                    if (!t.isValid()) {
                        t = scheduler.endOfTime;
                    }
                }
                break;
            case 'recurringSingle':
                let arrSH;
                if (sh === "show") {
                    arrSH = container.schedule.show.split('|');
                }
                else {
                    arrSH = container.schedule.hide.split('|');
                }
                const time = arrSH[1].split(':');
                let dayIndex = scheduler.days.indexOf(arrSH[0]);
                if (dayIndex === -1) {
                    dayIndex = now.day();
                    if (scheduler.logging) {
                        console.warn(`Invalid day in 'show' attribute:\n`, container.div);
                    }
                }
                const daysAdded = (dayIndex + 7 - now.day()) % 7;
                t.add(daysAdded, 'days');
                t.hours(parseInt(time[0], 10));
                t.minutes(parseInt(time[1], 10));
                t.seconds(parseInt(time[2], 10));
                if (daysAdded === 0 && now.isAfter(t)) {
                    t.add(7, 'days');
                }
                break;
            case 'recurringMultipleRange':
                const daysStr = showHide[0].split(',');
                const timesStr = showHide[1].split(',');
                let daysArr = daysStr.map(day => scheduler.days.indexOf(day)).sort();
                if (daysArr[0] === -1) {
                    if (scheduler.logging) {
                        console.warn(`Invalid day in 'show-hide' attribute:\n`, container.div);
                    }
                    break;
                }
                let i = 0;
                if (sh === 'hide')
                    i = 1;
                let timesArr = timesStr.map(times => times.split('-')[i]);
                let dist = daysArr.map(e => (e + 7 + now.day()) % 7).sort();
                if (dist[0] !== 0) {
                    t.add(dist[0], 'days');
                    const time = timesArr[0].split(':');
                    t.hour(parseInt(time[0], 10));
                    t.minute(parseInt(time[1], 10));
                    t.second(0);
                }
                else {
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
                            t.add(dist[1], 'days');
                            const time = timesArr[0].split(':');
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
        t.utcOffset(container.schedule.timezone);
        return t;
    },
    showHide(container) {
        if (container.schedule.type === 'invalid')
            return;
        if (container.div.dataset.clock)
            return;
        const now = moment();
        if (now.isBetween(container.schedule.nextShow, container.schedule.nextHide)) {
            if (!container.div.classList.contains('hidden'))
                return;
            if (scheduler.logging)
                console.log(`showing container.`);
            container.div.classList.remove('hidden');
            if (container.hasVideo) {
                scheduler.insertVideo(container.div);
            }
            if (container.hasChat) {
                scheduler.insertChat(container.div);
            }
            return;
        }
        if (container.div.classList.contains('hidden'))
            return;
        if (scheduler.logging)
            console.log(`hiding container.`);
        container.div.classList.add('hidden');
        container.schedule.nextShow = scheduler.getNextTime(container, 'show');
        container.schedule.nextHide = scheduler.getNextTime(container, 'hide');
        if (container.hasVideo || container.hasChat) {
            container.div.innerHTML = "";
        }
    },
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
                }
                else {
                    container.div.innerHTML = `<p>${time}</p>`;
                }
            });
        }, 1000);
        if (scheduler.logging)
            console.log(`timeLoop started.`);
    },
    clockCalc(container) {
        let clock = "";
        console.log(container);
        return clock;
    },
    padZero(num) {
        let s = num.toString();
        if (s.length === 1)
            s = '0' + s;
        return s;
    },
    insertVideo(container) {
        if (container.querySelector('.containerVideo') != null) {
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
        }
        else {
            console.warn(`invalid video embed parameters.`);
        }
        if (this.logging)
            console.log(`video inserted.`);
    },
    insertChat(container) {
        if (container.querySelector('.containerChat') != null) {
            return;
        }
        const chatUrl = container.dataset.chatUrl;
        const chatPublisher = container.dataset.chatPublisher;
        const chatRoom = container.dataset.chatRoom;
        let template = '';
        if (chatUrl) {
            template = `<div class="containerChat"><iframe src="${chatUrl}"></iframe></div>`;
            container.insertAdjacentHTML('beforeend', template);
        }
        else if (chatPublisher) {
            template = `<div class="arena-chat containerChat" data-publisher="${chatPublisher}" data-chatroom="${chatRoom}" data-position="in-page"></div>`;
            container.insertAdjacentHTML('beforeend', template);
            const scriptSrc = `https://go.arena.im/public/js/arenachatlib.js?p=${chatPublisher}&e=${chatRoom}`;
            this.insertScript(scriptSrc);
        }
        else {
            console.warn(`incorrect dataset parameters for chat embedding.`);
        }
        if (this.logging)
            console.log(`chat inserted.`);
    },
    insertScript(src) {
        if (document.querySelector(`script[src="${src}"]`))
            return;
        const s = document.createElement('script');
        s.setAttribute('src', src);
        document.body.appendChild(s);
    },
    vidResize() {
        let cv = document.querySelector('div.containerVideo');
        cv.style.height = cv.clientWidth * 9 / 16 + 'px';
    }
};
scheduler.start();
window.scheduler = scheduler;
//# sourceMappingURL=index.js.map
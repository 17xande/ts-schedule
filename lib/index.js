import moment from '../node_modules/moment/moment.js';
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
            const chatRoom = div.dataset.chatRoom ?? '';
            const videoUrl = div.dataset.videoUrl ?? '';
            let container = {
                div: div,
                hasVideo: div.dataset.embedId?.length === 36 || videoUrl != '',
                hasChat: chatUrl != '' || chatRoom != '',
                schedule: {
                    type: '',
                    show: div.dataset.show ?? '',
                    hide: div.dataset.hide ?? '',
                    showHide: div.dataset.showHide ?? '',
                    timezone: div.dataset.timezone ?? '+02:00',
                    next: { show: moment(0), hide: moment(scheduler.endOfTime) }
                },
            };
            container.schedule.type = scheduler.getScheduleType(container);
            let sh = scheduler.getNextTime(container);
            container.schedule.next = sh;
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
    getNextTime(container) {
        const now = moment();
        const showHide = container.schedule.showHide.split('|');
        let ts = now.clone();
        let th = now.clone();
        switch (container.schedule.type) {
            case 'onceOff':
                ts = moment(container.schedule.show);
                if (!ts.isValid()) {
                    ts = moment(0);
                }
                th = moment(container.schedule.hide);
                if (!th.isValid()) {
                    th = scheduler.endOfTime;
                }
                break;
            case 'recurringSingle':
                const arrS = container.schedule.show.split('|');
                const arrH = container.schedule.hide.split('|');
                const timeS = arrS[1].split(':');
                const timeH = arrH[1].split(':');
                let daysAdded = this.getDayDifference(arrS[0]);
                ts.add(daysAdded, 'days');
                ts.hours(parseInt(timeS[0], 10));
                ts.minutes(parseInt(timeS[1], 10));
                ts.seconds(parseInt(timeS[2], 10));
                daysAdded = this.getDayDifference(arrH[0]);
                th.add(daysAdded, 'days');
                th.hours(parseInt(timeH[0], 10));
                th.minutes(parseInt(timeH[1], 10));
                th.seconds(parseInt(timeH[2], 10));
                if (daysAdded === 0 && now.isAfter(th)) {
                    ts.add(7, 'days');
                    th.add(7, 'days');
                }
                break;
            case 'recurringMultipleRange':
                const daysStr = showHide[0].split(',');
                const timesStr = showHide[1].split(',');
                let dist = daysStr.map(d => scheduler.getDayDifference(d)).sort();
                if (dist[0] !== 0) {
                    ts.add(dist[0], 'days');
                    th.add(dist[0], 'days');
                    let timesArr = timesStr[0].split('-');
                    let time = timesArr[0].split(':');
                    ts.hour(parseInt(time[0], 10));
                    ts.minute(parseInt(time[1], 10));
                    ts.second(0);
                    time = timesArr[1].split(':');
                    th.hour(parseInt(time[0], 10));
                    th.minute(parseInt(time[1], 10));
                    th.second(0);
                }
                else {
                    for (let i = 0; i < timesStr.length; i++) {
                        const ti = timesStr[i].split('-')[1].split(':');
                        let d = now.clone();
                        d.hour(parseInt(ti[0], 10));
                        d.minute(parseInt(ti[1], 10));
                        if (d.isAfter(now)) {
                            const tih = timesStr[i].split('-')[0].split(':');
                            ts.hour(parseInt(tih[0], 10)).minute(parseInt(tih[1], 10)).second(0);
                            th.hour(d.hour()).minute(d.minute()).second(0);
                            break;
                        }
                        if (i === timesStr.length - 1) {
                            ts.add(dist[1], 'days');
                            th.add(dist[1], 'days');
                            const times = timesStr[0].split('-');
                            ts.hour(parseInt(times[0].split(':')[0], 10));
                            ts.minute(parseInt(times[0].split(':')[1], 10));
                            ts.second(0);
                            th.hour(parseInt(times[1].split(':')[0], 10));
                            th.minute(parseInt(times[1].split(':')[1], 10));
                            th.second(0);
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
        ts.utcOffset(container.schedule.timezone);
        th.utcOffset(container.schedule.timezone);
        return { show: ts, hide: th };
    },
    getDayDifference(day) {
        const now = moment();
        let dayIndex = scheduler.days.indexOf(day);
        if (dayIndex === -1) {
            dayIndex = now.day();
            if (scheduler.logging) {
                console.warn(`Invalid day in 'show' attribute:\n`, day);
            }
        }
        const daysAdded = (dayIndex + 7 - now.day()) % 7;
        return daysAdded;
    },
    showHide(container) {
        if (container.schedule.type === 'invalid')
            return;
        if (container.div.dataset.clock)
            return;
        const now = moment();
        if (now.isBetween(container.schedule.next.show, container.schedule.next.hide)) {
            if (container.hasVideo) {
                scheduler.insertVideo(container.div);
            }
            if (container.hasChat) {
                scheduler.insertChat(container.div);
            }
            if (!container.div.classList.contains('hidden'))
                return;
            if (scheduler.logging)
                console.log(`showing container.`);
            container.div.classList.remove('hidden');
            return;
        }
        if (container.div.classList.contains('hidden'))
            return;
        if (scheduler.logging)
            console.log(`hiding container.`);
        container.div.classList.add('hidden');
        const sche = scheduler.getNextTime(container);
        container.schedule.next = { show: sche.show, hide: sche.hide };
        if (container.hasVideo || container.hasChat) {
            container.div.querySelector('.containerVideo')?.remove();
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
        }
        else if (embedID) {
            template = `<div id="la1-video-player" class="containerVideo" data-embed-id="${embedID}"></div>`;
            container.insertAdjacentHTML('afterbegin', template);
            scheduler.insertScript('https://control.livingasone.com/webplayer/loader.min.js');
            window.la1InitWebPlayer?.();
        }
        else {
            console.warn(`invalid video embed parameters.`);
            return;
        }
        if (scheduler.logging)
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
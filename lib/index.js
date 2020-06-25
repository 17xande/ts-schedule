import * as moment from 'moment-timezone';
const scheduler = {
    version: "0.4.1",
    endOfTime: new Date(8640000000000000),
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
        const containers = scheduler.getContainers(scheduler.selector);
        containers.forEach(container => scheduler.showHide(container));
        scheduler.timeLoop(containers);
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
                    timezone: div.dataset.timezone ?? 'Africa/Johannesburg'
                },
            };
            container.schedule.type = scheduler.getScheduleType(container);
            container = scheduler.getDates(container);
            containers.push(container);
        }
        if (scheduler.logging)
            console.log(`containers found: ${containers.length}.`);
        return containers;
    },
    getScheduleType(container) {
        const inv = 'Invalid Date';
        const showDate = new Date(container.schedule.show);
        const hideDate = new Date(container.schedule.hide);
        let scheduleType = 'invalid';
        if (container.schedule.showHide) {
            container.schedule.type = 'recurringMultipleRange';
        }
        else if (container.schedule.show || container.schedule.hide) {
            if (showDate.toString() == inv && hideDate.toString() == inv) {
                container.schedule.type = 'recurringSingle';
            }
            else {
                container.schedule.type = 'onceOff';
            }
        }
        else {
            scheduleType = 'invalid';
            if (scheduler.logging) {
                console.warn("Invalid schedule:\n", container.div);
            }
        }
        return scheduleType;
    },
    getNextShow(container) {
        const inv = 'Invalid Date';
        const now = new Date();
        const day = scheduler.padZero(now.getDate());
        const month = scheduler.padZero(now.getMonth() + 1);
        const year = now.getFullYear();
        const showHide = container.schedule.showHide.split('|');
        let show = new Date();
        let mShow;
        switch (container.schedule.type) {
            case 'onceOff':
                show = new Date(container.schedule.show);
                mShow = moment.tz(container.schedule.show, container.schedule.timezone);
                console.log(mShow);
                if (show.toString() === inv) {
                    show = new Date(0);
                }
                break;
            case 'recurringSingle':
                const arrShow = container.schedule.show.split('|');
                let dayIndex = scheduler.days.indexOf(arrShow[0]);
                if (dayIndex === -1) {
                    dayIndex = now.getDay();
                    if (scheduler.logging) {
                        console.warn(`Invalid day in 'show' attribute:\n${container.div}`);
                    }
                }
                const daysAdded = (dayIndex + (7 - now.getDay())) % 7;
                show.setDate(daysAdded);
                break;
            case 'recurringMultipleRange':
                const timeSlots = showHide[1].split(',');
                for (let i = 0; i < timeSlots.length; i++) {
                    const time = timeSlots[i].split('-')[0];
                    const dateString = `${year}-${month}-${day}T${time}${container.schedule.timezone}`;
                    show = new Date(dateString);
                }
                break;
        }
        return show;
    },
    getNextHide(container) {
        let hide = new Date(container.schedule.hide);
        return hide;
    },
    getDates(container) {
        const timezone = container.div.dataset.timezone || "+02:00";
        let now = new Date();
        const month = scheduler.padZero(now.getMonth() + 1);
        const day = scheduler.padZero(now.getDate());
        let schedule = '';
        let days;
        const timeSlots = schedule.split(',');
        if (new Date() > parseDate(timeSlots[timeSlots.length - 1]).hide) {
            now = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        function parseDate(timeSlots) {
            const times = timeSlots.split('-');
            const date = `${now.getFullYear()}-${month}-${day}T`;
            const show = `${date}${times[0]}:00${timezone}`;
            const hide = `${date}${times[1]}:00${timezone}`;
            return {
                show: new Date(show),
                hide: new Date(hide),
                days: days
            };
        }
        ;
        return container;
    },
    showHide(container) {
        if (container.div.dataset.clock)
            return;
        if (container.div.classList.contains('hidden'))
            return;
        if (scheduler.logging)
            console.log(`hiding container.`);
        container.div.classList.add('hidden');
        if (container.hasVideo || container.hasChat) {
            container.div.innerHTML = "";
            window.removeEventListener('resize', scheduler.vidResize);
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
//# sourceMappingURL=index.js.map
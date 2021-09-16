var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as moment from 'moment-timezone';
const scheduler = {
    endOfTime: moment(32503672800000),
    debug: true,
    logging: true,
    selector: 'div.riversschedule',
    timerID: 0,
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    containers: [],
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (scheduler.debug)
                scheduler.logging = true;
            scheduler.stop();
            const sheetContainers = scheduler.getSheetContainers(scheduler.selector);
            yield scheduler.updateSheetContainers(sheetContainers);
            scheduler.containers = scheduler.getContainers(scheduler.selector);
            scheduler.containers.forEach(container => scheduler.showHide(container));
            scheduler.timeLoop(scheduler.containers);
        });
    },
    stop() {
        if (scheduler.timerID != 0) {
            if (scheduler.logging)
                console.log(`stopping timeLoop: ${scheduler.timerID}`);
            clearInterval(scheduler.timerID);
        }
    },
    getSheetContainers(selector) {
        const els = document.querySelectorAll(selector);
        const sheetContainers = Array.from(els).map(e => e).filter(d => {
            var _a;
            const sheetLookup = (_a = d.dataset.sheetLookup) !== null && _a !== void 0 ? _a : '';
            if (sheetLookup == '')
                return false;
            return true;
        });
        return sheetContainers;
    },
    updateSheetContainers(sheetContainers) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function* () {
            if (sheetContainers.length == 0)
                return;
            let sheets = new Map();
            for (let i = 0; i < sheetContainers.length; i++) {
                const c = sheetContainers[i];
                const id = (_a = c.dataset.sheetId) !== null && _a !== void 0 ? _a : '';
                const lookup = (_b = c.dataset.sheetLookup) !== null && _b !== void 0 ? _b : '';
                if (id == '')
                    return;
                let sheet = (_c = sheets.get(id)) !== null && _c !== void 0 ? _c : {};
                if (!sheet.lookup)
                    sheet.lookup = [];
                sheet.lookup.push(lookup);
                sheet.id = id;
                sheets.set(id, sheet);
                if (!sheet.value) {
                    const url = `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv`;
                    const res = yield fetch(url);
                    sheet.value = yield res.text();
                }
                sheet.entries = scheduler.parseSheet(sheet.value);
                const rows = sheet.entries.filter((e) => e.key === lookup);
                if (rows.length === 0) {
                    console.error(`key ${lookup} not found in sheet.`);
                    return Promise.reject();
                }
                const row = rows[0];
                c.dataset.show = (_d = row.show) !== null && _d !== void 0 ? _d : '';
                c.dataset.hide = (_e = row.hide) !== null && _e !== void 0 ? _e : '';
                c.dataset.videoUrl = (_f = row.videoUrl) !== null && _f !== void 0 ? _f : '';
                c.dataset.sheetId = '';
                c.dataset.sheetLookup = '';
            }
        });
    },
    parseSheet(text) {
        const lines = text.split('\n');
        let entries = [];
        for (let l of lines) {
            const fields = l.split(',');
            const entry = {
                key: fields[0],
                videoUrl: fields[1],
                show: fields[2],
                hide: fields[3],
                showDate: fields[4],
                hideDate: fields[5],
                time: fields[6],
                WebUrlCheck: fields[7],
            };
            entries.push(entry);
        }
        return entries;
    },
    getContainers(selector) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const divs = document.querySelectorAll(selector);
        let containers = [];
        for (let i = 0; i < divs.length; i++) {
            const div = divs[i];
            const chatUrl = (_a = div.dataset.chatUrl) !== null && _a !== void 0 ? _a : '';
            const chatRoom = (_b = div.dataset.chatRoom) !== null && _b !== void 0 ? _b : '';
            const videoUrl = (_c = div.dataset.videoUrl) !== null && _c !== void 0 ? _c : '';
            const clockEnd = (_d = div.dataset.clockend) !== null && _d !== void 0 ? _d : '';
            let container = {
                div: div,
                hasVideo: ((_e = div.dataset.embedId) === null || _e === void 0 ? void 0 : _e.length) === 36 || videoUrl != '',
                hasChat: chatUrl != '' || chatRoom != '',
                hasClock: clockEnd != '',
                schedule: {
                    type: '',
                    show: (_f = div.dataset.show) !== null && _f !== void 0 ? _f : '',
                    hide: (_g = div.dataset.hide) !== null && _g !== void 0 ? _g : '',
                    showHide: (_h = div.dataset.showHide) !== null && _h !== void 0 ? _h : '',
                    timezone: (_j = div.dataset.timezone) !== null && _j !== void 0 ? _j : 'Africa/Johannesburg',
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
        const showDate = moment.tz(container.schedule.show, container.schedule.timezone);
        const hideDate = moment.tz(container.schedule.hide, container.schedule.timezone);
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
        const now = moment.tz(container.schedule.timezone);
        const showHide = container.schedule.showHide.split('|');
        let ts = now.clone();
        let th = now.clone();
        switch (container.schedule.type) {
            case 'onceOff':
                ts = moment.tz(container.schedule.show, container.schedule.timezone);
                if (!ts.isValid()) {
                    ts = moment(0);
                }
                th = moment.tz(container.schedule.hide, container.schedule.timezone);
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
        return { show: ts, hide: th };
    },
    getDayDifference(day) {
        const now = moment.tz('Africa/Johannesburg');
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
            container.div.querySelectorAll('.containerVideo, .containerChat, .arena--initial-loading').forEach(e => e.remove());
        }
    },
    timeLoop(containers) {
        let that = this;
        scheduler.timerID = window.setInterval(() => {
            containers.forEach(container => {
                that.showHide(container);
                if (container.hasClock) {
                    const time = that.clockCalc(container);
                    const el = container.div.querySelector('.rivTime');
                    if (el) {
                        el.textContent = time;
                    }
                    else {
                        container.div.innerHTML = `<p>${time}</p>`;
                    }
                }
            });
        }, 1000);
        if (scheduler.logging)
            console.log(`timeLoop started.`);
    },
    clockCalc(container) {
        const now = moment();
        const clockEnd = (container.div.dataset.clockend || "00:00").split(':');
        const endTime = container.schedule.next.hide;
        const dur = moment.duration(endTime.diff(now)).add(clockEnd[0], 'minutes').add(clockEnd[1], 'seconds');
        const days = dur.days();
        let sDays = '';
        if (days === 1) {
            sDays = 'Day';
        }
        else if (days > 1) {
            sDays = 'Days';
        }
        const clock = `${days || ''} ${sDays} ${scheduler.padZero(dur.hours())}:${scheduler.padZero(dur.minutes())}:${scheduler.padZero(dur.seconds())}`;
        return clock;
    },
    padZero(num) {
        let s = num.toString();
        if (s.length === 1)
            s = '0' + s;
        return s;
    },
    insertVideo(container) {
        var _a;
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
            template = `<div id="resi-video-player" class="containerVideo" data-embed-id="${embedID}"></div>`;
            container.insertAdjacentHTML('afterbegin', template);
            scheduler.insertScript('https://control.resi.io/webplayer/loader.min.js');
            (_a = window.la1InitWebPlayer) === null || _a === void 0 ? void 0 : _a.call(window);
        }
        else {
            console.warn(`invalid video embed parameters.`);
            return;
        }
        if (scheduler.logging)
            console.log(`video inserted.`);
    },
    insertChat(container) {
        var _a, _b;
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
            (_b = (_a = window.arenaChat) === null || _a === void 0 ? void 0 : _a.reset) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        else {
            console.warn(`incorrect dataset parameters for chat embedding.`);
        }
        if (this.logging)
            console.log(`chat inserted.`);
    },
    insertSheetLookup(container) {
        if (container.querySelector('.containerVideo') != null) {
            return Promise.resolve();
        }
        const sheetId = container.dataset.sheetId;
        const sheetLookup = container.dataset.sheetLookup;
        const url = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv`;
        const p = fetch(url)
            .then(res => res.text())
            .then(text => {
            var _a, _b;
            const entries = scheduler.parseSheet(text);
            const f = entries.filter((e) => e.key === sheetLookup);
            if (f.length === 0)
                return Promise.reject();
            const src = (_b = (_a = f[0]) === null || _a === void 0 ? void 0 : _a.videoUrl) !== null && _b !== void 0 ? _b : '';
            if (src === '')
                return Promise.reject();
            const template = `<div class="containerVideo"><iframe src=${src}></iframe></div>`;
            container.insertAdjacentHTML('afterbegin', template);
            return src;
        });
        return p;
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
//# sourceMappingURL=ts-schedule.js.map
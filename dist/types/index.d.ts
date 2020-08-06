import moment from '../node_modules/moment/moment.js';
interface Scheduler {
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
    getNextTime(container: Container): {
        show: moment.Moment;
        hide: moment.Moment;
    };
    getDayDifference(day: string): number;
    showHide(container: Container): void;
    clockCalc(container: Container): string;
    timeLoop(containers: Container[]): void;
    padZero(num: number): string;
    insertVideo(container: HTMLDivElement): void;
    insertChat(container: HTMLDivElement): void;
    insertScript(src: string): void;
    vidResize(): void;
}
interface Container {
    div: HTMLDivElement;
    hasVideo: boolean;
    hasChat: boolean;
    schedule: {
        type: string;
        show: string;
        hide: string;
        showHide: string;
        timezone: string;
        next: {
            show: moment.Moment;
            hide: moment.Moment;
        };
    };
}
export declare const scheduler: Scheduler;
export {};

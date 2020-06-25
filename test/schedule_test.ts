// const tester = {
//   testDataSunday: {
//     startBuffer: 9,
//     endBuffer: 5,
//     imgSrc: "https://cdn.rivers.church/wp-content/uploads/sites/4/2020/03/26121029/Artboard-1.jpg",
//     timezone: "+02:00",
//     day: "Sunday",
//     Schedule: ["07:51", "09:21", "10:51", "12:21", "13:51", "15:21", "16:51"],
//     campuses: [
//       {
//         name: 'ballito',
//         contentID: "15ceaff0-1a08-4dce-9fd9-36b5ca640012",
//         youtube: "https://www.youtube.com/channel/UCXWPfUyrHUNYYqPh2kQP96g",
//       },
//       {
//         name: 'centurion',
//         contentID: "dbd835a0-d85e-46d8-bcee-7f3177279865",
//         youtube: "https://www.youtube.com/channel/UCJLS4R39IDxe-reEy7I7OXg",
//       },
//       {
//         name: 'durban-north',
//         contentID: "543b027f-cfc5-470b-8467-372a2db42272",
//         youtube: "https://www.youtube.com/channel/UCzqYJV6TfvdHySp9GO78r6Q",
//       },
//       {
//         name: 'kyalami',
//         contentID: "aa49ae3e-d6da-4ae7-bbeb-35d14ec6c50a",
//         youtube: "https://www.youtube.com/channel/UCO-CyzLZqksoVOJnrIpc2Zg",
//       },
//       {
//         name: 'sandton',
//         contentID: "cd01cdaf-1846-4100-858c-78e413ab6798",
//         youtube: "https://www.youtube.com/c/riverssandton",
//       }
//     ]
//   },

//   report: {
//     campus: [""],
//     showDays: [""],
//     schedule: [""],
//     image: [""],
//     timezone: [""],
//   },

//   // test gets some input from the user on what parameters are expected in the page
//   // and returns a message if the page reflects what is expected.
//   test() {
//     const containers = scheduler.getContainers(scheduler.selector);
//     this.createDialog(containers);
//   },

//   // createDialog creates an HTML Dialog that for users to enter test data.
//   createDialog(containers: Array<Container>) {
//     const d = <HTMLDialogElement>document.querySelector('#diagReport'),
//           pCampus = <HTMLParagraphElement>d.querySelector('.dialogCampus')!,
//           pShowDays = <HTMLParagraphElement>d.querySelector('.dialogShowDays')!,
//           pSchedule = <HTMLParagraphElement>d.querySelector('.dialogSchedule')!,
//           pTimezone = <HTMLParagraphElement>d.querySelector('.dialogTimezone')!,
//           pImage = <HTMLParagraphElement>d.querySelector('.dialogImage')!,
//           campus = document.location.pathname.split('/')[1];

//     containers.forEach(c => {
//       const isIframe = c.div.dataset.contentid?.length === 36,
//             isClock = c.div.dataset.clock === "true",
//             day = c.div.dataset.day!,
//             schedule = c.div.dataset.schedule!,
//             timezone = c.div.dataset.timezone!,
//             image = c.div.querySelector('img');

//       if (this.report.showDays.indexOf(day) === -1) {
//         this.report.showDays.push(day);
//       }

//       if (this.report.schedule.indexOf(schedule) === -1) {
//         this.report.schedule.push(schedule);
//       }

//       if (this.report.timezone.indexOf(timezone) === -1) {
//         this.report.timezone.push(timezone);
//       }

//       if (image && this.report.image.indexOf(image.src) === -1) {
//         this.report.image.push(`<img src="${image.src}" style="width: 50px">`);
//       }

//       if (isIframe) {
//         for (let i = 0; i < this.testDataSunday.campuses.length; i++) {
//           const objCamp = this.testDataSunday.campuses[i];

//           if (objCamp.contentID === c.div.dataset.contentid) {
//             this.report.campus.push(objCamp.name);
//             if (objCamp.name === campus) {
//               this.report.campus.push(`✔`);
//             } else {
//               this.report.campus.push(`!= ${campus} ⚠`);
//             }
//           }
//         }

//         if (this.report.campus.length === 1) {
//           this.report.campus.unshift(`⚠ Error: campus link on page is invalid!\nContentID: ${c.div.dataset.contentid!}`);
//         }
//       }


//       if (isClock) {
//         console.log('clock found');
//       }
//     });

//     if (this.report.schedule.length > 2) {
//       this.report.schedule.unshift(`⚠ Warning: Multiple (${this.report.schedule.length - 1}) schedules found in page:\n`);
//     }

//     if (this.report.timezone.length > 3) {
//       this.report.timezone.unshift(`⚠ Warning: Multipe (${this.report.timezone.length - 1} timezones found in page:\n)`);
//     }

//     if (this.report.campus.length > 3) {
//         this.report.campus.unshift(`⚠ Error: Multiple campus iFrames found in page: `);
//     }

//     pCampus.innerText += this.report.campus.join(' ');
//     pShowDays.innerText += this.report.showDays.join(' ');
//     pSchedule.innerText += this.report.schedule.join('\n');
//     pTimezone.innerText += this.report.timezone.join(' ');
//     pImage.innerHTML += this.report.image.join(' ');

//     d.showModal();
//   }
// };

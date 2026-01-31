let userData = {};
let timeOffset = 0;
let precision = {
    'time-until-class': false,
    'time-until-period': false,
    'time-until-day': false
};

let lastStrings = {
    'time-until-class': '',
    'time-until-period': '',
    'time-until-day': ''
};

const PERIODS_LONG = [
    { id: "0", start: "09:10", end: "09:25", type: "reg" },
    { id: "1", start: "09:25", end: "10:05", type: "p" },
    { id: "2", start: "10:05", end: "10:45", type: "p" },
    { id: "break", start: "10:45", end: "11:00", type: "break" },
    { id: "3", start: "11:00", end: "11:40", type: "p" },
    { id: "4", start: "11:40", end: "12:20", type: "p" },
    { id: "5", start: "12:20", end: "13:00", type: "p" },
    { id: "6", start: "13:00", end: "13:35", type: "p" },
    { id: "7", start: "13:35", end: "14:10", type: "p" },
    { id: "8", start: "14:10", end: "14:50", type: "p" },
    { id: "9", start: "14:50", end: "15:30", type: "p" }
];

const PERIODS_SHORT = [
    { id: "0", start: "09:10", end: "09:25", type: "reg" },
    { id: "1", start: "09:25", end: "10:05", type: "p" },
    { id: "2", start: "10:05", end: "10:45", type: "p" },
    { id: "3", start: "10:45", end: "11:25", type: "p" },
    { id: "4", start: "11:25", end: "12:05", type: "p" },
    { id: "5", start: "12:05", end: "12:45", type: "p" },
    { id: "6", start: "12:45", end: "13:25", type: "p" },
    { id: "7", start: "13:25", end: "14:05", type: "p" }
];

function timeToMins(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function formatDiff(totalMs, showMs = false) {
    if (totalMs <= 0) return showMs ? "00:00:00.000" : "00:00:00";
    const totalSeconds = Math.floor(totalMs / 1000);
    const ms = Math.floor(totalMs % 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    let base = `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return showMs ? `${base}.${ms.toString().padStart(3, '0')}` : base;
}

function updateRollingTimer(id, newStr) {
    const container = document.getElementById(id);
    if (!container) return;
    const oldStr = lastStrings[id];
    if (oldStr === newStr) return;
    if (precision[id]) {
        container.innerText = newStr;
        lastStrings[id] = newStr;
        return;
    }
    if (container.children.length !== newStr.length) {
        container.innerHTML = '';
        [...newStr].forEach(char => {
            const span = document.createElement('span');
            span.style.display = 'inline-block';
            span.innerText = char;
            container.appendChild(span);
        });
    }
    [...newStr].forEach((char, i) => {
        const span = container.children[i];
        if (span.innerText !== char) {
            gsap.to(span, {
                y: -15,
                opacity: 0,
                duration: 0.15,
                onComplete: () => {
                    span.innerText = char;
                    gsap.fromTo(span, 
                        { y: 15, opacity: 0 }, 
                        { y: 0, opacity: 1, duration: 0.2, ease: "back.out(1.7)" }
                    );
                }
            });
        }
    });
    lastStrings[id] = newStr;
}

function updateURLParam(key, val) {
    const url = new URL(window.location);
    url.searchParams.set(key, val);
    window.history.pushState({}, '', url);
    updateSettingsLink();
}

function updateSettingsLink() {
    const link = document.getElementById('settings-link');
    if (link) link.href = `./settings/${window.location.search}`;
}

async function syncTime() {
    try {
        const start = Date.now();
        const response = await fetch('https://worldtimeapi.org/api/ip');
        const data = await response.json();
        const serverTime = new Date(data.datetime).getTime();
        timeOffset = serverTime - (start + (Date.now() - start) / 2);
    } catch (e) { console.warn("Time sync failed"); }
}

async function loadDataAndInit() {
    try {
        await syncTime();
        const response = await fetch('users.json');
        userData = await response.json();
        const params = new URLSearchParams(window.location.search);
        const user = params.get('u');
        if (user && userData[user]) document.getElementById('userSelector').value = user;

        const presets = {
            dark: { bg: '000000', txt: 'ffffff' },
            light: { bg: 'ffffff', txt: '000000' },
            luxury: { bg: '1a2e35', txt: 'ffcc00' }
        };

        const theme = params.get('t');
        const bg = params.get('bg');
        const txt = params.get('txt');

        if (theme && presets[theme]) {
            document.documentElement.style.setProperty('--bg-color', `#${presets[theme].bg}`);
            document.documentElement.style.setProperty('--text-main', `#${presets[theme].txt}`);
        } else if (theme === 'custom' && bg && txt) {
            document.documentElement.style.setProperty('--bg-color', `#${bg}`);
            document.documentElement.style.setProperty('--text-main', `#${txt}`);
        }

        document.querySelectorAll('.clickable-timer').forEach(timer => {
            timer.addEventListener('click', () => {
                precision[timer.id] = !precision[timer.id];
                document.getElementById(timer.id).innerHTML = '';
            });
        });

        updateSettingsLink();
        update();
        setInterval(update, 50);
    } catch (e) { console.error("Init failed", e); }
}

function update() {
    const params = new URLSearchParams(window.location.search);
    const devTime = params.get('devt'), devDay = params.get('devd');
    let nowFull = new Date(Date.now() + timeOffset);
    const day = (devDay !== null) ? parseInt(devDay) : nowFull.getDay();
    
    let currentMs;
    if (devTime) {
        const p = devTime.split(':').map(Number);
        currentMs = ((p[0] * 3600) + (p[1] * 60) + (p[2] || 0)) * 1000;
    } else {
        currentMs = (nowFull.getHours() * 3600 + nowFull.getMinutes() * 60 + nowFull.getSeconds()) * 1000 + nowFull.getMilliseconds();
    }

    const currentMins = Math.floor(currentMs / 60000);
    const schedule = (day === 0 || day === 6) ? null : ((day === 3 || day === 5) ? PERIODS_SHORT : PERIODS_LONG);
    
    if (!schedule) {
        document.getElementById('status-label').innerText = "Weekend";
        updateRollingTimer('time-until-class', "OFF");
        document.title = "Weekend | potatogamer.uk"; // restored title
        return;
    }

    const user = document.getElementById('userSelector').value;
    const classes = userData[user]?.timetable[day] || {};

    const endMs = timeToMins(schedule[schedule.length - 1].end) * 60000;
    updateRollingTimer('time-until-day', formatDiff(endMs - currentMs, precision['time-until-day']));

    let pIdx = schedule.findIndex(p => currentMins >= timeToMins(p.start) && currentMins < timeToMins(p.end));
    let p = pIdx !== -1 ? schedule[pIdx] : null;
    if (p) {
        updateRollingTimer('time-until-period', formatDiff((timeToMins(p.end) * 60000) - currentMs, precision['time-until-period']));
    } else {
        updateRollingTimer('time-until-period', "--:--");
    }

    let active = (p && classes[p.id]) ? classes[p.id] : null;
    let next = schedule.find(p => timeToMins(p.start) > currentMins && classes[p.id]);

    if (active) {
        let last = p;
        for (let i = pIdx + 1; i < schedule.length; i++) {
            if (classes[schedule[i].id] === active) last = schedule[i]; else break;
        }
        const diff = (timeToMins(last.end) * 60000) - currentMs;
        const diffText = formatDiff(diff, precision['time-until-class']);
        document.getElementById('status-label').innerText = `End of ${active}`;
        updateRollingTimer('time-until-class', diffText);
        document.title = `${diffText} till ${active} ends | potatogamer.uk`; // restored title
    } else if (next) {
        const diff = (timeToMins(next.start) * 60000) - currentMs;
        const diffText = formatDiff(diff, precision['time-until-class']);
        document.getElementById('status-label').innerText = `Next Class`;
        updateRollingTimer('time-until-class', diffText);
        document.title = `${diffText} till ${classes[next.id]} starts | potatogamer.uk`; // restored title
    } else {
        document.getElementById('status-label').innerText = "School Finished";
        updateRollingTimer('time-until-class', "DONE");
        document.title = "School Finished | potatogamer.uk"; // restored title
    }

    // restored next class preview
    let up = active ? schedule.slice(pIdx + 1).find(p => classes[p.id] && classes[p.id] !== active) : next;
    const previewEl = document.getElementById('next-class-preview');
    if (previewEl) {
        previewEl.innerText = (up && classes[up.id]) ? `Next Up: ${classes[up.id]}` : "";
    }
}

loadDataAndInit();
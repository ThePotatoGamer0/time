let userData = {};

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

function formatDiff(totalSeconds) {
    if (totalSeconds <= 0) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateURLParam(key, val) {
    const url = new URL(window.location);
    url.searchParams.set(key, val);
    window.history.pushState({}, '', url);
}

async function loadDataAndInit() {
    try {
        const response = await fetch('users.json');
        userData = await response.json();
        
        const params = new URLSearchParams(window.location.search);
        const user = params.get('u');
        if (user && userData[user]) document.getElementById('userSelector').value = user;

        const theme = params.get('t');
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            document.getElementById('sun-svg').style.display = 'none';
            document.getElementById('moon-svg').style.display = 'block';
        }

        update();
        setInterval(update, 1000);
    } catch (e) {
        console.error("Failed to load user data", e);
    }
}

function update() {
    const params = new URLSearchParams(window.location.search);
    const devTime = params.get('devt');
    
    let now = new Date();
    let currentSecs;

    if (devTime) {
        document.getElementById('test-indicator').style.display = 'block';
        const parts = devTime.split(':').map(Number);
        currentSecs = (parts[0] * 3600) + (parts[1] * 60) + (parts[2] || 0);
    } else {
        document.getElementById('test-indicator').style.display = 'none';
        currentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    }

    const currentMins = Math.floor(currentSecs / 60);
    const day = now.getDay(); 
    const isShort = (day === 3 || day === 5);
    const schedule = (day === 0 || day === 6) ? null : (isShort ? PERIODS_SHORT : PERIODS_LONG);
    
    if (!schedule) {
        document.getElementById('status-label').innerText = "Weekend";
        document.getElementById('time-until-class').innerText = "OFF";
        document.getElementById('time-until-period').innerText = "--:--";
        document.getElementById('time-until-day').innerText = "--:--";
        document.title = "Weekend | potatogamer.uk";
        return;
    }

    const user = document.getElementById('userSelector').value;
    const userClasses = userData[user]?.timetable[day] || {};

    const schoolEndSecs = timeToMins(schedule[schedule.length - 1].end) * 60;
    const diffEndDay = schoolEndSecs - currentSecs;
    document.getElementById('time-until-day').innerText = diffEndDay > 0 ? formatDiff(diffEndDay) : "--:--";

    let currentPeriodIdx = schedule.findIndex(p => currentMins >= timeToMins(p.start) && currentMins < timeToMins(p.end));
    let currentPeriod = currentPeriodIdx !== -1 ? schedule[currentPeriodIdx] : null;
    if (currentPeriod) {
        document.getElementById('time-until-period').innerText = formatDiff((timeToMins(currentPeriod.end) * 60) - currentSecs);
    } else {
        document.getElementById('time-until-period').innerText = "--:--";
    }

    let activeClassName = (currentPeriod && userClasses[currentPeriod.id]) ? userClasses[currentPeriod.id] : null;
    let nextClassPeriod = schedule.find(p => timeToMins(p.start) > currentMins && userClasses[p.id]);

    if (activeClassName) {
        let lastConsecutivePeriod = currentPeriod;
        for (let i = currentPeriodIdx + 1; i < schedule.length; i++) {
            if (userClasses[schedule[i].id] === activeClassName) lastConsecutivePeriod = schedule[i];
            else break;
        }
        const timeStr = formatDiff((timeToMins(lastConsecutivePeriod.end) * 60) - currentSecs);
        document.getElementById('status-label').innerText = `End of ${activeClassName}`;
        document.getElementById('time-until-class').innerText = timeStr;
        document.title = `${timeStr} till ${activeClassName} ends | potatogamer.uk`;
    } else if (nextClassPeriod) {
        const timeStr = formatDiff((timeToMins(nextClassPeriod.start) * 60) - currentSecs);
        document.getElementById('status-label').innerText = `Time Until Next Class`;
        document.getElementById('time-until-class').innerText = timeStr;
        document.title = `${timeStr} till ${userClasses[nextClassPeriod.id]} starts | potatogamer.uk`;
    } else {
        document.getElementById('status-label').innerText = "School Finished";
        document.getElementById('time-until-class').innerText = "DONE";
        document.title = "School Finished | potatogamer.uk";
    }

    let upcoming = activeClassName ? 
        schedule.slice(currentPeriodIdx + 1).find(p => userClasses[p.id] && userClasses[p.id] !== activeClassName) : 
        nextClassPeriod;
    document.getElementById('next-class-preview').innerText = (upcoming && userClasses[upcoming.id]) ? `Next Up: ${userClasses[upcoming.id]}` : "";
}

document.getElementById('theme-toggle').addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    document.getElementById('sun-svg').style.display = isLight ? 'none' : 'block';
    document.getElementById('moon-svg').style.display = isLight ? 'block' : 'none';
    updateURLParam('t', isLight ? 'light' : 'dark');
});

document.getElementById('bookmark-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        alert("URL copied! Press Ctrl+D to bookmark this configuration.");
    });
});

loadDataAndInit();
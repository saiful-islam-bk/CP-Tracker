document.addEventListener("DOMContentLoaded", () => {
    loadUpcomingContests();
});
// =========================================================
// LOAD UPCOMING CONTESTS
// =========================================================
async function loadUpcomingContests() {
    const container = document.querySelector(".upcoming-contests");
    if (!container) return;
    container.innerHTML = `
        <div class="panel-header">
            <div>
                <h3>Upcoming Contests</h3>
                <span>Loading upcoming contests...</span>
            </div>
        </div>
        <div class="contest-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading contests...
        </div>
    `;
    try {
        const response = await fetch("/api/contests/upcoming");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!data.success) {
            throw new Error("Unable to load contests");
        }
        renderUpcomingContests(data.contests);
    } catch (error) {
        console.error("Contest loading error:", error);
        container.innerHTML = `
            <div class="panel-header">
                <div>
                    <h3>Upcoming Contests</h3>
                    <span>Don't miss your next opportunity.</span>
                </div>
            </div>
            <div class="contest-empty">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <strong>Unable to load contests</strong>
                <span>
                    Please try again later.
                </span>
            </div>
        `;
    }
}
// =========================================================
// RENDER CONTESTS
// =========================================================
function renderUpcomingContests(contests) {
    const container = document.querySelector(".upcoming-contests");
    if (!container) return;
    if (!contests || contests.length === 0) {
        container.innerHTML = `
            <div class="panel-header">
                <div>
                    <h3>Upcoming Contests</h3>
                    <span>Don't miss your next opportunity.</span>
                </div>
            </div>
            <div class="contest-empty">
                <i class="fa-regular fa-calendar-xmark"></i>
                <strong>No upcoming contests found.</strong>
                <span>
                    Check again later for new contests.
                </span>
            </div>
        `;
        return;
    }
    container.innerHTML = `
        <div class="panel-header">
            <div>
                <h3>Upcoming Contests</h3>
                <span>Don't miss your next opportunity.</span>
            </div>
        </div>
        <div class="contest-list">
            ${contests.slice(0, 5).map(contest => `
                <div class="contest-item"
                     data-start-time="${contest.startTime}">
                    <div class="contest-platform ${getPlatformClass(contest.platform)}">
                        ${contest.platform}
                    </div>
                    <div class="contest-info">
                        <strong title="${escapeHTML(contest.name)}">
                            ${escapeHTML(contest.name)}
                        </strong>
                        <span>
                            <i class="fa-regular fa-calendar"></i>
                            ${formatContestDate(contest.startTime)}
                        </span>
                    </div>
                    <div class="contest-countdown">
                        <span>Starts in</span>
                        <strong>
                            ${getCountdown(contest.startTime)}
                        </strong>
                    </div>
                    <button
                        class="contest-reminder"
                        title="Set reminder"
                        data-contest-id="${contest.id}">
                        <i class="fa-regular fa-bell"></i>
                    </button>
                </div>
            `).join("")}
        </div>
    `;
    startCountdownUpdater();
}
// =========================================================
// PLATFORM CLASS
// =========================================================
function getPlatformClass(platform) {
    platform = platform.toLowerCase();
    if (platform === "cf") return "cf";
    if (platform === "ac") return "ac";
    if (platform === "cc") return "cc";
    return "";
}
// =========================================================
// DATE
// =========================================================
function formatContestDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString("en-BD", {
        timeZone: "Asia/Dhaka",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}
// =========================================================
// COUNTDOWN
// =========================================================
function getCountdown(startTime) {
    const difference = startTime - Date.now();
    if (difference <= 0) {
        return "Starting...";
    }
    const totalSeconds =
        Math.floor(difference / 1000);
    const days =
        Math.floor(totalSeconds / 86400);
    const hours =
        Math.floor((totalSeconds % 86400) / 3600);
    const minutes =
        Math.floor((totalSeconds % 3600) / 60);
    const seconds =
        totalSeconds % 60;
    if (days > 0) {
        return `${days}d ${String(hours).padStart(2, "0")}h`;
    }
    return `${String(hours).padStart(2, "0")}:` +
           `${String(minutes).padStart(2, "0")}:` +
           `${String(seconds).padStart(2, "0")}`;
}
// =========================================================
// LIVE COUNTDOWN
// =========================================================
function startCountdownUpdater() {
    if (window.contestCountdownTimer) {
        clearInterval(window.contestCountdownTimer);
    }
    window.contestCountdownTimer =
        setInterval(() => {
            document
                .querySelectorAll(".contest-item")
                .forEach(item => {
                    const startTime =
                        Number(item.dataset.startTime);
                    const countdown =
                        item.querySelector(
                            ".contest-countdown strong"
                        );
                    if (countdown) {
                        countdown.textContent =
                            getCountdown(startTime);
                    }
                });
        }, 1000);
}
// =========================================================
// HTML ESCAPE
// =========================================================
function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}
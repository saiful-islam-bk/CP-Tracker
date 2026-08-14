/* =========================================================
   CP TRACKER — CONTEST MODULE
   ========================================================= */
(() => {
    "use strict";
    // =====================================================
    // CONFIG
    // =====================================================
    const API_URL = "/api/contests";
    let countdownTimer = null;
    // =====================================================
    // INIT
    // =====================================================
    function initContestModule() {
        const container =
            document.querySelector(
                ".upcoming-contests"
            );
        if (!container) {
            return;
        }
        loadContests();
        setupReminderButtons();
    }
    // =====================================================
    // LOAD CONTESTS
    // =====================================================
    async function loadContests() {
        const container =
            document.querySelector(".upcoming-contests");

        if (!container){
            console.error(
              "❌ .upcoming-contests not found"
          );
          return;
        }

        showLoading(container);

        try {
            const response = await fetch(
                "/api/contests",
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    cache: "no-store"
                }
            );

            console.log("Contest HTTP status:", response.status);

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const result = await response.json();

            console.log(
                "================================="
            );

            console.log("CONTEST API:", result);

            console.log("CONTEST COUNT:", result?.contests?.length);

            console.log("=================================");

            if (!result || result.success !== true) {
                throw new Error(
                    "Contest API returned invalid response"
                );
            }

            const contests =
                Array.isArray(result.contests)
                    ? result.contests
                    : [];

            
            renderContests(
                container,
                contests
            );

        } catch (error) {

            console.error(
                "Contest loading failed:",
                error
            );

            showError(container);
        }
    }
    // =====================================================
    // RENDER
    // =====================================================
    function renderContests(container, contests) {
        /*
        * Remove previous dynamic
        * contest messages/items.
        */

        container
            .querySelectorAll(
                ".contest-loading, " +
                ".contest-empty, " +
                ".contest-error, " +
                ".contest-item"
            )
            .forEach(
                element => element.remove()
            );

        /*
        * No contests.
        */

        if (
            !Array.isArray(contests) ||
            contests.length === 0
        ) {
            showEmpty(container);
            return;
        }


        /*
            * Maximum 2 contests from
            * each platform.
            */

            const cf =
                contests
                    .filter(
                        contest =>
                            contest.platform === "cf"
                    )
                    .sort(
                        (a, b) =>
                            a.timestamp -
                            b.timestamp
                    )
                    .slice(0, 2);

            const ac =
                contests
                    .filter(
                        contest =>
                            contest.platform === "ac"
                    )
                    .sort(
                        (a, b) =>
                            a.timestamp -
                            b.timestamp
                    )
                    .slice(0, 2);

            const cc =
                contests
                    .filter(
                        contest =>
                            contest.platform === "cc"
                    )
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .slice(0, 2);

            const finalContests = [
                ...cf,
                ...ac,
                ...cc
            ].sort(
                (a, b) => a.timestamp - b.timestamp
            );

            console.log("CF:", cf);
            console.log("AC:", ac);
            console.log("CC:", cc);
            console.log("FINAL:", finalContests);

        /*
        * Add contests.
        */

        finalContests.forEach(contest => {

                const normalized =
                    normalizeContest(
                        contest
                    );

                if (
                    !normalized.timestamp
                ) {
                    return;
                }

                const item =
                    createContestItem(
                        normalized
                    );

                container.appendChild(
                    item
                );
            }
        );

        /*
        * Start live countdown.
        */

        startCountdown();
    }
    // =====================================================
    // CREATE ITEM
    // =====================================================
    function createContestItem(
        contest
    ) {
        const item =
            document.createElement(
                "div"
            );
        item.className =
            "contest-item";
        item.dataset.contestId =
            contest.id || "";
        item.dataset.startTime =
            contest.timestamp;
        const platform =
            normalizePlatform(
                contest.platform
            );
        const platformName =
            getPlatformName(
                platform
            );
        const timestamp =
            Number(
                contest.timestamp
            );
        item.innerHTML = `
            <div class="contest-platform ${platform}">
                ${platformName}
            </div>
            <div class="contest-info">
                <strong
                    title="${escapeHTML(
                        contest.name
                    )}"
                >
                    ${escapeHTML(
                        contest.name
                    )}
                </strong>
                <span>
                    <i class="fa-regular fa-calendar"></i>
                    ${formatContestDate(
                        timestamp
                    )}
                </span>
            </div>
            <div class="contest-countdown">
                <span>
                    Starts in
                </span>
                <strong
                    data-contest-countdown="${timestamp}"
                >
                    ${formatCountdown(
                        timestamp -
                        Date.now()
                    )}
                </strong>
            </div>
            <button
                type="button"
                class="contest-reminder"
                data-contest-id="${escapeHTML(
                    String(
                        contest.id || ""
                    )
                )}"
                title="Set reminder"
            >
                <i class="fa-regular fa-bell"></i>
            </button>
        `;
        /*
         * Click contest -> open official page
         */
        item
            .querySelector(
                ".contest-info"
            )
            .style.cursor = "pointer";
        item
            .querySelector(
                ".contest-info"
            )
            .addEventListener(
                "click",
                () => {
                    if (
                        contest.url
                    ) {
                        window.open(
                            contest.url,
                            "_blank",
                            "noopener,noreferrer"
                        );
                    }
                }
            );
        return item;
    }
    // =====================================================
    // PLATFORM
    // =====================================================
    function normalizePlatform(
        platform
    ) {
        const value =
            String(
                platform || ""
            ).toLowerCase();
        if (
            value === "cf" ||
            value.includes(
                "codeforces"
            )
        ) {
            return "cf";
        }
        if (
            value === "ac" ||
            value.includes(
                "atcoder"
            )
        ) {
            return "ac";
        }
        if (
            value === "cc" ||
            value.includes(
                "codechef"
            )
        ) {
            return "cc";
        }
        return "cf";
    }
    function getPlatformName(
        platform
    ) {
        switch (
            platform
        ) {
            case "cf":
                return "CF";
            case "ac":
                return "AC";
            case "cc":
                return "CC";
            default:
                return "CP";
        }
    }
    // =====================================================
    // DATE
    // =====================================================
    function formatContestDate(
        timestamp
    ) {
        const date =
            new Date(
                timestamp
            );
        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Date unavailable";
        }
        const now =
            new Date();
        const today =
            date.toDateString() ===
            now.toDateString();
        const tomorrow =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 1
            ).toDateString() ===
            date.toDateString();
        const time =
            date.toLocaleTimeString(
                "en-BD",
                {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                }
            );
        if (today) {
            return `Today • ${time}`;
        }
        if (tomorrow) {
            return `Tomorrow • ${time}`;
        }
        return date.toLocaleDateString(
            "en-BD",
            {
                month: "short",
                day: "numeric"
            }
        ) +
        ` • ${time}`;
    }
    // =====================================================
    // COUNTDOWN
    // =====================================================
    function formatCountdown(
        milliseconds
    ) {
        if (
            !Number.isFinite(
                milliseconds
            )
        ) {
            return "--:--:--";
        }
        if (
            milliseconds <= 0
        ) {
            return "LIVE";
        }
        let seconds =
            Math.floor(
                milliseconds / 1000
            );
        const days =
            Math.floor(
                seconds / 86400
            );
        seconds %= 86400;
        const hours =
            Math.floor(
                seconds / 3600
            );
        seconds %= 3600;
        const minutes =
            Math.floor(
                seconds / 60
            );
        seconds %=
            60;
        if (
            days > 0
        ) {
            return (
                `${days}d ` +
                `${String(hours).padStart(2, "0")}h`
            );
        }
        return [
            String(
                hours
            ).padStart(
                2,
                "0"
            ),
            String(
                minutes
            ).padStart(
                2,
                "0"
            ),
            String(
                seconds
            ).padStart(
                2,
                "0"
            )
        ].join(":");
    }
    // =====================================================
    // LIVE COUNTDOWN
    // =====================================================
    function startCountdown() {
        if (
            countdownTimer
        ) {
            clearInterval(
                countdownTimer
            );
        }
        countdownTimer =
            setInterval(
                () => {
                    const now =
                        Date.now();
                    document
                        .querySelectorAll(
                            "[data-contest-countdown]"
                        )
                        .forEach(
                            element => {
                                const timestamp =
                                    Number(
                                        element.dataset
                                            .contestCountdown
                                    );
                                const remaining =
                                    timestamp -
                                    now;
                                element.textContent =
                                    formatCountdown(
                                        remaining
                                    );
                            }
                        );
                },
                1000
            );
    }
    // =====================================================
    // LOADING
    // =====================================================
    function showLoading(
        container
    ) {
        removeDynamicMessages(
            container
        );
        const loading =
            document.createElement(
                "div"
            );
        loading.className =
            "contest-loading";
        loading.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>
                Loading upcoming contests...
            </span>
        `;
        container.appendChild(
            loading
        );
    }
    // =====================================================
    // EMPTY
    // =====================================================
    function showEmpty(
        container
    ) {
        removeDynamicMessages(
            container
        );
        const empty =
            document.createElement(
                "div"
            );
        empty.className =
            "contest-empty";
        empty.innerHTML = `
            <i class="fa-regular fa-calendar-xmark"></i>
            <strong>
                No upcoming contests found.
            </strong>
            <span>
                New contests will appear here automatically.
            </span>
        `;
        container.appendChild(
            empty
        );
    }
    // =====================================================
    // ERROR
    // =====================================================
    function showError(
        container
    ) {
        removeDynamicMessages(
            container
        );
        const error =
            document.createElement(
                "div"
            );
        error.className =
            "contest-error";
        error.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            <strong>
                Unable to load contests
            </strong>
            <span>
                Please try again later.
            </span>
            <button
                type="button"
                class="contest-retry"
            >
                Retry
            </button>
        `;
        container.appendChild(
            error
        );
        error
            .querySelector(
                ".contest-retry"
            )
            ?.addEventListener(
                "click",
                loadContests
            );
    }
    // =====================================================
    // REMOVE MESSAGES
    // =====================================================
    function removeDynamicMessages(
        container
    ) {
        container
            .querySelectorAll(
                ".contest-loading, .contest-empty, .contest-error"
            )
            .forEach(
                element =>
                    element.remove()
            );
    }
    // =====================================================
    // REMINDERS
    // =====================================================
    function setupReminderButtons() {
        document.addEventListener(
            "click",
            event => {
                const button =
                    event.target.closest(
                        ".contest-reminder"
                    );
                if (!button) {
                    return;
                }
                button.classList.toggle(
                    "active"
                );
                const icon =
                    button.querySelector(
                        "i"
                    );
                if (
                    button.classList.contains(
                        "active"
                    )
                ) {
                    icon.className =
                        "fa-solid fa-bell";
                    button.title =
                        "Reminder enabled";
                }
                else {
                    icon.className =
                        "fa-regular fa-bell";
                    button.title =
                        "Set reminder";
                }
            }
        );
    }
    // =====================================================
    // ESCAPE HTML
    // =====================================================
    function escapeHTML(
        value
    ) {
        return String(
            value
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }
    // =====================================================
    // START
    // =====================================================
    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initContestModule
        );
    }
    else {
        initContestModule();
    }
    // =====================================================
    // GLOBAL
    // =====================================================
    window.ContestModule = {
        reload:
            loadContests
    };
})();
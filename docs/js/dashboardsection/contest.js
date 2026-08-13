/* =========================================================
   CONTESTS
========================================================= */
function renderContests(data) {
    const contests =
        data?.upcomingContests ||
        data?.contests ||
        [];
    const list =
        document.querySelector(
            ".upcoming-contests"
        );
    if (!list) return;
    /*
     * Normalize contest data
     */
    const items = Array.isArray(contests)
        ? contests
            .map(contest => {
                const start =
                    contest.startTime ||
                    contest.start ||
                    contest.time;
                return {
                    ...contest,
                    start,
                    timestamp:
                        new Date(start).getTime()
                };
            })
            .filter(
                contest =>
                    Number.isFinite(
                        contest.timestamp
                    ) &&
                    contest.timestamp >
                    Date.now()
            )
            .sort(
                (a, b) =>
                    a.timestamp -
                    b.timestamp
            )
            .slice(0, 5)
        : [];
    /*
     * Remove previously rendered
     * contest items and empty state.
     */
    list
        .querySelectorAll(
            ".contest-item, .contest-empty"
        )
        .forEach(item => item.remove());
    /*
     * Empty state
     */
    if (!items.length) {
        const empty =
            document.createElement(
                "div"
            );
        empty.className =
            "contest-empty";
        empty.textContent =
            "No upcoming contests found.";
        list.appendChild(empty);
        clearInterval(
            state.countdownTimer
        );
        return;
    }
    /*
     * Render contests
     */
    items.forEach(contest => {
        const platform =
            String(
                contest.platform ||
                "CP"
            ).toUpperCase();
        const platformClass =
            platform
                .toLowerCase()
                .replace(
                    /[^a-z0-9_-]/g,
                    ""
                );
        const contestId =
            contest.id ||
            contest.name ||
            contest.start ||
            "";
        const div =
            document.createElement(
                "div"
            );
        div.className =
            "contest-item";
        div.innerHTML = `
            <div class="contest-platform ${escapeHTML(platformClass)}">
                ${escapeHTML(
                    platform.slice(0, 2)
                )}
            </div>
            <div class="contest-info">
                <strong>
                    ${escapeHTML(
                        contest.name ||
                        "Contest"
                    )}
                </strong>
                <span>
                    <i class="fa-regular fa-calendar"></i>
                    ${escapeHTML(
                        formatDateTime(
                            contest.start
                        )
                    )}
                </span>
            </div>
            <div class="contest-countdown">
                <span>
                    Starts in
                </span>
                <strong
                    data-contest-countdown="${contest.timestamp}">
                    ${countdown(
                        contest.timestamp -
                        Date.now()
                    )}
                </strong>
            </div>
            <button
                type="button"
                class="contest-reminder"
                data-contest-id="${escapeHTML(
                    contestId
                )}"
                title="Set reminder"
                aria-label="Set contest reminder">
                <i class="fa-regular fa-bell"></i>
            </button>
        `;
        list.appendChild(div);
    });
    setupContestReminderButtons();
    startCountdown();
}
/* =========================================================
   CONTEST COUNTDOWN
========================================================= */
function startCountdown() {
    clearInterval(
        state.countdownTimer
    );
    state.countdownTimer =
        setInterval(() => {
            const elements =
                document.querySelectorAll(
                    "[data-contest-countdown]"
                );
            if (!elements.length) {
                clearInterval(
                    state.countdownTimer
                );
                return;
            }
            elements.forEach(element => {
                const target =
                    Number(
                        element.dataset
                            .contestCountdown
                    );
                if (
                    !Number.isFinite(
                        target
                    )
                ) {
                    return;
                }
                const diff =
                    target -
                    Date.now();
                element.textContent =
                    countdown(diff);
            });
        }, 1000);
}
/* =========================================================
   CONTEST REMINDER
========================================================= */
function setupContestReminderButtons() {
    document
        .querySelectorAll(
            ".contest-reminder"
        )
        .forEach(button => {
            button.onclick = async () => {
                button.classList.toggle(
                    "active"
                );
                const enabled =
                    button.classList.contains(
                        "active"
                    );
                const icon =
                    button.querySelector(
                        "i"
                    );
                if (icon) {
                    icon.className =
                        enabled
                            ? "fa-solid fa-bell"
                            : "fa-regular fa-bell";
                }
                /*
                 * Request notification permission
                 * only when reminder is enabled.
                 */
                if (
                    enabled &&
                    "Notification" in window
                ) {
                    if (
                        Notification.permission ===
                        "default"
                    ) {
                        try {
                            await Notification
                                .requestPermission();
                        } catch (error) {
                            console.warn(
                                "Notification permission request failed:",
                                error
                            );
                        }
                    }
                }
            };
        });
}
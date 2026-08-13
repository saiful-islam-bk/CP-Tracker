    /* =========================================================
       RECENT ACTIVITIES
       ========================================================= */
    function renderRecentActivities(data) {
        const activities =
            data.recentActivities ||
            data.activity ||
            [];
        const container =
            document.querySelector(
                ".activity-timeline"
            );
        if (
            !container ||
            !Array.isArray(activities)
        ) {
            return;
        }
        if (!activities.length) {
            container.innerHTML = `
                <div class="empty-state">
                    No recent activities.
                </div>
            `;
            return;
        }
        container.innerHTML =
            activities
                .slice(0, 8)
                .map(activity => {
                    const type =
                        activity.type ||
                        "solved";
                    const icon =
                        type === "contest"
                            ? "fa-trophy"
                            : type === "sync"
                                ? "fa-rotate"
                                : "fa-check";
                    const title =
                        activity.title ||
                        (
                            type === "contest"
                                ? "Participated in contest"
                                : type === "sync"
                                    ? "Profile synchronized"
                                    : "Solved a problem"
                        );
                    const problem =
                        activity.problem ||
                        activity.name ||
                        "";
                    const platform =
                        activity.platform ||
                        "Platform";
                    const rating =
                        activity.rating;
                    const time =
                        activity.time ||
                        activity.date ||
                        activity.timestamp;
                    return `
                        <div class="activity-item">
                            <div class="activity-icon ${escapeHTML(type)}">
                                <i class="fa-solid ${icon}"></i>
                            </div>
                            <div class="activity-content">
                                <strong>
                                    ${escapeHTML(title)}
                                </strong>
                                <p>
                                    ${
                                        problem
                                            ? `<span class="activity-problem">
                                                ${escapeHTML(problem)}
                                               </span>`
                                            : escapeHTML(platform)
                                    }
                                </p>
                                <div class="activity-meta">
                                    ${
                                        rating
                                            ? `
                                                <span>
                                                    <i class="fa-solid fa-star"></i>
                                                    ${number(rating)}
                                                </span>
                                            `
                                            : ""
                                    }
                                    <span>
                                        ${escapeHTML(
                                            platform
                                        )}
                                    </span>
                                    <span>
                                        ${relativeTime(time)}
                                    </span>
                                </div>
                            </div>
                            <span class="activity-status ${escapeHTML(type)}">
                                ${
                                    type === "contest"
                                        ? signedNumber(
                                            activity.ratingChange ||
                                            0
                                          )
                                        : type === "sync"
                                            ? "Synced"
                                            : "Solved"
                                }
                            </span>
                        </div>
                    `;
                })
                .join("");
    }
    /* =========================================================
    HEATMAP
    ========================================================= */
    function renderHeatmap(data) {
    const grid = $("heatmapGrid");
    const monthsContainer = $("heatmapMonths");
    if (!grid) return;
    const heatmap =
        data?.heatmap ||
        data?.activityHeatmap ||
        [];
    const map = new Map();
    heatmap.forEach(item => {
        const date = new Date(item.date);
        if (Number.isNaN(date.getTime())) return;
        const key = date.toISOString().slice(0, 10);
        map.set(
            key,
            Number(item.count ?? item.solved ?? 0)
        );
    });
    grid.innerHTML = "";
    if (monthsContainer) {
        monthsContainer.innerHTML = "";
    }
    /* ================================
       LAST 365 DAYS
       ================================ */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    /*
       Move to Sunday.
       Sunday = 0
    */
    start.setDate(
        start.getDate() - start.getDay()
    );
    const weeks = [];
    let cursor = new Date(start);
    while (cursor <= today) {
        const week = [];
        for (let day = 0; day < 7; day++) {
            const date = new Date(cursor);
            date.setDate(
                cursor.getDate() + day
            );
            const key =
                date.toISOString().slice(0, 10);
            const count =
                map.get(key) || 0;
            week.push({
                date,
                key,
                count
            });
        }
        weeks.push(week);
        cursor.setDate(
            cursor.getDate() + 7
        );
    }
    /* ================================
       CREATE WEEKS
       ================================ */
    weeks.forEach((week, weekIndex) => {
        const weekElement =
            document.createElement("div");
        weekElement.className =
            "heatmap-week";
        week.forEach(day => {
            let level = 0;
            if (day.count >= 1 && day.count <= 2) {
                level = 1;
            }
            else if (day.count >= 3 && day.count <= 5) {
                level = 2;
            }
            else if (day.count >= 6 && day.count <= 9) {
                level = 3;
            }
            else if (day.count >= 10) {
                level = 4;
            }
            const cell =
                document.createElement("span");
            /*
               IMPORTANT:
               CSS uses heatmap-cell
            */
            cell.className =
                `heatmap-cell level-${level}`;
            cell.title =
                `${day.count} solve${day.count === 1 ? "" : "s"} • ${day.key}`;
            weekElement.appendChild(cell);
        });
        grid.appendChild(weekElement);
    });
    /* ================================
       MONTH NAMES
       ================================ */
    if (monthsContainer) {
        monthsContainer.style.position =
            "relative";
        weeks.forEach((week, index) => {
            const firstDay = week[0].date;
            /*
               Only show when month changes
            */
            if (
                index === 0 ||
                firstDay.getMonth() !==
                weeks[index - 1][0].date.getMonth()
            ) {
                const label =
                    document.createElement("span");
                label.textContent =
                    firstDay.toLocaleDateString(
                        "en-US",
                        {
                            month: "short"
                        }
                    );
                label.style.position =
                    "absolute";
                /*
                   14px cell + 5px gap
                   = 19px per week
                */
                label.style.left =
                    `${index * 19}px`;
                monthsContainer.appendChild(label);
            }
        });
    }
    /* ================================
       ACTIVITY TOTAL
       ================================ */
    const total =
        [...map.values()]
            .reduce(
                (sum, value) =>
                    sum + value,
                0
            );
    setText(
        "activityTotal",
        number(total)
    );
    /* ================================
       LONGEST STREAK
       ================================ */
    const longest =
        calculateLongestStreak(map);
    setText(
        "activityLongestStreak",
        number(longest)
    );
}
    function calculateLongestStreak(map) {
        const dates =
            [...map.entries()]
                .filter(
                    ([, count]) =>
                        count > 0
                )
                .map(
                    ([date]) =>
                        new Date(date)
                )
                .sort(
                    (a, b) =>
                        a - b
                );
        if (!dates.length) {
            return 0;
        }
        let longest = 1;
        let current = 1;
        for (
            let i = 1;
            i < dates.length;
            i++
        ) {
            const diff =
                (
                    dates[i] -
                    dates[i - 1]
                ) /
                86400000;
            if (diff === 1) {
                current++;
                longest =
                    Math.max(
                        longest,
                        current
                    );
            } else {
                current = 1;
            }
        }
        return longest;
    }
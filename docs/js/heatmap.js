/* =========================================================
   CP TRACKER — ACTIVITY HEATMAP
   ========================================================= */
(() => {
    "use strict";
    const API_URL = "http://localhost:3000/dashboard";
    const DAYS = 365;
    let initialized = false;
    /* =====================================================
       INITIALIZE
       ===================================================== */
    function initHeatmap() {
        if (initialized) return;
        const grid = document.getElementById("heatmapGrid");
        if (!grid) {
            console.warn("Heatmap: #heatmapGrid not found.");
            return;
        }
        initialized = true;
        loadHeatmap();
    }
    /* =====================================================
       LOAD
       ===================================================== */
    async function loadHeatmap() {
        const grid =
            document.getElementById("heatmapGrid");
        if (!grid) return;
        showLoading();
        try {
            const token =
                localStorage.getItem("token") ||
                sessionStorage.getItem("token");
            if (!token) {
                throw new Error(
                    "Authentication token not found."
                );
            }
            console.log(
                "🔥 HEATMAP: requesting dashboard data..."
            );
            const response =
                await fetch(
                    API_URL,
                    {
                        method: "GET",
                        headers: {
                            "Authorization":
                                `Bearer ${token}`,
                            "Content-Type":
                                "application/json"
                        }
                    }
                );
            console.log(
                "🔥 HEATMAP: HTTP status =",
                response.status
            );
            const text =
                await response.text();
            console.log(
                "🔥 HEATMAP: raw response =",
                text.substring(0, 500)
            );
            if (!response.ok) {
                throw new Error(
                    `Dashboard HTTP ${response.status}`
                );
            }
            let result;
            try {
                result =
                    JSON.parse(text);
            } catch (error) {
                throw new Error(
                    "Dashboard returned invalid JSON."
                );
            }
            console.log(
                "🔥 HEATMAP: dashboard response =",
                result
            );
            /*
             * Your backend currently returns:
             *
             * {
             *     stats: {...},
             *     activity: [...],
             *     heatmap: [
             *         {
             *             date: "2026-08-01",
             *             count: 3
             *         }
             *     ]
             * }
             */
            const dashboard =
                result.dashboard ||
                result.data ||
                result;
            const heatmap =
                dashboard.heatmap ||
                dashboard.activityHeatmap ||
                [];
            console.log(
                "🔥 HEATMAP: received heatmap =",
                heatmap
            );
            if (!Array.isArray(heatmap)) {
                throw new Error(
                    "Heatmap data is not an array."
                );
            }
            renderHeatmap(heatmap);
        } catch (error) {
            console.error(
                "❌ HEATMAP ERROR:",
                error
            );
            renderEmptyHeatmap();
            showError(
                error.message
            );
        }
    }
    /* =====================================================
       RENDER
       ===================================================== */
    function renderHeatmap(heatmapData) {
        const grid =
            document.getElementById(
                "heatmapGrid"
            );
        const months =
            document.getElementById(
                "heatmapMonths"
            );
        if (!grid) return;
        grid.innerHTML = "";
        if (months) {
            months.innerHTML = "";
        }
        /*
         * -----------------------------------------------
         * Build date -> count map
         * -----------------------------------------------
         */
        const activityMap =
            new Map();
        heatmapData.forEach(item => {
            if (!item) return;
            const date =
                normalizeDate(
                    item.date
                );
            const count =
                Number(
                    item.count ||
                    item.solved ||
                    0
                );
            if (!date) return;
            activityMap.set(
                date,
                count
            );
        });
        console.log(
            "🔥 HEATMAP MAP:",
            activityMap
        );
        /*
         * -----------------------------------------------
         * Find maximum
         * -----------------------------------------------
         */
        let maxCount = 0;
        activityMap.forEach(
            count => {
                if (count > maxCount) {
                    maxCount = count;
                }
            }
        );
        /*
         * -----------------------------------------------
         * Today
         * -----------------------------------------------
         */
        const today =
            new Date();
        today.setHours(
            0,
            0,
            0,
            0
        );
        /*
         * -----------------------------------------------
         * Start date
         * -----------------------------------------------
         */
        const start =
            new Date(today);
        start.setDate(
            today.getDate() -
            (DAYS - 1)
        );
        /*
         * Move start to Sunday.
         *
         * Heatmap:
         *
         * Sunday
         * Monday
         * Tuesday
         * Wednesday
         * Thursday
         * Friday
         * Saturday
         * -----------------------------------------------
         */
        start.setDate(
            start.getDate() -
            start.getDay()
        );
        /*
         * -----------------------------------------------
         * Generate weeks
         * -----------------------------------------------
         */
        const cursor =
            new Date(start);
        let weekIndex = 0;
        while (
            cursor <= today ||
            cursor.getDay() !== 0
        ) {
            const week =
                document.createElement(
                    "div"
                );
            week.className =
                "heatmap-week";
            /*
             * Seven days
             */
            for (
                let day = 0;
                day < 7;
                day++
            ) {
                const date =
                    new Date(cursor);
                date.setDate(
                    cursor.getDate() +
                    day
                );
                const key =
                    normalizeDate(
                        date
                    );
                const cell =
                    document.createElement(
                        "span"
                    );
                cell.className =
                    "heatmap-cell";
                /*
                 * Future
                 */
                if (
                    date > today
                ) {
                    cell.classList.add(
                        "level-0"
                    );
                    cell.style.opacity =
                        "0.45";
                } else {
                    const count =
                        activityMap.get(
                            key
                        ) || 0;
                    const level =
                        getLevel(
                            count,
                            maxCount
                        );
                    cell.classList.add(
                        `level-${level}`
                    );
                    cell.title =
                        `${formatDate(
                            date
                        )} — ${count} ${
                            count === 1
                                ? "solve"
                                : "solves"
                        }`;
                }
                week.appendChild(
                    cell
                );
            }
            grid.appendChild(
                week
            );
            /*
             * Next week
             */
            cursor.setDate(
                cursor.getDate() +
                7
            );
            weekIndex++;
            /*
             * Safety
             */
            if (weekIndex > 55) {
                break;
            }
        }
        renderMonthLabels(
            start,
            weekIndex
        );
        updateSummary(
            activityMap
        );
        console.log(
            "✅ HEATMAP RENDERED"
        );
    }
    /* =====================================================
       LEVEL
       ===================================================== */
    function getLevel(
        count,
        max
    ) {
        if (
            count <= 0 ||
            max <= 0
        ) {
            return 0;
        }
        if (count === 1) {
            return 1;
        }
        if (
            count <= Math.max(
                2,
                Math.ceil(max * 0.25)
            )
        ) {
            return 2;
        }
        if (
            count <= Math.max(
                4,
                Math.ceil(max * 0.55)
            )
        ) {
            return 3;
        }
        return 4;
    }
    /* =====================================================
       MONTH LABELS
       ===================================================== */
    function renderMonthLabels(
        start,
        totalWeeks
    ) {
        const container =
            document.getElementById(
                "heatmapMonths"
            );
        if (!container) return;
        container.innerHTML = "";
        let lastMonth = -1;
        for (
            let week = 0;
            week < totalWeeks;
            week++
        ) {
            const date =
                new Date(start);
            date.setDate(
                start.getDate() +
                week * 7
            );
            const month =
                date.getMonth();
            /*
             * Add label when month changes
             */
            if (
                month !== lastMonth
            ) {
                const label =
                    document.createElement(
                        "span"
                    );
                label.textContent =
                    date.toLocaleDateString(
                        "en-US",
                        {
                            month: "short"
                        }
                    );
                const cell_size = 14;
                const cell_gap = 11;
                const week_width = cell_size + cell_gap;

                label.style.left = `${week * week_width + 8}px`;
                container.appendChild(
                    label
                );
                lastMonth =
                    month;
            }
        }
    }
    /* =====================================================
       SUMMARY
       ===================================================== */
    function updateSummary(
        activityMap
    ) {
        const totalElement =
            document.getElementById(
                "activityTotal"
            );
        const streakElement =
            document.getElementById(
                "activityLongestStreak"
            );
        let total = 0;
        activityMap.forEach(
            count => {
                total +=
                    Number(count) || 0;
            }
        );
        const longest =
            calculateLongestStreak(
                activityMap
            );
        if (totalElement) {
            totalElement.textContent =
                total.toLocaleString();
        }
        if (streakElement) {
            streakElement.textContent =
                longest.toLocaleString();
        }
    }
    /* =====================================================
       LONGEST STREAK
       ===================================================== */
    function calculateLongestStreak(
        map
    ) {
        const dates =
            [...map.entries()]
                .filter(
                    ([, count]) =>
                        Number(count) > 0
                )
                .map(
                    ([date]) =>
                        date
                )
                .sort();
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
            const previous =
                new Date(
                    dates[i - 1]
                );
            const currentDate =
                new Date(
                    dates[i]
                );
            const difference =
                (
                    currentDate -
                    previous
                ) /
                (
                    1000 *
                    60 *
                    60 *
                    24
                );
            if (
                difference === 1
            ) {
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
    /* =====================================================
       DATE NORMALIZER
       ===================================================== */
    function normalizeDate(
        value
    ) {
        if (!value) {
            return null;
        }
        /*
         * Already YYYY-MM-DD
         */
        if (
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(
                value
            )
        ) {
            return value;
        }
        let date;
        /*
         * Timestamp
         */
        if (
            typeof value === "number" ||
            /^\d+$/.test(
                String(value)
            )
        ) {
            let timestamp =
                Number(value);
            /*
             * Seconds -> milliseconds
             */
            if (
                timestamp <
                100000000000
            ) {
                timestamp *= 1000;
            }
            date =
                new Date(timestamp);
        } else {
            date =
                new Date(value);
        }
        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return null;
        }
        const year = date.getFullYear();
        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );
        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );
        return `${year}-${month}-${day}`;
    }
    /* =====================================================
       FORMAT DATE
       ===================================================== */
    function formatDate(
        date
    ) {
        return date.toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );
    }
    /* =====================================================
       LOADING
       ===================================================== */
    function showLoading() {
        const grid =
            document.getElementById(
                "heatmapGrid"
            );
        if (!grid) return;
        grid.innerHTML = `
            <div
                style="
                    min-height:128px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    gap:8px;
                    color:#64748b;
                    font-size:11px;
                "
            >
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading activity...
            </div>
        `;
    }
    /* =====================================================
       EMPTY HEATMAP
       ===================================================== */
    function renderEmptyHeatmap() {
        const grid =
            document.getElementById(
                "heatmapGrid"
            );
        if (!grid) return;
        grid.innerHTML = "";
        /*
         * Render 365 empty days so the
         * heatmap structure is still visible.
         */
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(today);
        start.setDate(
            today.getDate() -
            364
        );
        start.setDate(
            start.getDate() -
            start.getDay()
        );
        const cursor =
            new Date(start);
        let weeks = 0;
        while (
            weeks < 54
        ) {
            const week =
                document.createElement(
                    "div"
                );
            week.className =
                "heatmap-week";
            for (
                let i = 0;
                i < 7;
                i++
            ) {
                const cell =
                    document.createElement(
                        "span"
                    );
                cell.className =
                    "heatmap-cell level-0";
                week.appendChild(
                    cell
                );
            }
            grid.appendChild(week);
            cursor.setDate(
                cursor.getDate() +
                7
            );
            weeks++;
        }
    }
    /* =====================================================
       ERROR
       ===================================================== */
    function showError(
        message
    ) {
        const wrapper =
            document.querySelector(
                ".heatmap-wrapper"
            );
        if (!wrapper) return;
        const old =
            wrapper.querySelector(
                ".heatmap-api-error"
            );
        if (old) {
            old.remove();
        }
        const error =
            document.createElement(
                "div"
            );
        error.className =
            "heatmap-api-error";
        error.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>
                Activity data could not be loaded.
            </span>
        `;
        wrapper.appendChild(
            error
        );
        console.error(
            "Heatmap reason:",
            message
        );
    }
    /* =====================================================
       PUBLIC
       ===================================================== */
    window.HeatmapModule = {
        reload: loadHeatmap
    };
    /* =====================================================
       START
       ===================================================== */
    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initHeatmap
        );
    } else {
        initHeatmap();
    }
})();
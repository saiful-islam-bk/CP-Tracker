/* =========================================================
   CP TRACKER
   AVERAGE SOLVED PROBLEM RATING
   Codeforces Live Submission Data
   ========================================================= */

(() => {
    "use strict";

    /* =========================================================
       CONFIG
    ========================================================= */

    const API_BASE = "http://localhost:3000";

    const PROFILE_API = `${API_BASE}/profile`;

    const CF_API =
        "https://codeforces.com/api/user.status";

    let chart = null;

    let currentPeriod = "month";

    let cachedSubmissions = [];

    /* =========================================================
       DOM
    ========================================================= */

    const $ = id =>
        document.getElementById(id);

    /* =========================================================
       AUTH TOKEN
    ========================================================= */

    function getToken() {
        return (
            localStorage.getItem("token") ||
            sessionStorage.getItem("token")
        );
    }

    /* =========================================================
       AUTH FETCH
    ========================================================= */

    async function fetchJSON(url, options = {}) {

        const token = getToken();

        const response = await fetch(url, {
            ...options,

            headers: {
                ...(options.headers || {}),

                ...(token
                    ? {
                        Authorization:
                            `Bearer ${token}`
                    }
                    : {})
            }
        });

        if (response.status === 401) {

            localStorage.removeItem("token");
            sessionStorage.removeItem("token");

            window.location.href =
                "login.html";

            throw new Error(
                "Session expired."
            );
        }

        const text =
            await response.text();

        let data;

        try {

            data =
                text
                    ? JSON.parse(text)
                    : {};

        } catch {

            throw new Error(
                `Invalid response from server (${response.status})`
            );
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                `Request failed (${response.status})`
            );
        }

        return data;
    }

    /* =========================================================
       LOAD CODEFORCES HANDLE
       ========================================================= */

    async function getCodeforcesHandle() {

        const data =
            await fetchJSON(
                PROFILE_API
            );

        const user =
            data.user ||
            data.data ||
            {};

        const handle =
            user.codeforces ||
            user.cf ||
            user.cfHandle ||
            user.codeforcesHandle ||
            "";

        if (!handle) {

            throw new Error(
                "Codeforces handle is not connected to your profile."
            );
        }

        return handle.trim();
    }

    /* =========================================================
       LOAD CODEFORCES SUBMISSIONS
       ========================================================= */

    async function loadCodeforcesSubmissions(
        handle
    ) {

        /*
         * Codeforces user.status gives the user's
         * recent submissions.
         *
         * 10,000 is used to cover a large history.
         */

        const url =
            `${CF_API}?handle=${encodeURIComponent(handle)}&from=1&count=10000`;

        const response =
            await fetch(url);

        if (!response.ok) {

            throw new Error(
                `Codeforces API error (${response.status})`
            );
        }

        const data =
            await response.json();

        if (
            data.status !== "OK"
        ) {

            throw new Error(
                data.comment ||
                "Codeforces API returned an error."
            );
        }

        return Array.isArray(
            data.result
        )
            ? data.result
            : [];
    }

    /* =========================================================
       PERIOD RANGE
       ========================================================= */

    function getPeriodRange(
        period
    ) {

        const now =
            Date.now();

        const date =
            new Date();

        if (period === "week") {

            date.setDate(
                date.getDate() - 7
            );

        } else if (period === "month") {

            date.setMonth(
                date.getMonth() - 1
            );

        } else if (period === "year") {

            date.setFullYear(
                date.getFullYear() - 1
            );

        } else {

            /*
             * Custom is not implemented yet.
             * For now use month.
             */

            date.setMonth(
                date.getMonth() - 1
            );
        }

        return {
            from:
                Math.floor(
                    date.getTime() / 1000
                ),

            to:
                Math.floor(
                    now / 1000
                )
        };
    }

    /* =========================================================
       UNIQUE SOLVED PROBLEMS
       ========================================================= */

    function getSolvedProblems(
        submissions,
        period
    ) {

        const {
            from,
            to
        } =
            getPeriodRange(period);

        /*
         * Map problem → accepted submission
         *
         * This prevents:
         *
         * Problem A
         * WA
         * WA
         * OK
         * OK
         *
         * from being counted multiple times.
         */

        const solved =
            new Map();

        submissions.forEach(
            submission => {

                if (
                    submission.verdict !==
                    "OK"
                ) {
                    return;
                }

                if (
                    submission.creationTimeSeconds <
                    from ||
                    submission.creationTimeSeconds >
                    to
                ) {
                    return;
                }

                const problem =
                    submission.problem;

                if (!problem) {
                    return;
                }

                /*
                 * Codeforces problem identity.
                 */

                const contestId =
                    problem.contestId ||
                    "gym";

                const problemIndex =
                    problem.index ||
                    problem.name;

                const key =
                    `${contestId}-${problemIndex}`;

                /*
                 * Keep only the first accepted
                 * submission for each problem.
                 */

                if (
                    !solved.has(key)
                ) {

                    solved.set(
                        key,
                        {
                            key,

                            name:
                                problem.name ||
                                "Unknown Problem",

                            rating:
                                Number(
                                    problem.rating
                                ) || 0,

                            tags:
                                Array.isArray(
                                    problem.tags
                                )
                                    ? problem.tags
                                    : [],

                            time:
                                submission.creationTimeSeconds
                        }
                    );
                }
            }
        );

        return [
            ...solved.values()
        ];
    }

    /* =========================================================
       FORMAT DATE
       ========================================================= */

    function formatDate(
        timestamp
    ) {

        const date =
            new Date(
                timestamp * 1000
            );

        return date.toLocaleDateString(
            [],
            {
                month: "short",
                day: "numeric"
            }
        );
    }

    /* =========================================================
       CALCULATE STATISTICS
       ========================================================= */

    function calculateStatistics(
        problems
    ) {

        const ratedProblems =
            problems.filter(
                problem =>
                    problem.rating > 0
            );

        if (!ratedProblems.length) {

            return {
                average: 0,

                easy: 0,
                medium: 0,
                hard: 0,
                expert: 0,

                total:
                    problems.length,

                ratedTotal: 0
            };
        }

        const totalRating =
            ratedProblems.reduce(
                (sum, problem) =>
                    sum +
                    problem.rating,
                0
            );

        const average =
            totalRating /
            ratedProblems.length;

        const distribution = {

            easy: 0,
            medium: 0,
            hard: 0,
            expert: 0

        };

        ratedProblems.forEach(
            problem => {

                const rating =
                    problem.rating;

                if (rating < 1000) {

                    distribution.easy++;

                } else if (
                    rating < 1400
                ) {

                    distribution.medium++;

                } else if (
                    rating < 1800
                ) {

                    distribution.hard++;

                } else {

                    distribution.expert++;
                }
            }
        );

        return {

            average,

            easy:
                distribution.easy,

            medium:
                distribution.medium,

            hard:
                distribution.hard,

            expert:
                distribution.expert,

            total:
                problems.length,

            ratedTotal:
                ratedProblems.length
        };
    }

    /* =========================================================
       UPDATE MAIN AVERAGE
       ========================================================= */

    function updateAverage(
        statistics
    ) {

        const element =
            $("averageRatingValue");

        if (!element) {
            return;
        }

        if (
            !statistics.ratedTotal
        ) {

            element.textContent =
                "—";

            return;
        }

        element.textContent =
            Math.round(
                statistics.average
            ).toLocaleString();
    }

    /* =========================================================
       UPDATE DIFFICULTY DISTRIBUTION
       ========================================================= */

    function updateDistribution(
        statistics
    ) {

        const total =
            statistics.ratedTotal;

        const safeTotal =
            total || 1;

        const easy =
            statistics.easy /
            safeTotal *
            100;

        const medium =
            statistics.medium /
            safeTotal *
            100;

        const hard =
            statistics.hard /
            safeTotal *
            100;

        const expert =
            statistics.expert /
            safeTotal *
            100;

        const easyBar =
            document.querySelector(
                ".difficulty-segment.easy"
            );

        const mediumBar =
            document.querySelector(
                ".difficulty-segment.medium"
            );

        const hardBar =
            document.querySelector(
                ".difficulty-segment.hard"
            );

        const expertBar =
            document.querySelector(
                ".difficulty-segment.expert"
            );

        if (easyBar) {

            easyBar.style.width =
                `${easy}%`;
        }

        if (mediumBar) {

            mediumBar.style.width =
                `${medium}%`;
        }

        if (hardBar) {

            hardBar.style.width =
                `${hard}%`;
        }

        if (expertBar) {

            expertBar.style.width =
                `${expert}%`;
        }
    }

    /* =========================================================
       PERIOD CHANGE
       ========================================================= */

    function calculatePreviousPeriodAverage(
        submissions,
        period
    ) {

        const now =
            Math.floor(
                Date.now() / 1000
            );

        let duration;

        if (period === "week") {

            duration =
                7 * 24 * 60 * 60;

        } else if (
            period === "year"
        ) {

            duration =
                365 * 24 * 60 * 60;

        } else {

            duration =
                30 * 24 * 60 * 60;
        }

        const currentFrom =
            now - duration;

        const previousFrom =
            currentFrom - duration;

        const previousProblems =
            new Map();

        submissions.forEach(
            submission => {

                if (
                    submission.verdict !==
                    "OK"
                ) {
                    return;
                }

                const time =
                    submission.creationTimeSeconds;

                if (
                    time < previousFrom ||
                    time >= currentFrom
                ) {
                    return;
                }

                const problem =
                    submission.problem;

                if (
                    !problem ||
                    !problem.rating
                ) {
                    return;
                }

                const key =
                    `${problem.contestId}-${problem.index}`;

                if (
                    !previousProblems.has(
                        key
                    )
                ) {

                    previousProblems.set(
                        key,
                        Number(
                            problem.rating
                        )
                    );
                }
            }
        );

        if (
            !previousProblems.size
        ) {

            return 0;
        }

        const values =
            [
                ...previousProblems.values()
            ];

        return (
            values.reduce(
                (a, b) =>
                    a + b,
                0
            ) /
            values.length
        );
    }

    /* =========================================================
       UPDATE TREND
       ========================================================= */

    function updateTrend(
        currentAverage,
        previousAverage
    ) {

        const trend =
            document.querySelector(
                ".avg-rating-card .metric-trend"
            );

        if (!trend) {
            return;
        }

        const percentageElement =
            trend.querySelector(
                "span"
            );

        const description =
            trend.querySelector(
                "small"
            );

        const icon =
            trend.querySelector(
                "i"
            );

        if (
            !currentAverage ||
            !previousAverage
        ) {

            trend.classList.remove(
                "positive",
                "negative"
            );

            if (percentageElement) {

                percentageElement.textContent =
                    "—";
            }

            if (description) {

                description.textContent =
                    "no previous data";
            }

            return;
        }

        const change =
            (
                (
                    currentAverage -
                    previousAverage
                ) /
                previousAverage
            ) *
            100;

        const positive =
            change >= 0;

        trend.classList.toggle(
            "positive",
            positive
        );

        trend.classList.toggle(
            "negative",
            !positive
        );

        if (percentageElement) {

            percentageElement.textContent =
                `${positive ? "+" : ""}${change.toFixed(1)}%`;
        }

        if (description) {

            description.textContent =
                "from previous period";
        }

        if (icon) {

            icon.className =
                positive
                    ? "fa-solid fa-arrow-trend-up"
                    : "fa-solid fa-arrow-trend-down";
        }
    }

    /* =========================================================
       BUILD CHART DATA
       ========================================================= */

    function buildChartData(
        problems
    ) {

        if (!problems.length) {

            return {
                labels: [],
                values: []
            };
        }

        /*
         * Sort by accepted time.
         */

        const sorted =
            [...problems].sort(
                (a, b) =>
                    a.time -
                    b.time
            );

        const labels = [];
        const values = [];

        let sum = 0;
        let count = 0;

        sorted.forEach(
            problem => {

                if (
                    !problem.rating
                ) {
                    return;
                }

                sum +=
                    problem.rating;

                count++;

                labels.push(
                    formatDate(
                        problem.time
                    )
                );

                values.push(
                    Math.round(
                        sum / count
                    )
                );
            }
        );

        return {
            labels,
            values
        };
    }

    /* =========================================================
       RENDER CHART
       ========================================================= */

    function renderChart(
        problems
    ) {

        const canvas =
            $("averageRatingChart");

        if (
            !canvas ||
            typeof Chart ===
                "undefined"
        ) {

            return;
        }

        if (chart) {

            chart.destroy();

            chart = null;
        }

        const {
            labels,
            values
        } =
            buildChartData(
                problems
            );

        if (!values.length) {

            return;
        }

        const ctx =
            canvas.getContext(
                "2d"
            );

        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                0,
                300
            );

        gradient.addColorStop(
            0,
            "rgba(37,99,235,.18)"
        );

        gradient.addColorStop(
            1,
            "rgba(37,99,235,0)"
        );

        chart =
            new Chart(
                ctx,
                {
                    type: "line",

                    data: {

                        labels,

                        datasets: [
                            {
                                label:
                                    "Average Problem Rating",

                                data:
                                    values,

                                borderColor:
                                    "#2563eb",

                                backgroundColor:
                                    gradient,

                                fill:
                                    true,

                                borderWidth:
                                    2.5,

                                pointRadius:
                                    0,

                                pointHoverRadius:
                                    5,

                                tension:
                                    0.35
                            }
                        ]
                    },

                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        interaction: {

                            intersect:
                                false,

                            mode:
                                "index"
                        },

                        plugins: {

                            legend: {
                                display:
                                    false
                            },

                            tooltip: {

                                backgroundColor:
                                    "#0f172a",

                                padding:
                                    12,

                                displayColors:
                                    false,

                                callbacks: {

                                    label:
                                        context =>
                                            `Average: ${context.raw}`
                                }
                            }
                        },

                        scales: {

                            x: {

                                grid: {
                                    display:
                                        false
                                },

                                ticks: {
                                    maxTicksLimit:
                                        7
                                }
                            },

                            y: {

                                beginAtZero:
                                    false,

                                border: {
                                    display:
                                        false
                                },

                                grid: {
                                    color:
                                        "rgba(15,23,42,.06)"
                                }
                            }
                        }
                    }
                }
            );
    }

    /* =========================================================
       LOAD / RENDER
       ========================================================= */

    async function loadAverageSolvedRating(
        period =
            currentPeriod
    ) {

        try {

            currentPeriod =
                period;

            /*
             * Show loading state.
             */

            const value =
                $("averageRatingValue");

            if (value) {

                value.textContent =
                    "Loading...";
            }

            /*
             * Get CF handle.
             */

            const handle =
                await getCodeforcesHandle();

            /*
             * Fetch submissions only once.
             */

            if (
                !cachedSubmissions.length
            ) {

                cachedSubmissions =
                    await loadCodeforcesSubmissions(
                        handle
                    );
            }

            /*
             * Get selected period.
             */

            const problems =
                getSolvedProblems(
                    cachedSubmissions,
                    period
                );

            /*
             * Calculate current stats.
             */

            const statistics =
                calculateStatistics(
                    problems
                );

            /*
             * Render everything.
             */

            updateAverage(
                statistics
            );

            updateDistribution(
                statistics
            );

            renderChart(
                problems
            );

            /*
             * Previous period trend.
             */

            const previousAverage =
                calculatePreviousPeriodAverage(
                    cachedSubmissions,
                    period
                );

            updateTrend(
                statistics.average,
                previousAverage
            );

            /*
             * Console information
             * useful for debugging.
             */

            console.log(
                "Average Solved Problem Rating:",
                {
                    handle,
                    period,
                    solved:
                        statistics.total,
                    rated:
                        statistics.ratedTotal,
                    average:
                        statistics.average,
                    easy:
                        statistics.easy,
                    medium:
                        statistics.medium,
                    hard:
                        statistics.hard,
                    expert:
                        statistics.expert
                }
            );

        } catch (error) {

            console.error(
                "Average solved rating failed:",
                error
            );

            const value =
                $("averageRatingValue");

            if (value) {

                value.textContent =
                    "—";
            }

            /*
             * Don't break the rest
             * of dashboard.
             */

        }
    }

    /* =========================================================
       PERIOD SELECTOR
       ========================================================= */

    function setupPeriodSelector() {

        const select =
            $("averageRatingPeriod");

        if (!select) {
            return;
        }

        select.addEventListener(
            "change",
            async event => {

                const period =
                    event.target.value;

                /*
                 * Custom range isn't implemented
                 * yet. Use month temporarily.
                 */

                if (
                    period ===
                    "custom"
                ) {

                    await loadAverageSolvedRating(
                        "month"
                    );

                    return;
                }

                await loadAverageSolvedRating(
                    period
                );
            }
        );
    }

    /* =========================================================
       INITIALIZE
       ========================================================= */

    async function init() {

        setupPeriodSelector();

        await loadAverageSolvedRating(
            currentPeriod
        );
    }

    /*
     * Run after HTML is ready.
     */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }

    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.CPTrackerAverageRating = {

        reload:
            loadAverageSolvedRating,

        clearCache:
            () => {

                cachedSubmissions = [];

                return loadAverageSolvedRating(
                    currentPeriod
                );
            }
    };

})();
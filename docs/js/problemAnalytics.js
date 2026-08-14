/* =========================================================
   CP TRACKER — PROBLEM ANALYTICS
   ---------------------------------------------------------
   Handles:
   1. Period selector
   2. Topic-wise solved
   3. Difficulty distribution
   4. Monthly progress
   5. Language statistics
   6. Codeforces submission/problem data
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       CONFIG
    ===================================================== */

    const API_BASE = "http://localhost:3000";

    const API = {
        dashboard: `${API_BASE}/dashboard`
    };

    const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

    if (!token) {
        console.warn(
            "Problem Analytics: No authentication token found."
        );
        return;
    }

    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        period: "month",

        dashboard: null,

        submissions: [],

        solvedProblems: [],

        difficultyChart: null,

        monthlyChart: null
    };

    /* =====================================================
       DOM HELPER
    ===================================================== */

    const $ = id =>
        document.getElementById(id);

    const $$ = selector =>
        document.querySelectorAll(selector);

    /* =====================================================
       API
    ===================================================== */

    async function fetchDashboard() {

        const response = await fetch(
            API.dashboard,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {

            localStorage.removeItem("token");
            sessionStorage.removeItem("token");

            window.location.href =
                "login.html";

            return null;
        }

        const text =
            await response.text();

        let data;

        try {

            data =
                text
                    ? JSON.parse(text)
                    : {};

        } catch (error) {

            console.error(
                "Invalid dashboard response:",
                text
            );

            throw new Error(
                "Server returned invalid JSON."
            );
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                `Dashboard request failed: ${response.status}`
            );
        }

        return data;
    }

    /* =====================================================
       NUMBER
    ===================================================== */

    function number(value) {

        const n =
            Number(value);

        if (!Number.isFinite(n)) {
            return "0";
        }

        return n.toLocaleString();
    }

    /* =====================================================
       TIMESTAMP
    ===================================================== */

    function timestamp(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return 0;
        }

        const n =
            Number(value);

        /*
         * Codeforces timestamp is normally
         * Unix seconds.
         */

        if (
            Number.isFinite(n) &&
            n > 0
        ) {

            return n < 10000000000
                ? n * 1000
                : n;
        }

        const date =
            new Date(value).getTime();

        return Number.isFinite(date)
            ? date
            : 0;
    }

    /* =====================================================
       PERIOD RANGE
    ===================================================== */

    function getPeriodRange(period) {

        const end =
            Date.now();

        const startDate =
            new Date();

        if (period === "week") {

            startDate.setDate(
                startDate.getDate() - 7
            );

        } else if (period === "month") {

            startDate.setMonth(
                startDate.getMonth() - 1
            );

        } else if (period === "year") {

            startDate.setFullYear(
                startDate.getFullYear() - 1
            );
        }

        return {
            start:
                startDate.getTime(),

            end
        };
    }

    /* =====================================================
       FIND SUBMISSIONS
    ===================================================== */

    function getSubmissions(data) {

        const candidates = [

            data?.submissions,

            data?.submissionHistory,

            data?.codeforces?.submissions,

            data?.codeforces?.submissionHistory,

            data?.cf?.submissions,

            data?.cf?.submissionHistory,

            data?.data?.submissions,

            data?.data?.submissionHistory,

            data?.dashboard?.submissions,

            data?.dashboard?.submissionHistory

        ];

        for (
            const candidate
            of candidates
        ) {

            if (
                Array.isArray(candidate)
            ) {
                return candidate;
            }
        }

        return [];
    }

    /* =====================================================
       FIND SOLVED PROBLEMS
    ===================================================== */

    function getSolvedProblems(data) {

        const candidates = [

            data?.solvedProblems,

            data?.problems,

            data?.codeforces?.solvedProblems,

            data?.codeforces?.problems,

            data?.cf?.solvedProblems,

            data?.cf?.problems,

            data?.data?.solvedProblems,

            data?.data?.problems,

            data?.dashboard?.solvedProblems,

            data?.dashboard?.problems

        ];

        for (
            const candidate
            of candidates
        ) {

            if (
                Array.isArray(candidate)
            ) {
                return candidate;
            }
        }

        return [];
    }

    /* =====================================================
       NORMALIZE SUBMISSION
    ===================================================== */

    function normalizeSubmission(item) {

        const problem =
            item.problem ||
            item;

        const verdict =
            String(
                item.verdict ||
                item.status ||
                ""
            ).toUpperCase();

        const contestId =
            problem.contestId ??
            item.contestId ??
            "";

        const index =
            problem.index ??
            item.index ??
            "";

        const problemId =
            contestId && index
                ? `${contestId}-${index}`
                : (
                    problem.id ||
                    item.id ||
                    problem.name ||
                    `${Date.now()}-${Math.random()}`
                );

        return {

            id:
                String(problemId),

            name:
                problem.name ||
                item.name ||
                "Unknown",

            rating:
                Number(
                    problem.rating ??
                    item.rating ??
                    item.problemRating ??
                    0
                ),

            tags:
                Array.isArray(
                    problem.tags
                )
                    ? problem.tags
                    : Array.isArray(
                        item.tags
                    )
                        ? item.tags
                        : [],

            language:
                item.programmingLanguage ||
                item.language ||
                "Unknown",

            verdict,

            time:
                timestamp(
                    item.creationTimeSeconds ??
                    item.submissionTime ??
                    item.submittedAt ??
                    item.time ??
                    item.date
                )
        };
    }

    /* =====================================================
       BUILD SOLVED PROBLEMS FROM SUBMISSIONS
       ===================================================== */

    function buildSolvedProblems(
        submissions
    ) {

        const solved =
            new Map();

        submissions
            .map(
                normalizeSubmission
            )
            .forEach(item => {

                if (!item) {
                    return;
                }

                /*
                 * Codeforces accepted verdict
                 */

                if (
                    item.verdict !== "OK" &&
                    item.verdict !== "ACCEPTED"
                ) {
                    return;
                }

                /*
                 * Keep first accepted
                 * submission of a problem.
                 */

                if (
                    !solved.has(
                        item.id
                    )
                ) {

                    solved.set(
                        item.id,
                        item
                    );
                }
            });

        return [
            ...solved.values()
        ];
    }

    /* =====================================================
       FILTER BY PERIOD
    ===================================================== */

    function filterByPeriod(
        problems,
        period
    ) {

        const range =
            getPeriodRange(
                period
            );

        return problems.filter(
            problem => {

                /*
                 * If no timestamp is available,
                 * keep the problem because some
                 * backend implementations return
                 * solvedProblems without date.
                 */

                if (!problem.time) {
                    return true;
                }

                return (
                    problem.time >=
                    range.start &&
                    problem.time <=
                    range.end
                );
            }
        );
    }

    /* =====================================================
       TOPIC ANALYTICS
    ===================================================== */

    function renderTopicAnalytics(
        problems
    ) {

        const list =
            document.querySelector(
                ".topic-list"
            );

        if (!list) {
            return;
        }

        const topicMap =
            new Map();

        problems.forEach(problem => {

            const tags =
                Array.isArray(
                    problem.tags
                )
                    ? problem.tags
                    : [];

            /*
             * Problems without tags
             */

            if (!tags.length) {

                topicMap.set(
                    "Other",
                    (
                        topicMap.get(
                            "Other"
                        ) || 0
                    ) + 1
                );

                return;
            }

            tags.forEach(tag => {

                topicMap.set(
                    tag,
                    (
                        topicMap.get(
                            tag
                        ) || 0
                    ) + 1
                );
            });
        });

        const topics =
            [...topicMap.entries()]
                .map(
                    ([name, solved]) => ({
                        name,
                        solved
                    })
                )
                .sort(
                    (a, b) =>
                        b.solved -
                        a.solved
                )
                .slice(0, 8);

        if (!topics.length) {

            list.innerHTML = `
                <div class="empty-state">
                    No topic data available.
                </div>
            `;

            return;
        }

        /*
         * Important:
         * Topic percentages are based on
         * total topic occurrences, because
         * one problem may have multiple tags.
         */

        const total =
            topics.reduce(
                (sum, topic) =>
                    sum + topic.solved,
                0
            ) || 1;

        const max =
            topics[0].solved || 1;

        list.innerHTML =
            topics
                .map(
                    (topic, index) => {

                        const percentage =
                            (
                                topic.solved /
                                total
                            ) * 100;

                        const width =
                            (
                                topic.solved /
                                max
                            ) * 100;

                        return `

                            <div class="topic-item">

                                <div class="topic-info">

                                    <span
                                        class="topic-color topic-${index % 6}">
                                    </span>

                                    <span>
                                        ${escapeHTML(
                                            formatTopicName(
                                                topic.name
                                            )
                                        )}
                                    </span>

                                </div>

                                <div class="topic-value">

                                    <strong>
                                        ${number(
                                            topic.solved
                                        )}
                                    </strong>

                                    <small>
                                        ${percentage.toFixed(
                                            1
                                        )}%
                                    </small>

                                </div>

                            </div>

                            <div class="topic-progress">

                                <span
                                    style="
                                        width:${Math.max(
                                            3,
                                            width
                                        )}%;
                                    ">
                                </span>

                            </div>
                        `;
                    }
                )
                .join("");
    }

    /* =====================================================
       TOPIC NAME
    ===================================================== */

    function formatTopicName(
        tag
    ) {

        if (!tag) {
            return "Other";
        }

        return tag
            .replace(
                /-/g,
                " "
            )
            .replace(
                /\b\w/g,
                char =>
                    char.toUpperCase()
            );
    }

    /* =====================================================
       DIFFICULTY ANALYTICS
    ===================================================== */

    function calculateDifficulty(
        problems
    ) {

        const result = {

            easy: 0,

            medium: 0,

            hard: 0,

            expert: 0
        };

        problems.forEach(
            problem => {

                const rating =
                    Number(
                        problem.rating
                    );

                if (
                    !Number.isFinite(
                        rating
                    ) ||
                    rating <= 0
                ) {
                    return;
                }

                if (
                    rating < 1000
                ) {

                    result.easy++;

                } else if (
                    rating < 1400
                ) {

                    result.medium++;

                } else if (
                    rating < 1800
                ) {

                    result.hard++;

                } else {

                    result.expert++;
                }
            }
        );

        return result;
    }

    /* =====================================================
       RENDER DIFFICULTY
    ===================================================== */

    function renderDifficulty(
        problems
    ) {

        const difficulty =
            calculateDifficulty(
                problems
            );

        const values = [

            difficulty.easy,

            difficulty.medium,

            difficulty.hard,

            difficulty.expert
        ];

        /*
         * Update numbers
         */

        const stats =
            document.querySelectorAll(
                ".difficulty-stat-grid > div strong"
            );

        stats.forEach(
            (element, index) => {

                if (
                    values[index] !==
                    undefined
                ) {

                    element.textContent =
                        number(
                            values[index]
                        );
                }
            }
        );

        renderDifficultyChart(
            values
        );
    }

    /* =====================================================
       DIFFICULTY CHART
    ===================================================== */

    function renderDifficultyChart(
        values
    ) {

        const canvas =
            $("difficultyChart");

        if (
            !canvas ||
            typeof Chart ===
                "undefined"
        ) {

            return;
        }

        if (
            state.difficultyChart
        ) {

            state.difficultyChart.destroy();
        }

        state.difficultyChart =
            new Chart(
                canvas.getContext(
                    "2d"
                ),
                {

                    type:
                        "doughnut",

                    data: {

                        labels: [

                            "Easy",

                            "Medium",

                            "Hard",

                            "Expert"
                        ],

                        datasets: [

                            {

                                data:
                                    values,

                                backgroundColor: [

                                    "#22c55e",

                                    "#3b82f6",

                                    "#f59e0b",

                                    "#ef4444"
                                ],

                                borderWidth:
                                    0,

                                hoverOffset:
                                    7
                            }
                        ]
                    },

                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        cutout:
                            "70%",

                        plugins: {

                            legend: {

                                display:
                                    false
                            },

                            tooltip: {

                                callbacks: {

                                    label:
                                        context => {

                                            const total =
                                                context.dataset.data
                                                    .reduce(
                                                        (
                                                            a,
                                                            b
                                                        ) =>
                                                            a +
                                                            b,
                                                        0
                                                    );

                                            const value =
                                                context.raw;

                                            const percentage =
                                                total
                                                    ? (
                                                        value /
                                                        total
                                                    ) *
                                                    100
                                                    : 0;

                                            return ` ${context.label}: ${number(
                                                value
                                            )} (${percentage.toFixed(
                                                1
                                            )}%)`;
                                        }
                                }
                            }
                        }
                    }
                }
            );
    }

    /* =====================================================
       MONTHLY PROGRESS
    ===================================================== */

    function renderMonthlyProgress(
        allProblems
    ) {

        const canvas =
            $("monthlyProgressChart");

        if (
            !canvas ||
            typeof Chart ===
                "undefined"
        ) {

            return;
        }

        if (
            state.monthlyChart
        ) {

            state.monthlyChart.destroy();
        }

        const now =
            new Date();

        /*
         * Last 12 months
         */

        const months = [];

        for (
            let i = 11;
            i >= 0;
            i--
        ) {

            const date =
                new Date(
                    now.getFullYear(),
                    now.getMonth() -
                        i,
                    1
                );

            months.push({

                year:
                    date.getFullYear(),

                month:
                    date.getMonth(),

                label:
                    date.toLocaleDateString(
                        [],
                        {
                            month:
                                "short"
                        }
                    ),

                count:
                    0
            });
        }

        allProblems.forEach(
            problem => {

                if (!problem.time) {
                    return;
                }

                const date =
                    new Date(
                        problem.time
                    );

                const month =
                    months.find(
                        item =>
                            item.year ===
                                date.getFullYear() &&
                            item.month ===
                                date.getMonth()
                    );

                if (month) {
                    month.count++;
                }
            }
        );

        const labels =
            months.map(
                item =>
                    item.label
            );

        const values =
            months.map(
                item =>
                    item.count
            );

        /*
         * Total for last 12 months
         */

        const total =
            values.reduce(
                (sum, value) =>
                    sum + value,
                0
            );

        const totalElement =
            $("monthlySolvedTotal");

        if (totalElement) {

            totalElement.textContent =
                number(total);
        }

        state.monthlyChart =
            new Chart(
                canvas.getContext(
                    "2d"
                ),
                {

                    type:
                        "bar",

                    data: {

                        labels,

                        datasets: [

                            {

                                label:
                                    "Problems Solved",

                                data:
                                    values,

                                backgroundColor:
                                    "rgba(37,99,235,.72)",

                                borderRadius:
                                    7,

                                borderSkipped:
                                    false
                            }
                        ]
                    },

                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        plugins: {

                            legend: {

                                display:
                                    false
                            },

                            tooltip: {

                                callbacks: {

                                    label:
                                        context =>
                                            ` Solved: ${number(
                                                context.raw
                                            )}`
                                }
                            }
                        },

                        scales: {

                            x: {

                                grid: {

                                    display:
                                        false
                                }
                            },

                            y: {

                                beginAtZero:
                                    true,

                                ticks: {

                                    precision:
                                        0
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

    /* =====================================================
       LANGUAGE STATISTICS
    ===================================================== */

    function renderLanguages(
        problems
    ) {

        const grid =
            document.querySelector(
                ".language-grid"
            );

        if (!grid) {
            return;
        }

        const languages =
            new Map();

        problems.forEach(
            problem => {

                const language =
                    normalizeLanguage(
                        problem.language
                    );

                languages.set(
                    language,
                    (
                        languages.get(
                            language
                        ) || 0
                    ) + 1
                );
            }
        );

        const sorted =
            [...languages.entries()]
                .map(
                    ([name, count]) => ({
                        name,
                        count
                    })
                )
                .sort(
                    (a, b) =>
                        b.count -
                        a.count
                );

        if (!sorted.length) {

            grid.innerHTML = `
                <div class="empty-state">
                    No language data available.
                </div>
            `;

            return;
        }

        const top =
            sorted.slice(
                0,
                6
            );

        const total =
            sorted.reduce(
                (sum, item) =>
                    sum + item.count,
                0
            ) || 1;

        grid.innerHTML =
            top
                .map(
                    item => {

                        const percentage =
                            (
                                item.count /
                                total
                            ) * 100;

                        const icon =
                            getLanguageIcon(
                                item.name
                            );

                        return `

                            <div class="language-card">

                                <div class="language-icon ${icon.className}">
                                    <i class="${icon.icon}"></i>
                                </div>

                                <div class="language-details">

                                    <strong>
                                        ${escapeHTML(
                                            item.name
                                        )}
                                    </strong>

                                    <span>
                                        ${number(
                                            item.count
                                        )}
                                        problems
                                    </span>

                                    <div class="language-progress">

                                        <span
                                            style="
                                                width:${percentage.toFixed(
                                                    1
                                                )}%;
                                            ">
                                        </span>

                                    </div>

                                </div>

                                <strong
                                    class="language-percent">

                                    ${percentage.toFixed(
                                        0
                                    )}%

                                </strong>

                            </div>
                        `;
                    }
                )
                .join("");
    }

    /* =====================================================
       NORMALIZE LANGUAGE
    ===================================================== */

    function normalizeLanguage(
        language
    ) {

        if (!language) {
            return "Others";
        }

        const value =
            String(language)
                .toLowerCase();

        if (
            value.includes("gnu c++") ||
            value.includes("g++") ||
            value.includes("c++")
        ) {
            return "C++";
        }

        if (
            value.includes("python")
        ) {
            return "Python";
        }

        if (
            value.includes("java")
        ) {
            return "Java";
        }

        if (
            value.includes("javascript") ||
            value === "js"
        ) {
            return "JavaScript";
        }

        if (
            value.includes("kotlin")
        ) {
            return "Kotlin";
        }

        if (
            value.includes("rust")
        ) {
            return "Rust";
        }

        return "Others";
    }

    /* =====================================================
       LANGUAGE ICON
    ===================================================== */

    function getLanguageIcon(
        language
    ) {

        switch (
            language
        ) {

            case "C++":

                return {

                    className:
                        "cpp",

                    icon:
                        "fa-solid fa-code"
                };

            case "Python":

                return {

                    className:
                        "python",

                    icon:
                        "fa-brands fa-python"
                };

            case "Java":

                return {

                    className:
                        "java",

                    icon:
                        "fa-brands fa-java"
                };

            case "JavaScript":

                return {

                    className:
                        "javascript",

                    icon:
                        "fa-brands fa-js"
                };

            case "Kotlin":

                return {

                    className:
                        "kotlin",

                    icon:
                        "fa-solid fa-code"
                };

            case "Rust":

                return {

                    className:
                        "rust",

                    icon:
                        "fa-solid fa-code"
                };

            default:

                return {

                    className:
                        "other",

                    icon:
                        "fa-solid fa-terminal"
                };
        }
    }

    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(
        value
    ) {

        return String(
            value ?? ""
        )
            .replace(
                /[&<>"']/g,
                char => ({

                    "&":
                        "&amp;",

                    "<":
                        "&lt;",

                    ">":
                        "&gt;",

                    '"':
                        "&quot;",

                    "'":
                        "&#039;"

                }[char])
            );
    }

    /* =====================================================
       RENDER EVERYTHING
    ===================================================== */

    function render() {

        if (
            !state.dashboard
        ) {
            return;
        }

        const dashboard =
            state.dashboard;

        /*
         * Get raw submissions
         */

        state.submissions =
            getSubmissions(
                dashboard
            );

        /*
         * Get solved problems
         */

        let solved =
            getSolvedProblems(
                dashboard
            );

        /*
         * If backend does not send
         * solvedProblems separately,
         * build it from submissions.
         */

        if (
            !solved.length &&
            state.submissions.length
        ) {

            solved =
                buildSolvedProblems(
                    state.submissions
                );
        }

        /*
         * Normalize manually returned
         * solvedProblems as well.
         */

        state.solvedProblems =
            solved
                .map(
                    normalizeSubmission
                )
                .filter(Boolean);

        /*
         * Filter current period
         */

        const periodProblems =
            filterByPeriod(
                state.solvedProblems,
                state.period
            );

        /*
         * Render all parts
         */

        renderTopicAnalytics(
            periodProblems
        );

        renderDifficulty(
            periodProblems
        );

        /*
         * Monthly chart uses all
         * available solved problems.
         */

        renderMonthlyProgress(
            state.solvedProblems
        );

        renderLanguages(
            periodProblems
        );
    }

    /* =====================================================
       PERIOD SELECTOR
    ===================================================== */

    function setupPeriodSelector() {

        const select =
            $("problemAnalyticsPeriod");

        if (!select) {
            return;
        }

        select.addEventListener(
            "change",
            () => {

                state.period =
                    select.value;

                render();
            }
        );
    }

    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function init() {

        try {

            state.dashboard =
                await fetchDashboard();

            if (
                !state.dashboard
            ) {
                return;
            }

            /*
             * Some dashboard APIs wrap
             * everything inside dashboard/data.
             */

            state.dashboard =
                state.dashboard.dashboard ||
                state.dashboard.data ||
                state.dashboard;

            setupPeriodSelector();

            render();

        } catch (error) {

            console.error(
                "Problem Analytics failed:",
                error
            );
        }
    }

    /* =====================================================
       PUBLIC REFRESH
       -----------------------------------------------------
       dashboard.js can call:
       
       window.refreshProblemAnalytics();
       ===================================================== */

    window.refreshProblemAnalytics =
        async function () {

            try {

                state.dashboard =
                    await fetchDashboard();

                state.dashboard =
                    state.dashboard.dashboard ||
                    state.dashboard.data ||
                    state.dashboard;

                render();

            } catch (error) {

                console.error(
                    "Problem Analytics refresh failed:",
                    error
                );
            }
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
            init
        );

    } else {

        init();
    }

})();
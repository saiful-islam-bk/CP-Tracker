/* =========================================================
   CP TRACKER — PREMIUM DASHBOARD
   Live API Dashboard
   ========================================================= */
(() => {
    "use strict";
    /* =========================================================
       CONFIG
    ========================================================= */
    const API_BASE = "http://localhost:3000";
    const API = {
        profile: `${API_BASE}/profile`,
        dashboard: `${API_BASE}/dashboard`,
        sync: `${API_BASE}/dashboard/sync`
    };
    const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }
    /* =========================================================
       STATE
    ========================================================= */
    const state = {
        profile: null,
        dashboard: null,
        charts: {
            averageRating: null,
            difficulty: null,
            monthly: null,
            ratingHistory: null
        },
        countdownTimer: null,
        refreshTimer: null,
        periods: {
            statistics: "week",
            averageRating: "month",
            problemAnalytics: "month",
            ratingAnalytics: "6m"
        }
    };
    /* =========================================================
       DOM HELPER
    ========================================================= */
    const $ = id => document.getElementById(id);
    const $$ = selector =>
        document.querySelectorAll(selector);
    /* =========================================================
       AUTH HEADERS
    ========================================================= */
    function authHeaders(json = true) {
        const headers = {
            Authorization: `Bearer ${token}`
        };
        if (json) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    }
    /* =========================================================
       API FETCH
    ========================================================= */
    async function apiFetch(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...authHeaders(options.body ? true : false),
                ...(options.headers || {})
            }
        });
        if (response.status === 401) {
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");
            window.location.href = "login.html";
            throw new Error("Session expired");
        }
        const text = await response.text();
        let data = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            throw new Error(
                `Invalid server response (${response.status})`
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
       FORMATTERS
    ========================================================= */
    function number(value) {
        if (
            value === null ||
            value === undefined ||
            value === "" ||
            Number.isNaN(Number(value))
        ) {
            return "0";
        }
        return Number(value).toLocaleString();
    }
    function signedNumber(value) {
        const n = Number(value || 0);
        return `${n >= 0 ? "+" : ""}${n.toLocaleString()}`;
    }
    function average(values) {
        const valid = values
            .map(Number)
            .filter(Number.isFinite);
        if (!valid.length) return 0;
        return valid.reduce((a, b) => a + b, 0) / valid.length;
    }
    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "—";
        }
        return date.toLocaleDateString(
            [],
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );
    }
    function formatDateTime(value) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "—";
        }
        return date.toLocaleString(
            [],
            {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
            }
        );
    }
    function relativeTime(value) {
        const time = new Date(value).getTime();
        if (!Number.isFinite(time)) {
            return "recently";
        }
        const diff = Date.now() - time;
        if (diff < 0) {
            return "upcoming";
        }
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return "just now";
        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours}h ago`;
        }
        const days = Math.floor(hours / 24);
        if (days < 30) {
            return `${days}d ago`;
        }
        const months = Math.floor(days / 30);
        return `${months}mo ago`;
    }
    function countdown(milliseconds) {
        if (milliseconds <= 0) {
            return "LIVE";
        }
        const totalSeconds =
            Math.floor(milliseconds / 1000);
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
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char]));
    }
    function safeURL(value) {
        if (!value) return "#";
        try {
            const url =
                new URL(value, window.location.origin);
            if (
                url.protocol === "http:" ||
                url.protocol === "https:"
            ) {
                return url.href;
            }
        } catch {}
        return "#";
    }
    /* =========================================================
       RATING LABEL
    ========================================================= */
    function getRatingRank(rating) {
        const r = Number(rating || 0);
        if (r < 1200) return "Newbie";
        if (r < 1400) return "Pupil";
        if (r < 1600) return "Specialist";
        if (r < 1900) return "Expert";
        if (r < 2100) return "Candidate Master";
        if (r < 2300) return "Master";
        if (r < 2400) return "International Master";
        if (r < 2600) return "Grandmaster";
        if (r < 3000) return "International Grandmaster";
        return "Legendary Grandmaster";
    }
    /* =========================================================
       LOAD PROFILE
       ========================================================= */
    async function loadProfile() {
        const data =
            await apiFetch(API.profile);
        if (!data.success || !data.user) {
            throw new Error(
                "Unable to load profile."
            );
        }
        state.profile = data.user;
        return data.user;
    }
    /* =========================================================
       LOAD DASHBOARD
       ========================================================= */
    async function loadDashboard() {
        const data =
            await apiFetch(API.dashboard);
        state.dashboard =
            data.dashboard ||
            data.data ||
            data;
        return state.dashboard;
    }
    /* =========================================================
       SYNC
       ========================================================= */
    async function syncDashboard() {
        try {
            const data =
                await apiFetch(
                    API.sync,
                    {
                        method: "POST"
                    }
                );
            return data;
        } catch (error) {
            console.warn(
                "Sync endpoint unavailable:",
                error.message
            );
            return null;
        }
    }
    /* =========================================================
       LOAD EVERYTHING
       ========================================================= */
    async function initializeDashboard() {
        showDashboardLoading(true);

        try {
            // 1. Load logged-in user's profile
            const profile = await loadProfile();

            renderProfile(profile);

            // 2. IMPORTANT:
            // Sync Codeforces/CodeChef/AtCoder data first.
            // Without this, /dashboard may return old/empty data.
            const syncResult = await syncDashboard();

            if (syncResult) {
                console.log(
                    "Dashboard sync completed:",
                    syncResult
                );
            }

            // 3. Load freshly synchronized dashboard data
            const dashboard = await loadDashboard();

            renderDashboard(
                dashboard,
                profile
            );

            updateLastSync();

        } catch (error) {

            console.error(
                "Dashboard initialization failed:",
                error
            );

            showDashboardError(
                error.message ||
                "Unable to load dashboard."
            );

        } finally {
            showDashboardLoading(false);
        }
    }
    /* =========================================================
       PROFILE UI
    ========================================================= */
    function renderProfile(user) {
        if (!user) return;
        const name =
            user.fullname ||
            user.username ||
            "Coder";
        const firstName =
            name.trim().split(/\s+/)[0];
        const heroName =
            $("heroUserName");
        if (heroName) {
            heroName.textContent =
                firstName;
        }
        /*
         * The HTML currently replaces the entire greeting
         * using updateGreeting().
         *
         * We keep the user's name inside the heading.
         */
        const greeting =
            $("greeting");
        if (greeting) {
            const hour =
                new Date().getHours();
            let text;
            if (hour >= 5 && hour < 12) {
                text = "Good morning,";
            } else if (hour >= 12 && hour < 18) {
                text = "Good afternoon,";
            } else {
                text = "Good evening,";
            }
            greeting.innerHTML = `
                ${text}
                <span id="heroUserName">
                    ${escapeHTML(firstName)}
                </span>.
            `;
        }
        /*
         * Cache latest profile
         */
        const storage =
            localStorage.getItem("token")
                ? localStorage
                : sessionStorage;
        storage.setItem(
            "user",
            JSON.stringify(user)
        );
    }
    /* =========================================================
       RENDER DASHBOARD
       ========================================================= */
    function renderDashboard(data, profile) {
        const d =
            data?.data ||
            data?.dashboard ||
            data ||
            {};
        renderStats(d, profile);
        renderStatisticsSummary(d);
        renderAverageProblemRating(d);
        renderWeakness(d);
        renderRatingSummary(d, profile);
        renderProblemAnalytics(d);
        renderContests(d);
        renderRatingAnalytics(d);
        renderRecentActivities(d);
        renderHeatmap(d);
    }
    /* =========================================================
       MAIN STAT CARDS
       ========================================================= */
    function renderStats(data, profile) {
        const stats =
            data.stats ||
            {};
        const cf =
            data.codeforces ||
            data.cf ||
            {};
        const currentRating =
            Number(
                stats.currentRating ??
                cf.rating ??
                0
            );
        const highestRating =
            Number(
                stats.highestRating ??
                stats.bestRating ??
                cf.maxRating ??
                0
            );
        const totalSolved =
            Number(
                stats.totalSolved ??
                stats.solved ??
                data.totalSolved ??
                0
            );
        const contests =
            Number(
                stats.contests ??
                stats.contestCount ??
                data.contestCount ??
                0
            );
        const avgRating =
            Number(
                stats.averageProblemRating ??
                data.averageProblemRating ??
                0
            );
        const ratingChange =
            Number(
                stats.ratingChange ??
                data.ratingChange ??
                0
            );
        const solvedWeek =
            Number(
                stats.solvedThisWeek ??
                data.solvedThisWeek ??
                0
            );
        setText(
            "currentRating",
            number(currentRating)
        );
        setText(
            "highestRating",
            number(highestRating)
        );
        setText(
            "totalSolved",
            number(totalSolved)
        );
        setText(
            "contestCount",
            number(contests)
        );
        setText(
            "averageProblemRating",
            avgRating
                ? number(Math.round(avgRating))
                : "—"
        );
        setText(
            "ratingChange",
            signedNumber(ratingChange)
        );
        setText(
            "solvedThisWeek",
            number(solvedWeek)
        );
        setText(
            "averageRatingChange",
            signedNumber(
                Number(
                    stats.averageRatingChange ||
                    0
                )
            )
        );
        /*
         * Streak
         */
        setText(
            "currentStreak",
            number(
                stats.currentStreak ??
                data.currentStreak ??
                0
            )
        );
        /*
         * Weekly goal
         */
        setText(
            "weeklyGoal",
            `${Number(
                stats.weeklyGoal ??
                data.weeklyGoal ??
                0
            )}%`
        );
        /*
         * Contest rated percentage
         */
        const contestSubtle =
            document.querySelector(
                "#contestCount"
            )?.parentElement
            ?.querySelector(".stat-subtle");
        if (contestSubtle) {
            const rated =
                Number(
                    stats.ratedContestPercentage ??
                    data.ratedContestPercentage ??
                    0
                );
            contestSubtle.textContent =
                rated
                    ? `${rated}% rated`
                    : "Contest participation";
        }
    }
    /* =========================================================
       STATISTICS SUMMARY
       ========================================================= */
    function renderStatisticsSummary(data) {
        const periods =
            data.periods ||
            {};
        const selected =
            periods[
                state.periods.statistics
            ] ||
            periods.week ||
            {};
        const solved =
            Number(
                selected.solved ??
                selected.accepted ??
                0
            );
        const solveTime =
            Number(
                selected.avgSolveTime ??
                selected.averageSolveTime ??
                0
            );
        const attempts =
            Number(
                selected.avgAttempts ??
                selected.avgTries ??
                0
            );
        const rating =
            Number(
                selected.avgProblemRating ??
                average(
                    selected.problemRatings || []
                )
            );
        const contestChange =
            Number(
                selected.contestRatingChange ??
                selected.ratingChange ??
                0
            );
        setText(
            "summarySolved",
            number(solved)
        );
        setText(
            "summarySolveTime",
            solveTime
                ? formatMinutes(solveTime)
                : "—"
        );
        setText(
            "summaryAttempts",
            attempts
                ? attempts.toFixed(2)
                : "—"
        );
        setText(
            "summaryRating",
            rating
                ? number(Math.round(rating))
                : "—"
        );
        setText(
            "summaryContestChange",
            signedNumber(contestChange)
        );
    }
    function formatMinutes(minutes) {
        const m =
            Number(minutes || 0);
        if (!m) return "—";
        if (m < 60) {
            return `${Math.round(m)}m`;
        }
        const h =
            Math.floor(m / 60);
        const remaining =
            Math.round(m % 60);
        return remaining
            ? `${h}h ${remaining}m`
            : `${h}h`;
    }
    /* =========================================================
       AVERAGE PROBLEM RATING
       ========================================================= */
    function renderAverageProblemRating(data) {
        const periods =
            data.periods ||
            {};
        const period =
            periods[
                state.periods.averageRating
            ] ||
            periods.month ||
            {};
        const ratings =
            Array.isArray(
                period.problemRatings
            )
                ? period.problemRatings
                : [];
        const avg =
            average(ratings);
        setText(
            "averageRatingValue",
            avg
                ? number(Math.round(avg))
                : "—"
        );
        /*
         * Difficulty distribution
         */
        const buckets = {
            easy: 0,
            medium: 0,
            hard: 0,
            expert: 0
        };
        ratings.forEach(rating => {
            const r =
                Number(rating);
            if (r < 1000) {
                buckets.easy++;
            } else if (r < 1400) {
                buckets.medium++;
            } else if (r < 1800) {
                buckets.hard++;
            } else {
                buckets.expert++;
            }
        });
        const total =
            ratings.length || 1;
        const percentages = {
            easy:
                buckets.easy / total * 100,
            medium:
                buckets.medium / total * 100,
            hard:
                buckets.hard / total * 100,
            expert:
                buckets.expert / total * 100
        };
        const segments =
            document.querySelectorAll(
                ".difficulty-segment"
            );
        segments.forEach(segment => {
            if (
                segment.classList.contains("easy")
            ) {
                segment.style.width =
                    `${percentages.easy}%`;
            }
            if (
                segment.classList.contains("medium")
            ) {
                segment.style.width =
                    `${percentages.medium}%`;
            }
            if (
                segment.classList.contains("hard")
            ) {
                segment.style.width =
                    `${percentages.hard}%`;
            }
            if (
                segment.classList.contains("expert")
            ) {
                segment.style.width =
                    `${percentages.expert}%`;
            }
        });
        renderAverageRatingChart(
            data,
            ratings
        );
    }
    /* =========================================================
       AVERAGE RATING CHART
       ========================================================= */
    function renderAverageRatingChart(
        data,
        ratings
    ) {
        const canvas =
            $("averageRatingChart");
        if (
            !canvas ||
            typeof Chart === "undefined"
        ) {
            return;
        }
        if (state.charts.averageRating) {
            state.charts.averageRating.destroy();
        }
        const history =
            data.averageProblemRatingHistory ||
            data.problemRatingHistory ||
            data.averageRatingHistory ||
            [];
        let labels = [];
        let values = [];
        if (Array.isArray(history) && history.length) {
            labels =
                history.map(
                    item =>
                        formatDate(
                            item.date ||
                            item.time
                        )
                );
            values =
                history.map(
                    item =>
                        Number(
                            item.rating ||
                            item.average ||
                            0
                        )
                );
        } else {
            /*
             * If backend only gives raw ratings,
             * create a compact progression.
             */
            values =
                ratings.slice(-30);
            labels =
                values.map(
                    (_, index) =>
                        `#${index + 1}`
                );
        }
        state.charts.averageRating =
            new Chart(
                canvas.getContext("2d"),
                {
                    type: "line",
                    data: {
                        labels,
                        datasets: [{
                            data: values,
                            borderColor:
                                "#2563eb",
                            backgroundColor:
                                "rgba(37,99,235,.08)",
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 5
                        }]
                    },
                    options:
                        chartOptions(
                            "Average Rating"
                        )
                }
            );
    }
    /* =========================================================
       WEAKNESS ANALYSIS
       ========================================================= */
    function renderWeakness(data) {
        const topics =
            data.topics ||
            data.weakness ||
            [];
        if (!Array.isArray(topics)) {
            return;
        }
        const sorted =
            [...topics]
                .map(topic => ({
                    name:
                        topic.name ||
                        topic.topic ||
                        topic.tag ||
                        "Unknown",
                    attempts:
                        Number(
                            topic.avgAttempts ??
                            topic.avgTries ??
                            topic.averageTries ??
                            topic.attempts ??
                            0
                        )
                }))
                .filter(
                    topic =>
                        Number.isFinite(
                            topic.attempts
                        )
                )
                .sort(
                    (a, b) =>
                        b.attempts -
                        a.attempts
                )
                .slice(0, 5);
        if (!sorted.length) return;
        const weakest =
            sorted[0];
        setText(
            "weakestTopic",
            weakest.name
        );
        const highlight =
            document.querySelector(
                ".weakness-highlight small"
            );
        if (highlight) {
            highlight.textContent =
                `${weakest.attempts.toFixed(2)} average attempts`;
        }
        const rows =
            document.querySelectorAll(
                ".weakness-row"
            );
        const max =
            Math.max(
                ...sorted.map(
                    x => x.attempts
                ),
                1
            );
        rows.forEach((row, index) => {
            const topic =
                sorted[index];
            if (!topic) {
                row.style.display =
                    "none";
                return;
            }
            row.style.display = "";
            const name =
                row.querySelector(
                    ".weakness-topic span:last-child"
                );
            const value =
                row.querySelector(
                    "strong"
                );
            const bar =
                row.querySelector(
                    ".weakness-bar span"
                );
            if (name) {
                name.textContent =
                    topic.name;
            }
            if (value) {
                value.textContent =
                    topic.attempts.toFixed(2);
            }
            if (bar) {
                bar.style.width =
                    `${Math.max(
                        5,
                        topic.attempts /
                        max * 100
                    )}%`;
            }
        });
    }
    /* =========================================================
       RATING SUMMARY
       ========================================================= */
    function renderRatingSummary(
        data,
        profile
    ) {
        const stats =
            data.stats ||
            {};
        const cf =
            data.codeforces ||
            data.cf ||
            {};
        const current =
            Number(
                stats.currentRating ??
                cf.rating ??
                0
            );
        const peak =
            Number(
                stats.highestRating ??
                stats.bestRating ??
                cf.maxRating ??
                0
            );
        const change =
            Number(
                stats.ratingChange ??
                data.ratingChange ??
                0
            );
        const globalRank =
            stats.globalRank ??
            cf.rankPosition ??
            data.globalRank;
        setText(
            "ratingSummaryCurrent",
            number(current)
        );
        setText(
            "ratingSummaryPeak",
            number(peak)
        );
        setText(
            "ratingSummaryChange",
            signedNumber(change)
        );
        setText(
            "ratingGlobalRank",
            globalRank
                ? `#${number(globalRank)}`
                : "—"
        );
        /*
         * Rank badge
         */
        const rankElement =
            document.querySelector(
                ".rating-rank"
            );
        if (rankElement) {
            rankElement.textContent =
                getRatingRank(current);
        }
        /*
         * Progress to next Codeforces rank
         */
        const nextRank =
            getNextRank(current);
        const previousRank =
            nextRank.previous;
        const progress =
            nextRank.rating >
            previousRank
                ? Math.min(
                    100,
                    Math.max(
                        0,
                        (
                            (current -
                                previousRank) /
                            (nextRank.rating -
                                previousRank)
                        ) * 100
                    )
                )
                : 100;
        setText(
            "ratingProgressPercent",
            `${Math.round(progress)}%`
        );
        const progressBar =
            $("ratingProgressBar");
        if (progressBar) {
            progressBar.style.width =
                `${progress}%`;
        }
        const progressBottom =
            document.querySelector(
                ".rating-progress-bottom"
            );
        if (progressBottom) {
            const spans =
                progressBottom.querySelectorAll(
                    "span"
                );
            if (spans[0]) {
                spans[0].textContent =
                    previousRank;
            }
            if (spans[1]) {
                spans[1].textContent =
                    nextRank.rating;
            }
        }
    }
    function getNextRank(rating) {
        const ranks = [
            1200,
            1400,
            1600,
            1900,
            2100,
            2300,
            2400,
            2600,
            3000
        ];
        const current =
            Number(rating || 0);
        let previous = 0;
        for (const rank of ranks) {
            if (current < rank) {
                return {
                    rating: rank,
                    previous
                };
            }
            previous = rank;
        }
        return {
            rating: 3000,
            previous: 2600
        };
    }
    /* =========================================================
       PROBLEM ANALYTICS
       ========================================================= */
    function renderProblemAnalytics(data) {
        renderTopicAnalytics(data);
        renderDifficultyChart(data);
        renderMonthlyProgress(data);
        renderLanguageStatistics(data);
    }
    /* =========================================================
       TOPIC ANALYTICS
       ========================================================= */
    function renderTopicAnalytics(data) {
        const topics =
            data.topics ||
            data.topicStatistics ||
            [];
        const list =
            document.querySelector(
                ".topic-list"
            );
        if (
            !list ||
            !Array.isArray(topics)
        ) {
            return;
        }
        const sorted =
            [...topics]
                .map(topic => ({
                    name:
                        topic.name ||
                        topic.topic ||
                        topic.tag ||
                        "Unknown",
                    solved:
                        Number(
                            topic.solved ??
                            topic.count ??
                            0
                        )
                }))
                .filter(
                    topic =>
                        topic.solved >= 0
                )
                .sort(
                    (a, b) =>
                        b.solved -
                        a.solved
                )
                .slice(0, 8);
        if (!sorted.length) return;
        const total =
            sorted.reduce(
                (sum, topic) =>
                    sum + topic.solved,
                0
            ) || 1;
        list.innerHTML =
            sorted.map((topic, index) => {
                const percentage =
                    (
                        topic.solved /
                        total *
                        100
                    ).toFixed(1);
                const width =
                    Math.min(
                        100,
                        topic.solved /
                        sorted[0].solved *
                        100
                    );
                return `
                    <div class="topic-item">
                        <div class="topic-info">
                            <span class="topic-color topic-${index % 6}">
                            </span>
                            <span>
                                ${escapeHTML(topic.name)}
                            </span>
                        </div>
                        <div class="topic-value">
                            <strong>
                                ${number(topic.solved)}
                            </strong>
                            <small>
                                ${percentage}%
                            </small>
                        </div>
                    </div>
                    <div class="topic-progress">
                        <span
                            style="width:${width}%">
                        </span>
                    </div>
                `;
            }).join("");
    }
    /* =========================================================
       DIFFICULTY CHART
       ========================================================= */
    function renderDifficultyChart(data) {
        const canvas =
            $("difficultyChart");
        if (
            !canvas ||
            typeof Chart === "undefined"
        ) {
            return;
        }
        if (state.charts.difficulty) {
            state.charts.difficulty.destroy();
        }
        const difficulty =
            data.difficulty ||
            data.difficultyAnalysis ||
            {};
        const easy =
            Number(
                difficulty.easy ??
                data.easy ??
                0
            );
        const medium =
            Number(
                difficulty.medium ??
                data.medium ??
                0
            );
        const hard =
            Number(
                difficulty.hard ??
                data.hard ??
                0
            );
        const expert =
            Number(
                difficulty.expert ??
                data.expert ??
                0
            );
        /*
         * Update numeric stats.
         */
        const values = [
            easy,
            medium,
            hard,
            expert
        ];
        const statElements =
            document.querySelectorAll(
                ".difficulty-stat-grid > div strong"
            );
        statElements.forEach(
            (element, index) => {
                if (values[index] !== undefined) {
                    element.textContent =
                        number(values[index]);
                }
            }
        );
        state.charts.difficulty =
            new Chart(
                canvas.getContext("2d"),
                {
                    type: "doughnut",
                    data: {
                        labels: [
                            "Easy",
                            "Medium",
                            "Hard",
                            "Expert"
                        ],
                        datasets: [{
                            data: values,
                            backgroundColor: [
                                "#22c55e",
                                "#3b82f6",
                                "#f59e0b",
                                "#ef4444"
                            ],
                            borderWidth: 0,
                            hoverOffset: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: "72%",
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                padding: 12
                            }
                        }
                    }
                }
            );
    }
    /* =========================================================
       MONTHLY PROGRESS
       ========================================================= */
    function renderMonthlyProgress(data) {
        const canvas =
            $("monthlyProgressChart");
        if (
            !canvas ||
            typeof Chart === "undefined"
        ) {
            return;
        }
        if (state.charts.monthly) {
            state.charts.monthly.destroy();
        }
        const monthly =
            data.monthlyProgress ||
            data.monthly ||
            [];
        let labels;
        let values;
        if (
            Array.isArray(monthly) &&
            monthly.length
        ) {
            labels =
                monthly.map(
                    item =>
                        item.month ||
                        formatDate(item.date)
                );
            values =
                monthly.map(
                    item =>
                        Number(
                            item.solved ??
                            item.count ??
                            0
                        )
                );
        } else {
            /*
             * fallback
             */
            labels = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec"
            ];
            values =
                labels.map(() => 0);
        }
        const total =
            values.reduce(
                (a, b) => a + b,
                0
            );
        setText(
            "monthlySolvedTotal",
            number(
                data.totalSolved ??
                total
            )
        );
        state.charts.monthly =
            new Chart(
                canvas.getContext("2d"),
                {
                    type: "bar",
                    data: {
                        labels,
                        datasets: [{
                            data: values,
                            backgroundColor:
                                "rgba(37,99,235,.72)",
                            borderRadius: 7,
                            borderSkipped: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            x: {
                                grid: {
                                    display: false
                                }
                            },
                            y: {
                                beginAtZero: true,
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
       LANGUAGE STATISTICS
       ========================================================= */
    function renderLanguageStatistics(data) {
        const languages =
            data.languages ||
            data.languageStatistics ||
            [];
        if (
            !Array.isArray(languages) ||
            !languages.length
        ) {
            return;
        }
        const grid =
            document.querySelector(
                ".language-grid"
            );
        if (!grid) return;
        const total =
            languages.reduce(
                (sum, language) =>
                    sum +
                    Number(
                        language.count ??
                        language.solved ??
                        0
                    ),
                0
            ) || 1;
        grid.innerHTML =
            languages
                .slice(0, 6)
                .map(language => {
                    const count =
                        Number(
                            language.count ??
                            language.solved ??
                            0
                        );
                    const percentage =
                        count /
                        total *
                        100;
                    const name =
                        language.language ||
                        language.name ||
                        "Other";
                    let icon =
                        "fa-terminal";
                    let brand =
                        "fa-solid";
                    const lower =
                        name.toLowerCase();
                    if (
                        lower.includes("c++")
                    ) {
                        icon = "fa-code";
                    }
                    if (
                        lower.includes("python")
                    ) {
                        icon = "fa-python";
                        brand =
                            "fa-brands";
                    }
                    if (
                        lower.includes("java")
                    ) {
                        icon = "fa-java";
                        brand =
                            "fa-brands";
                    }
                    return `
                        <div class="language-card">
                            <div class="language-icon">
                                <i class="${brand} ${icon}">
                                </i>
                            </div>
                            <div class="language-details">
                                <strong>
                                    ${escapeHTML(name)}
                                </strong>
                                <span>
                                    ${number(count)}
                                    problems
                                </span>
                                <div class="language-progress">
                                    <span
                                        style="width:${percentage}%">
                                    </span>
                                </div>
                            </div>
                            <strong class="language-percent">
                                ${percentage.toFixed(0)}%
                            </strong>
                        </div>
                    `;
                })
                .join("");
    }
    /* =========================================================
       CONTESTS
       ========================================================= */
    function renderContests(data) {
        const contests =
            data.upcomingContests ||
            data.contests ||
            [];
        const list =
            document.querySelector(
                ".upcoming-contests"
            );
        if (!list) return;
        /*
         * Keep panel header.
         */
        const items =
            contests
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
                .slice(0, 5);
        /*
         * Remove old dynamic contest items
         * but preserve panel header.
         */
        list
            .querySelectorAll(
                ".contest-item"
            )
            .forEach(
                item =>
                    item.remove()
            );
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
            return;
        }
        items.forEach(
            contest => {
                const platform =
                    (
                        contest.platform ||
                        "CP"
                    ).toUpperCase();
                const div =
                    document.createElement(
                        "div"
                    );
                div.className =
                    "contest-item";
                div.innerHTML = `
                    <div class="contest-platform ${platform.toLowerCase()}">
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
                            ${formatDateTime(
                                contest.start
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
                        class="contest-reminder"
                        data-contest-id="${escapeHTML(
                            contest.id ||
                            contest.name ||
                            ""
                        )}"
                        title="Set reminder">
                        <i class="fa-regular fa-bell"></i>
                    </button>
                `;
                list.appendChild(div);
            }
        );
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
                document
                    .querySelectorAll(
                        "[data-contest-countdown]"
                    )
                    .forEach(element => {
                        const target =
                            Number(
                                element.dataset
                                    .contestCountdown
                            );
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
                button.onclick =
                    () => {
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
                        if (
                            enabled &&
                            "Notification"
                            in window
                        ) {
                            if (
                                Notification.permission ===
                                "default"
                            ) {
                                Notification.requestPermission();
                            }
                        }
                    };
            });
    }
    /* =========================================================
       RATING ANALYTICS
       ========================================================= */
    function renderRatingAnalytics(data) {
        const stats =
            data.stats ||
            {};
        const cf =
            data.codeforces ||
            data.cf ||
            {};
        const current =
            Number(
                stats.currentRating ??
                cf.rating ??
                0
            );
        const best =
            Number(
                stats.highestRating ??
                stats.bestRating ??
                cf.maxRating ??
                0
            );
        const ratings =
            data.ratings ||
            data.ratingHistory ||
            [];
        const ratingValues =
            ratings
                .map(
                    item =>
                        Number(
                            item.rating ??
                            item.newRating ??
                            0
                        )
                )
                .filter(
                    Number.isFinite
                );
        const lowest =
            ratingValues.length
                ? Math.min(
                    ...ratingValues
                )
                : 0;
        const avg =
            average(
                ratingValues
            );
        const predicted =
            predictRating(
                ratings
            );
        const statBoxes =
            document.querySelectorAll(
                ".rating-analytics-stats > div"
            );
        if (statBoxes[0]) {
            const strong =
                statBoxes[0]
                    .querySelector("strong");
            if (strong) {
                strong.textContent =
                    number(current);
            }
        }
        if (statBoxes[1]) {
            const strong =
                statBoxes[1]
                    .querySelector("strong");
            if (strong) {
                strong.textContent =
                    number(best);
            }
        }
        if (statBoxes[2]) {
            const strong =
                statBoxes[2]
                    .querySelector("strong");
            if (strong) {
                strong.textContent =
                    number(lowest);
            }
        }
        if (statBoxes[3]) {
            const strong =
                statBoxes[3]
                    .querySelector("strong");
            if (strong) {
                strong.textContent =
                    avg
                        ? number(
                            Math.round(avg)
                        )
                        : "—";
            }
        }
        if (statBoxes[4]) {
            const strong =
                statBoxes[4]
                    .querySelector("strong");
            if (strong) {
                strong.textContent =
                    predicted
                        ? number(
                            Math.round(
                                predicted
                            )
                        )
                        : "—";
            }
        }
        renderRatingHistoryChart(
            ratings
        );
    }
    /* =========================================================
       SIMPLE RATING PREDICTION
       ========================================================= */
    function predictRating(history) {
        if (
            !Array.isArray(history) ||
            history.length < 3
        ) {
            return 0;
        }
        const values =
            history
                .map(
                    item =>
                        Number(
                            item.rating ??
                            item.newRating ??
                            0
                        )
                )
                .filter(
                    Number.isFinite
                )
                .slice(-8);
        if (values.length < 3) {
            return 0;
        }
        const first =
            values[0];
        const last =
            values[values.length - 1];
        const trend =
            (
                last -
                first
            ) /
            Math.max(
                1,
                values.length - 1
            );
        /*
         * This is intentionally labelled
         * estimated in the UI.
         */
        return Math.max(
            0,
            last + trend * 3
        );
    }
    /* =========================================================
       RATING HISTORY CHART
       ========================================================= */
    function renderRatingHistoryChart(
        ratings
    ) {
        const canvas =
            $("ratingHistoryChart");
        if (
            !canvas ||
            typeof Chart === "undefined"
        ) {
            return;
        }
        if (state.charts.ratingHistory) {
            state.charts.ratingHistory.destroy();
        }
        const normalized =
            ratings
                .map(item => ({
                    date:
                        item.date ||
                        item.time ||
                        item.ratingUpdateTime ||
                        item.ratingUpdateTimeSeconds,
                    rating:
                        Number(
                            item.rating ??
                            item.newRating ??
                            0
                        )
                }))
                .filter(
                    item =>
                        item.date &&
                        Number.isFinite(
                            item.rating
                        )
                );
        if (!normalized.length) {
            return;
        }
        const labels =
            normalized.map(
                item =>
                    formatDate(
                        Number.isFinite(
                            Number(item.date)
                        ) &&
                        String(item.date)
                            .length === 10
                            ? Number(item.date) * 1000
                            : item.date
                    )
            );
        const values =
            normalized.map(
                item =>
                    item.rating
            );
        const ctx =
            canvas.getContext("2d");
        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                0,
                360
            );
        gradient.addColorStop(
            0,
            "rgba(37,99,235,.18)"
        );
        gradient.addColorStop(
            1,
            "rgba(37,99,235,0)"
        );
        state.charts.ratingHistory =
            new Chart(
                ctx,
                {
                    type: "line",
                    data: {
                        labels,
                        datasets: [
                            {
                                label:
                                    "Rating",
                                data:
                                    values,
                                borderColor:
                                    "#2563eb",
                                backgroundColor:
                                    gradient,
                                fill: true,
                                borderWidth: 3,
                                pointRadius: 0,
                                pointHoverRadius: 6,
                                tension: .38
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            intersect: false,
                            mode: "index"
                        },
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                backgroundColor:
                                    "#0f172a",
                                titleColor:
                                    "#cbd5e1",
                                bodyColor:
                                    "#ffffff",
                                padding: 12,
                                displayColors:
                                    false,
                                callbacks: {
                                    label:
                                        context =>
                                            `Rating: ${number(
                                                context.raw
                                            )}`
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    maxTicksLimit: 8
                                }
                            },
                            y: {
                                border: {
                                    display: false
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
        const grid =
            $("heatmapGrid");
        if (!grid) return;
        const heatmap =
            data.heatmap ||
            data.activityHeatmap ||
            [];
        const map =
            new Map();
        heatmap.forEach(item => {
            const date =
                new Date(
                    item.date
                );
            if (
                !Number.isNaN(
                    date.getTime()
                )
            ) {
                const key =
                    date.toISOString()
                        .slice(0, 10);
                map.set(
                    key,
                    Number(
                        item.count ||
                        item.solved ||
                        0
                    )
                );
            }
        });
        const cells = [];
        const today =
            new Date();
        today.setHours(
            0,
            0,
            0,
            0
        );
        for (
            let i = 364;
            i >= 0;
            i--
        ) {
            const date =
                new Date(today);
            date.setDate(
                today.getDate() - i
            );
            const key =
                date.toISOString()
                    .slice(0, 10);
            const count =
                map.get(key) || 0;
            let level = 0;
            if (count === 1) {
                level = 1;
            } else if (count <= 3) {
                level = 2;
            } else if (count <= 5) {
                level = 3;
            } else if (count > 5) {
                level = 4;
            }
            cells.push(`
                <span
                    class="heat-cell level-${level}"
                    title="${count} solve${count === 1 ? "" : "s"} • ${key}">
                </span>
            `);
        }
        grid.innerHTML =
            cells.join("");
        /*
         * Update totals
         */
        const total =
            [...map.values()]
                .reduce(
                    (a, b) =>
                        a + b,
                    0
                );
        setText(
            "activityTotal",
            number(total)
        );
        const activeDays =
            [...map.values()]
                .filter(
                    value =>
                        value > 0
                );
        const longest =
            calculateLongestStreak(
                map
            );
        setText(
            "activityLongestStreak",
            number(longest)
        );
        /*
         * Heatmap total is also useful
         * for the current activity card.
         */
        const activitySummary =
            document.querySelector(
                ".activity-summary"
            );
        if (activitySummary) {
            const spans =
                activitySummary
                    .querySelectorAll(
                        "span"
                    );
            if (spans[0]) {
                spans[0].textContent =
                    "total solves";
            }
            if (spans[1]) {
                spans[1].textContent =
                    "longest streak";
            }
        }
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
    /* =========================================================
       PERIOD SELECTORS
       ========================================================= */
    function setupPeriodSelectors() {
        /*
         * Statistics
         */
        $$(".period-option")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        $$(".period-option")
                            .forEach(
                                item =>
                                    item.classList
                                        .remove(
                                            "active"
                                        )
                            );
                        button.classList.add(
                            "active"
                        );
                        state.periods.statistics =
                            button.dataset
                                .statPeriod ||
                            "week";
                        if (state.dashboard) {
                            renderStatisticsSummary(
                                state.dashboard
                            );
                        }
                    }
                );
            });
        /*
         * Average rating
         */
        $("averageRatingPeriod")
            ?.addEventListener(
                "change",
                event => {
                    state.periods.averageRating =
                        event.target.value;
                    if (state.dashboard) {
                        renderAverageProblemRating(
                            state.dashboard
                        );
                    }
                }
            );
        /*
         * Problem analytics
         */
        $("problemAnalyticsPeriod")
            ?.addEventListener(
                "change",
                event => {
                    state.periods.problemAnalytics =
                        event.target.value;
                    if (state.dashboard) {
                        renderProblemAnalytics(
                            state.dashboard
                        );
                    }
                }
            );
        /*
         * Rating analytics
         */
        $("ratingAnalyticsPeriod")
            ?.addEventListener(
                "change",
                event => {
                    state.periods.ratingAnalytics =
                        event.target.value;
                    if (state.dashboard) {
                        renderRatingAnalytics(
                            state.dashboard
                        );
                    }
                }
            );
    }
    /* =========================================================
       SEARCH
       ========================================================= */
    function setupSearch() {
        const overlay =
            $("searchOverlay");
        const input =
            $("globalSearch");
        const close =
            $("searchClose");
        if (!overlay || !input) {
            return;
        }
        function openSearch() {
            overlay.classList.add(
                "active"
            );
            overlay.setAttribute(
                "aria-hidden",
                "false"
            );
            setTimeout(
                () =>
                    input.focus(),
                100
            );
        }
        function closeSearch() {
            overlay.classList.remove(
                "active"
            );
            overlay.setAttribute(
                "aria-hidden",
                "true"
            );
            input.value = "";
        }
        close?.addEventListener(
            "click",
            closeSearch
        );
        overlay.addEventListener(
            "click",
            event => {
                if (
                    event.target ===
                    overlay
                ) {
                    closeSearch();
                }
            }
        );
        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "/" &&
                    document.activeElement !==
                    input
                ) {
                    event.preventDefault();
                    openSearch();
                }
                if (
                    event.key === "Escape"
                ) {
                    closeSearch();
                }
            }
        );
        /*
         * Navbar may have its own search button.
         */
        document
            .querySelectorAll(
                "[data-search], .search-button, #searchButton"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    openSearch
                );
            });
    }
    /* =========================================================
       REMINDER SETTINGS
       ========================================================= */
    function setupReminderSettings() {
        const save =
            document.querySelector(
                ".primary-button"
            );
        if (!save) return;
        save.addEventListener(
            "click",
            () => {
                const options =
                    document.querySelectorAll(
                        ".reminder-option input"
                    );
                const settings = {
                    oneDay:
                        Boolean(
                            options[0]?.checked
                        ),
                    fifteenMinutes:
                        Boolean(
                            options[1]?.checked
                        )
                };
                localStorage.setItem(
                    "cpTrackerReminderSettings",
                    JSON.stringify(settings)
                );
                showToast(
                    "Reminder settings saved."
                );
            }
        );
    }
    /* =========================================================
       LAST SYNC
       ========================================================= */
    function updateLastSync() {
        const element =
            $("lastSynced");
        if (!element) return;
        const now =
            new Date();
        element.textContent =
            `Last synced ${now.toLocaleTimeString(
                [],
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            )}`;
    }
    /* =========================================================
       AUTO REFRESH
       ========================================================= */
    function setupAutoRefresh() {
        /*
         * Refresh every 5 minutes.
         *
         * Important:
         * Codeforces officially limits API requests,
         * so don't aggressively poll.
         */
        clearInterval(
            state.refreshTimer
        );
        state.refreshTimer =
            setInterval(
                async () => {
                    try {
                        await loadDashboard();
                        renderDashboard(
                            state.dashboard,
                            state.profile
                        );
                        updateLastSync();
                    } catch (error) {
                        console.warn(
                            "Auto refresh failed:",
                            error.message
                        );
                    }
                },
                5 * 60 * 1000
            );
    }
    /* =========================================================
       UI HELPERS
       ========================================================= */
    function setText(id, value) {
        const element =
            $(id);
        if (element) {
            element.textContent =
                value;
        }
    }
    function chartOptions(
        tooltipLabel
    ) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor:
                        "#0f172a",
                    titleColor:
                        "#cbd5e1",
                    bodyColor:
                        "#ffffff",
                    padding: 12,
                    displayColors:
                        false,
                    callbacks: {
                        label:
                            context =>
                                `${tooltipLabel}: ${number(
                                    context.raw
                                )}`
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 7
                    }
                },
                y: {
                    border: {
                        display: false
                    },
                    grid: {
                        color:
                            "rgba(15,23,42,.06)"
                    }
                }
            }
        };
    }
    function showToast(
        message,
        type = "success"
    ) {
        let container =
            document.querySelector(
                ".dashboard-toast-container"
            );
        if (!container) {
            container =
                document.createElement(
                    "div"
                );
            container.className =
                "dashboard-toast-container";
            document.body.appendChild(
                container
            );
        }
        const toast =
            document.createElement(
                "div"
            );
        toast.className =
            `dashboard-toast ${type}`;
        toast.textContent =
            message;
        container.appendChild(
            toast
        );
        setTimeout(
            () => {
                toast.classList.add(
                    "hide"
                );
                setTimeout(
                    () =>
                        toast.remove(),
                    300
                );
            },
            3000
        );
    }
    function showDashboardLoading(
        loading
    ) {
        document.body.classList.toggle(
            "dashboard-loading",
            loading
        );
    }
    function showDashboardError(
        message
    ) {
        console.error(
            "CP Tracker Dashboard:",
            message
        );
        showToast(
            message ||
            "Unable to load dashboard.",
            "error"
        );
    }
    /* =========================================================
       BOOTSTRAP
       ========================================================= */
    async function boot() {
        setupPeriodSelectors();
        setupSearch();
        setupReminderSettings();
        await initializeDashboard();
        setupAutoRefresh();
    }
    boot();
})();
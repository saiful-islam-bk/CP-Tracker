/* =========================================================
   CP TRACKER — STATISTICS SUMMARY
   Codeforces submission based statistics
   ========================================================= */

(() => {
    "use strict";

    const API_BASE = "http://localhost:3000";

    const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

    if (!token) return;

    const state = {
        submissions: [],
        periods: {
            week: null,
            month: null,
            year: null
        },
        currentPeriod: "week"
    };

    /* =========================================================
       HELPERS
       ========================================================= */

    const $ = id =>
        document.getElementById(id);

    function setText(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = value;
        }
    }

    function number(value) {
        const n = Number(value);

        if (!Number.isFinite(n)) {
            return "0";
        }

        return n.toLocaleString();
    }

    function signedNumber(value) {
        const n = Number(value || 0);

        if (!Number.isFinite(n)) {
            return "0";
        }

        return `${n >= 0 ? "+" : ""}${n.toLocaleString()}`;
    }

    function authHeaders() {
        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        };
    }

    /* =========================================================
       LOAD PROFILE
       ========================================================= */

    async function getProfile() {
        const response = await fetch(
            `${API_BASE}/profile`,
            {
                headers: authHeaders()
            }
        );

        if (response.status === 401) {
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");

            window.location.href = "login.html";

            throw new Error("Session expired.");
        }

        if (!response.ok) {
            throw new Error(
                `Profile request failed: ${response.status}`
            );
        }

        const data =
            await response.json();

        if (!data.success || !data.user) {
            throw new Error(
                "Unable to load profile."
            );
        }

        return data.user;
    }

    /* =========================================================
       CODEFORCES API
       ========================================================= */

    async function fetchCodeforcesSubmissions(handle) {
        if (!handle) {
            throw new Error(
                "Codeforces handle not found."
            );
        }

        const url =
            `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`;

        const response =
            await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Codeforces API error: ${response.status}`
            );
        }

        const data =
            await response.json();

        if (data.status !== "OK") {
            throw new Error(
                data.comment ||
                "Codeforces API returned an error."
            );
        }

        return Array.isArray(data.result)
            ? data.result
            : [];
    }

    /* =========================================================
       CALCULATE PERIOD
       ========================================================= */

    function calculatePeriod(
        submissions,
        days
    ) {
        const now =
            Math.floor(
                Date.now() / 1000
            );

        const from =
            now -
            days * 24 * 60 * 60;

        const periodSubmissions =
            submissions.filter(sub => {
                const time =
                    Number(
                        sub.creationTimeSeconds
                    );

                return (
                    Number.isFinite(time) &&
                    time >= from &&
                    time <= now
                );
            });

        /*
         * Every submission counts as an attempt.
         *
         * Example:
         *
         * WA
         * WA
         * TLE
         * OK
         *
         * Attempts = 4
         */
        const attempts =
            periodSubmissions.length;

        /*
         * A problem is counted as solved only once.
         *
         * Same problem:
         * WA
         * WA
         * OK
         *
         * Solved = 1
         */
        const solvedProblems =
            new Map();

        for (
            const submission
            of periodSubmissions
        ) {
            if (
                submission.verdict !== "OK" ||
                !submission.problem
            ) {
                continue;
            }

            const problem =
                submission.problem;

            /*
             * Codeforces problem identity.
             */
            const contestId =
                problem.contestId ??
                "gym";

            const index =
                problem.index ??
                problem.name ??
                Math.random();

            const key =
                `${contestId}:${index}`;

            if (
                !solvedProblems.has(key)
            ) {
                solvedProblems.set(
                    key,
                    problem
                );
            }
        }

        const solved =
            solvedProblems.size;

        /*
         * Average rating of solved problems.
         */
        const ratings =
            [...solvedProblems.values()]
                .map(problem =>
                    Number(problem.rating)
                )
                .filter(
                    rating =>
                        Number.isFinite(
                            rating
                        ) &&
                        rating > 0
                );

        const averageRating =
            ratings.length
                ? ratings.reduce(
                    (sum, rating) =>
                        sum + rating,
                    0
                ) / ratings.length
                : 0;

        return {
            solved,
            attempts,
            averageRating:
                Math.round(
                    averageRating
                )
        };
    }

    /* =========================================================
       CALCULATE ALL PERIODS
       ========================================================= */

    function calculateAllPeriods(
        submissions
    ) {
        state.periods.week =
            calculatePeriod(
                submissions,
                7
            );

        state.periods.month =
            calculatePeriod(
                submissions,
                30
            );

        state.periods.year =
            calculatePeriod(
                submissions,
                365
            );
    }

    /* =========================================================
       RENDER
       ========================================================= */

    function renderPeriod(
        periodName
    ) {
        const data =
            state.periods[
                periodName
            ];

        if (!data) return;

        setText(
            "summarySolved",
            number(data.solved)
        );

        setText(
            "summaryAttempts",
            number(data.attempts)
        );

        setText(
            "summaryRating",
            data.averageRating
                ? number(
                    data.averageRating
                )
                : "—"
        );

        /*
         * These change indicators can later
         * compare against previous periods.
         *
         * For now show useful labels.
         */

        setText(
            "summarySolvedChange",
            `${number(data.solved)} solved`
        );

        setText(
            "summaryAttemptsChange",
            `${number(data.attempts)} submissions`
        );

        setText(
            "summaryRatingChange",
            data.averageRating
                ? `avg ${number(data.averageRating)}`
                : "No rated problems"
        );
    }

    /* =========================================================
       PERIOD BUTTONS
       ========================================================= */

    function setupPeriodButtons() {
        const buttons =
            document.querySelectorAll(
                ".period-option"
            );

        buttons.forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    buttons.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );

                    button.classList.add(
                        "active"
                    );

                    const period =
                        button.dataset
                            .statPeriod ||
                        "week";

                    state.currentPeriod =
                        period;

                    renderPeriod(
                        period
                    );
                }
            );
        });
    }

    /* =========================================================
       LOAD
       ========================================================= */

    async function initialize() {
        try {
            const profile =
                await getProfile();

            /*
             * Your profile field is expected
             * to be `cf`.
             *
             * Also supports common alternatives.
             */
            const handle =
                profile.cf ||
                profile.codeforces ||
                profile.codeforcesHandle ||
                profile.cfHandle;

            if (!handle) {
                console.warn(
                    "No Codeforces handle found."
                );

                setText(
                    "summarySolved",
                    "—"
                );

                setText(
                    "summaryAttempts",
                    "—"
                );

                setText(
                    "summaryRating",
                    "—"
                );

                setText(
                    "summarySolvedChange",
                    "CF handle not connected"
                );

                setText(
                    "summaryAttemptsChange",
                    "CF handle not connected"
                );

                setText(
                    "summaryRatingChange",
                    "CF handle not connected"
                );

                return;
            }

            const submissions =
                await fetchCodeforcesSubmissions(
                    handle
                );

            state.submissions =
                submissions;

            calculateAllPeriods(
                submissions
            );

            renderPeriod(
                state.currentPeriod
            );

            console.log(
                "Statistics Summary loaded:",
                state.periods
            );

        } catch (error) {
            console.error(
                "Statistics Summary error:",
                error
            );

            setText(
                "summarySolved",
                "—"
            );

            setText(
                "summaryAttempts",
                "—"
            );

            setText(
                "summaryRating",
                "—"
            );

            setText(
                "summarySolvedChange",
                "Unable to fetch"
            );

            setText(
                "summaryAttemptsChange",
                "Unable to fetch"
            );

            setText(
                "summaryRatingChange",
                "Unable to fetch"
            );
        }
    }

    /* =========================================================
       BOOT
       ========================================================= */

    function boot() {
        setupPeriodButtons();
        initialize();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            boot
        );
    } else {
        boot();
    }

})();
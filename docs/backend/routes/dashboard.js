const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db");
// =========================================================
// CONFIG
// =========================================================
const FETCH_TIMEOUT = 15000;
const CF_API = "https://codeforces.com/api";
const ATCODER_API = "https://atcoder.jp";
const ATCODER_SUBMISSION_API =
    "https://kenkoooo.com/atcoder/atcoder-api/v3";
// =========================================================
// AUTH MIDDLEWARE
// =========================================================
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Access denied"
        });
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
            success: false,
            message: "Invalid authorization format"
        });
    }
    const token = parts[1];
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Token expired or invalid"
        });
    }
}
// =========================================================
// FETCH JSON HELPER
// =========================================================
async function fetchJSON(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(
        () => controller.abort(),
        options.timeout || FETCH_TIMEOUT
    );
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "User-Agent": "CP-Tracker/1.0",
                ...(options.headers || {})
            },
            signal: controller.signal
        });
        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status} for ${url}`
            );
        }
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}
// =========================================================
// FETCH TEXT HELPER
// =========================================================
async function fetchText(url) {
    const controller = new AbortController();
    const timer = setTimeout(
        () => controller.abort(),
        FETCH_TIMEOUT
    );
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "CP-Tracker/1.0",
                "Accept": "text/html"
            },
            signal: controller.signal
        });
        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }
        return await response.text();
    } finally {
        clearTimeout(timer);
    }
}
// =========================================================
// SAFE FETCH
// =========================================================
async function safeFetch(fn, fallback = null) {
    try {
        return await fn();
    } catch (error) {
        console.error(
            "External API error:",
            error.message
        );
        return fallback;
    }
}
// =========================================================
// CODEFORCES
// =========================================================
async function getCodeforcesData(handle) {
    if (!handle) {
        console.log("CF: No handle provided");
        return {
            connected: false,
            profile: null,
            ratingHistory: [],
            submissions: []
        };
    }
    console.log("CF: Fetching handle =", handle);
    const encodedHandle = encodeURIComponent(handle);
    const [
        infoResponse,
        ratingResponse,
        submissionResponse
    ] = await Promise.all([
        safeFetch(
            () =>
                fetchJSON(
                    `${CF_API}/user.info?handles=${encodedHandle}`
                ),
            null
        ),
        safeFetch(
            () =>
                fetchJSON(
                    `${CF_API}/user.rating?handle=${encodedHandle}`
                ),
            null
        ),
        safeFetch(
            () =>
                fetchJSON(
                    `${CF_API}/user.status?handle=${encodedHandle}&from=1&count=10000`
                ),
            null
        )
    ]);
     console.log(
        "CF INFO:",
        infoResponse?.status,
        infoResponse?.comment || ""
    );

    console.log(
        "CF RATING:",
        ratingResponse?.status,
        ratingResponse?.comment || ""
    );

    console.log(
        "CF SUBMISSIONS:",
        submissionResponse?.status,
        submissionResponse?.comment || ""
    );
    
    const profile =
        infoResponse?.status === "OK"
            ? infoResponse.result?.[0] || null
            : null;
    const ratingHistory =
        ratingResponse?.status === "OK"
            ? ratingResponse.result || []
            : [];
    const submissions =
        submissionResponse?.status === "OK"
            ? submissionResponse.result || []
            : [];
    return {
        connected: !!profile,
        profile,
        ratingHistory,
        submissions
    };
}
// =========================================================
// ATCODER
// =========================================================
async function getAtCoderData(handle) {
    if (!handle) {
        return {
            connected: false,
            profile: null,
            ratingHistory: [],
            submissions: []
        };
    }
    const encodedHandle =
        encodeURIComponent(handle);
    const [
        history,
        submissions
    ] = await Promise.all([
        safeFetch(
            () =>
                fetchJSON(
                    `${ATCODER_API}/users/${encodedHandle}/history/json`
                ),
            []
        ),
        safeFetch(
            () =>
                fetchJSON(
                    `${ATCODER_SUBMISSION_API}/user/submissions?user=${encodedHandle}`
                ),
            []
        )
    ]);
    let profile = null;
    if (Array.isArray(history) && history.length) {
        const latest =
            history[history.length - 1];
        const highestRating =
            Math.max(
                ...history.map(
                    x => Number(x.NewRating || 0)
                )
            );
        profile = {
            userScreenName:
                handle,
            rating:
                Number(
                    latest.NewRating || 0
                ),
            highestRating,
            ratedMatches:
                history.length,
            lastCompeted:
                latest.EndTime || null
        };
    }
    return {
        connected: !!profile,
        profile,
        ratingHistory:
            Array.isArray(history)
                ? history
                : [],
        submissions:
            Array.isArray(submissions)
                ? submissions
                : []
    };
}
// =========================================================
// CODECHEF
// =========================================================
async function getCodeChefData(handle) {
    if (!handle) {
        return {
            connected: false,
            profile: null
        };
    }
    const encodedHandle =
        encodeURIComponent(handle);
    /*
     * CodeChef does not expose a public profile API
     * comparable to Codeforces.
     *
     * We try the commonly available public profile
     * endpoint first.
     */
    const profile = await safeFetch(
        () =>
            fetchJSON(
                `https://codechef-api.vercel.app/handle/${encodedHandle}`
            ),
        null
    );
    if (!profile) {
        return {
            connected: false,
            profile: null
        };
    }
    return {
        connected: true,
        profile
    };
}
// =========================================================
// CODEFORCES ANALYTICS
// =========================================================
function analyzeCodeforcesSubmissions(
    submissions
) {
    const solvedMap = new Map();
    const topicStats = new Map();
    const difficulty = {
        easy: 0,
        medium: 0,
        hard: 0,
        expert: 0
    };
    const languageStats = new Map();
    const dailyMap = new Map();
    let totalAttempts = 0;
    let acceptedAttempts = 0;
    let totalProblemRating = 0;
    let ratedProblemCount = 0;
    const activities = [];
    for (const submission of submissions) {
        totalAttempts++;
        const problem =
            submission.problem || {};
        const contestId =
            problem.contestId;
        const index =
            problem.index;
        const problemKey =
            contestId !== undefined
                ? `${contestId}-${index}`
                : `${problem.name || "unknown"}-${problemKeySafe(problem)}`;
        const date =
            new Date(
                Number(
                    submission.creationTimeSeconds
                ) * 1000
            );
        const dateKey =
            date.toISOString().slice(0, 10);
        const rating =
            Number(problem.rating || 0);
        const language =
            normalizeLanguage(
                submission.programmingLanguage
            );
        languageStats.set(
            language,
            (languageStats.get(language) || 0) + 1
        );
        if (submission.verdict === "OK") {
            acceptedAttempts++;
            if (!solvedMap.has(problemKey)) {
                solvedMap.set(
                    problemKey,
                    {
                        name:
                            problem.name ||
                            "Unknown Problem",
                        rating,
                        date:
                            date.toISOString(),
                        tags:
                            problem.tags || [],
                        language,
                        url:
                            contestId !== undefined
                                ? `https://codeforces.com/contest/${contestId}/problem/${index}`
                                : "https://codeforces.com/problemset"
                    }
                );
                if (rating > 0) {
                    totalProblemRating += rating;
                    ratedProblemCount++;
                    if (rating < 1000) {
                        difficulty.easy++;
                    }
                    else if (rating < 1400) {
                        difficulty.medium++;
                    }
                    else if (rating < 1800) {
                        difficulty.hard++;
                    }
                    else {
                        difficulty.expert++;
                    }
                }
                dailyMap.set(
                    dateKey,
                    (dailyMap.get(dateKey) || 0) + 1
                );
                /*
                 * Topic statistics
                 */
                const tags =
                    problem.tags || [];
                for (const tag of tags) {
                    if (!topicStats.has(tag)) {
                        topicStats.set(
                            tag,
                            {
                                solved: 0,
                                attempts: 0
                            }
                        );
                    }
                    topicStats.get(tag).solved++;
                }
                /*
                 * Recent activity
                 */
                activities.push({
                    platform:
                        "Codeforces",
                    problem:
                        problem.name ||
                        "Solved Problem",
                    rating:
                        rating || null,
                    time:
                        date.toISOString(),
                    url:
                        contestId !== undefined
                            ? `https://codeforces.com/contest/${contestId}/problem/${index}`
                            : "https://codeforces.com/problemset",
                    language
                });
            }
        }
    }
    /*
     * Calculate attempts per solved topic
     */
    for (const submission of submissions) {
        const problem =
            submission.problem || {};
        const tags =
            problem.tags || [];
        for (const tag of tags) {
            if (!topicStats.has(tag)) continue;
            topicStats.get(tag).attempts++;
        }
    }
    const topics =
        [...topicStats.entries()]
            .map(([topic, value]) => ({
                topic,
                solved:
                    value.solved,
                attempts:
                    value.solved
                        ? Number(
                            (
                                value.attempts /
                                value.solved
                            ).toFixed(2)
                        )
                        : 0
            }))
            .sort(
                (a, b) =>
                    b.attempts -
                    a.attempts
            )
            .slice(0, 10);
    const languageStatsArray =
        [...languageStats.entries()]
            .map(
                ([language, count]) => ({
                    language,
                    count
                })
            )
            .sort(
                (a, b) =>
                    b.count - a.count
            );
    const activity =
        activities
            .sort(
                (a, b) =>
                    new Date(b.time) -
                    new Date(a.time)
            )
            .slice(0, 20);
    const heatmap =
        [...dailyMap.entries()]
            .map(
                ([date, count]) => ({
                    date,
                    count
                })
            );
    const solved =
        solvedMap.size;
    const averageProblemRating =
        ratedProblemCount
            ? Math.round(
                totalProblemRating /
                ratedProblemCount
            )
            : 0;
    return {
        solved,
        totalAttempts,
        acceptedAttempts,
        averageProblemRating,
        difficulty,
        topics,
        languages:
            languageStatsArray,
        activity,
        heatmap
    };
}
// =========================================================
// HELPERS
// =========================================================
function problemKeySafe(problem) {
    return [
        problem.name || "",
        problem.rating || "",
        (problem.tags || []).join(",")
    ].join("|");
}
function normalizeLanguage(language) {
    if (!language) {
        return "Other";
    }
    const value =
        language.toLowerCase();
    if (
        value.includes("gnu c++") ||
        value.includes("c++")
    ) {
        return "C++";
    }
    if (value.includes("python")) {
        return "Python";
    }
    if (value.includes("java")) {
        return "Java";
    }
    if (value.includes("javascript")) {
        return "JavaScript";
    }
    if (value.includes("kotlin")) {
        return "Kotlin";
    }
    return "Other";
}
// =========================================================
// RATING ANALYTICS
// =========================================================
function buildRatingAnalytics(
    ratingHistory
) {
    if (!ratingHistory.length) {
        return {
            currentRating: 0,
            bestRating: 0,
            lowestRating: 0,
            averageRating: 0,
            change: 0,
            history: [],
            prediction: null
        };
    }
    const values =
        ratingHistory.map(
            x => Number(x.newRating || 0)
        );
    const currentRating =
        values[values.length - 1] || 0;
    const bestRating =
        Math.max(...values);
    const lowestRating =
        Math.min(...values);
    const averageRating =
        Math.round(
            values.reduce(
                (sum, value) =>
                    sum + value,
                0
            ) / values.length
        );
    const previousRating =
        values.length > 1
            ? values[values.length - 2]
            : currentRating;
    const change =
        currentRating -
        previousRating;
    const history =
        ratingHistory.map(item => ({
            date:
                new Date(
                    Number(
                        item.ratingUpdateTimeSeconds
                    ) * 1000
                ).toISOString(),
            rating:
                Number(
                    item.newRating
                ),
            contestName:
                item.contestName,
            rank:
                item.rank,
            change:
                Number(
                    item.newRating -
                    item.oldRating
                )
        }));
    /*
     * Simple future prediction.
     *
     * This is intentionally presented as
     * an estimate, not an AI prediction.
     */
    const recent =
        values.slice(-5);
    let prediction =
        currentRating;
    if (recent.length >= 2) {
        const first =
            recent[0];
        const last =
            recent[recent.length - 1];
        const trend =
            (last - first) /
            (recent.length - 1);
        prediction =
            Math.round(
                currentRating +
                trend * 3
            );
    }
    prediction =
        Math.max(
            0,
            Math.min(
                4000,
                prediction
            )
        );
    return {
        currentRating,
        bestRating,
        lowestRating,
        averageRating,
        change,
        history,
        prediction
    };
}
// =========================================================
// CONTESTS
// =========================================================
async function getCodeforcesContests() {
    const data =
        await safeFetch(
            () =>
                fetchJSON(
                    `${CF_API}/contest.list?gym=false`
                ),
            null
        );
    if (
        !data ||
        data.status !== "OK"
    ) {
        return [];
    }
    return data.result
        .filter(
            contest =>
                contest.phase === "BEFORE"
        )
        .map(
            contest => ({
                platform:
                    "Codeforces",
                short:
                    "CF",
                name:
                    contest.name,
                startsAt:
                    Number(
                        contest.startTimeSeconds
                    ) * 1000,
                duration:
                    Number(
                        contest.durationSeconds
                    ) * 1000,
                rated:
                    !String(
                        contest.name
                    )
                        .toLowerCase()
                        .includes("unrated")
            })
        );
}
async function getAtCoderContests() {
    const html =
        await safeFetch(
            () =>
                fetchText(
                    `${ATCODER_API}/contests/`
                ),
            ""
        );
    if (!html) {
        return [];
    }
    const contests = [];
    /*
     * Parse contest links from AtCoder's
     * public contests page.
     */
    const regex =
        /href="\/contests\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while (
        (match = regex.exec(html)) !== null
    ) {
        const id =
            match[1];
        const rawName =
            match[2]
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        if (!rawName) continue;
        /*
         * AtCoder page does not expose a
         * reliable machine-readable start
         * timestamp here, so only include
         * contest identity.
         *
         * The frontend will not countdown
         * these unless startsAt exists.
         */
        contests.push({
            platform:
                "AtCoder",
            short:
                "AC",
            name:
                rawName,
            contestId:
                id,
            rated: true,
            url:
                `${ATCODER_API}/contests/${id}/`
        });
    }
    /*
     * Remove duplicates.
     */
    const seen =
        new Set();
    return contests.filter(
        contest => {
            const key =
                contest.contestId;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        }
    ).slice(0, 20);
}
async function getCodeChefContests() {
    const data =
        await safeFetch(
            () =>
                fetchJSON(
                    "https://www.codechef.com/api/list/contests/all"
                ),
            null
        );
    if (!data) {
        return [];
    }
    const contests = [];
    const sections = [
        ...(data.future_contests || []),
        ...(data.present_contests || [])
    ];
    for (const contest of sections) {
        const start =
            contest.contest_start_date_iso ||
            contest.contest_start_date;
        const end =
            contest.contest_end_date_iso ||
            contest.contest_end_date;
        if (!start) continue;
        contests.push({
            platform:
                "CodeChef",
            short:
                "CC",
            name:
                contest.contest_name ||
                contest.contest_code,
            startsAt:
                new Date(start).getTime(),
            duration:
                end
                    ? new Date(end).getTime() -
                      new Date(start).getTime()
                    : 0,
            rated:
                true,
            url:
                `https://www.codechef.com/${contest.contest_code}`
        });
    }
    return contests;
}
async function getUpcomingContests() {
    const [
        codeforces,
        atcoder,
        codechef
    ] = await Promise.all([
        getCodeforcesContests(),
        getAtCoderContests(),
        getCodeChefContests()
    ]);
    return [
        ...codeforces,
        ...atcoder,
        ...codechef
    ]
        .filter(
            contest => {
                if (!contest.startsAt) {
                    return true;
                }
                return (
                    contest.startsAt >
                    Date.now()
                );
            }
        )
        .sort(
            (a, b) =>
                (a.startsAt || Infinity) -
                (b.startsAt || Infinity)
        )
        .slice(0, 15);
}
// =========================================================
// USER DATA
// =========================================================
async function getUser(req) {
    const [users] =
        await db.execute(
            `
            SELECT
                id,
                username,
                fullname,
                email,
                country,
                institution,
                bio,
                cf,
                cc,
                ac,
                profile_pic,
                joined
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [req.user.id]
        );
    if (!users.length) {
        return null;
    }
    return users[0];
}
// =========================================================
// BUILD DASHBOARD
// =========================================================
async function buildDashboard(req) {
    const user =
        await getUser(req);
    if (!user) {
        throw new Error(
            "User not found"
        );
    }
    const cfHandle = String(user.cf || "").trim();
    const ccHandle = String(user.cc || "").trim();
    const acHandle = String(user.ac || "").trim();

        console.log("=================================");
        console.log("DASHBOARD USER:", user.username);
        console.log("CF HANDLE:", cfHandle);
        console.log("CC HANDLE:", ccHandle);
        console.log("AC HANDLE:", acHandle);
        console.log("=================================");

    /*
     * Fetch all platforms concurrently.
     */
    const [
        cf,
        cc,
        ac,
        contests
    ] = await Promise.all([
        getCodeforcesData(
            cfHandle
        ),
        getCodeChefData(
            ccHandle
        ),
        getAtCoderData(
            acHandle
        ),
        getUpcomingContests()
    ]);
    /*
     * Codeforces analytics.
     */
    const cfAnalytics =
        analyzeCodeforcesSubmissions(
            cf.submissions
        );
    /*
     * Rating.
     */
    const cfRating =
        buildRatingAnalytics(
            cf.ratingHistory
        );
    /*
     * Use Codeforces as primary rating
     * because the dashboard's rating
     * fields are currently CF-oriented.
     */
    const currentRating =
        cf.profile?.rating ||
        0;
    const highestRating =
        cf.profile?.maxRating ||
        cfRating.bestRating ||
        0;
    const ratingChange =
        cfRating.change ||
        0;
    /*
     * Total solved.
     */
    const totalSolved =
        cfAnalytics.solved;
    /*
     * Last 7 days.
     */
    const weekAgo =
        Date.now() -
        7 * 24 * 60 * 60 * 1000;
    const monthAgo =
        Date.now() -
        30 * 24 * 60 * 60 * 1000;
    const solvedThisWeek =
        cfAnalytics.activity.filter(
            item =>
                new Date(item.time).getTime()
                >= weekAgo
        ).length;
    const monthActivities =
        cfAnalytics.activity.filter(
            item =>
                new Date(item.time).getTime()
                >= monthAgo
        );
    const monthProblemRatings =
        monthActivities
            .map(
                x => Number(x.rating)
            )
            .filter(
                x => x > 0
            );
    const averageProblemRating =
        monthProblemRatings.length
            ? Math.round(
                monthProblemRatings.reduce(
                    (a, b) => a + b,
                    0
                ) /
                monthProblemRatings.length
            )
            : cfAnalytics.averageProblemRating;
    /*
     * Attempts.
     */
    const averageAttempts =
        cfAnalytics.solved
            ? Number(
                (
                    cfAnalytics.totalAttempts /
                    cfAnalytics.solved
                ).toFixed(2)
            )
            : 0;
    /*
     * Current solving streak.
     */
    const heatmapMap =
        new Map(
            cfAnalytics.heatmap.map(
                x => [
                    x.date,
                    Number(x.count)
                ]
            )
        );
    const currentStreak =
        calculateCurrentStreak(
            heatmapMap
        );
    const longestStreak =
        calculateLongestStreak(
            heatmapMap
        );
    /*
     * Weekly goal.
     *
     * 5 problems/week.
     */
    const weeklyGoal =
        Math.min(
            100,
            Math.round(
                solvedThisWeek /
                5 *
                100
            )
        );
    /*
     * Topic data.
     */
    const topics =
        cfAnalytics.topics;
    /*
     * Language statistics.
     */
    const languages =
        cfAnalytics.languages;
    /*
     * Recent activities.
     */
    const activity =
        cfAnalytics.activity;
    /*
     * Rating summary.
     */
    const ratingSummary = {
        current:
            currentRating,
        peak:
            highestRating,
        change:
            ratingChange,
        rank:
            cf.profile?.rank || "Unrated",
        globalRank:
            cf.profile?.rank
                ? cf.profile.rank
                : null
    };
    /*
     * User object.
     */
    const userData = {
        id:
            user.id,
        name:
            user.fullname ||
            user.username,
        firstName:
            (
                user.fullname ||
                user.username ||
                "User"
            ).split(" ")[0],
        username:
            user.username,
        handle:
            cfHandle,
        cfHandle,
        ccHandle,
        acHandle,
        avatar:
            user.profile_pic || null
    };
    /*
     * Platform information.
     */
    const platforms = {
        codeforces: {
            connected:
                cf.connected,
            handle:
                cfHandle,
            rating:
                currentRating,
            highestRating,
            rank:
                cf.profile?.rank ||
                null,
            maxRank:
                cf.profile?.maxRank ||
                null
        },
        codechef: {
            connected:
                cc.connected,
            handle:
                ccHandle,
            profile:
                cc.profile
        },
        atcoder: {
            connected:
                ac.connected,
            handle:
                acHandle,
            rating:
                ac.profile?.rating ||
                0,
            highestRating:
                ac.profile?.highestRating ||
                0
        }
    };
    /*
     * Monthly progress.
     */
    const monthlyProgress =
        buildMonthlyProgress(
            cfAnalytics.heatmap
        );
    /*
     * Difficulty data.
     */
    const difficulty =
        cfAnalytics.difficulty;
    /*
     * Contest count.
     */
    const contestCount =
        cfRating.history.length;
    /*
     * Rating prediction.
     */
    const prediction =
        cfRating.prediction;
    /*
     * Final dashboard response.
     */
    return {
        success: true,
        syncedAt:
            new Date().toISOString(),
        user:
            userData,
        handles: {
            cf: cfHandle,
            cc: ccHandle,
            ac: acHandle
        },
        platforms,
        stats: {
            currentRating,
            highestRating,
            totalSolved,
            solvedThisWeek,
            contestCount,
            ratedContestPercentage:
                contestCount
                    ? 100
                    : 0,
            ratingChange,
            averageProblemRating,
            averageRatingChange:
                averageProblemRating,
            currentStreak,
            longestStreak,
            weeklyGoal
        },
        summary: {
            solved:
                solvedThisWeek,
            solveTime:
                "--",
            attempts:
                averageAttempts,
            rating:
                ratingChange,
            averageProblemRating,
            contestChange:
                ratingChange
        },
        ratingSummary,
        ratingAnalytics: {
            current:
                cfRating.currentRating,
            best:
                cfRating.bestRating,
            lowest:
                cfRating.lowestRating,
            average:
                cfRating.averageRating,
            change:
                cfRating.change,
            prediction,
            history:
                cfRating.history
        },
        ratingHistory:
            cfRating.history,
        problemHistory:
            activity.map(
                item => ({
                    date:
                        item.time,
                    rating:
                        item.rating || 0,
                    problem:
                        item.problem,
                    platform:
                        item.platform,
                    language:
                        item.language
                })
            ),
        problemAnalytics: {
            totalSolved,
            topics,
            difficulty,
            languages,
            monthlyProgress,
            averageProblemRating,
            totalAttempts:
                cfAnalytics.totalAttempts,
            acceptedAttempts:
                cfAnalytics.acceptedAttempts
        },
        topics,
        difficulty,
        languages,
        monthlyProgress,
        activity,
        heatmap:
            cfAnalytics.heatmap,
        contests,
        contestHistory:
            cfRating.history.map(
                item => ({
                    contestName:
                        item.contestName,
                    date:
                        item.date,
                    rank:
                        item.rank,
                    oldRating:
                        item.rating -
                        item.change,
                    newRating:
                        item.rating,
                    ratingChange:
                        item.change
                })
            ),
        syncStatus: {
            codeforces:
                cf.connected,
            codechef:
                cc.connected,
            atcoder:
                ac.connected
        }
    };
}
// =========================================================
// CURRENT STREAK
// =========================================================
function calculateCurrentStreak(
    map
) {
    let streak = 0;
    const today =
        new Date();
    today.setHours(
        0,
        0,
        0,
        0
    );
    for (;;) {
        const key =
            today.toISOString()
                .slice(0, 10);
        const count =
            map.get(key) || 0;
        if (count <= 0) {
            break;
        }
        streak++;
        today.setDate(
            today.getDate() - 1
        );
    }
    return streak;
}
// =========================================================
// LONGEST STREAK
// =========================================================
function calculateLongestStreak(
    map
) {
    if (!map.size) {
        return 0;
    }
    const dates =
        [...map.keys()]
            .sort();
    let longest = 0;
    let current = 0;
    let previous = null;
    for (const dateString of dates) {
        const date =
            new Date(dateString);
        if (!previous) {
            current = 1;
        } else {
            const diff =
                Math.round(
                    (
                        date -
                        previous
                    ) /
                    86400000
                );
            if (diff === 1) {
                current++;
            } else {
                current = 1;
            }
        }
        longest =
            Math.max(
                longest,
                current
            );
        previous =
            date;
    }
    return longest;
}
// =========================================================
// MONTHLY PROGRESS
// =========================================================
function buildMonthlyProgress(
    heatmap
) {
    const months =
        new Array(12)
            .fill(0);
    for (const item of heatmap) {
        const date =
            new Date(
                item.date
            );
        const month =
            date.getMonth();
        months[month] +=
            Number(
                item.count || 0
            );
    }
    return months.map(
        (count, index) => ({
            month:
                new Date(
                    2000,
                    index,
                    1
                ).toLocaleString(
                    "en-US",
                    {
                        month: "short"
                    }
                ),
            solved:
                count
        })
    );
}
// =========================================================
// GET DASHBOARD
// =========================================================
router.get(
    "/",
    verifyToken,
    async (req, res) => {
        try {
            const dashboard =
                await buildDashboard(req);
            return res.json(
                dashboard
            );
        } catch (error) {
            console.error(
                "Dashboard error:",
                error
            );
            return res.status(500).json({
                success: false,
                message:
                    "Failed to load dashboard data",
                error:
                    process.env.NODE_ENV === "development"
                        ? error.message
                        : undefined
            });
        }
    }
);
// =========================================================
// FORCE SYNC
// =========================================================
router.post(
    "/sync",
    verifyToken,
    async (req, res) => {
        try {
            const dashboard =
                await buildDashboard(req);
            return res.json(
                dashboard
            );
        } catch (error) {
            console.error(
                "Dashboard sync error:",
                error
            );
            return res.status(500).json({
                success: false,
                message:
                    "Dashboard synchronization failed",
                error:
                    process.env.NODE_ENV === "development"
                        ? error.message
                        : undefined
            });
        }
    }
);
// =========================================================
// PLATFORM CONNECTION STATUS
// =========================================================
router.get(
    "/platforms",
    verifyToken,
    async (req, res) => {
        try {
            const user =
                await getUser(req);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User not found"
                });
            }
            const [
                cf,
                cc,
                ac
            ] = await Promise.all([
                getCodeforcesData(
                    user.cf
                ),
                getCodeChefData(
                    user.cc
                ),
                getAtCoderData(
                    user.ac
                )
            ]);
            return res.json({
                success: true,
                platforms: {
                    codeforces: {
                        handle:
                            user.cf || null,
                        connected:
                            cf.connected
                    },
                    codechef: {
                        handle:
                            user.cc || null,
                        connected:
                            cc.connected
                    },
                    atcoder: {
                        handle:
                            user.ac || null,
                        connected:
                            ac.connected
                    }
                }
            });
        } catch (error) {
            console.error(
                "Platform status error:",
                error
            );
            return res.status(500).json({
                success: false,
                message:
                    "Failed to check platform status"
            });
        }
    }
);
module.exports = router;
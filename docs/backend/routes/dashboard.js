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
async function getAllCodeforcesSubmissions(handle) {
    if(!handle) return [];
    const allSubmissions = [];
    const COUNT = 10000;
    let from = 1;
    while (true) {
        const data = await safeFetch(
            () =>
                fetchJSON(
                    `${CF_API}/user.status?handle=${encodeURIComponent(handle)}&from=${from}&count=${COUNT}`
                ),
            null
        );
        if (!data || data.status !== "OK" || !Array.isArray(data.result)) {
            break;
        }
        const batch = data.result || [];
        allSubmissions.push(...batch);
        console.log(
            `CF submissions fetched: ${allSubmissions.length}`
        );
        if (batch.length < COUNT) {
            break;
        }
        from += COUNT;
        await new Promise(
            resolve => setTimeout(resolve, 2100)
        );
    }
    return allSubmissions;
}
async function getCodeforcesData(handle) {
    // ============================================
    // NO CODEFORCES HANDLE
    // ============================================
    if (!handle) {
        return {
            connected: false,
            profile: null,
            ratingHistory: [],
            submissions: [],
            profileStats: {
                solvedAllTime: 0,
                solvedLastYear: 0,
                solvedLastMonth: 0,
                maxStreak: 0,
                streakLastYear: 0,
                streakLastMonth: 0,
                currentStreak: 0
            }
        };
    }
    const encodedHandle = encodeURIComponent(handle);
    // ============================================
    // FETCH CF DATA
    // ============================================
    const [
        infoResponse,
        ratingResponse,
        submissions
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
        getAllCodeforcesSubmissions(handle)
    ]);
    // ============================================
    // PROFILE
    // ============================================
    const profile =
        infoResponse?.status === "OK"
            ? infoResponse.result?.[0] || null
            : null;
    // ============================================
    // RATING HISTORY
    // ============================================
    const ratingHistory =
        ratingResponse?.status === "OK"
            ? ratingResponse.result || []
            : [];
    // ============================================
    // VALID SUBMISSIONS
    // ============================================
    const validSubmissions =
        Array.isArray(submissions)
            ? submissions
            : [];
    // ============================================
    // SOLVED PROBLEMS
    // ============================================
    const solvedMap = new Map();
    for (const submission of validSubmissions) {
        if (submission.verdict !== "OK") {
            continue;
        }
        const problem = submission.problem || {};
        const contestId = problem.contestId;
        const index = problem.index;
        const problemKey =
            contestId !== undefined
                ? `${contestId}-${index}`
                : `${problem.name || "unknown"}-${problemKeySafe(problem)}`;
        const timestamp =
            Number(
                submission.creationTimeSeconds || 0
            );
        if (!timestamp) {
            continue;
        }
        // Only count each problem once
        if (!solvedMap.has(problemKey)) {
            solvedMap.set(
                problemKey,
                timestamp
            );
        }
    }
    // ============================================
    // TIME LIMITS
    // ============================================
    const now = Date.now();
    const oneMonthAgo =
        now - 30 * 24 * 60 * 60 * 1000;
    const oneYearAgo =
        now - 365 * 24 * 60 * 60 * 1000;
    // ============================================
    // SOLVED COUNTS + SOLVED DATES
    // ============================================
    let solvedLastMonth = 0;
    let solvedLastYear = 0;
    const solvedDates = new Set();
    for (const timestamp of solvedMap.values()) {
        const time = timestamp * 1000;
        if (time >= oneMonthAgo) {
            solvedLastMonth++;
        }
        if (time >= oneYearAgo) {
            solvedLastYear++;
        }
        const date =
            new Date(time)
                .toISOString()
                .slice(0, 10);
        solvedDates.add(date);
    }
    // ============================================
    // LONGEST STREAK
    // ============================================
    const sortedDates =
        [...solvedDates].sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let previousDate = null;
    for (const dateString of sortedDates) {
        const date = new Date(dateString);
        if (!previousDate) {
            currentStreak = 1;
        } else {
            const diff =
                Math.round(
                    (date - previousDate) / 86400000
                );
            if (diff === 1) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
        }
        longestStreak =
            Math.max(
                longestStreak,
                currentStreak
            );
        previousDate = date;
    }
    // ============================================
    // CURRENT STREAK
    // ============================================
    let currentStreakValue = 0;
    const today = new Date();
    today.setHours(
        0,
        0,
        0,
        0
    );
    while (true) {
        const dateKey =
            today.toISOString().slice(0, 10);
        if (!solvedDates.has(dateKey)) {
            break;
        }
        currentStreakValue++;
        today.setDate(
            today.getDate() - 1
        );
    }
    // ============================================
    // LAST YEAR STREAK
    // ============================================
    let streakLastYear = 0;
    const yearDates =
        sortedDates.filter(date => {
            const time =
                new Date(date).getTime();
            return time >= oneYearAgo;
        });
    let tempStreak = 0;
    let previousYearDate = null;
    for (const dateString of yearDates) {
        const date = new Date(dateString);
        if (!previousYearDate) {
            tempStreak = 1;
        } else {
            const diff =
                Math.round(
                    (date - previousYearDate) / 86400000
                );
            if (diff === 1) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }
        }
        streakLastYear =
            Math.max(
                streakLastYear,
                tempStreak
            );
        previousYearDate = date;
    }
    // ============================================
    // LAST MONTH STREAK
    // ============================================
    let streakLastMonth = 0;
    const monthDates =
        sortedDates.filter(date => {
            const time =
                new Date(date).getTime();
            return time >= oneMonthAgo;
        });
    tempStreak = 0;
    let previousMonthDate = null;
    for (const dateString of monthDates) {
        const date = new Date(dateString);
        if (!previousMonthDate) {
            tempStreak = 1;
        } else {
            const diff =
                Math.round(
                    (date - previousMonthDate) / 86400000
                );
            if (diff === 1) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }
        }
        streakLastMonth =
            Math.max(
                streakLastMonth,
                tempStreak
            );
        previousMonthDate = date;
    }
    // ============================================
    // PROFILE STATISTICS
    // ============================================
    const profileStats = {
        solvedAllTime: solvedMap.size,
        solvedLastYear,
        solvedLastMonth,
        maxStreak: longestStreak,
        streakLastYear,
        streakLastMonth,
        currentStreak: currentStreakValue
    };
    // ============================================
    // RETURN
    // ============================================
    return {
        connected: !!profile,
        profile,
        ratingHistory,
        submissions: validSubmissions,
        profileStats
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
            profile: null,
            ratingHistory: [],
            submissions: [],
            profileStats: {
                solvedAllTime: 0,
                solvedLastYear: 0,
                solvedLastMonth: 0,
                maxStreak: 0,
                streakLastYear: 0,
                streakLastMonth: 0
            }
        };
    }
    const encodedHandle = encodeURIComponent(handle);
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
        const problem = submission.problem || {};
        const contestId = problem.contestId;
        const index = problem.index;
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
        const dateKey = date.toISOString().slice(0, 10);
        const rating = Number(problem.rating || 0 || undefined);
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
                solvedMap.set(problemKey,
                    {
                        name: problem.name || "Unknown Problem",
                        rating,
                        date: date.toISOString(),
                        tags: problem.tags || [],
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
                    platform: "Codeforces",
                    problem: problem.name || "Solved Problem",
                    rating: rating || null,
                    time: date.toISOString(),
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
    const solved = solvedMap.size;
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
        languages: languageStatsArray,
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
    const recent = values.slice(-5);
    let prediction = currentRating;
    if (recent.length >= 2) {
        const first = recent[0];
        const last = recent[recent.length - 1];
        const trend = (last - first) / (recent.length - 1);
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
// ACTIVITY HEATMAP
// =========================================================
function buildHeatmap(heatmapMap) {
    const heatmap = [];
    for (const [date, count] of heatmapMap.entries()) {
        heatmap.push({
            date,
            count: Number(count || 0)
        });
    }
    return heatmap.sort(
        (a, b) =>
            new Date(a.date) -
            new Date(b.date)
    );
}
function renderHeatmap(heatmapData) {
    const grid = document.getElementById("heatmapGrid");
    const monthsContainer = document.getElementById("heatmapMonths");
    if (!grid || !monthsContainer) return;
    grid.innerHTML = "";
    monthsContainer.innerHTML = "";
    const dataMap = new Map();
    if (Array.isArray(heatmapData)) {
        heatmapData.forEach(item => {
            dataMap.set(
                item.date,
                Number(item.count || 0)
            );
        });
    }
    // ============================================
    // LAST 365 DAYS
    // ============================================
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(
        startDate.getDate() - 364
    );
    // ============================================
    // ALIGN START TO SUNDAY
    // ============================================
    const firstDay = new Date(startDate);
    firstDay.setDate(
        firstDay.getDate() - firstDay.getDay()
    );
    // ============================================
    // CREATE WEEK COLUMNS
    // ============================================
    const weeks = [];
    let current = new Date(firstDay);
    while (current <= endDate) {
        const week = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(current);
            date.setDate(
                current.getDate() + i
            );
            week.push(date);
        }
        weeks.push(week);
        current.setDate(
            current.getDate() + 7
        );
    }
    // ============================================
    // MAX SOLVES
    // ============================================
    let maxCount = 0;
    for (const count of dataMap.values()) {
        maxCount = Math.max(maxCount, count);
    }
    // ============================================
    // CREATE CELLS
    // ============================================
    weeks.forEach(week => {
        const column =
            document.createElement("div");
        column.className =
            "heatmap-week";
        week.forEach(date => {
            const year =
                date.getFullYear();
            const month =
                String(
                    date.getMonth() + 1
                ).padStart(2, "0");
            const day =
                String(
                    date.getDate()
                ).padStart(2, "0");
            const dateKey =
                `${year}-${month}-${day}`;
            const count =
                dataMap.get(dateKey) || 0;
            const cell =
                document.createElement("div");
            cell.className =
                "heatmap-cell";
            // ====================================
            // NO SOLVE = WHITE
            // ====================================
            if (count === 0) {
                cell.classList.add(
                    "level-0"
                );
            }
            // ====================================
            // SOLVES
            // ====================================
            else {
                const ratio =
                    maxCount > 0
                        ? count / maxCount
                        : 0;
                if (ratio <= 0.25) {
                    cell.classList.add(
                        "level-1"
                    );
                } else if (ratio <= 0.50) {
                    cell.classList.add(
                        "level-2"
                    );
                } else if (ratio <= 0.75) {
                    cell.classList.add(
                        "level-3"
                    );
                } else {
                    cell.classList.add(
                        "level-4"
                    );
                }
            }
            // ====================================
            // TOOLTIP
            // ====================================
            cell.dataset.date =
                dateKey;
            cell.dataset.count =
                count;
            cell.title =
                count === 0
                    ? `${dateKey}: No solves`
                    : `${dateKey}: ${count} problem${count > 1 ? "s" : ""} solved`;
            column.appendChild(cell);
        });
        grid.appendChild(column);
    });
    // ============================================
    // DYNAMIC MONTH LABELS
    // LAST 12 MONTHS ONLY
    // ============================================
    let lastMonthKey = "";
    weeks.forEach((week, index) => {
        const visibleDate =
            week.find(date =>
                date >= startDate &&
                date <= endDate
            );
        if (!visibleDate) return;
        const monthKey =  `${visibleDate.getFullYear()}-${visibleDate.getMonth()}`;
        if (monthKey === lastMonthKey) {
            return;
        }
        const label = document.createElement("span");
        label.textContent =
            visibleDate.toLocaleString(
                "en-US",
                {
                    month: "short"
                }
            );
        label.style.gridColumn = index + 1;
        monthsContainer.appendChild(label);
        lastMonthKey = monthKey;
    });
    // ============================================
    // TOTAL SOLVES
    // ============================================
    const total =
        [...dataMap.values()]
            .reduce(
                (sum, count) =>
                    sum + count,
                0
            );
    const totalElement =
        document.getElementById(
            "activityTotal"
        );
    if (totalElement) {
        totalElement.textContent = total.toLocaleString();
    }
}
function formatHeatmapDate(date) {
    const year = date.getFullYear();
    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");
    const day =
        String(
            date.getDate()
        ).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function formatHeatmapReadableDate(date) {
    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
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
    const acHandle =  String(user.ac || "").trim();
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
    const cfProfileStats = cf.profileStats || {};
    const totalSolved = cf.profileStats?.solvedAllTime || cfAnalytics.solved;
    /*
     * Last 7 days.
     */
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
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
    const heatmap = buildHeatmap(heatmapMap);
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
                solvedThisWeek / 5 * 100
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
    const languages = cfAnalytics.languages;
    /*
     * Recent activities.
     */
    const activity = cfAnalytics.activity;
    /*
     * Rating summary.
     */
    const ratingSummary = {
        current: currentRating,
        peak: highestRating,
        change: ratingChange,
        rank: cf.profile?.rank || "Unrated",
        globalRank: cf.profile?.rank? cf.profile.rank : null
    };
    /*
     * User object.
     */
    const userData = {
        id: user.id,
        name: user.fullname || user.username,
        firstName:
            (
                user.fullname ||
                user.username ||
                "User"
            ).split(" ")[0],
        username: user.username,
        handle: {
            cf: cfHandle,
            cc: ccHandle,
            ac: acHandle,
        },
        avatar: user.profile_pic || null
    };
    /*
     * Platform information.
     */
    const platforms = {
        codeforces: {
            connected: cf.connected,
            handle: cfHandle,
            rating: currentRating,
            highestRating,
            rank:
                cf.profile?.rank ||
                null,
            maxRank:
                cf.profile?.maxRank ||
                null
        },
        codechef: {
            connected: cc.connected,
            handle: ccHandle,
            profile: cc.profile
        },
        atcoder: {
            connected: ac.connected,
            handle: acHandle,
            rating: ac.profile?.rating || 0,
            highestRating: ac.profile?.highestRating || 0
        }
    };
    /*
     * Monthly progress.
     */
    const monthlyProgress =
        buildMonthlyProgress(
            heatmap
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
            solvedLastYear: cfProfileStats.solvedLastYear || 0,
            solvedLastMonth: cfProfileStats.solvedLastMonth || 0,
            maxStreak: cfProfileStats.maxStreak || 0,
            streakLastYear: cfProfileStats.streakLastYear || 0,
            streakLastMonth: cfProfileStats.streakLastMonth || 0,
            contestCount,
            ratedContestPercentage:
                contestCount
                    ? 100
                    : 0,
            ratingChange,
            averageProblemRating,
            averageRatingChange: averageProblemRating,
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
                    date: item.time,
                    rating: item.rating || 0,
                    problem: item.problem,
                    platform: item.platform,
                    language: item.language
                })
            ),
        problemAnalytics: {
            totalSolved,
            topics,
            difficulty,
            languages,
            monthlyProgress,
            averageProblemRating,
            totalAttempts: cfAnalytics.totalAttempts,
            acceptedAttempts: cfAnalytics.acceptedAttempts
        },
        topics,
        difficulty,
        languages,
        monthlyProgress,
        activity,
        heatmap: heatmap,
        contests,
        contestHistory:
            cfRating.history.map(
                item => ({
                    contestName: item.contestName,
                    date: item.date,
                    rank: item.rank,
                    oldRating: item.rating - item.change,
                    newRating: item.rating,
                    ratingChange: item.change
                })
            ),
        syncStatus: {
            codeforces: cf.connected,
            codechef: cc.connected,
            atcoder: ac.connected
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
            const dashboard = await buildDashboard(req);
            console.log("=================================");
            console.log("DASHBOARD DATA CHECK");
            console.log("CF HANDLE:", dashboard.handles.cf);
            console.log("CURRENT RATING:", dashboard.stats.currentRating);
            console.log("HIGHEST RATING:", dashboard.stats.highestRating);
            console.log("TOTAL SOLVED:", dashboard.stats.totalSolved);
            console.log("RATING HISTORY:", dashboard.ratingHistory.length);
            console.log("ACTIVITY:", dashboard.activity.length);
            console.log("=================================");
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
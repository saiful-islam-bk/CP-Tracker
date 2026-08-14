const express = require("express");
const router = express.Router();
async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
}
// =========================================================
// CODEFORCES
// =========================================================
async function getCodeforcesContests() {
    const data = await fetchJSON(
        "https://codeforces.com/api/contest.list"
    );
    if (data.status !== "OK") {
        throw new Error("Codeforces API error");
    }
    return data.result
        .filter(contest => contest.phase === "BEFORE")
        .map(contest => ({
            id: `cf-${contest.id}`,
            platform: "CF",
            platformName: "Codeforces",
            name: contest.name,
            startTime: contest.startTimeSeconds * 1000,
            duration: contest.durationSeconds,
            url: `https://codeforces.com/contest/${contest.id}`
        }));
}
// =========================================================
// ATCODER
// =========================================================
async function getAtCoderContests() {
    const data = await fetchJSON(
        "https://atcoder.jp/contests/"
    );
    /*
     * AtCoder does not provide a simple official JSON
     * upcoming-contest API like Codeforces.
     *
     * So this function is intentionally left separate.
     */
    return [];
}
// =========================================================
// UPCOMING CONTESTS
// =========================================================
router.get("/upcoming", async (req, res) => {
    const results = [];
    const errors = [];
    // -----------------------------
    // Codeforces
    // -----------------------------
    try {
        const cf = await getCodeforcesContests();
        results.push(...cf);
    } catch (error) {
        console.error("Codeforces:", error.message);
        errors.push("Codeforces");
    }
    // -----------------------------
    // AtCoder
    // -----------------------------
    try {
        const ac = await getAtCoderContests();
        results.push(...ac);
    } catch (error) {
        console.error("AtCoder:", error.message);
        errors.push("AtCoder");
    }
    // Sort by start time
    results.sort((a, b) => a.startTime - b.startTime);
    res.json({
        success: true,
        contests: results,
        errors
    });
});
module.exports = router;
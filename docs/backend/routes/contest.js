const express = require("express");
const router = express.Router();
console.log("🔥🔥🔥 CONTEST ROUTE FILE LOADED 🔥🔥🔥");
// =========================================================
// CONFIG
// =========================================================
const MAX_PER_PLATFORM = 2;
const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/149.0 Safari/537.36",
    "Accept":
        "text/html,application/json,application/xhtml+xml"
};
// =========================================================
// HELPERS
// =========================================================
function normalizeTimestamp(value) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }
    if (typeof value === "number") {
        return value < 100000000000
            ? value * 1000
            : value;
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
        return numeric < 100000000000
            ? numeric * 1000
            : numeric;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed)
        ? null
        : parsed;
}
function cleanText(value = "") {
    return String(value)
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}
function timeoutSignal(ms = 15000) {
    return AbortSignal.timeout(ms);
}
function sortAndLimit(contests) {
    return contests
        .filter(
            contest =>
                contest &&
                contest.timestamp &&
                contest.timestamp > Date.now()
        )
        .sort(
            (a, b) =>
                a.timestamp - b.timestamp
        )
        .slice(0, MAX_PER_PLATFORM);
}
// =========================================================
// CODEFORCES
// =========================================================
async function fetchCodeforces() {
    console.log("CF: fetching contests...");
    try {
        const response = await fetch(
            "https://codeforces.com/api/contest.list",
            {
                headers: HEADERS,
                signal: timeoutSignal(15000)
            }
        );
        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }
        const data = await response.json();
        if (data.status !== "OK") {
            throw new Error(
                "Codeforces API status is not OK"
            );
        }
        const contests = [];
        for (const contest of data.result || []) {
            if (contest.phase !== "BEFORE") {
                continue;
            }
            const timestamp =
                normalizeTimestamp(
                    contest.startTimeSeconds
                );
            if (
                !timestamp ||
                timestamp <= Date.now()
            ) {
                continue;
            }
            contests.push({
                id:
                    `cf-${contest.id}`,
                name:
                    contest.name,
                platform:
                    "cf",
                timestamp,
                duration:
                    Number(
                        contest.durationSeconds || 0
                    ) * 1000,
                url:
                    `https://codeforces.com/contest/${contest.id}`
            });
        }
        const result =
            sortAndLimit(contests);
        console.log(
            `CF: found ${result.length} upcoming contests`
        );
        return result;
    } catch (error) {
        console.error(
            "❌ CF fetch error:",
            error.message
        );
        return [];
    }
}
// =========================================================
// ATCODER
// =========================================================
async function fetchAtCoder() {
    console.log("AC: fetching contests...");
    try {
        /*
         * AtCoder has an official contests page.
         * We parse the Upcoming Contests table.
         */
        const response = await fetch(
            "https://atcoder.jp/contests/?lang=en",
            {
                headers: HEADERS,
                signal: timeoutSignal(20000)
            }
        );
        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }
        const html =
            await response.text();
        const contests = [];
        /*
         * Match:
         *
         * <time datetime="...">
         * <a href="/contests/abc...">
         *
         * We don't depend on a specific table class.
         */
        const regex =
            /<time[^>]*datetime=["']([^"']+)["'][^>]*>[\s\S]*?<\/time>[\s\S]*?<a[^>]*href=["']\/contests\/([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while (
            (match = regex.exec(html)) !== null
        ) {
            const timestamp =
                normalizeTimestamp(
                    match[1]
                );
            if (
                !timestamp ||
                timestamp <= Date.now()
            ) {
                continue;
            }
            const contestId =
                match[2];
            const name =
                cleanText(match[3]);
            if (!contestId || !name) {
                continue;
            }
            contests.push({
                id:
                    `ac-${contestId}`,
                name,
                platform:
                    "ac",
                timestamp,
                url:
                    `https://atcoder.jp/contests/${contestId}`
            });
        }
        /*
         * Remove duplicates.
         */
        const unique =
            Array.from(
                new Map(
                    contests.map(
                        contest => [
                            contest.id,
                            contest
                        ]
                    )
                ).values()
            );
        const result =
            sortAndLimit(unique);
        console.log(
            `AC: found ${result.length} upcoming contests`
        );
        return result;
    } catch (error) {
        console.error(
            "❌ AC fetch error:",
            error.message
        );
        return [];
    }
}
// =========================================================
// CODECHEF
// =========================================================
async function fetchCodeChef() {
    console.log("CC: fetching contests...");
    try {
        const response = await fetch(
            "https://www.codechef.com/contests",
            {
                headers: HEADERS,
                signal: timeoutSignal(20000)
            }
        );
        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }
        const html =
            await response.text();
        const contests = [];
        /*
         * CodeChef changes frontend HTML
         * from time to time.
         *
         * Try multiple patterns.
         */
        const patterns = [
            /*
             * contest_code / contest_name /
             * contest_start_date_iso
             */
            /"contest_code"\s*:\s*"([^"]+)"[\s\S]*?"contest_name"\s*:\s*"([^"]+)"[\s\S]*?"contest_start_date_iso"\s*:\s*"([^"]+)"/gi,
            /*
             * contestCode / contestName /
             * startDate
             */
            /"contestCode"\s*:\s*"([^"]+)"[\s\S]*?"contestName"\s*:\s*"([^"]+)"[\s\S]*?"startDate"\s*:\s*"([^"]+)"/gi,
            /*
             * Generic CodeChef JSON structure
             */
            /"code"\s*:\s*"([^"]+)"[\s\S]*?"name"\s*:\s*"([^"]+)"[\s\S]*?"startDate"\s*:\s*"([^"]+)"/gi
        ];
        for (
            const pattern of patterns
        ) {
            let match;
            while (
                (match =
                    pattern.exec(html)) !== null
            ) {
                const code =
                    cleanText(match[1]);
                const name =
                    cleanText(match[2]);
                const timestamp =
                    normalizeTimestamp(
                        match[3]
                    );
                if (
                    !code ||
                    !name ||
                    !timestamp
                ) {
                    continue;
                }
                if (
                    timestamp <= Date.now()
                ) {
                    continue;
                }
                const id =
                    `cc-${code}`;
                if (
                    contests.some(
                        contest =>
                            contest.id === id
                    )
                ) {
                    continue;
                }
                contests.push({
                    id,
                    name,
                    platform:
                        "cc",
                    timestamp,
                    url:
                        `https://www.codechef.com/${code}`
                });
            }
        }
        const result =
            sortAndLimit(contests);
        console.log(
            `CC: found ${result.length} upcoming contests`
        );
        return result;
    } catch (error) {
        console.error(
            "❌ CC fetch error:",
            error.message
        );
        return [];
    }
}
// =========================================================
// FETCH ALL
// =========================================================
async function fetchAllContests() {
    console.log(
        "======================================"
    );
    console.log(
        "FETCHING UPCOMING CONTESTS"
    );
    console.log(
        "======================================"
    );
    /*
     * IMPORTANT:
     *
     * Each API has its own try/catch.
     *
     * So if:
     *
     * CF works
     * AC fails
     * CC times out
     *
     * CF data will STILL be returned.
     */
    const [
        codeforces,
        atcoder,
        codechef
    ] = await Promise.allSettled([
        fetchCodeforces(),
        fetchAtCoder(),
        fetchCodeChef()
    ]);
    const cf =
        codeforces.status === "fulfilled"
            ? codeforces.value
            : [];
    const ac =
        atcoder.status === "fulfilled"
            ? atcoder.value
            : [];
    const cc =
        codechef.status === "fulfilled"
            ? codechef.value
            : [];
    /*
     * Maximum 2 from each platform.
     */
    const finalCF =
        sortAndLimit(cf);
    const finalAC =
        sortAndLimit(ac);
    const finalCC =
        sortAndLimit(cc);
    const contests = [
        ...finalCF,
        ...finalAC,
        ...finalCC
    ].sort(
        (a, b) =>
            a.timestamp - b.timestamp
    );
    console.log(
        "======================================"
    );
    console.log(
        `CF: ${finalCF.length}`
    );
    console.log(
        `AC: ${finalAC.length}`
    );
    console.log(
        `CC: ${finalCC.length}`
    );
    console.log(
        `TOTAL: ${contests.length}`
    );
    console.log(
        "======================================"
    );
    return {
        contests,
        sources: {
            codeforces:
                finalCF.length,
            atcoder:
                finalAC.length,
            codechef:
                finalCC.length
        }
    };
}
// =========================================================
// API
// =========================================================
router.get(
    "/",
    async (req, res) => {
        console.log(
            "🔥🔥🔥 /api/contests REQUEST HIT 🔥🔥🔥"
        );
        try {
            const result =
                await fetchAllContests();
            res.json({
                success:
                    true,
                contests:
                    result.contests,
                sources:
                    result.sources
            });
        } catch (error) {
            console.error(
                "❌ Contest API error:",
                error
            );
            /*
             * Even if something unexpected
             * happens, don't crash server.
             */
            res.status(200).json({
                success:
                    true,
                contests:
                    [],
                sources: {
                    codeforces: 0,
                    atcoder: 0,
                    codechef: 0
                },
                warning:
                    "Some contest sources are temporarily unavailable."
            });
        }
    }
);
module.exports = router;
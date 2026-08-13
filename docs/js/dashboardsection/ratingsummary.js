/* =========================================================
   CP TRACKER — RATING SUMMARY
========================================================= */
function renderRatingSummary(data) {
    const stats =
        data?.stats ||
        {};
    const cf =
        data?.codeforces ||
        data?.cf ||
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
            data?.ratingChange ??
            0
        );
    const globalRank =
        stats.globalRank ??
        cf.rankPosition ??
        data?.globalRank;
    /* =====================================================
       SUMMARY VALUES
    ===================================================== */
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
    /* =====================================================
       RANK BADGE
    ===================================================== */
    const rankElement =
        document.querySelector(".rating-rank");
    if (rankElement) {
        rankElement.textContent =
            getRatingRank(current);
    }
    /* =====================================================
       PROGRESS TO NEXT RANK
    ===================================================== */
    const nextRank =
        getNextRank(current);
    const previousRank =
        nextRank.previous;
    const progress =
        nextRank.rating > previousRank
            ? Math.min(
                100,
                Math.max(
                    0,
                    (
                        (current - previousRank) /
                        (nextRank.rating - previousRank)
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
    /* =====================================================
       PROGRESS RANGE
    ===================================================== */
    const progressBottom =
        document.querySelector(
            ".rating-progress-bottom"
        );
    if (progressBottom) {
        const spans =
            progressBottom.querySelectorAll("span");
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
/* =========================================================
   CODEFORCES NEXT RANK
========================================================= */
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
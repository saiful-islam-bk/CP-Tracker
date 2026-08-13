/* =========================================================
   RATING ANALYTICS
========================================================= */
function renderRatingAnalytics(data) {
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
    const best =
        Number(
            stats.highestRating ??
            stats.bestRating ??
            cf.maxRating ??
            0
        );
    const ratings =
        Array.isArray(
            data?.ratings
        )
            ? data.ratings
            : Array.isArray(
                data?.ratingHistory
            )
                ? data.ratingHistory
                : [];
    const ratingValues =
        ratings
            .map(item =>
                Number(
                    item?.rating ??
                    item?.newRating ??
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
    /* =====================================================
       STAT BOXES
    ===================================================== */
    const statBoxes =
        document.querySelectorAll(
            ".rating-analytics-stats > div"
        );
    updateRatingStatBox(
        statBoxes[0],
        current
            ? number(current)
            : "—"
    );
    updateRatingStatBox(
        statBoxes[1],
        best
            ? number(best)
            : "—"
    );
    updateRatingStatBox(
        statBoxes[2],
        lowest
            ? number(lowest)
            : "—"
    );
    updateRatingStatBox(
        statBoxes[3],
        avg
            ? number(
                Math.round(avg)
            )
            : "—"
    );
    updateRatingStatBox(
        statBoxes[4],
        predicted
            ? number(
                Math.round(
                    predicted
                )
            )
            : "—"
    );
    /* =====================================================
       RATING HISTORY
    ===================================================== */
    renderRatingHistoryChart(
        ratings
    );
}
/* =========================================================
   UPDATE RATING STAT BOX
========================================================= */
function updateRatingStatBox(
    box,
    value
) {
    if (!box) return;
    const strong =
        box.querySelector(
            "strong"
        );
    if (strong) {
        strong.textContent =
            value;
    }
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
            .map(item =>
                Number(
                    item?.rating ??
                    item?.newRating ??
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
        values[
            values.length - 1
        ];
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
     * Simple estimated future rating.
     *
     * This is NOT an official
     * Codeforces prediction.
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
    /* Destroy previous chart */
    if (
        state.charts.ratingHistory
    ) {
        state.charts.ratingHistory.destroy();
        state.charts.ratingHistory =
            null;
    }
    if (
        !Array.isArray(ratings) ||
        !ratings.length
    ) {
        return;
    }
    /* =====================================================
       NORMALIZE DATA
    ===================================================== */
    const normalized =
        ratings
            .map(item => ({
                date:
                    item?.date ??
                    item?.time ??
                    item?.ratingUpdateTime ??
                    item?.ratingUpdateTimeSeconds,
                rating:
                    Number(
                        item?.rating ??
                        item?.newRating ??
                        0
                    )
            }))
            .filter(
                item =>
                    item.date !==
                        undefined &&
                    item.date !==
                        null &&
                    Number.isFinite(
                        item.rating
                    )
            );
    if (!normalized.length) {
        return;
    }
    /* =====================================================
       LABELS
    ===================================================== */
    const labels =
        normalized.map(
            item => {
                const raw =
                    item.date;
                const numeric =
                    Number(raw);
                /*
                 * Codeforces timestamps are
                 * normally Unix seconds.
                 */
                if (
                    Number.isFinite(
                        numeric
                    )
                ) {
                    return formatDate(
                        String(raw)
                            .length === 10
                            ? numeric * 1000
                            : numeric
                    );
                }
                return formatDate(
                    raw
                );
            }
        );
    const values =
        normalized.map(
            item =>
                item.rating
        );
    /* =====================================================
       CHART
    ===================================================== */
    const ctx =
        canvas.getContext(
            "2d"
        );
    if (!ctx) {
        return;
    }
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
                            fill:
                                true,
                            borderWidth:
                                3,
                            pointRadius:
                                0,
                            pointHoverRadius:
                                6,
                            tension:
                                0.38
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
                            titleColor:
                                "#cbd5e1",
                            bodyColor:
                                "#ffffff",
                            padding:
                                12,
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
                                display:
                                    false
                            },
                            ticks: {
                                maxTicksLimit:
                                    8
                            }
                        },
                        y: {
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
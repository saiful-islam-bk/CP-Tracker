/* =========================================================
   AVERAGE PROBLEM RATING
========================================================= */
function renderAverageProblemRating(data) {
    const periods = data?.periods || {};
    const period =
        periods[state.periods.averageRating] ||
        periods.month ||
        {};
    const ratings = Array.isArray(period.problemRatings)
        ? period.problemRatings
        : [];
    const avg = average(ratings);
    setText(
        "averageRatingValue",
        avg
            ? number(Math.round(avg))
            : "—"
    );
    /* =====================================================
       DIFFICULTY DISTRIBUTION
    ===================================================== */
    const buckets = {
        easy: 0,
        medium: 0,
        hard: 0,
        expert: 0
    };
    ratings.forEach(rating => {
        const r = Number(rating);
        if (!Number.isFinite(r)) return;
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
    const total = ratings.length;
    const percentages = {
        easy: total ? (buckets.easy / total) * 100 : 0,
        medium: total ? (buckets.medium / total) * 100 : 0,
        hard: total ? (buckets.hard / total) * 100 : 0,
        expert: total ? (buckets.expert / total) * 100 : 0
    };
    const segments =
        document.querySelectorAll(".difficulty-segment");
    segments.forEach(segment => {
        if (segment.classList.contains("easy")) {
            segment.style.width =
                `${percentages.easy}%`;
        }
        if (segment.classList.contains("medium")) {
            segment.style.width =
                `${percentages.medium}%`;
        }
        if (segment.classList.contains("hard")) {
            segment.style.width =
                `${percentages.hard}%`;
        }
        if (segment.classList.contains("expert")) {
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
function renderAverageRatingChart(data, ratings) {
    const canvas = $("averageRatingChart");
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
        data?.averageProblemRatingHistory ||
        data?.problemRatingHistory ||
        data?.averageRatingHistory ||
        [];
    let labels = [];
    let values = [];
    if (
        Array.isArray(history) &&
        history.length
    ) {
        labels = history.map(item =>
            formatDate(
                item.date ||
                item.time
            )
        );
        values = history.map(item =>
            Number(
                item.rating ??
                item.average ??
                0
            )
        );
    } else {
        /*
         * Backend does not provide history.
         * Use the latest 30 raw problem ratings.
         */
        values = ratings
            .slice(-30)
            .map(Number)
            .filter(Number.isFinite);
        labels = values.map(
            (_, index) => `#${index + 1}`
        );
    }
    if (!values.length) {
        return;
    }
    state.charts.averageRating =
        new Chart(
            canvas.getContext("2d"),
            {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Average Rating",
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
                        }
                    ]
                },
                options:
                    chartOptions(
                        "Average Rating"
                    )
            }
        );
}
/* =========================================================
   CP TRACKER — WEAKNESS ANALYSIS
========================================================= */
function renderWeakness(data) {
    const topics =
        data?.topics ||
        data?.weakness ||
        [];
    const rows =
        document.querySelectorAll(
            ".weakness-row"
        );
    if (!Array.isArray(topics)) {
        return;
    }
    /* =====================================================
       NORMALIZE & SORT
    ===================================================== */
    const sorted =
        topics
            .map(topic => ({
                name:
                    topic?.name ||
                    topic?.topic ||
                    topic?.tag ||
                    "Unknown",
                attempts:
                    Number(
                        topic?.avgAttempts ??
                        topic?.avgTries ??
                        topic?.averageTries ??
                        topic?.attempts ??
                        0
                    )
            }))
            .filter(topic =>
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
    /* =====================================================
       NO DATA
    ===================================================== */
    if (!sorted.length) {
        setText(
            "weakestTopic",
            "No data"
        );
        const highlight =
            document.querySelector(
                ".weakness-highlight small"
            );
        if (highlight) {
            highlight.textContent =
                "Not enough data";
        }
        rows.forEach(row => {
            row.style.display = "none";
        });
        return;
    }
    /* =====================================================
       WEAKEST TOPIC
    ===================================================== */
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
    /* =====================================================
       RENDER TOP TOPICS
    ===================================================== */
    const max =
        Math.max(
            ...sorted.map(
                topic =>
                    topic.attempts
            ),
            1
        );
    rows.forEach(
        (row, index) => {
            const topic =
                sorted[index];
            /* Hide unused rows */
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
                const percentage =
                    Math.max(
                        5,
                        (
                            topic.attempts /
                            max
                        ) * 100
                    );
                bar.style.width =
                    `${percentage}%`;
            }
        }
    );
}
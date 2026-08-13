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
/* =========================================================
    FORMATTERS
========================================================= */
function number(value) {
    if (
        value === null ||
        value === undefined ||
        value === "" ||
        Number.isNaN(Number(value))
    ) {
        return "0";
    }
    return Number(value).toLocaleString();
}
function signedNumber(value) {
    const n = Number(value || 0);
    return `${n >= 0 ? "+" : ""}${n.toLocaleString()}`;
}
function average(values) {
    const valid = values
        .map(Number)
        .filter(Number.isFinite);
    if (!valid.length) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
}
function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }
    return date.toLocaleDateString(
        [],
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}
function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }
    return date.toLocaleString(
        [],
        {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );
}
function relativeTime(value) {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) {
        return "recently";
    }
    const diff = Date.now() - time;
    if (diff < 0) {
        return "upcoming";
    }
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    if (days < 30) {
        return `${days}d ago`;
    }
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}
function countdown(milliseconds) {
    if (milliseconds <= 0) {
        return "LIVE";
    }
    const totalSeconds =
        Math.floor(milliseconds / 1000);
    const days =
        Math.floor(totalSeconds / 86400);
    const hours =
        Math.floor((totalSeconds % 86400) / 3600);
    const minutes =
        Math.floor((totalSeconds % 3600) / 60);
    const seconds =
        totalSeconds % 60;
    if (days > 0) {
        return `${days}d ${String(hours).padStart(2, "0")}h`;
    }
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function escapeHTML(value) {
    return String(value ?? "")
        .replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char]));
}
function safeURL(value) {
    if (!value) return "#";
    try {
        const url =
            new URL(value, window.location.origin);
        if (
            url.protocol === "http:" ||
            url.protocol === "https:"
        ) {
            return url.href;
        }
    } catch {}
    return "#";
}
/* =========================================================
    RATING LABEL
========================================================= */
function getRatingRank(rating) {
    const r = Number(rating || 0);
    if (r < 1200) return "Newbie";
    if (r < 1400) return "Pupil";
    if (r < 1600) return "Specialist";
    if (r < 1900) return "Expert";
    if (r < 2100) return "Candidate Master";
    if (r < 2300) return "Master";
    if (r < 2400) return "International Master";
    if (r < 2600) return "Grandmaster";
    if (r < 3000) return "International Grandmaster";
    return "Legendary Grandmaster";
}
/* =========================================================
    UI HELPERS
    ========================================================= */
function setText(id, value) {
    const element =
        $(id);
    if (element) {
        element.textContent =
            value;
    }
}
function chartOptions(
    tooltipLabel
) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: "index"
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor:
                    "#0f172a",
                titleColor:
                    "#cbd5e1",
                bodyColor:
                    "#ffffff",
                padding: 12,
                displayColors:
                    false,
                callbacks: {
                    label:
                        context =>
                            `${tooltipLabel}: ${number(
                                context.raw
                            )}`
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxTicksLimit: 7
                }
            },
            y: {
                border: {
                    display: false
                },
                grid: {
                    color:
                        "rgba(15,23,42,.06)"
                }
            }
        }
    };
}
function showToast(
    message,
    type = "success"
) {
    let container =
        document.querySelector(
            ".dashboard-toast-container"
        );
    if (!container) {
        container =
            document.createElement(
                "div"
            );
        container.className =
            "dashboard-toast-container";
        document.body.appendChild(
            container
        );
    }
    const toast =
        document.createElement(
            "div"
        );
    toast.className =
        `dashboard-toast ${type}`;
    toast.textContent =
        message;
    container.appendChild(
        toast
    );
    setTimeout(
        () => {
            toast.classList.add(
                "hide"
            );
            setTimeout(
                () =>
                    toast.remove(),
                300
            );
        },
        3000
    );
}
function showDashboardLoading(
    loading
) {
    document.body.classList.toggle(
        "dashboard-loading",
        loading
    );
}
function showDashboardError(
    message
) {
    console.error(
        "CP Tracker Dashboard:",
        message
    );
    showToast(
        message ||
        "Unable to load dashboard.",
        "error"
    );
}
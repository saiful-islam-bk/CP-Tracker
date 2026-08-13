/* =========================================================
   CP TRACKER — PREMIUM DASHBOARD
   Main Controller
========================================================= */
"use strict";
/* =========================================================
   CONFIG
========================================================= */
const API_BASE =
    "http://localhost:3000";
const API = {
    profile:
        `${API_BASE}/profile`,
    dashboard:
        `${API_BASE}/dashboard`,
    sync:
        `${API_BASE}/dashboard/sync`
};
/* =========================================================
   AUTH
========================================================= */
const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");
if (!token) {
    window.location.href = "login.html";
    throw new Error("Authentication required");
}
/* =========================================================
   STATE
========================================================= */
const state = {
    profile: null,
    dashboard: null,
    charts: {
        averageRating: null,
        difficulty: null,
        monthly: null,
        ratingHistory: null
    },
    countdownTimer: null,
    refreshTimer: null,
    periods: {
        statistics: "week",
        averageRating: "month",
        problemAnalytics: "month",
        ratingAnalytics: "6m"
    }
};
/* =========================================================
   DOM HELPERS
========================================================= */
const $ = id =>
    document.getElementById(id);
const $$ = selector =>
    document.querySelectorAll(selector);
/* =========================================================
   AUTH HEADERS
========================================================= */
function authHeaders(json = true) {
    const headers = {
        Authorization:
            `Bearer ${token}`
    };
    if (json) {
        headers["Content-Type"] =
            "application/json";
    }
    return headers;
}
/* =========================================================
   API FETCH
========================================================= */
async function apiFetch(
    url,
    options = {}
) {
    const response =
        await fetch(url, {
            ...options,
            headers: {
                ...authHeaders(
                    Boolean(options.body)
                ),
                ...(options.headers || {})
            }
        });
    /* =====================================================
       SESSION EXPIRED
    ===================================================== */
    if (response.status === 401) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        window.location.href =
            "login.html";
        throw new Error(
            "Session expired"
        );
    }
    /* =====================================================
       READ RESPONSE
    ===================================================== */
    const text =
        await response.text();
    let data = {};
    try {
        data =
            text
                ? JSON.parse(text)
                : {};
    } catch {
        throw new Error(
            `Invalid server response (${response.status})`
        );
    }
    /* =====================================================
       API ERROR
    ===================================================== */
    if (!response.ok) {
        throw new Error(
            data.message ||
            `Request failed (${response.status})`
        );
    }
    return data;
}
/* =========================================================
   LOAD PROFILE
========================================================= */
async function loadProfile() {
    const data =
        await apiFetch(
            API.profile
        );
    if (
        !data.success ||
        !data.user
    ) {
        throw new Error(
            "Unable to load profile."
        );
    }
    state.profile =
        data.user;
    return data.user;
}
/* =========================================================
   LOAD DASHBOARD
========================================================= */
async function loadDashboard() {
    const data =
        await apiFetch(
            API.dashboard
        );
    state.dashboard =
        data.dashboard ||
        data.data ||
        data;
    return state.dashboard;
}
/* =========================================================
   SYNC DASHBOARD
========================================================= */
async function syncDashboard() {
    try {
        return await apiFetch(
            API.sync,
            {
                method: "POST"
            }
        );
    } catch (error) {
        console.warn(
            "Sync endpoint unavailable:",
            error.message
        );
        return null;
    }
}
/* =========================================================
   INITIALIZE DASHBOARD
========================================================= */
async function initializeDashboard() {
    showDashboardLoading(true);
    try {
        /* ---------------------------------------------
           Load profile
        --------------------------------------------- */
        const profile =
            await loadProfile();
        renderProfile(
            profile
        );
        /* ---------------------------------------------
           Load dashboard
        --------------------------------------------- */
        const dashboard =
            await loadDashboard();
        renderDashboard(
            dashboard
        );
        updateLastSync();
    } catch (error) {
        console.error(
            "Dashboard initialization failed:",
            error
        );
        showDashboardError(
            error.message
        );
    } finally {
        showDashboardLoading(false);
    }
}
/* =========================================================
   RENDER DASHBOARD
========================================================= */
function renderDashboard(data) {
    const d =
        data?.data ||
        data?.dashboard ||
        data ||
        {};
    /* =====================================================
       MAIN STATS
    ===================================================== */
    renderStats(d);
    /* =====================================================
       STATISTICS
    ===================================================== */
    renderStatisticsSummary(d);
    /* =====================================================
       AVERAGE PROBLEM RATING
    ===================================================== */
    renderAverageProblemRating(d);
    /* =====================================================
       WEAKNESS
    ===================================================== */
    renderWeakness(d);
    /* =====================================================
       RATING SUMMARY
    ===================================================== */
    renderRatingSummary(d);
    /* =====================================================
       PROBLEM ANALYTICS
    ===================================================== */
    renderProblemAnalytics(d);
    /* =====================================================
       CONTESTS
    ===================================================== */
    renderContests(d);
    /* =====================================================
       RATING ANALYTICS
    ===================================================== */
    renderRatingAnalytics(d);
    /* =====================================================
       RECENT ACTIVITY
    ===================================================== */
    renderRecentActivities(d);
    /* =====================================================
       HEATMAP
    ===================================================== */
    renderHeatmap(d);
}
/* =========================================================
   LAST SYNC
========================================================= */
function updateLastSync() {
    const element =
        $("lastSynced");
    if (!element) return;
    const now =
        new Date();
    element.textContent =
        `Last synced ${now.toLocaleTimeString(
            [],
            {
                hour: "numeric",
                minute: "2-digit"
            }
        )}`;
}
/* =========================================================
   AUTO REFRESH
========================================================= */
function setupAutoRefresh() {
    clearInterval(
        state.refreshTimer
    );
    state.refreshTimer =
        setInterval(
            async () => {
                try {
                    await loadDashboard();
                    renderDashboard(
                        state.dashboard
                    );
                    updateLastSync();
                } catch (error) {
                    console.warn(
                        "Auto refresh failed:",
                        error.message
                    );
                }
            },
            5 * 60 * 1000
        );
}
/* =========================================================
   BOOTSTRAP
========================================================= */
async function boot() {
    setupPeriodSelectors();
    setupSearch();
    setupReminderSettings();
    await initializeDashboard();
    setupAutoRefresh();
}
/* =========================================================
   START
========================================================= */
if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        boot
    );
} else {
    boot();
}
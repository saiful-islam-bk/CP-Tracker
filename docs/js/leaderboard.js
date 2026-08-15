/* =========================================================
   CP TRACKER — LEADERBOARD
   ========================================================= */
(() => {
    "use strict";
    /* =====================================================
       CONFIG
       ===================================================== */
    const API_ENDPOINTS = [
        "/api/leaderboard",
        "/leaderboard"
    ];
    let allUsers = [];
    let filteredUsers = [];
    /* =====================================================
       DOM
       ===================================================== */
    const body =
        document.getElementById("leaderboardBody");
    const loading =
        document.getElementById("leaderboardLoading");
    const empty =
        document.getElementById("leaderboardEmpty");
    const error =
        document.getElementById("leaderboardError");
    const searchInput =
        document.getElementById("leaderboardSearch");
    const clearSearch =
        document.getElementById("clearSearch");
    const sortSelect =
        document.getElementById("sortLeaderboard");
    const userCount =
        document.getElementById("userCount");
    const rankingShowing =
        document.getElementById("rankingShowing");
    const retryButton =
        document.getElementById("retryLeaderboard");
    /* =====================================================
       INITIALIZE
       ===================================================== */
    function initLeaderboard() {
        if (!body) {
            console.error(
                "Leaderboard container not found."
            );
            return;
        }
        loadLeaderboard();
        searchInput?.addEventListener(
            "input",
            handleSearch
        );
        clearSearch?.addEventListener(
            "click",
            clearSearchInput
        );
        sortSelect?.addEventListener(
            "change",
            handleSort
        );
        retryButton?.addEventListener(
            "click",
            loadLeaderboard
        );
    }
    /* =====================================================
       LOAD LEADERBOARD
       ===================================================== */
    async function loadLeaderboard() {
        showState("loading");
        let lastError = null;
        for (
            const endpoint of API_ENDPOINTS
        ) {
            try {
                const token =
                    localStorage.getItem("token");
                const headers = {
                    "Content-Type":
                        "application/json"
                };
                if (token) {
                    headers.Authorization =
                        `Bearer ${token}`;
                }
                const response =
                    await fetch(
                        endpoint,
                        {
                            method: "GET",
                            headers
                        }
                    );
                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}`
                    );
                }
                const result =
                    await response.json();
                console.log(
                    "Leaderboard API:",
                    result
                );
                const users =
                    extractUsers(result);
                if (!Array.isArray(users)) {
                    throw new Error(
                        "Invalid leaderboard data"
                    );
                }
                allUsers =
                    users
                        .map(normalizeUser)
                        .filter(Boolean);
                applySorting();
                updateUserCount();
                renderPodium();
                renderTable();
                return;
            }
            catch (err) {
                lastError = err;
                console.warn(
                    `Leaderboard endpoint failed: ${endpoint}`,
                    err
                );
            }
        }
        console.error(
            "Leaderboard loading failed:",
            lastError
        );
        showState("error");
    }
    /* =====================================================
       EXTRACT USERS
       ===================================================== */
    function extractUsers(result) {
        if (Array.isArray(result)) {
            return result;
        }
        if (
            Array.isArray(
                result?.users
            )
        ) {
            return result.users;
        }
        if (
            Array.isArray(
                result?.data
            )
        ) {
            return result.data;
        }
        if (
            Array.isArray(
                result?.data?.users
            )
        ) {
            return result.data.users;
        }
        if (
            Array.isArray(
                result?.leaderboard
            )
        ) {
            return result.leaderboard;
        }
        if (
            Array.isArray(
                result?.data?.leaderboard
            )
        ) {
            return result.data.leaderboard;
        }
        return [];
    }
    /* =====================================================
       NORMALIZE USER
       ===================================================== */
    function normalizeUser(user) {
        if (!user || typeof user !== "object") {
            return null;
        }
        const name =
            user.name ||
            user.fullName ||
            user.username ||
            user.handle ||
            "Unknown User";
        const username =
            user.username ||
            user.handle ||
            user.cfHandle ||
            user.codeforcesHandle ||
            name;
        const rating =
            toNumber(
                user.rating ??
                user.currentRating ??
                user.cfRating ??
                user.codeforcesRating
            );
        const solved =
            toNumber(
                user.solved ??
                user.solvedProblems ??
                user.totalSolved ??
                user.problemSolved ??
                user.problemsSolved
            );
        const contests =
            toNumber(
                user.contests ??
                user.contestParticipation ??
                user.contestParticipations ??
                user.contestCount ??
                user.participatedContests
            );
        const platforms =
            detectPlatforms(user);
        return {
            id:
                user.id ||
                user.userId ||
                username,
            name,
            username,
            rating,
            solved,
            contests,
            platforms,
            avatar:
                user.avatar ||
                user.profilePicture ||
                user.photoURL ||
                null
        };
    }
    /* =====================================================
       DETECT PLATFORMS
       ===================================================== */
    function detectPlatforms(user) {
        const platforms = [];
        const cf =
            user.cfHandle ||
            user.codeforcesHandle ||
            user.codeforces;
        const ac =
            user.acHandle ||
            user.atcoderHandle ||
            user.atcoder;
        const cc =
            user.ccHandle ||
            user.codechefHandle ||
            user.codechef;
        if (cf) {
            platforms.push("cf");
        }
        if (ac) {
            platforms.push("ac");
        }
        if (cc) {
            platforms.push("cc");
        }
        /*
         * If backend already provides
         * a platforms array.
         */
        if (
            Array.isArray(
                user.platforms
            )
        ) {
            user.platforms.forEach(
                platform => {
                    const value =
                        String(platform)
                            .toLowerCase();
                    if (
                        (
                            value.includes("cf") ||
                            value.includes("codeforces")
                        ) &&
                        !platforms.includes("cf")
                    ) {
                        platforms.push("cf");
                    }
                    if (
                        (
                            value.includes("ac") ||
                            value.includes("atcoder")
                        ) &&
                        !platforms.includes("ac")
                    ) {
                        platforms.push("ac");
                    }
                    if (
                        (
                            value.includes("cc") ||
                            value.includes("codechef")
                        ) &&
                        !platforms.includes("cc")
                    ) {
                        platforms.push("cc");
                    }
                }
            );
        }
        return platforms;
    }
    /* =====================================================
       SORT
       ===================================================== */
    function applySorting() {
        const sortBy =
            sortSelect?.value ||
            "rating";
        filteredUsers =
            [...allUsers];
        switch (sortBy) {
            case "rating":
                filteredUsers.sort(
                    (a, b) =>
                        b.rating -
                        a.rating
                );
                break;
            case "solved":
                filteredUsers.sort(
                    (a, b) =>
                        b.solved -
                        a.solved
                );
                break;
            case "contests":
                filteredUsers.sort(
                    (a, b) =>
                        b.contests -
                        a.contests
                );
                break;
            case "name":
                filteredUsers.sort(
                    (a, b) =>
                        a.name
                            .localeCompare(
                                b.name
                            )
                );
                break;
        }
    }
    /* =====================================================
       SEARCH
       ===================================================== */
    function handleSearch() {
        const query =
            searchInput.value
                .trim()
                .toLowerCase();
        if (query) {
            searchInput
                .closest(
                    ".leaderboard-search"
                )
                ?.classList.add(
                    "has-value"
                );
        }
        else {
            searchInput
                .closest(
                    ".leaderboard-search"
                )
                ?.classList.remove(
                    "has-value"
                );
        }
        if (!query) {
            applySorting();
        }
        else {
            filteredUsers =
                allUsers.filter(
                    user =>
                        user.name
                            .toLowerCase()
                            .includes(query)
                        ||
                        user.username
                            .toLowerCase()
                            .includes(query)
                );
            /*
             * Search results still follow
             * selected sorting.
             */
            sortFilteredUsers();
        }
        renderTable();
        updateUserCount();
    }
    /* =====================================================
       SORT FILTERED
       ===================================================== */
    function sortFilteredUsers() {
        const sortBy =
            sortSelect?.value ||
            "rating";
        switch (sortBy) {
            case "rating":
                filteredUsers.sort(
                    (a, b) =>
                        b.rating -
                        a.rating
                );
                break;
            case "solved":
                filteredUsers.sort(
                    (a, b) =>
                        b.solved -
                        a.solved
                );
                break;
            case "contests":
                filteredUsers.sort(
                    (a, b) =>
                        b.contests -
                        a.contests
                );
                break;
            case "name":
                filteredUsers.sort(
                    (a, b) =>
                        a.name.localeCompare(
                            b.name
                        )
                );
                break;
        }
    }
    /* =====================================================
       CLEAR SEARCH
       ===================================================== */
    function clearSearchInput() {
        if (!searchInput) {
            return;
        }
        searchInput.value = "";
        searchInput
            .closest(
                ".leaderboard-search"
            )
            ?.classList.remove(
                "has-value"
            );
        applySorting();
        renderTable();
        updateUserCount();
    }
    /* =====================================================
       SORT CHANGE
       ===================================================== */
    function handleSort() {
        const query =
            searchInput?.value
                .trim()
                .toLowerCase();
        if (query) {
            filteredUsers =
                allUsers.filter(
                    user =>
                        user.name
                            .toLowerCase()
                            .includes(query)
                        ||
                        user.username
                            .toLowerCase()
                            .includes(query)
                );
            sortFilteredUsers();
        }
        else {
            applySorting();
        }
        renderTable();
        updateUserCount();
        renderPodium();
    }
    /* =====================================================
       RENDER PODIUM
       ===================================================== */
    function renderPodium() {
        /*
         * Podium represents the current
         * selected sorting.
         */
        const top =
            filteredUsers.slice(0, 3);
        for (
            let index = 0;
            index < 3;
            index++
        ) {
            const user =
                top[index];
            const position =
                index + 1;
            if (!user) {
                setPodiumEmpty(
                    position
                );
                continue;
            }
            const avatar =
                document.getElementById(
                    `podiumAvatar${position}`
                );
            const name =
                document.getElementById(
                    `podiumName${position}`
                );
            const handle =
                document.getElementById(
                    `podiumHandle${position}`
                );
            const rating =
                document.getElementById(
                    `podiumRating${position}`
                );
            const platforms =
                document.getElementById(
                    `podiumPlatforms${position}`
                );
            avatar.textContent =
                getInitials(
                    user.name
                );
            name.textContent =
                user.name;
            handle.textContent =
                `@${user.username}`;
            rating.textContent =
                formatNumber(
                    user.rating
                );
            platforms.innerHTML =
                renderPlatforms(
                    user.platforms,
                    true
                );
        }
    }
    /* =====================================================
       EMPTY PODIUM
       ===================================================== */
    function setPodiumEmpty(position) {
        const avatar =
            document.getElementById(
                `podiumAvatar${position}`
            );
        const name =
            document.getElementById(
                `podiumName${position}`
            );
        const handle =
            document.getElementById(
                `podiumHandle${position}`
            );
        const rating =
            document.getElementById(
                `podiumRating${position}`
            );
        const platforms =
            document.getElementById(
                `podiumPlatforms${position}`
            );
        if (avatar) {
            avatar.textContent = "?";
        }
        if (name) {
            name.textContent = "—";
        }
        if (handle) {
            handle.textContent = "—";
        }
        if (rating) {
            rating.textContent = "0";
        }
        if (platforms) {
            platforms.innerHTML = "";
        }
    }
    /* =====================================================
       RENDER TABLE
       ===================================================== */
    function renderTable() {
        if (!body) {
            return;
        }
        body.innerHTML = "";
        if (!filteredUsers.length) {
            showState("empty");
            return;
        }
        showState("table");
        filteredUsers.forEach(
            (user, index) => {
                const row =
                    document.createElement(
                        "tr"
                    );
                row.innerHTML = `
                    <td>
                        <span class="
                            rank-number
                            ${getRankClass(index + 1)}
                        ">
                            ${index + 1}
                        </span>
                    </td>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar">
                                ${
                                    user.avatar
                                        ? `
                                            <img
                                                src="${escapeHTML(user.avatar)}"
                                                alt=""
                                                style="
                                                    width:100%;
                                                    height:100%;
                                                    object-fit:cover;
                                                    border-radius:inherit;
                                                "
                                            >
                                          `
                                        :
                                          getInitials(
                                              user.name
                                          )
                                }
                            </div>
                            <div class="user-details">
                                <strong>
                                    ${escapeHTML(
                                        user.name
                                    )}
                                </strong>
                                <span>
                                    @${escapeHTML(
                                        user.username
                                    )}
                                </span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <strong class="rating-value">
                            ${formatNumber(
                                user.rating
                            )}
                        </strong>
                        <span class="rating-label">
                            current rating
                        </span>
                    </td>
                    <td>
                        <strong class="stat-value">
                            ${formatNumber(
                                user.solved
                            )}
                        </strong>
                    </td>
                    <td>
                        <strong class="stat-value">
                            ${formatNumber(
                                user.contests
                            )}
                        </strong>
                    </td>
                    <td>
                        <div class="platform-list">
                            ${renderPlatforms(
                                user.platforms
                            )}
                        </div>
                    </td>
                `;
                body.appendChild(row);
            }
        );
        rankingShowing.textContent =
            `Showing ${filteredUsers.length} ${
                filteredUsers.length === 1
                    ? "user"
                    : "users"
            }`;
    }
    /* =====================================================
       PLATFORM HTML
       ===================================================== */
    function renderPlatforms(
        platforms,
        mini = false
    ) {
        if (
            !Array.isArray(platforms) ||
            !platforms.length
        ) {
            return `
                <span class="
                    platform-badge
                ">
                    —
                </span>
            `;
        }
        return platforms
            .map(
                platform => {
                    const name =
                        platform.toUpperCase();
                    return `
                        <span class="
                            ${mini
                                ? "platform-mini"
                                : "platform-badge"
                            }
                            ${platform}
                        ">
                            ${name}
                        </span>
                    `;
                }
            )
            .join("");
    }
    /* =====================================================
       UPDATE COUNTS
       ===================================================== */
    function updateUserCount() {
        if (!userCount) {
            return;
        }
        userCount.textContent =
            `${filteredUsers.length} ${
                filteredUsers.length === 1
                    ? "programmer"
                    : "programmers"
            }`;
    }
    /* =====================================================
       STATE
       ===================================================== */
    function showState(state) {
        loading?.classList.add("hidden");
        empty?.classList.add("hidden");
        error?.classList.add("hidden");
        if (state === "loading") {
            loading?.classList.remove(
                "hidden"
            );
            body.innerHTML = "";
        }
        if (state === "empty") {
            empty?.classList.remove(
                "hidden"
            );
        }
        if (state === "error") {
            error?.classList.remove(
                "hidden"
            );
            body.innerHTML = "";
        }
    }
    /* =====================================================
       HELPERS
       ===================================================== */
    function toNumber(value) {
        const number =
            Number(value);
        return Number.isFinite(number)
            ? number
            : 0;
    }
    function formatNumber(value) {
        return Number(value || 0)
            .toLocaleString("en-US");
    }
    function getInitials(name) {
        return String(name || "?")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(
                part =>
                    part
                        .charAt(0)
                        .toUpperCase()
            )
            .join("");
    }
    function getRankClass(rank) {
        if (rank === 1) {
            return "top-one";
        }
        if (rank === 2) {
            return "top-two";
        }
        if (rank === 3) {
            return "top-three";
        }
        return "";
    }
    function escapeHTML(value) {
        return String(value ?? "")
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }
    /* =====================================================
       START
       ===================================================== */
    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initLeaderboard
        );
    }
    else {
        initLeaderboard();
    }
    /*
     * Optional global access
     */
    window.LeaderboardModule = {
        reload:
            loadLeaderboard,
        refresh:
            loadLeaderboard
    };
})();
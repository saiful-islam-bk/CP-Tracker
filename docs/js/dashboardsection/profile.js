/* =========================================================
   CP TRACKER — PROFILE
========================================================= */
/* =========================================================
   LOAD PROFILE
========================================================= */
async function loadProfile() {
    const data =
        await apiFetch(API.profile);
    if (!data.success || !data.user) {
        throw new Error(
            "Unable to load profile."
        );
    }
    state.profile = data.user;
    return data.user;
}
/* =========================================================
   PROFILE UI
========================================================= */
function renderProfile(user) {
    if (!user) return;
    const name =
        user.fullname ||
        user.username ||
        "Coder";
    const firstName =
        name.trim().split(/\s+/)[0];
    const heroName =
        $("heroUserName");
    if (heroName) {
        heroName.textContent =
            firstName;
    }
    /*
     * Update greeting
     */
    const greeting =
        $("greeting");
    if (greeting) {
        const hour =
            new Date().getHours();
        let text;
        if (hour >= 5 && hour < 12) {
            text = "Good morning,";
        } else if (hour >= 12 && hour < 18) {
            text = "Good afternoon,";
        } else {
            text = "Good evening,";
        }
        greeting.innerHTML = `
            ${text}
            <span id="heroUserName">
                ${escapeHTML(firstName)}
            </span>.
        `;
    }
    /*
     * Cache latest profile
     */
    const storage =
        localStorage.getItem("token")
            ? localStorage
            : sessionStorage;
    storage.setItem(
        "user",
        JSON.stringify(user)
    );
}
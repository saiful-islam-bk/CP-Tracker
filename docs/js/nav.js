fetch("nav.html")
    .then(response => response.text())
    .then(data => {
        document.getElementById("navbar").innerHTML = data;
        updateNavbar();
    });
function updateNavbar() {
    const navMenu = document.getElementById("navMenu");
    const user =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"));
    if (user) {
        navMenu.innerHTML += `
            <li class="profile-menu">
                <a href="profile.html">
                    ${user.username}
                </a>
            </li>
            <li>
                <a href="#" id="logoutBtn">
                    Logout
                </a>
            </li>
        `;
        document
            .getElementById("logoutBtn")
            .addEventListener("click", logout);
    }
    else {
        navMenu.innerHTML += `
            <li>
                <a href="login.html">
                    Login
                </a>
            </li>
            <li>
                <a href="reg.html">
                    Sign Up
                </a>
            </li>
        `;
    }
}
function logout(e) {
    e.preventDefault();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    alert("Logged out successfully");
    window.location.href = "index.html";
}
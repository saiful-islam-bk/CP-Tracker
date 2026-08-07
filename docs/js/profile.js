// ========================================
// TOKEN
// ========================================
const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");
if (!token) {
    window.location.href = "login.html";
}

// ========================================
// ELEMENTS
// ========================================

const fullNameInput = document.getElementById("fullNameInput");
const usernameInput = document.getElementById("usernameInput");
const emailInput = document.getElementById("emailInput");
const countryInput = document.getElementById("countryInput");
const institutionInput = document.getElementById("institutionInput");
const bioInput = document.getElementById("bioInput");
const cfInput = document.getElementById("cf");
const ccInput = document.getElementById("cc");
const acInput = document.getElementById("ac");
const profileName = document.getElementById("fullname");
const profileUsername = document.getElementById("username");
const profileCountry = document.getElementById("country");
const profileJoined = document.getElementById("joined");
const profileBio = document.getElementById("bioText");
const profileImage = document.getElementById("profileImage");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const upload = document.getElementById("profileUpload");
const changePhoto = document.getElementById("changePhoto");


// ========================================
// LOAD PROFILE
// ========================================

async function loadProfile() {
    try {
        const response = await fetch(
            "http://localhost:3000/profile",
            {
                headers: {
                    Authorization:
                        "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            window.location.href = "login.html";
            return;
        }

        const user = data.user;

        profileName.textContent = user.fullname;

        profileUsername.textContent = "@" + user.username;

        profileCountry.textContent = user.country || "Not Set";

        profileBio.textContent = user.bio || "No bio yet.";

        profileJoined.textContent = new Date(user.joined).toLocaleDateString();

        fullNameInput.value = user.fullname;

        usernameInput.value = user.username;

        emailInput.value = user.email;

        countryInput.value = user.country || "";

        institutionInput.value = user.institution || "";

        bioInput.value = user.bio || "";

        cfInput.value = user.cf || "";

        ccInput.value = user.cc || "";

        acInput.value = user.ac || "";
        if (user.profile_pic) {
          profileImage.src ="http://localhost:3000" + user.profile_pic;
        }
    }
    catch (err) {
        console.error(err);
        alert(err.message);
    }

}

loadProfile();


// ========================================
// CHANGE PHOTO
// ========================================

changePhoto.onclick = () => {
    upload.click();
};

upload.onchange = async () => {
    const file = upload.files[0];
    if (!file) return;
    // Preview
    profileImage.src = URL.createObjectURL(file);
    // Upload to server
    const formData = new FormData();
    formData.append("photo", file);
    const response = await fetch(
        "http://localhost:3000/profile/photo",
        {
            method: "POST",
            headers: {
                Authorization: "Bearer " + token
            },
            body: formData
        }
    );
    const data = await response.json();
    if (data.success) {
        profileImage.src = "http://localhost:3000" + data.profile_pic;
        alert("Photo uploaded successfully.");
    } else {
        alert(data.message);
    }
};

// ========================================
// SAVE PROFILE
// ========================================

saveBtn.addEventListener("click", async () => {
    const profileData = {
        fullname: fullNameInput.value.trim(),
        country: countryInput.value.trim(),
        institution: institutionInput.value.trim(),
        bio: bioInput.value.trim(),
        cf: cfInput.value.trim(),
        cc: ccInput.value.trim(),
        ac: acInput.value.trim()
    };
    if (profileData.fullname === "") {
        alert("Full name cannot be empty.");
        return;
    }
    try {
        const response = await fetch(
            "http://localhost:3000/profile",

            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization:
                        "Bearer " + token
                },
                body: JSON.stringify(profileData)
            }
        );

        const data = await response.json();
        console.log(response.status);
        console.log(data);
        if (!response.ok) {
            alert(data.message);
            return;
        }
        alert("Profile updated successfully.");
        loadProfile();
    }

    catch (err) {
      console.log(err);
      alert("Server error.");
    }

});


// ========================================
// CANCEL
// ========================================

cancelBtn.addEventListener("click", () => {
    loadProfile();
});


// ========================================
// AUTO UPDATE HEADER
// ========================================

fullNameInput.addEventListener("input", () => {
    profileName.textContent = fullNameInput.value;
});

countryInput.addEventListener("input", () => {
    profileCountry.textContent = countryInput.value || "Not Set";

});

bioInput.addEventListener("input", () => {
    profileBio.textContent = bioInput.value || "No bio yet.";

});


// ========================================
// SAVE USER CACHE
// ========================================

async function refreshUserCache() {
    try {
      const response = await fetch(
        "http://localhost:3000/profile",
        {
            headers: {Authorization:"Bearer " + token}
        }
      );
      const data = await response.json();
      if (data.success) {
        const storage = localStorage.getItem("token") ? localStorage : sessionStorage;
        storage.setItem("user", JSON.stringify(data.user));
      }
    }
    catch (err){
      console.log(err);
    }

}


// ========================================
// AFTER SAVE
// ========================================

saveBtn.addEventListener("click", async () => {

    setTimeout(() => {
      refreshUserCache();
    }, 300);

});
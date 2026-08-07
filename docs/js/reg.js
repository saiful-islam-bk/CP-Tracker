const form = document.getElementById("regform");


form.addEventListener("submit", async (event) => {

    event.preventDefault();


    // Get values

    const fullname =
        document.getElementById("fullname").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const username =
        document.getElementById("username").value.trim();

    const country =
        document.getElementById("country").value.trim();

    const institution =
        document.getElementById("institution").value.trim();

    const password =
        document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;


    // Password match check

    if (password !== confirmPassword) {

        alert("Passwords do not match");

        return;
    }


    // Create object

    const userData = {

        fullname,
        email,
        username,
        country,
        institution,
        password,
        confirmPassword

    };


    try {

        const response = await fetch(
            "http://localhost:3000/register",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(userData)

            }
        );


        const data = await response.json();


        // Failed

        if (!response.ok) {

            alert(data.message);

            return;
        }


        // Success

        alert("Account created successfully");


        // Redirect login

        window.location.href = "login.html";


    } catch (error) {

        console.error(error);

        alert(
            "Could not connect to the server"
        );

    }

});
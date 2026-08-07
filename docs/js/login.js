const form = document.getElementById("loginform");


form.addEventListener("submit", async (event) => {

    event.preventDefault();


    const identifier =
        document.getElementById("identifier").value.trim();

    const password =
        document.getElementById("password").value;

    const rememberMe =
        document.getElementById("rememberMe").checked;


    if (!identifier || !password) {

        alert(
            "Please enter username/email and password"
        );

        return;

    }


    try {

        const response = await fetch(
            "http://localhost:3000/login",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    identifier,
                    password
                })

            }
        );


        const data = await response.json();


        // Login failed

        if (!response.ok) {

            alert(data.message);

            return;

        }


        // Login successful

        alert("Login successful");


        // Remember Me checked

        if (rememberMe) {

            localStorage.setItem(
                "token",
                data.token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

        }

        // Remember Me not checked

        else {

            sessionStorage.setItem(
                "token",
                data.token
            );

            sessionStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

        }


        // Go homepage

        window.location.href = "index.html";


    } catch (error) {

        console.error(error);

        alert(
            "Could not connect to the server"
        );

    }

});
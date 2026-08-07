const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");
const app = express();
require("dotenv").config();

const multer = require("multer");
const path = require("path");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ========================================
// TEST SERVER
// ========================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "CP Tracker API is running"
    });
});


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "uploads/profile"));
    },
    filename: async (req, file, cb) => {
        try {
          const [users] = await db.execute(
            "SELECT username FROM users WHERE id = ?",
            [req.user.id]
          );
          const username = users[0].username;
          const ext = path.extname(file.originalname);
          cb(null, username + ext);
        }catch (err) {
          cb(err);
        }
    }
});

const upload = multer({ storage });



// ========================================
// REGISTER
// ========================================

app.post("/register", async (req, res) => {

  console.log(req.body);

    try {

        let {
            fullname,
            email,
            username,
            country,
            institution,
            password,
            confirmPassword
        } = req.body;


        // ----------------------------
        // Clean input
        // ----------------------------

        fullname = fullname?.trim();
        email = email?.trim().toLowerCase();
        username = username?.trim();
        country = country?.trim() || null;
        institution = institution?.trim() || null;


        // ----------------------------
        // Required fields
        // ----------------------------

        if (!fullname || !email || !username || !password || !confirmPassword) {

            return res.status(400).json({
                success: false,
                message: "Please fill all required fields"
            });

        }


        // ----------------------------
        // Username validation
        // ----------------------------

        if (username.length < 3) {

            return res.status(400).json({
                success: false,
                message: "Username must be at least 3 characters"
            });

        }


        if (username.length > 30) {

            return res.status(400).json({
                success: false,
                message: "Username is too long"
            });

        }


        const usernameRegex = /^[a-zA-Z0-9_]+$/;

        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: "Username can contain only letters, numbers and underscore"
            });
        }


        // ----------------------------
        // Email validation
        // ----------------------------

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email"
            });
        }


        // ----------------------------
        // Password validation
        // ----------------------------

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }


        // ----------------------------
        // Password confirmation
        // ----------------------------

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }


        // ----------------------------
        // Check username
        // ----------------------------

        const [usernameResult] = await db.execute(
            "SELECT id FROM users WHERE username = ? LIMIT 1",
            [username]
        );


        if (usernameResult.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Username already exists"
            });
        }

        // ----------------------------
        // Check email
        // ----------------------------

        const [emailResult] = await db.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (emailResult.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }

        // ----------------------------
        // Hash password
        // ----------------------------

        const hashedPassword = await bcrypt.hash(password, 10);

        // ----------------------------
        // Insert user
        // ----------------------------

        const [result] = await db.execute(
            `INSERT INTO users
            (
                username,
                fullname,
                email,
                password,
                country,
                institution
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                username,
                fullname,
                email,
                hashedPassword,
                country,
                institution
            ]
        );

        // ----------------------------
        // Success
        // ----------------------------

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: result.insertId,
                username,
                fullname,
                email
            }
        });


    } catch (error) {

        console.error(error);

        // MySQL duplicate key
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Username or email already exists"
            });
        }


        return res.status(500).json({
            success: false,
            message: "Server error"
        });

    }

});


// ========================================
// LOGIN
// ========================================

app.post("/login", async (req, res) => {
   console.log("Login Request:", req.body);
    try {
        let {
            identifier,
            password
        } = req.body;

        identifier = identifier?.trim();


        // ----------------------------
        // Empty check
        // ----------------------------

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Username/email and password are required"
            });
        }


        // ----------------------------
        // Find user
        // ----------------------------

        const [users] = await db.execute(
            `SELECT *
             FROM users
             WHERE username = ?
             OR email = ?
             LIMIT 1`,
            [
                identifier,
                identifier.toLowerCase()
            ]
        );


        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid username/email or password"
            });
        }


        const user = users[0];


        // ----------------------------
        // Password check
        // ----------------------------

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid username/email or password"
            });
        }


        // ----------------------------
        // JWT
        // ----------------------------

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );


        // Don't send password
        delete user.password;


        // ----------------------------
        // Success
        // ----------------------------

        return res.json({
            success: true,
            message: "Login successful",
            token,
            user
        });


    } catch (error) {

        console.error(error);


        return res.status(500).json({
            success: false,
            message: "Server error"
        });

    }

});


// ========================================
// JWT MIDDLEWARE
// ========================================

function verifyToken(req, res, next) {

  console.log(req.headers.authorization);
    const authHeader = req.headers.authorization;
    console.log("Authorization:", authHeader);

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Access denied"
        });

    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        req.user = decoded;
        next();
    }catch {
        return res.status(401).json({
            success: false,
            message: "Token expired"
        });
    }
}


// ========================================
// GET PROFILE
// ========================================

app.get("/profile", verifyToken, async (req, res) => {

    try {

        const [users] = await db.execute(

            `SELECT
                id,
                username,
                fullname,
                email,
                country,
                institution,
                bio,
                cf,
                cc,
                ac,
                profile_pic,
                joined
            FROM users
            WHERE id=?`,

            [req.user.id]

        );

        if (users.length === 0) {
            return res.status(404).json({

                success: false,
                message: "User not found"

            });
        }

        res.json({
            success: true,
            user: users[0]
        });

    }

    catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });

    }

});


// ========================================
// UPDATE PROFILE
// ========================================

app.put("/profile", verifyToken, async (req, res) => {

    console.log("Decoded User:", req.user);

    try {
        const {
            fullname,
            country,
            institution,
            bio,
            cf,
            cc,
            ac

        } = req.body;

        await db.execute(

            `UPDATE users
            SET

            fullname=?,
            country=?,
            institution=?,
            bio=?,
            cf=?,
            cc=?,
            ac=?

            WHERE id=?`,

            [

                fullname,
                country,
                institution,
                bio,
                cf,
                cc,
                ac,

                req.user.id

            ]

        );

        res.json({
            success: true,
            message: "Profile updated"
        });

    }

    catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });

    }

});

app.post(
    "/profile/photo",
    verifyToken,
    upload.single("photo"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "No file selected"
                });
            }
            const photo = "/uploads/profile/" + req.file.filename;
            await db.execute(
                "UPDATE users SET profile_pic = ? WHERE id = ?",
                [photo, req.user.id]
            );
            res.json({
                success: true,
                profile_pic: photo
            });

        } catch (err) {
            console.log(err);
            res.status(500).json({
                success: false,
                message: "Upload failed"
            });
        }
    }
);


// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
    console.log(
        `CP Tracker server running on port ${PORT}`
    );

});
const express = require("express");
const bcrypt =
    require("bcrypt");
const jwt =
    require("jsonwebtoken");
const db =
    require("../db");
const router =
    express.Router();
// ========================================
// REGISTER
// ========================================
router.post(
    "/register",
    async (req, res) => {
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
            // Clean input
            fullname =
                fullname?.trim();
            email =
                email?.trim().toLowerCase();
            username =
                username?.trim();
            country =
                country?.trim() || null;
            institution =
                institution?.trim() || null;
            // Required fields
            if (
                !fullname ||
                !email ||
                !username ||
                !password ||
                !confirmPassword
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please fill all required fields"
                });
            }
            // Username validation
            if (username.length < 3) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Username must be at least 3 characters"
                });
            }
            if (username.length > 30) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Username is too long"
                });
            }
            const usernameRegex =
                /^[a-zA-Z0-9_]+$/;
            if (
                !usernameRegex.test(
                    username
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Username can contain only letters, numbers and underscore"
                });
            }
            // Email validation
            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (
                !emailRegex.test(email)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a valid email"
                });
            }
            // Password validation
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 6 characters"
                });
            }
            if (
                password !==
                confirmPassword
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Passwords do not match"
                });
            }
            // Check username
            const [usernameResult] =
                await db.execute(
                    "SELECT id FROM users WHERE username = ? LIMIT 1",
                    [username]
                );
            if (
                usernameResult.length > 0
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Username already exists"
                });
            }
            // Check email
            const [emailResult] =
                await db.execute(
                    "SELECT id FROM users WHERE email = ? LIMIT 1",
                    [email]
                );
            if (
                emailResult.length > 0
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Email already exists"
                });
            }
            // Hash password
            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );
            // Insert user
            const [result] =
                await db.execute(
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
            return res.status(201).json({
                success: true,
                message:
                    "Account created successfully",
                user: {
                    id:
                        result.insertId,
                    username,
                    fullname,
                    email
                }
            });
        }
        catch (error) {
            console.error(error);
            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Username or email already exists"
                });
            }
            return res.status(500).json({
                success: false,
                message:
                    "Server error"
            });
        }
    }
);
// ========================================
// LOGIN
// ========================================
router.post(
    "/login",
    async (req, res) => {
        console.log(
            "Login Request:",
            req.body
        );
        try {
            let {
                identifier,
                password
            } = req.body;
            identifier =
                identifier?.trim();
            if (
                !identifier ||
                !password
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Username/email and password are required"
                });
            }
            const [users] =
                await db.execute(
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
                    message:
                        "Invalid username/email or password"
                });
            }
            const user =
                users[0];
            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );
            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid username/email or password"
                });
            }
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
            delete user.password;
            return res.json({
                success: true,
                message:
                    "Login successful",
                token,
                user
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message:
                    "Server error"
            });
        }
    }
);
module.exports = router;
const express = require("express");
const multer =
    require("multer");
const path =
    require("path");
const db =
    require("../db");
const verifyToken =
    require("../middleware/auth");
const router =
    express.Router();
// ========================================
// MULTER
// ========================================
const storage =
    multer.diskStorage({
        destination:
            (req, file, cb) => {
                cb(
                    null,
                    path.join(
                        __dirname,
                        "../uploads/profile"
                    )
                );
            },
        filename:
            async (
                req,
                file,
                cb
            ) => {
                try {
                    const [users] =
                        await db.execute(
                            "SELECT username FROM users WHERE id = ?",
                            [
                                req.user.id
                            ]
                        );
                    const username =
                        users[0].username;
                    const ext =
                        path.extname(
                            file.originalname
                        );
                    cb(
                        null,
                        username + ext
                    );
                }
                catch (err) {
                    cb(err);
                }
            }
    });
const upload =
    multer({
        storage
    });
// ========================================
// GET PROFILE
// ========================================
router.get(
    "/profile",
    verifyToken,
    async (req, res) => {
        try {
            const [users] =
                await db.execute(
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
                    [
                        req.user.id
                    ]
                );
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User not found"
                });
            }
            res.json({
                success: true,
                user:
                    users[0]
            });
        }
        catch (err) {
            console.log(err);
            res.status(500).json({
                success: false,
                message:
                    "Server error"
            });
        }
    }
);
// ========================================
// UPDATE PROFILE
// ========================================
router.put(
    "/profile",
    verifyToken,
    async (req, res) => {
        console.log(
            "Decoded User:",
            req.user
        );
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
                message:
                    "Profile updated"
            });
        }
        catch (err) {
            console.log(err);
            res.status(500).json({
                success: false,
                message:
                    "Server error"
            });
        }
    }
);
// ========================================
// PROFILE PHOTO
// ========================================
router.post(
    "/profile/photo",
    verifyToken,
    upload.single("photo"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message:
                        "No file selected"
                });
            }
            const photo =
                "/uploads/profile/" +
                req.file.filename;
            await db.execute(
                "UPDATE users SET profile_pic = ? WHERE id = ?",
                [
                    photo,
                    req.user.id
                ]
            );
            res.json({
                success: true,
                profile_pic:
                    photo
            });
        }
        catch (err) {
            console.log(err);
            res.status(500).json({
                success: false,
                message:
                    "Upload failed"
            });
        }
    }
);
module.exports = router;
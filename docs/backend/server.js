const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const app = express();
console.log("SERVER FILE:", __filename);
console.log("FRONTEND PATH:", path.join(__dirname, ".."));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));
app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);
// ========================================
// TEST SERVER
// ========================================
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "CP Tracker API is running"
    });
});
// ========================================
// ROUTES
// ========================================
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const dashboardRoutes = require("./routes/dashboard");
const contestRoutes = require("./routes/contest");
app.use("/", authRoutes);
app.use("/", profileRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/api/contests", contestRoutes);
// ========================================
// START SERVER
// ========================================
const PORT =
    process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(
        `CP Tracker server running on port ${PORT}`
    );
});
const jwt = require("jsonwebtoken");
function verifyToken(req, res, next) {
    console.log(
        req.headers.authorization
    );
    const authHeader = req.headers.authorization;
    console.log(
        "Authorization:",
        authHeader
    );
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
        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({
            success: false,
            message: "Token expired"
        });
    }
}
module.exports = verifyToken;
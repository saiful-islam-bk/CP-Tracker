const https = require("https");
function request(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = "";
            response.on("data", chunk => {
                data += chunk;
            });
            response.on("end", () => {
                try {
                    const json =
                        JSON.parse(data);
                    if (json.status !== "OK") {
                        return reject(
                            new Error(
                                json.comment ||
                                "Codeforces API error"
                            )
                        );
                    }
                    resolve(json.result);
                } catch (error) {
                    reject(error);
                }
            });
        }).on("error", reject);
    });
}
// ========================================
// USER INFO
// ========================================
async function getUserInfo(handle) {
    return request(
        `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`
    );
}
// ========================================
// SUBMISSIONS
// ========================================
async function getSubmissions(handle) {
    return request(
        `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`
    );
}
// ========================================
// RATING HISTORY
// ========================================
async function getRatingHistory(handle) {
    return request(
        `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`
    );
}
// ========================================
// GET EVERYTHING
// ========================================
async function getAllData(handle) {
    const [
        user,
        submissions,
        rating
    ] = await Promise.all([
        getUserInfo(handle),
        getSubmissions(handle),
        getRatingHistory(handle)
    ]);
    return {
        user: user[0],
        submissions,
        rating
    };
}
module.exports = {
    getUserInfo,
    getSubmissions,
    getRatingHistory,
    getAllData
};
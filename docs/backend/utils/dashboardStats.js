// ========================================
// SOLVED PROBLEMS
// ========================================
function getSolvedProblems(
    submissions
) {
    const solved =
        new Map();
    for (
        const submission of submissions
    ) {
        if (
            submission.verdict !==
            "OK"
        ) {
            continue;
        }
        const problem =
            submission.problem;
        const key =
            `${problem.contestId}-${problem.index}`;
        if (
            !solved.has(key)
        ) {
            solved.set(
                key,
                {
                    contestId:
                        problem.contestId,
                    index:
                        problem.index,
                    name:
                        problem.name,
                    rating:
                        problem.rating ||
                        null,
                    tags:
                        problem.tags ||
                        [],
                    time:
                        submission.creationTimeSeconds
                }
            );
        }
    }
    return [
        ...solved.values()
    ];
}
// ========================================
// AVERAGE RATING
// ========================================
function getAverageProblemRating(
    problems
) {
    const rated =
        problems.filter(
            problem =>
                Number.isFinite(
                    problem.rating
                )
        );
    if (!rated.length) {
        return 0;
    }
    const total =
        rated.reduce(
            (
                sum,
                problem
            ) =>
                sum +
                problem.rating,
            0
        );
    return Math.round(
        total / rated.length
    );
}
// ========================================
// ATTEMPTS PER PROBLEM
// ========================================
function getAttemptsPerProblem(
    submissions
) {
    const problems = {};
    for (
        const submission of submissions
    ) {
        const problem =
            submission.problem;
        const key =
            `${problem.contestId}-${problem.index}`;
        if (!problems[key]) {
            problems[key] = {
                name:
                    problem.name,
                rating:
                    problem.rating ||
                    0,
                tags:
                    problem.tags ||
                    [],
                attempts:
                    0,
                solved:
                    false
            };
        }
        problems[key].attempts++;
        if (
            submission.verdict ===
            "OK"
        ) {
            problems[key].solved =
                true;
        }
    }
    return Object.values(
        problems
    );
}
// ========================================
// WEAKNESS / TOPICS
// ========================================
function getWeakTopics(
    problems
) {
    const topics = {};
    for (
        const problem of problems
    ) {
        for (
            const tag of problem.tags
        ) {
            if (!topics[tag]) {
                topics[tag] = {
                    attempts: 0,
                    problems: 0
                };
            }
            topics[tag].attempts +=
                problem.attempts;
            topics[tag].problems++;
        }
    }
    return Object.entries(
        topics
    )
        .map(
            ([topic, data]) => ({
                topic,
                averageAttempts:
                    Number(
                        (
                            data.attempts /
                            data.problems
                        ).toFixed(2)
                    )
            })
        )
        .sort(
            (
                a,
                b
            ) =>
                b.averageAttempts -
                a.averageAttempts
        );
}
// ========================================
// DAILY ACTIVITY
// ========================================
function getActivity(
    submissions
) {
    const activity = {};
    for (
        const submission of submissions
    ) {
        if (
            submission.verdict !==
            "OK"
        ) {
            continue;
        }
        const date =
            new Date(
                submission.creationTimeSeconds *
                1000
            )
                .toISOString()
                .slice(
                    0,
                    10
                );
        if (!activity[date]) {
            activity[date] =
                0;
        }
        activity[date]++;
    }
    return activity;
}
// ========================================
// RATING CHANGE
// ========================================
function getRatingStats(
    ratingHistory
) {
    if (
        !ratingHistory.length
    ) {
        return {
            currentRating: 0,
            highestRating: 0,
            ratingChange: 0
        };
    }
    const currentRating =
        ratingHistory[
            ratingHistory.length - 1
        ].newRating;
    const highestRating =
        Math.max(
            ...ratingHistory.map(
                contest =>
                    contest.newRating
            )
        );
    const recent =
        ratingHistory.slice(-2);
    let ratingChange = 0;
    if (
        recent.length === 2
    ) {
        ratingChange =
            recent[1].newRating -
            recent[0].newRating;
    }
    return {
        currentRating,
        highestRating,
        ratingChange
    };
}
module.exports = {
    getSolvedProblems,
    getAverageProblemRating,
    getAttemptsPerProblem,
    getWeakTopics,
    getActivity,
    getRatingStats
};
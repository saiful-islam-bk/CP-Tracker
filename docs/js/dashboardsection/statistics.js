/* =========================================================
   CP TRACKER — STATISTICS
   Statistics Summary
   ========================================================= */
function renderStatisticsSummary(data) {
    const periods = data?.periods || {};
    const selected =
        periods[state.periods.statistics] ||
        periods.week ||
        {};
    const solved =
        Number(
            selected.solved ??
            selected.accepted ??
            0
        );
    const solveTime =
        Number(
            selected.avgSolveTime ??
            selected.averageSolveTime ??
            0
        );
    const attempts =
        Number(
            selected.avgAttempts ??
            selected.avgTries ??
            0
        );
    const rating =
        Number(
            selected.avgProblemRating ??
            average(selected.problemRatings || [])
        );
    const contestChange =
        Number(
            selected.contestRatingChange ??
            selected.ratingChange ??
            0
        );
    setText(
        "summarySolved",
        number(solved)
    );
    setText(
        "summarySolveTime",
        solveTime
            ? formatMinutes(solveTime)
            : "—"
    );
    setText(
        "summaryAttempts",
        attempts
            ? attempts.toFixed(2)
            : "—"
    );
    setText(
        "summaryRating",
        rating
            ? number(Math.round(rating))
            : "—"
    );
    setText(
        "summaryContestChange",
        signedNumber(contestChange)
    );
}
/* =========================================================
   FORMAT SOLVE TIME
========================================================= */
function formatMinutes(minutes) {
    const m = Number(minutes || 0);
    if (!m) {
        return "—";
    }
    if (m < 60) {
        return `${Math.round(m)}m`;
    }
    const hours = Math.floor(m / 60);
    const remaining = Math.round(m % 60);
    return remaining
        ? `${hours}h ${remaining}m`
        : `${hours}h`;
}
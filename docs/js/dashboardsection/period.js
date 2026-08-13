/* =========================================================
   PERIOD SELECTORS
========================================================= */
function setupPeriodSelectors() {
    /* =====================================================
       STATISTICS
    ===================================================== */
    $$(".period-option").forEach(button => {
        button.addEventListener(
            "click",
            () => {
                $$(".period-option").forEach(
                    item => {
                        item.classList.remove(
                            "active"
                        );
                    }
                );
                button.classList.add(
                    "active"
                );
                state.periods.statistics =
                    button.dataset.statPeriod ||
                    "week";
                if (state.dashboard) {
                    renderStatisticsSummary(
                        state.dashboard
                    );
                }
            }
        );
    });
    /* =====================================================
       AVERAGE PROBLEM RATING
    ===================================================== */
    $("averageRatingPeriod")
        ?.addEventListener(
            "change",
            event => {
                state.periods.averageRating =
                    event.target.value;
                if (state.dashboard) {
                    renderAverageProblemRating(
                        state.dashboard
                    );
                }
            }
        );
    /* =====================================================
       PROBLEM ANALYTICS
    ===================================================== */
    $("problemAnalyticsPeriod")
        ?.addEventListener(
            "change",
            event => {
                state.periods.problemAnalytics =
                    event.target.value;
                if (state.dashboard) {
                    renderProblemAnalytics(
                        state.dashboard
                    );
                }
            }
        );
    /* =====================================================
       RATING ANALYTICS
    ===================================================== */
    $("ratingAnalyticsPeriod")
        ?.addEventListener(
            "change",
            event => {
                state.periods.ratingAnalytics =
                    event.target.value;
                if (state.dashboard) {
                    renderRatingAnalytics(
                        state.dashboard
                    );
                }
            }
        );
}
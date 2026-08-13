/* =========================================================
   CP TRACKER — REMINDER SETTINGS
========================================================= */
function setupReminderSettings() {
    const saveButton =
        document.querySelector(".primary-button");
    if (!saveButton) return;
    /* =====================================================
       LOAD SAVED SETTINGS
    ===================================================== */
    const saved =
        localStorage.getItem(
            "cpTrackerReminderSettings"
        );
    if (saved) {
        try {
            const settings =
                JSON.parse(saved);
            const options =
                document.querySelectorAll(
                    ".reminder-option input"
                );
            if (options[0]) {
                options[0].checked =
                    Boolean(settings.oneDay);
            }
            if (options[1]) {
                options[1].checked =
                    Boolean(
                        settings.fifteenMinutes
                    );
            }
        } catch (error) {
            console.warn(
                "Invalid reminder settings:",
                error
            );
        }
    }
    /* =====================================================
       SAVE SETTINGS
    ===================================================== */
    saveButton.addEventListener(
        "click",
        () => {
            const options =
                document.querySelectorAll(
                    ".reminder-option input"
                );
            const settings = {
                oneDay:
                    Boolean(
                        options[0]?.checked
                    ),
                fifteenMinutes:
                    Boolean(
                        options[1]?.checked
                    )
            };
            localStorage.setItem(
                "cpTrackerReminderSettings",
                JSON.stringify(settings)
            );
            showToast(
                "Reminder settings saved."
            );
        }
    );
}
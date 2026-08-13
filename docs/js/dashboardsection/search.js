/* =========================================================
   CP TRACKER — SEARCH
========================================================= */
function setupSearch() {
    const overlay = $("searchOverlay");
    const input = $("globalSearch");
    const close = $("searchClose");
    if (!overlay || !input) {
        return;
    }
    /* =====================================================
       OPEN SEARCH
    ===================================================== */
    function openSearch() {
        overlay.classList.add("active");
        overlay.setAttribute(
            "aria-hidden",
            "false"
        );
        setTimeout(() => {
            input.focus();
        }, 100);
    }
    /* =====================================================
       CLOSE SEARCH
    ===================================================== */
    function closeSearch() {
        overlay.classList.remove("active");
        overlay.setAttribute(
            "aria-hidden",
            "true"
        );
        input.value = "";
    }
    /* =====================================================
       CLOSE BUTTON
    ===================================================== */
    close?.addEventListener(
        "click",
        closeSearch
    );
    /* =====================================================
       CLICK OUTSIDE
    ===================================================== */
    overlay.addEventListener(
        "click",
        event => {
            if (event.target === overlay) {
                closeSearch();
            }
        }
    );
    /* =====================================================
       KEYBOARD SHORTCUTS
       "/"     → Open search
       Escape  → Close search
    ===================================================== */
    document.addEventListener(
        "keydown",
        event => {
            const activeElement =
                document.activeElement;
            const isTyping =
                activeElement &&
                (
                    activeElement.tagName === "INPUT" ||
                    activeElement.tagName === "TEXTAREA" ||
                    activeElement.isContentEditable
                );
            if (
                event.key === "/" &&
                !isTyping
            ) {
                event.preventDefault();
                openSearch();
            }
            if (
                event.key === "Escape" &&
                overlay.classList.contains("active")
            ) {
                closeSearch();
            }
        }
    );
    /* =====================================================
       SEARCH BUTTONS
    ===================================================== */
    document
        .querySelectorAll(
            "[data-search], .search-button, #searchButton"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                openSearch
            );
        });
}
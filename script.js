
const recruitmentForm = document.getElementById("recruitmentForm");
const leadRecruitmentForm = document.getElementById("leadRecruitmentForm");

function showFormMessage(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#a32121" : "#246b45";
    element.style.fontWeight = "bold";
    element.style.backgroundColor = isError ? "#ffe5e5" : "#e5ffe5";
    element.style.padding = "12px";
    element.style.borderRadius = "8px";
    element.style.display = "block";
}

if (recruitmentForm) {
    const formMessage = document.getElementById("formMessage");

    recruitmentForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const selectedInterests = recruitmentForm.querySelectorAll(
            'input[name="interests"]:checked'
        );

        if (selectedInterests.length === 0) {
            showFormMessage(
                formMessage,
                "Please select at least one area of interest.",
                true
            );
            return;
        }

        showFormMessage(
            formMessage,
            "Validation successful! Your application has NOT been saved yet."
        );
    });
}

if (leadRecruitmentForm) {
    const leadFormMessage = document.getElementById("leadFormMessage");

    leadRecruitmentForm.addEventListener("submit", function (event) {
        event.preventDefault();

        showFormMessage(
            leadFormMessage,
            "Validation successful! Your leadership application has NOT been saved yet."
        );
    });
}


/* Upcoming Event Pop-up */
document.addEventListener("DOMContentLoaded", function () {
    const popup = document.getElementById("eventPopup");
    const closeButton = document.getElementById("closeEventPopup");
    const okayButton = document.getElementById("eventPopupOkay");

    if (!popup) {
        console.error("TLS popup: #eventPopup was not found.");
        return;
    }

    function openPopup() {
        popup.classList.add("is-visible");
        popup.setAttribute("aria-hidden", "false");
    }

    function closePopup() {
        popup.classList.remove("is-visible");
        popup.setAttribute("aria-hidden", "true");
    }

    if (closeButton) {
        closeButton.addEventListener("click", closePopup);
    }

    if (okayButton) {
        okayButton.addEventListener("click", closePopup);
    }

    popup.addEventListener("click", function (event) {
        if (event.target === popup) {
            closePopup();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closePopup();
        }
    });

    // Show the popup one second after the page is ready
    window.setTimeout(openPopup, 1000);
});


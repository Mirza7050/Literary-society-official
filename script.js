
/* ========== SUPABASE CONFIGURATION ========== */
const SUPABASE_URL = "https://uyiiaqihliptuqhdfxjt.supabase.co";
const SUPABASE_KEY = "sb_publishable_Fw1MWY3K6zhxlPGIXaSXEQ_0UfMwoku";
const SUPABASE_BUCKET = "tls-resumes";

/* ========== FORM MESSAGE ========== */
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

/* ========== FORM FIELD HELPER ========== */
function getField(form, name) {
    const field = form.querySelector(`[name="${name}"]`);
    if (!field) return "";

    if (field.type === "radio") {
        const selected = form.querySelector(
            `input[name="${name}"]:checked`
        );
        return selected ? selected.value : "";
    }

    return field.value.trim();
}

/* ========== SECURE APPLICATION SUBMISSION ========== */

// Replace this placeholder with your deployed Supabase
// Edge Function URL for submit-tls-application.
const TLS_SUBMISSION_URL = "https://uyiiaqihliptuqhdfxjt.supabase.co/functions/v1/submit-tls-application";

async function submitTLSApplication(form, messageElement, applicationType) {
    const button = form.querySelector('[type="submit"]');

    try {
        if (!TLS_SUBMISSION_URL.startsWith("https://") ||
            TLS_SUBMISSION_URL === "PASTE_YOUR_FUNCTION_URL_HERE") {
            throw new Error("The application submission endpoint is not configured.");
        }

        // Make sure Cloudflare Turnstile is completed.
        const turnstileToken = form.querySelector(
            '[name="cf-turnstile-response"]'
        )?.value;

        if (!turnstileToken) {
            throw new Error("Please complete the security verification.");
        }

        // Collect all form fields, the resume, and the Turnstile token.
        const formData = new FormData(form);

        // Tell the server which type of application this is.
        formData.set("application_type", applicationType);

        // Send the application to the secure server-side function.
        const response = await fetch(TLS_SUBMISSION_URL, {
            method: "POST",
            body: formData
        });

        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error(
                "The server returned an unexpected response. Please try again."
            );
        }

        if (!response.ok || result.success !== true) {
            throw new Error(
                result.error || "Your application could not be submitted. Please try again."
            );
        }

        showFormMessage(
            messageElement,
            "Application submitted successfully! Thank you."
        );

        form.reset();

        // Reset Turnstile for the next submission.
        if (window.turnstile) {
            window.turnstile.reset();
        }

    } catch (error) {
        console.error("TLS application error:", error);

        showFormMessage(
            messageElement,
            error.message || "Something went wrong. Please try again.",
            true
        );

        // Refresh the security token so the applicant can retry.
        if (window.turnstile) {
            window.turnstile.reset();
        }

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent =
                button.dataset.originalText || "Submit";
        }
    }
}

/* ========== CONNECT BOTH FORMS ========== */
function connectTLSForm(form, messageId, applicationType) {
    if (!form) return;

    const messageElement = document.getElementById(messageId);
    const button = form.querySelector('[type="submit"]');

    if (button) {
        button.dataset.originalText = button.textContent.trim() || "Submit";
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (button?.disabled) return;

        if (button) {
            button.disabled = true;
            button.textContent = "Submitting...";
        }

        showFormMessage(messageElement, "Submitting your application...");

        await submitTLSApplication(form, messageElement, applicationType);
    });
}

connectTLSForm(
    document.getElementById("recruitmentForm"),
    "formMessage",
    "membership"
);

connectTLSForm(
    document.getElementById("leadRecruitmentForm"),
    "leadFormMessage",
    "leadership"
);

/* ========== HOMEPAGE EVENT POPUP ========== */
document.addEventListener("DOMContentLoaded", function () {
    const popup = document.getElementById("eventPopup");
    const closeButton = document.getElementById("closeEventPopup");
    const okayButton = document.getElementById("eventPopupOkay");

    if (!popup) return;

    function openPopup() {
        popup.classList.add("is-visible");
        popup.setAttribute("aria-hidden", "false");
    }

    function closePopup() {
        popup.classList.remove("is-visible");
        popup.setAttribute("aria-hidden", "true");
    }

    if (closeButton) closeButton.addEventListener("click", closePopup);
    if (okayButton) okayButton.addEventListener("click", closePopup);

    popup.addEventListener("click", function (event) {
        if (event.target === popup) closePopup();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closePopup();
    });

    window.setTimeout(openPopup, 1000);
});

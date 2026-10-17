
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

/* ========== SUBMIT APPLICATION ========== */
async function submitTLSApplication(form, messageElement, applicationType) {
    const button = form.querySelector('[type="submit"]');
    let resumePath = null;
    let client;

    try {
        if (!window.supabase) {
            throw new Error("Supabase library did not load. Refresh the page.");
        }

        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

        const fullName = getField(form, "fullName");
        const email = getField(form, "email");
        const phone = getField(form, "phone");
        const rollNumber = getField(form, "rollNumber");
        const academicYear = getField(form, "year");
        const branch = getField(form, "branch");
        const section = getField(form, "section");

        if (!fullName || !email || !phone || !rollNumber ||
            !academicYear || !branch || !section) {
            throw new Error("Please complete all required fields.");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("Please enter a valid email address.");
        }

        const resumeInput = form.querySelector('[name="resume"]');
        const resume = resumeInput?.files?.[0] || null;

        if (resume) {
            const allowedExtension = /\.(pdf|doc|docx)$/i;
            const allowedTypes = [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ];

            if (!allowedExtension.test(resume.name) ||
                !allowedTypes.includes(resume.type)) {
                throw new Error("Upload your resume as a PDF, DOC, or DOCX file.");
            }

            if (resume.size > 10 * 1024 * 1024) {
                throw new Error("Your resume must be smaller than 10 MB.");
            }

            const safeName = resume.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            resumePath = `${crypto.randomUUID()}-${safeName}`;

            const { error } = await client.storage
                .from(SUPABASE_BUCKET)
                .upload(resumePath, resume, {
                    contentType: resume.type,
                    upsert: false
                });

            if (error) throw error;
        }

        const application = {
            application_type: applicationType,
            full_name: fullName,
            email,
            phone,
            roll_number: rollNumber,
            academic_year: academicYear,
            branch,
            section,
            position: getField(form, "position") || null,
            resume_path: resumePath,
            profile_links: getField(form, "links") || null,
            prior_leadership: getField(form, "previousLeadership") || null,
            experience_skills: getField(form, "experience") || null,
            interview_slot: getField(form, "interviewSlot") || null
        };

        const { error: insertError } = await client
            .from("tls_applications")
            .insert([application]);

        if (insertError) {
            if (resumePath) {
                await client.storage.from(SUPABASE_BUCKET).remove([resumePath]);
                resumePath = null;
            }
            throw insertError;
        }

        showFormMessage(messageElement, "Application submitted successfully! Thank you.");
        form.reset();

    } catch (error) {
        console.error("TLS application error:", error);

        showFormMessage(
            messageElement,
            error.message || "Something went wrong. Please try again.",
            true
        );
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = button.dataset.originalText || "Submit";
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

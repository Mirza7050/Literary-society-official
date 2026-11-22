
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


/* ========== TLS COMMUNITY REVEAL ========== */
document.addEventListener("DOMContentLoaded", () => {
    const reveal = document.getElementById("communityReveal");
    const openButton = document.getElementById("openCommunityReveal");
    const closeButton = document.getElementById("closeCommunityReveal");
    const enterButton = document.getElementById("enterCommunity");
    const intro = document.getElementById("revealIntro");
    const directory = document.getElementById("revealDirectory");
    const detail = document.getElementById("teamDetail");
    const domainGrid = document.getElementById("domainGrid");
    const backButton = document.getElementById("backToDomains");
    const roster = document.getElementById("teamRoster");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reveal || !openButton || !domainGrid) return;

    // Names and designations are transcribed from the TLS Members & Leadership document.
    const teams = [
        {
            id: "leadership", number: "01", title: "Leadership", descriptor: "The visionaries",
            line: "The people guiding the society's vision.",
            symbol: "✦",
            members: [
                ["President", "Soha Sayeeda Wajahath"],
                ["Chief Executive", "Qurrat"],
                ["Vice President", "Mustafa"],
                ["Vice President", "Sejal"],
                ["Chief Coordinator", "Muneefah"],
                ["Co-Chief Coordinator", "Sibtain"],
                ["Chief Executive", "Furqan"]
            ]
        },
        {
            id: "secretary", number: "02", title: "Secretary", descriptor: "The backbone",
            line: "Keeping every chapter connected and in motion.",
            symbol: "❖",
            members: [
                ["Secretary", "Shifa"],
                ["Vice Secretary", "Amaan"],
                ["Joint Secretary", "Manaar"],
                ["Joint Secretary", "Nikitha"],
                ["Joint Secretary", "Saamiya"]
            ]
        },
        {
            id: "design", number: "03", title: "Design Team", descriptor: "The creators",
            line: "Giving ideas a visual language.",
            symbol: "✧",
            members: [
                ["Lead", "Yusra"],
                ["Member", "Wajiha"],
                ["Member", "Farwa"],
                ["Member", "Arisha"],
                ["Member", "Haadiya"]
            ]
        },
        {
            id: "techdev", number: "04", title: "TechDev Team", descriptor: "The builders",
            line: "Turning imagination into digital experiences.",
            symbol: "⌘",
            members: [
                ["Lead", "Shahnawaz"],
                ["Co-Lead", "Afia"],
                ["Member", "Saaduddin"],
                ["Member", "Abdul Rehman Taha"],
                ["Member", "Arsalaan"]
            ]
        },
        {
            id: "social", number: "05", title: "Social Media Team", descriptor: "The voices",
            line: "Carrying the society's stories beyond the page.",
            symbol: "◎",
            members: [
                ["Lead", "Siddique"],
                ["Co-Lead", "Muntaha"],
                ["Member", "Humera"],
                ["Member", "Zun"],
                ["Member", "Zaid"],
                ["Member", "Subhan"],
                ["Member", "Rehan"]
            ]
        },
        {
            id: "events", number: "06", title: "Events & Logistics", descriptor: "The orchestrators",
            line: "Making every gathering a moment worth remembering.",
            symbol: "✺",
            members: [
                ["Lead", "Fasi"],
                ["Co-Lead", "Swayamdeep"],
                ["Member", "Isahiti"],
                ["Member", "Samaira"],
                ["Member", "Sajjad"],
                ["Member", "Atif"],
                ["Member", "Fouzaan"],
                ["Member", "Rumaan"],
                ["Member", "Diya Agarwal"],
                ["Member", "Huda"],
                ["Member", "Haseeb"],
                ["Member", "Hasaan"],
                ["Member", "Noreen"]
            ]
        },
        {
            id: "cultural", number: "07", title: "Cultural Team", descriptor: "The performers",
            line: "Bringing expression, art and performance to life.",
            symbol: "✷",
            members: [
                ["Lead", "Omer Syed"],
                ["Co-Lead", "Omer Mhd"],
                ["Performance Member", "Hamdaan"],
                ["Performance Member", "Jeremy"],
                ["Performance Member", "Zubiya"],
                ["Art Member", "Akshara"],
                ["Art Member", "Sadiya"],
                ["Art Member", "Padala Sirja"],
                ["Photography Member", "Qavi"],
                ["Photography Member", "Mir Baquer Ali"],
                ["Photography Member", "Shaarib"]
            ]
        },
        {
            id: "literary", number: "08", title: "Literary Team", descriptor: "The storytellers",
            line: "Where words become ideas, arguments and stories.",
            symbol: "❧",
            members: [
                ["Lead", "Kashif"],
                ["Co-Lead", "Taha"],
                ["Orator Member", "Gunturu Ghisha"],
                ["Orator Member", "Izyan"],
                ["Orator Member", "Zainab"],
                ["Scripting Member", "Omkar"],
                ["Scripting Member", "Sumaiya"],
                ["Scripting Member", "Amena Zaidi"],
                ["Content Writing Member", "Zehra"],
                ["Content Writing Member", "Mustafa Ali"],
                ["Content Writing Member", "Fizza"]
            ]
        }
    ];

    let previousFocus = null;

    function createParticles() {
        const holder = document.getElementById("revealParticles");
        if (!holder || holder.childElementCount || reducedMotion) return;
        for (let i = 0; i < 42; i++) {
            const particle = document.createElement("span");
            particle.className = "reveal-particle";
            particle.style.setProperty("--x", `${(i * 37) % 100}%`);
            particle.style.setProperty("--delay", `${(i % 13) * -0.8}s`);
            particle.style.setProperty("--duration", `${7 + (i % 8)}s`);
            particle.style.setProperty("--drift", `${((i * 17) % 70) - 35}px`);
            holder.appendChild(particle);
        }
    }

    function openReveal() {
        previousFocus = document.activeElement;
        reveal.classList.add("is-open");
        reveal.setAttribute("aria-hidden", "false");
        document.body.classList.add("community-lock");
        closeButton?.focus();
        createParticles();
    }

    function closeReveal() {
        reveal.classList.remove("is-open");
        reveal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("community-lock");
        window.setTimeout(() => previousFocus?.focus?.(), 100);
    }

    function showDirectory() {
        intro.hidden = true;
        detail.hidden = true;
        directory.hidden = false;
        directory.classList.remove("view-enter");
        void directory.offsetWidth;
        directory.classList.add("view-enter");
    }

    function showTeam(team) {
        directory.hidden = true;
        detail.hidden = false;
        detail.classList.remove("view-enter");
        void detail.offsetWidth;
        detail.classList.add("view-enter");

        document.getElementById("teamKicker").textContent = `DOMAIN ${team.number} / THE LITERARY SOCIETY`;
        document.getElementById("teamTitle").textContent = team.title;
        document.getElementById("teamSubtitle").textContent = team.line;
        roster.replaceChildren();

        team.members.forEach(([role, name], index) => {
            const card = document.createElement("article");
            card.className = "roster-card";
            card.style.setProperty("--card-index", index);
            const number = document.createElement("span");
            number.className = "roster-number";
            number.textContent = String(index + 1).padStart(2, "0");
            const info = document.createElement("div");
            info.className = "roster-info";
            const designation = document.createElement("p");
            designation.className = "roster-role";
            designation.textContent = role;
            const memberName = document.createElement("h3");
            memberName.textContent = name;
            info.append(designation, memberName);
            const mark = document.createElement("span");
            mark.className = "roster-mark";
            mark.textContent = "✦";
            card.append(number, info, mark);
            roster.appendChild(card);
        });
        document.getElementById("revealStage").scrollTop = 0;
    }

    teams.forEach((team, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "domain-card";
        button.style.setProperty("--card-index", index);
        button.setAttribute("aria-label", `Open ${team.title}, ${team.members.length} members`);
        const number = document.createElement("span");
        number.className = "domain-number";
        number.textContent = team.number;
        const symbol = document.createElement("span");
        symbol.className = "domain-symbol";
        symbol.setAttribute("aria-hidden", "true");
        symbol.textContent = team.symbol;
        const title = document.createElement("h3");
        title.textContent = team.title;
        const descriptor = document.createElement("p");
        descriptor.textContent = team.descriptor;
        const count = document.createElement("span");
        count.className = "domain-count";
        count.textContent = `${String(team.members.length).padStart(2, "0")} MEMBERS`;
        const arrow = document.createElement("span");
        arrow.className = "domain-arrow";
        arrow.textContent = "↗";
        button.append(number, symbol, title, descriptor, count, arrow);
        button.addEventListener("click", () => showTeam(team));

        if (!reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            button.addEventListener("pointermove", (event) => {
                const rect = button.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width;
                const y = (event.clientY - rect.top) / rect.height;
                button.style.setProperty("--tilt-x", `${(0.5 - y) * 8}deg`);
                button.style.setProperty("--tilt-y", `${(x - 0.5) * 10}deg`);
                button.style.setProperty("--glow-x", `${x * 100}%`);
                button.style.setProperty("--glow-y", `${y * 100}%`);
            });
            button.addEventListener("pointerleave", () => {
                button.style.setProperty("--tilt-x", "0deg");
                button.style.setProperty("--tilt-y", "0deg");
            });
        }
        domainGrid.appendChild(button);
    });

    openButton.addEventListener("click", openReveal);
    closeButton?.addEventListener("click", closeReveal);
    enterButton?.addEventListener("click", showDirectory);
    backButton?.addEventListener("click", showDirectory);

    reveal.addEventListener("click", (event) => {
        if (event.target === reveal) closeReveal();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && reveal.classList.contains("is-open")) closeReveal();
    });
});

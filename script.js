
const recruitmentForm = document.getElementById("recruitmentForm");
const formMessage = document.getElementById("formMessage");

recruitmentForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const selectedInterests = document.querySelectorAll(
        'input[name="interests"]:checked'
    );

    if (selectedInterests.length === 0) {
        formMessage.textContent =
            "⚠ Please select at least one area of interest!";
        formMessage.style.color = "#ff0000";
        formMessage.style.fontWeight = "bold";
        formMessage.style.backgroundColor = "#ffe5e5";
        formMessage.style.padding = "12px";
        formMessage.style.borderRadius = "8px";
        formMessage.style.display = "block";
        return;
    }

    formMessage.textContent =
        "Form validation successful! Your application has NOT been saved yet.";
    formMessage.style.color = "green";
    formMessage.style.fontWeight = "bold";
    formMessage.style.backgroundColor = "#e5ffe5";
    formMessage.style.padding = "12px";
    formMessage.style.borderRadius = "8px";
    formMessage.style.display = "block";
});


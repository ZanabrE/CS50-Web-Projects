document.addEventListener("DOMContentLoaded", () => {
    const recipeCards = document.querySelectorAll(".recipe-card");
    const mealSlots = document.querySelectorAll(".meal-slot");
    const csrfToken = document.getElementById("csrf-token")?.value;

    // Initialize HTML5 Drag Event Listeners
    recipeCards.forEach(card => {
        card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", card.dataset.recipeId);
            card.classList.add("dragging");
        });

        card.addEventListener("dragend", () => {
            card.classList.remove("dragging");
        });
    });

    // Configure Calendar Target Areas
    mealSlots.forEach(slot => {
        slot.addEventListener("dragover", (e) => {
            e.preventDefault(); // Required to allow dropping
            slot.classList.add("drag-hover");
        });

        slot.addEventListener("dragleave", () => {
            slot.classList.remove("drag-hover");
        });

        slot.addEventListener("drop", async (e) => {
            e.preventDefault();
            slot.classList.remove("drag-hover");

            const recipeId = e.dataTransfer.getData("text/plain");
            const targetDay = slot.closest(".calendar-day-column").dataset.dayCode;
            const mealType = slot.dataset.mealType;

            // Trigger Single Page Background Database Update
            if (recipeId && targetDay && csrfToken) {
                try {
                    const response = await fetch("/api/calendar/move/", {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": csrfToken
                        },
                        body: JSON.stringify({
                            plan_id: recipeId, // Maps to views.py data extraction key
                            new_date: targetDay,
                            meal_type: mealType
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.status === "success") {
                        // Visual update: Clone recipe card inside the target container slot
                        const originCard = document.querySelector(`[data-recipe-id="${recipeId}"]`);
                        if (originCard) {
                            const occupiedZone = slot.querySelector(".slot-occupied-zone");
                            occupiedZone.innerHTML = `<span class="badge bg-primary w-100">${originCard.querySelector('strong').innerText}</span>`;
                        }
                    } else {
                        console.error("Database sync failed:", data.message);
                    }
                } catch (error) {
                    console.error("Network interface error:", error);
                }
            }
        });
    });

    // Control Optimization Dialog Modal System
    const optimizerBtn = document.getElementById("run-optimizer-btn");
    const closeBtn = document.getElementById("close-modal-btn");
    const modal = document.getElementById("optimization-modal");

    if (optimizerBtn && modal) {
        optimizerBtn.addEventListener("click", (e) => {
            e.preventDefault();
            modal.showModal(); // Utilizes native HTML5 dialog layer mechanics
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            modal.close();
        });
    }
});

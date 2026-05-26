document.addEventListener("DOMContentLoaded", () => {
    const recipeCards = document.querySelectorAll(".recipe-card");
    const mealSlots = document.querySelectorAll(".meal-slot");


    // Fallback helper to fetch CRSF token from cookies if DOM element is missing (e.g., during testing or template changes)
    const getCsrfToken = () => {
        const tokenFromDom = document.getElementById("csrf-token")?.value;
        if (tokenFromDom) return tokenFromDom;

        const cookieValue = document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='));
        return cookieValue ? cookieValue.split('=')[1] : null;
    }
        

    // Initialize HTML5 Drag Event Listeners
    recipeCards.forEach(card => {
        card.addEventListener("dragstart", (e) => {
            const targetCard = e.target.closest(".recipe-card");
            if (targetCard) {
                e.dataTransfer.setData("text/plain", targetCard.dataset.recipeId);
                targetCard.classList.add("dragging");
            }
        });

        card.addEventListener("dragend", (e) => {
            const targetCard = e.target.closest(".recipe-card");
            if (targetCard) {
                targetCard.classList.remove("dragging");
            }
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
            const targetDay = slot.closest(".calendar-day-column")?.dataset.dayCode;
            const mealType = slot.dataset.mealType;
            const csrfToken = getCsrfToken();

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
                        // Update the UI slot with the new recipe title without a full page refresh
                        const originCard = document.querySelector(`[data-recipe-id="${recipeId}"]`);

                        if (originCard) {
                            const occupiedZone = slot.querySelector(".slot-occupied-zone");
                            const recipeTitle = originCard.querySelector('strong')?.innerText || "Selected Recipe";
                            const badgeHtml = `<span class="badge bg-primary w-100 py-2 text-wrap">${recipeTitle}</span>`;
                            
                            // Safety fallback if .slot-occupied-zone does not exist
                            if (occupiedZone) {
                                occupiedZone.innerHTML = badgeHtml;
                            } else {
                                slot.innerHTML = badgeHtml;
                            }
                        }
                    } else {
                        console.error("Database sync failed:", data.message || "Unknown error");
                    }
                } catch (error) {
                    console.error("Network interface error:", error);
                }
            } else {
                console.warn("Drag dropped, but validation failed. Details:", { recipeId, targetDay, hasToken: !!csrfToken });
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

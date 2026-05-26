document.addEventListener("DOMContentLoaded", () => {
    const recipeCards = document.querySelectorAll(".recipe-card");
    const mealSlots = document.querySelectorAll(".meal-slot");
    const dayColumns = document.querySelectorAll(".calendar-day-column");

    let currentActiveDayCode = "MON"; // Default layout viewport initialization assignment tracker

    // Fallback helper to fetch CSRF token from cookies
    const getCsrfToken = () => {
        const tokenFromDom = document.getElementById("csrf-token")?.value;
        if (tokenFromDom) return tokenFromDom;

        const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
        return cookieValue ? cookieValue.split('=')[1] : null;
    };

    // Helper to refresh progress bars based on calculations for a specific day
    const calculateAndRenderDayMacros = (dayColumnElement) => {
        const calsBar = document.getElementById("calories-progress");
        const protBar = document.getElementById("protein-progress");
        const calsText = document.getElementById("calories-text-value");
        const protText = document.getElementById("protein-text-value");
        const labelText = document.getElementById("active-day-tracker-label");

        let dayTotalCals = 0;
        let dayTotalProt = 0;

        // Sum up the macros currently assigned to all three slots within this day column
        dayColumnElement.querySelectorAll(".meal-slot").forEach(slot => {
            dayTotalCals += parseFloat(slot.dataset.currentCalories) || 0;
            dayTotalProt += parseFloat(slot.dataset.currentProtein) || 0;
        });

        // Apply values safely to the progress DOM node layers
        if (calsBar && protBar) {
            calsBar.value = dayTotalCals;
            protBar.value = dayTotalProt;
            calsText.innerText = `${dayTotalCals} / 2000 kcal`;
            protText.innerText = `${dayTotalProt} / 150g`;
            labelText.innerText = `Selected: ${dayColumnElement.dataset.dayName}`;
        }
    };

    // Allow clicking columns to view different day's progress targets
    dayColumns.forEach(column => {
        column.addEventListener("click", () => {
            currentActiveDayCode = column.dataset.dayCode;
            calculateAndRenderDayMacros(column);
        });
    });

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
            e.preventDefault();
            slot.classList.add("drag-hover");
        });

        slot.addEventListener("dragleave", () => {
            slot.classList.remove("drag-hover");
        });

        slot.addEventListener("drop", async (e) => {
            e.preventDefault();
            slot.classList.remove("drag-hover");

            const recipeId = e.dataTransfer.getData("text/plain");
            const parentColumn = slot.closest(".calendar-day-column");
            const targetDay = parentColumn?.dataset.dayCode;
            const mealType = slot.dataset.mealType;
            const csrfToken = getCsrfToken();

            if (recipeId && targetDay && csrfToken) {
                try {
                    const response = await fetch("/api/calendar/move/", {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": csrfToken
                        },
                        body: JSON.stringify({
                            plan_id: recipeId,
                            new_date: targetDay,
                            meal_type: mealType
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.status === "success") {
                        const originCard = document.querySelector(`[data-recipe-id="${recipeId}"]`);

                        if (originCard) {
                            const occupiedZone = slot.querySelector(".slot-occupied-zone");
                            const recipeTitle = originCard.querySelector('strong')?.innerText || "Selected Recipe";
                            const badgeHtml = `<span class="badge bg-primary w-100 py-2 text-wrap">${recipeTitle}</span>`;
                            
                            if (occupiedZone) {
                                occupiedZone.innerHTML = badgeHtml;
                            } else {
                                slot.innerHTML = badgeHtml;
                            }

                            // FIXED: Extract new macros from the dropped card configuration 
                            const newCals = parseFloat(originCard.dataset.calories) || 0;
                            const newProt = parseFloat(originCard.dataset.protein) || 0;

                            // Update slot values dynamically to trigger instantaneous recalculation matrices
                            slot.dataset.currentCalories = newCals;
                            slot.dataset.currentProtein = newProt;

                            // Re-evaluate matching layout updates if the drop targets the active viewport day row
                            calculateAndRenderDayMacros(parentColumn);
                        }
                    } else {
                        console.error("Database sync failed:", data.message || "Unknown error");
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
            modal.showModal();
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            modal.close();
        });
    }

    // Run baseline initialization macro calculation for Monday on layout load
    const mondayColumn = document.querySelector('[data-day-code="MON"]');
    if (mondayColumn) calculateAndRenderDayMacros(mondayColumn);
});
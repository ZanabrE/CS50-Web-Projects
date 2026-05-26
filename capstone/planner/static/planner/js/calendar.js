document.addEventListener("DOMContentLoaded", () => {
    const mealSlots = document.querySelectorAll(".meal-slot");
    const dayColumns = document.querySelectorAll(".calendar-day-column");

    const getCsrfToken = () => {
        const tokenFromDom = document.getElementById("csrf-token")?.value;
        if (tokenFromDom) return tokenFromDom;
        const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
        return cookieValue ? cookieValue.split('=')[1] : null;
    };

    const calculateAndRenderDayMacros = (dayColumnElement) => {
        const calsBar = document.getElementById("calories-progress");
        const protBar = document.getElementById("protein-progress");
        const calsText = document.getElementById("calories-text-value");
        const protText = document.getElementById("protein-text-value");

        let dayTotalCals = 0;
        let dayTotalProt = 0;

        dayColumnElement.querySelectorAll(".meal-slot").forEach(slot => {
            dayTotalCals += parseFloat(slot.dataset.currentCalories) || 0;
            dayTotalProt += parseFloat(slot.dataset.currentProtein) || 0;
        });

        if (calsBar && protBar) {
            calsBar.value = dayTotalCals;
            protBar.value = parseFloat(dayTotalProt.toFixed(1));
            calsText.innerText = `${dayTotalCals} / 2000 kcal`;
            protText.innerText = `${dayTotalProt.toFixed(1)} / 150g`;
        }
    };

    // Initialize listeners for draggable elements dynamically
    const attachDragListeners = (card) => {
        card.addEventListener("dragstart", (e) => {
            const targetCard = e.target.closest(".recipe-card");
            if (targetCard) {
                e.dataTransfer.setData("text/plain", targetCard.dataset.recipeId);
                targetCard.classList.add("dragging");
                
                // Track where the card is being dragged FROM (for re-scheduling swaps)
                const sourceSlot = targetCard.closest(".meal-slot");
                if (sourceSlot) {
                    sourceSlot.setAttribute("data-dragging-source", "true");
                }
            }
        });

        card.addEventListener("dragend", (e) => {
            const targetCard = e.target.closest(".recipe-card");
            if (targetCard) {
                targetCard.classList.remove("dragging");
            }
            // Clear out source markers
            document.querySelectorAll("[data-dragging-source]").forEach(el => el.removeAttribute("data-dragging-source"));
        });
    };

    // Core removal script processor logic function
    const handleMealRemoval = async (buttonElement) => {
        const badge = buttonElement.closest(".recipe-card");
        const slot = badge.closest(".meal-slot");
        const parentColumn = slot.closest(".calendar-day-column");
        const targetDay = parentColumn?.dataset.dayCode;
        const mealType = slot.dataset.mealType;
        const csrfToken = getCsrfToken();

        if (targetDay && mealType && csrfToken) {
            try {
                const response = await fetch("/api/calendar/move/", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
                    body: JSON.stringify({ plan_id: null, new_date: targetDay, meal_type: mealType })
                });

                const data = await response.json();
                if (response.ok && data.status === "success") {
                    // Reset node parameters and clear layout space
                    slot.dataset.currentCalories = 0;
                    slot.dataset.currentProtein = 0;
                    slot.querySelector(".slot-occupied-zone").innerHTML = "";
                    
                    calculateAndRenderDayMacros(parentColumn);
                }
            } catch (error) {
                console.error("Removal interface sync anomaly:", error);
            }
        }
    };

    // Attach listener hooks to all baseline elements on load
    document.querySelectorAll(".recipe-card").forEach(card => attachDragListeners(card));

    // Handle delete button click delegation
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-meal-btn")) {
            e.stopPropagation();
            handleMealRemoval(e.target);
        }
    });

    dayColumns.forEach(column => {
        column.addEventListener("click", () => calculateAndRenderDayMacros(column));
    });

    mealSlots.forEach(slot => {
        slot.addEventListener("dragover", (e) => {
            e.preventDefault();
            slot.classList.add("drag-hover");
        });

        slot.addEventListener("dragleave", () => slot.classList.remove("drag-hover"));

        slot.addEventListener("drop", async (e) => {
            e.preventDefault();
            slot.classList.remove("drag-hover");

            const recipeId = e.dataTransfer.getData("text/plain");
            const parentColumn = slot.closest(".calendar-day-column");
            const targetDay = parentColumn?.dataset.dayCode;
            const mealType = slot.dataset.mealType;
            const csrfToken = getCsrfToken();

            const sourceSlot = document.querySelector("[data-dragging-source]");

            if (recipeId && targetDay && csrfToken) {
                try {
                    const response = await fetch("/api/calendar/move/", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
                        body: JSON.stringify({ plan_id: recipeId, new_date: targetDay, meal_type: mealType })
                    });

                    const data = await response.json();

                    if (response.ok && data.status === "success") {
                        const originCard = document.querySelector(`.recipe-card[data-recipe-id="${recipeId}"]`);
                        
                        if (originCard) {
                            const newCals = parseFloat(originCard.dataset.calories) || 0;
                            const newProt = parseFloat(originCard.dataset.protein) || 0;
                            const recipeTitle = originCard.querySelector('strong')?.innerText || "Selected Recipe";

                            // If this was moved from an old slot, clear out the old slot backend/frontend properties
                            if (sourceSlot && sourceSlot !== slot) {
                                const sourceColumn = sourceSlot.closest(".calendar-day-column");
                                
                                // Cleanly clear out database record asynchronously for the old slot
                                await fetch("/api/calendar/move/", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
                                    body: JSON.stringify({ plan_id: null, new_date: sourceColumn.dataset.dayCode, meal_type: sourceSlot.dataset.mealType })
                                });

                                sourceSlot.dataset.currentCalories = 0;
                                sourceSlot.dataset.currentProtein = 0;
                                sourceSlot.querySelector(".slot-occupied-zone").innerHTML = "";
                                calculateAndRenderDayMacros(sourceColumn);
                            }

                            // Update new slot values
                            slot.dataset.currentCalories = newCals;
                            slot.dataset.currentProtein = newProt;

                            const occupiedZone = slot.querySelector(".slot-occupied-zone");
                            const badgeHtml = `
                                <span class="recipe-card badge bg-primary w-100 py-1 text-wrap d-flex justify-content-between align-items-center" 
                                      draggable="true" data-recipe-id="${recipeId}" data-calories="${newCals}" data-protein="${newProt}" style="cursor: grab; font-size: 0.7rem;">
                                    <strong class="text-white">${recipeTitle}</strong>
                                    <button type="button" class="btn-close btn-close-white remove-meal-btn" aria-label="Remove" style="font-size: 0.5rem; padding: 0.2rem; cursor: pointer;"></button>
                                </span>`;
                            
                            if (occupiedZone) {
                                occupiedZone.innerHTML = badgeHtml;
                                attachDragListeners(occupiedZone.querySelector(".recipe-card"));
                            }

                            calculateAndRenderDayMacros(parentColumn);
                        }
                    }
                } catch (error) {
                    console.error("Network sync error:", error);
                }
            }
        });
    });

    // Control Optimization Dialog Modal System
    const optimizerBtn = document.getElementById("run-optimizer-btn");
    const closeBtn = document.getElementById("close-modal-btn");
    const modal = document.getElementById("optimization-modal");

    if (optimizerBtn && modal) {
        optimizerBtn.addEventListener("click", (e) => { e.preventDefault(); modal.showModal(); });
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => modal.close());
    }

    const mondayColumn = document.querySelector('[data-day-code="MON"]');
    if (mondayColumn) calculateAndRenderDayMacros(mondayColumn);
});

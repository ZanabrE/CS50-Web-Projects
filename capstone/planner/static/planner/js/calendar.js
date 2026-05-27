document.addEventListener("DOMContentLoaded", () => {
    const mealSlots = document.querySelectorAll(".meal-slot");
    const dayColumns = document.querySelectorAll(".calendar-day-column");
    const labelText = document.getElementById("active-day-tracker-label");  // Added null check for labelText to prevent reference errors if element is absent

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

        dayTotalProt = parseFloat(dayTotalProt.toFixed(1));

        if (calsBar && protBar) {
            calsBar.value = dayTotalCals;
            protBar.value = dayTotalProt;
            if (calsText) calsText.innerText = `${dayTotalCals} / 2000 kcal`;
            if (protText) protText.innerText = `${dayTotalProt} / 150g`;
            // FIXED: Shielded from reference errors if element is absent
            if (labelText && dayColumnElement.dataset.dayName) {
                labelText.innerText = `Selected: ${dayColumnElement.dataset.dayName}`;
            }
        }
    };

    const attachDragListeners = (card) => {
        card.addEventListener("dragstart", (e) => {
            const targetCard = e.target.closest(".recipe-card");
            if (targetCard) {
                e.dataTransfer.setData("text/plain", targetCard.dataset.recipeId);
                targetCard.classList.add("dragging");
                
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
            document.querySelectorAll("[data-dragging-source]").forEach(el => el.removeAttribute("data-dragging-source"));
        });
    };

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
                    slot.dataset.currentCalories = 0;
                    slot.dataset.currentProtein = 0;
                    const occupiedZone = slot.querySelector(".slot-occupied-zone");
                    if (occupiedZone) occupiedZone.innerHTML = "";
                    
                    calculateAndRenderDayMacros(parentColumn);
                }
            } catch (error) {
                console.error("Removal interface sync anomaly:", error);
            }
        }
    };

    // Initialize drag properties for baseline cards
    document.querySelectorAll(".recipe-card").forEach(card => attachDragListeners(card));

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

                            if (sourceSlot && sourceSlot !== slot) {
                                const sourceColumn = sourceSlot.closest(".calendar-day-column");
                                
                                await fetch("/api/calendar/move/", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
                                    body: JSON.stringify({ plan_id: null, new_date: sourceColumn.dataset.dayCode, meal_type: sourceSlot.dataset.mealType })
                                });

                                sourceSlot.dataset.currentCalories = 0;
                                sourceSlot.dataset.currentProtein = 0;
                                const oldZone = sourceSlot.querySelector(".slot-occupied-zone");
                                if (oldZone) oldZone.innerHTML = "";
                                calculateAndRenderDayMacros(sourceColumn);
                            }

                            // Update properties
                            slot.dataset.currentCalories = newCals;
                            slot.dataset.currentProtein = newProt;

                            // FIXED & COMPLETED: Core markup generation engine to render elements into target slot
                            const occupiedZone = slot.querySelector(".slot-occupied-zone");
                            if (occupiedZone) {
                                occupiedZone.innerHTML = `
                                    <span class="recipe-card badge bg-primary w-100 py-1 text-wrap d-flex justify-content-between align-items-center" 
                                        draggable="true" 
                                        data-recipe-id="${recipeId}"
                                        data-calories="${newCals}"
                                        data-protein="${newProt}"
                                        style="cursor: grab; font-size: 0.7rem;">
                                        <strong class="text-white">${recipeTitle}</strong>
                                        <button type="button" class="btn-close btn-close-white remove-meal-btn" 
                                                aria-label="Remove" 
                                                style="font-size: 0.5rem; padding: 0.2rem; cursor: pointer;"></button>
                                    </span>
                                `;
                                
                                // RE-ATTACH DRAG LISTENERS: Allows dynamically added elements to be dragged again
                                const newlyAddedBadge = occupiedZone.querySelector(".recipe-card");
                                attachDragListeners(newlyAddedBadge);
                            }
                            
                            calculateAndRenderDayMacros(parentColumn);
                        }
                    }
                } catch (error) {
                    console.error("Drop placement sync anomaly:", error);
                }
            }
        });
    });
});

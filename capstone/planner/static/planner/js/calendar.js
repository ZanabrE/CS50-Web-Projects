document.addEventListener("DOMContentLoaded", () => {
        // SECURITY GUARD: If calendar elements don't exist on this screen, stop executing instantly
    if (!document.querySelector(".calendar-day-column")) {
        return;
    }

    const mealSlots = document.querySelectorAll(".meal-slot");
    const dayColumns = document.querySelectorAll(".calendar-day-column");
    const labelText = document.getElementById("active-day-tracker-label");

    // Global trackers for mobile touch interaction states
    let touchActiveCard = null;
    let touchSourceSlot = null;

    // Secure cookie extractor to safely load Django security tokens
    const getCsrfToken = () => {
        const tokenFromDom = document.getElementById("csrf-token")?.value;
        if (tokenFromDom) return tokenFromDom;
        const cookieValue = document.cookie.split("; ").find(row => row.startsWith("csrftoken="));
        return cookieValue ? cookieValue.split("=")[1] : null;
    };

    // Core macro calculation engine to process daily parameters dynamically
    const calculateAndRenderDayMacros = (dayColumnElement) => {
        if (!dayColumnElement) return;
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

        if (calsBar) calsBar.value = dayTotalCals;
        if (protBar) protBar.value = dayTotalProt;
        if (calsText) calsText.innerText = `${dayTotalCals} / 2000 kcal`;
        if (protText) protText.innerText = `${dayTotalProt} / 150g`;

        if (labelText && dayColumnElement.dataset.dayName) {
            labelText.innerText = `Selected: ${dayColumnElement.dataset.dayName}`;
        }
    };

    // SHARED UTILITY ENGINE: Updates layouts and recalculates totals across desktop and mobile
    const processSlotAssignment = (slot, recipeId, recipeTitle, newCals, newProt, parentColumn, sourceSlot) => {
        if (sourceSlot && sourceSlot !== slot) {
            const sourceColumn = sourceSlot.closest(".calendar-day-column");
            sourceSlot.dataset.currentCalories = 0;
            sourceSlot.dataset.currentProtein = 0;
            const oldZone = sourceSlot.querySelector(".slot-occupied-zone");
            
            if (oldZone) oldZone.innerHTML = "";
            calculateAndRenderDayMacros(sourceColumn);
        }

        slot.dataset.currentCalories = newCals;
        slot.dataset.currentProtein = newProt;
        
        const occupiedZone = slot.querySelector(".slot-occupied-zone");
        
        if (occupiedZone) {
            occupiedZone.innerHTML = `
                <span class="recipe-card badge bg-primary w-100 py-1 text-wrap d-flex justify-content-between align-items-center" draggable="true" data-recipe-id="${recipeId}" data-calories="${newCals}" data-protein="${newProt}" style="cursor: grab; font-size: 0.7rem;">
                    <strong class="text-white">${recipeTitle}</strong>
                    <button type="button" class="btn-close btn-close-white remove-meal-btn" aria-label="Remove" style="font-size: 0.5rem; padding: 0.2rem; cursor: pointer;"></button>
                </span>
            `;
            const newlyAddedBadge = occupiedZone.querySelector(".recipe-card");
            attachDragListeners(newlyAddedBadge); // Re-binds listeners to the fresh DOM card
        }
        calculateAndRenderDayMacros(parentColumn);
    };

    const attachDragListeners = (card) => {
        // --- DESKTOP MOUSE HANDLERS ---
        card.addEventListener("dragstart", (e) => {
            const targetCard = e.target.closest(".recipe-card");
            if (targetCard) {
                let recipeTitle = targetCard.querySelector("strong")?.innerText || "Selected Recipe";
                recipeTitle = recipeTitle
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                e.dataTransfer.setData("text/plain", targetCard.dataset.recipeId);
                e.dataTransfer.setData("text/title", recipeTitle);
                e.dataTransfer.setData("text/calories", targetCard.dataset.calories || "0");
                e.dataTransfer.setData("text/protein", targetCard.dataset.protein || "0");
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

        // --- MOBILE & TABLET TOUCH HANDLERS (FIXED SCROLL MECHANICS) ---
        let touchOffset = { x: 0, y: 0 };

        card.addEventListener("touchstart", (e) => {
            if (e.target.classList.contains("remove-meal-btn")) return;
            const targetCard = e.target.closest(".recipe-card");
            if (!targetCard) return;

            document.querySelectorAll(".recipe-card").forEach(c => c.style.border = "none");
            
            mobileSelectedCard = targetCard;
            mobileSelectedCard.style.border = "2px solid #0d6efd";
            touchActiveCard = targetCard;
            touchSourceSlot = touchActiveCard.closest(".meal-slot");
            touchActiveCard.style.opacity = "0.6";

            // FIX 2 REMEDY: Calculate specific contact points to prevent card jumping
            const rect = touchActiveCard.getBoundingClientRect();
            touchOffset.x = e.touches[0].clientX - rect.left;
            touchOffset.y = e.touches[0].clientY - rect.top;
        }, { passive: true });

        card.addEventListener("touchmove", (e) => {
            if (!touchActiveCard) return;
            e.preventDefault(); 
            
            const touch = e.touches[0];

            touchActiveCard.style.position = "fixed";
            // Uses precise finger offsets instead of hardcoded half-width adjustments
            touchActiveCard.style.left = `${touch.clientX - touchOffset.x}px`;
            touchActiveCard.style.top = `${touch.clientY - touchOffset.y}px`;
            touchActiveCard.style.zIndex = "99999";
            touchActiveCard.style.pointerEvents = "none"; 

            // Auto Scroll Triggers
            const sens = 60, speed = 14;
            if (touch.clientX > (window.innerWidth - sens)) window.scrollBy(speed, 0);
            else if (touch.clientX < sens) window.scrollBy(-speed, 0);

            if (touch.clientY > (window.innerHeight - sens)) window.scrollBy(0, speed);
            else if (touch.clientY < sens) window.scrollBy(0, -speed);
        }, { passive: false });

        card.addEventListener("touchend", async (e) => {
            if (!touchActiveCard) return;

            const touch = e.changedTouches[0];
            
            // FIX 3 REMEDY: Force boundary evaluation to find the slot behind the floating preview card
            const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetSlot = dropTarget ? dropTarget.closest(".meal-slot") : null;

            // FIX 1 REMEDY: Reset variables cleanly so it returns to standard layout flows inside its parent wrapper
            touchActiveCard.style.opacity = "1";
            touchActiveCard.style.transform = "none";
            touchActiveCard.style.position = "";
            touchActiveCard.style.left = "";
            touchActiveCard.style.top = "";
            touchActiveCard.style.zIndex = "";
            touchActiveCard.style.pointerEvents = "";

            if (targetSlot) {
                const recipeId = touchActiveCard.dataset.recipeId;
                let recipeTitle = touchActiveCard.querySelector("strong")?.innerText || "Selected Recipe";
                recipeTitle = recipeTitle.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                const newCals = parseFloat(touchActiveCard.dataset.calories) || 0;
                const newProt = parseFloat(touchActiveCard.dataset.protein) || 0;
                const parentColumn = targetSlot.closest(".calendar-day-column");
                const targetDay = parentColumn?.dataset.dayCode;
                const dayName = parentColumn?.dataset.dayName || "this day";
                const mealType = targetSlot.dataset.mealType;
                const csrfToken = getCsrfToken();

                if (recipeId && targetDay && csrfToken) {
                    const isDuplicate = Array.from(parentColumn.querySelectorAll(".recipe-card"))
                        .some(card => card.dataset.recipeId === recipeId && card.closest(".meal-slot") !== touchSourceSlot);

                    if (isDuplicate) {
                        alert(`⚠ "${recipeTitle}" is already scheduled for ${dayName}!`);
                        touchActiveCard = null;
                        touchSourceSlot = null;
                        return;
                    }

                    try {
                        const response = await fetch("/api/calendar/move/", {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                "X-CSRFToken": csrfToken
                            },
                            body: JSON.stringify({ plan_id: recipeId, new_date: targetDay, meal_type: mealType })
                        });
                        const data = await response.json();
                        if (response.ok && data.status === "success") {
                            processSlotAssignment(targetSlot, recipeId, recipeTitle, newCals, newProt, parentColumn, touchSourceSlot);
                        }
                    } catch (error) {
                        if (error.message && error.message.includes("message channel closed")) {
                            processSlotAssignment(targetSlot, recipeId, recipeTitle, newCals, newProt, parentColumn, touchSourceSlot);
                        } else {
                            console.error("Touch placement sync anomaly:", error);
                        }
                    }
                }
            } else {
                // Fallback safety layer: If dropping outside a calendar slot completely, push the card back inside its native source lane
                if (touchSourceSlot && touchSourceSlot.querySelector('.slot-occupied-zone')) {
                    touchSourceSlot.querySelector('.slot-occupied-zone').appendChild(touchActiveCard);
                }
            }

            touchActiveCard = null;
            touchSourceSlot = null;
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
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrfToken
                    },
                    body: JSON.stringify({ 
                        plan_id: null, 
                        new_date: targetDay, 
                        meal_type: mealType 
                    })
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

    // Initialize all existing cards on dashboard layout load
    document.querySelectorAll(".recipe-card").forEach(card => attachDragListeners(card));
    
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-meal-btn")) {
            e.stopPropagation();handleMealRemoval(e.target);
        }
    });

    // RESTORED: Click event configuration listener to update metrics view on desktop columns selection
    dayColumns.forEach(column => {
        column.addEventListener("click", () => {
            calculateAndRenderDayMacros(column);
        });
    });

    // Desktop Drag Drop Listeners
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
            const recipeTitle = e.dataTransfer.getData("text/title");
            const newCals = parseFloat(e.dataTransfer.getData("text/calories")) || 0;
            const newProt = parseFloat(e.dataTransfer.getData("text/protein")) || 0;
            
            const parentColumn = slot.closest(".calendar-day-column");
            const targetDay = parentColumn?.dataset.dayCode;
            const dayName = parentColumn?.dataset.dayName || "this day";
            const mealType = slot.dataset.mealType;
            const csrfToken = getCsrfToken();
            const sourceSlot = document.querySelector("[data-dragging-source]");
            
            if (recipeId && targetDay && csrfToken) {
                const isDuplicate = Array.from(parentColumn.querySelectorAll(".recipe-card"))
                .some(card => card.dataset.recipeId === recipeId && card.closest(".meal-slot") !== sourceSlot);
                
                if (isDuplicate) {
                    alert(`⚠ "${recipeTitle}" is already scheduled for ${dayName}!`);
                    return;
                }
                
                try {
                    const response = await fetch("/api/calendar/move/", {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": csrfToken
                        },
                        body: JSON.stringify({ plan_id: recipeId, new_date: targetDay, meal_type: mealType })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok && data.status === "success") {
                        processSlotAssignment(slot, recipeId, recipeTitle, newCals, newProt, parentColumn, sourceSlot);
                    }
                } catch (error) {
                    if (error.message && error.message.includes("message channel closed")) {
                        processSlotAssignment(slot, recipeId, recipeTitle, newCals, newProt, parentColumn, sourceSlot);
                    } else {
                        console.error("Drop placement sync anomaly:", error);
                    }
                }
            }
        });
    });

    //=========================================================================
    // ASYNCHRONOUS DIALOG INTERACTION HANDLERS (OPTIMIZER MODAL)
    // =========================================================================
    const modal = document.getElementById("optimization-modal");
    const openBtn = document.getElementById("run-optimizer-btn");
    const closeBtn = document.getElementById("close-modal-btn");
    
    if (openBtn && modal) {
        openBtn.addEventListener("click", (e) => {
            e.preventDefault();
            modal.showModal();
        });
    }
    
    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            modal.close();
        });
    }
    
    if (modal) {modal.addEventListener("click", (e) => {
        const dialogDimensions = modal.getBoundingClientRect();
        if (
            e.clientX < dialogDimensions.left ||
            e.clientX > dialogDimensions.right ||
            e.clientY < dialogDimensions.top ||
            e.clientY > dialogDimensions.bottom
        ) {
            modal.close();
        }
    })
    
    ;}

});

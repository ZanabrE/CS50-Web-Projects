/**
 * Smart Meal Planner - CS50W Capstone Production Engine
 * Synchronized tightly with layout.html DOM architecture
 */

// ==========================================
// 1. GLOBAL SCOPE SYSTEM VARIABLES (DECLARED ONCE)
// ==========================================
let touchActiveCard = null;
let touchSourceSlot = null;
let currentHoveredSlot = null;
let mobileSelectedCard = null;
const touchOffset = { x: 0, y: 0 };

// Secure CSRF extraction looking directly at your layout.html hidden input element
function getCsrfToken() {
    return document.getElementById('csrf-token')?.value || '';
}

// Ensure execution hooks only fire after the HTML tree is safely parsed
document.addEventListener("DOMContentLoaded", () => {
    initDesktopDragAndDrop();
    initMobileTouchEngine();
    initMobileDropdownAccessibility();
    initOptimizerModalMechanics();

    // Setup defensive multi-day selector listeners across column structures
    document.querySelectorAll(".calendar-day-column").forEach(column => {
        column.addEventListener("click", (e) => {
            // Guard: Avoid triggering calculations when clicking internal interactive nodes
            if (e.target.closest(".recipe-card") || e.target.closest(".remove-meal-btn") || e.target.closest("select")) return;

            const dayName = column.dataset.dayName;
            
            // FIX: Defensive guard ensures script does not crash on login/register views
            const label = document.getElementById("active-day-tracker-label");
            if (label) {
                label.innerText = `Selected: ${dayName}`;
            }

            // Recalculate and update the progress bars for THIS day column
            if (typeof calculateAndRenderDayMacros === "function") {
                calculateAndRenderDayMacros(column);
            }
        });
    });
});

// ==========================================
// 1.5 NUTRITIONAL CALCULATION ENGINE (FIXED CALCULATIONS)
// ==========================================
function calculateAndRenderDayMacros(column) {
    if (!column) return;

    let totalCalories = 0;
    let totalProtein = 0;

    // FIX: Use the :not selector to explicitly skip cards currently in mid-drag or mid-gesture transit
    const scheduledCards = column.querySelectorAll(".recipe-card:not(.dragging)");

    scheduledCards.forEach(card => {
        // Parse numerical values safely from data attributes
        totalCalories += parseFloat(card.dataset.calories) || 0;
        totalProtein += parseFloat(card.dataset.protein) || 0;
    });

    // Update the progress bars in the left sidebar safely
    const calProgress = document.getElementById("calories-progress");
    const protProgress = document.getElementById("protein-progress");
    const calText = document.getElementById("calories-text-value");
    const protText = document.getElementById("protein-text-value");

    if (calProgress) calProgress.value = totalCalories;
    if (protProgress) protProgress.value = totalProtein;
    
    // Smooth decimal handling ensuring integers or formatted outputs update cleanly
    if (calText) calText.innerText = `${Math.round(totalCalories)} / 2000 kcal`;
    if (protText) protText.innerText = `${Math.round(totalProtein)} / 150g`;
}

// ==========================================
// 2. DESKTOP NATIVE DRAG & DROP ENGINE (FIXED STATE PERSISTENCE)
// ==========================================
function initDesktopDragAndDrop() {
    document.addEventListener("dragstart", (e) => {
        const card = e.target.closest(".recipe-card");
        if (!card) return;
        
        e.stopPropagation(); 
        card.classList.add("dragging");
        
        // Use standard text format solely for basic cross-browser identifier binding
        e.dataTransfer.setData("text/plain", card.dataset.recipeId);
        e.dataTransfer.effectAllowed = "move";
    });

    document.addEventListener("dragend", (e) => {
        const card = e.target.closest(".recipe-card");
        if (!card) return;
        card.classList.remove("dragging");
        document.querySelectorAll(".meal-slot").forEach(s => s.classList.remove("drag-hover"));
    });

    document.addEventListener("dragover", (e) => {
        const slot = e.target.closest(".meal-slot");
        if (!slot) return;
        e.preventDefault(); 
        slot.classList.add("drag-hover");
    });

    document.addEventListener("dragleave", (e) => {
        const slot = e.target.closest(".meal-slot");
        if (!slot) return;
        slot.classList.remove("drag-hover");
    });

    document.addEventListener("drop", async (e) => {
        const slot = e.target.closest(".meal-slot");
        if (!slot) return;
        e.preventDefault(); 
        slot.classList.remove("drag-hover");

        const draggingCard = document.querySelector(".recipe-card.dragging");
        if (!draggingCard) return;

        const targetColumn = slot.closest(".calendar-day-column");
        const sourceSlot = draggingCard.closest(".meal-slot");
        const recipeId = draggingCard.dataset.recipeId;
        const recipeTitle = draggingCard.querySelector("strong")?.innerText || "Selected Recipe";
        const dayName = targetColumn?.dataset.dayName || "this day";

        // STEP 1: SAFETY GUARD DUPLICATE CHECK
        const isDuplicate = Array.from(targetColumn.querySelectorAll(".recipe-card"))
            .some(c => c.dataset.recipeId === recipeId && c.closest(".meal-slot") !== sourceSlot);

        if (isDuplicate) {
            alert(`⚠ "${recipeTitle}" is already scheduled for ${dayName}!`);
            draggingCard.classList.remove("dragging");
            return; 
        }

        // STEP 2: CACHE VALID DATA ATTRIBUTES DIRECTLY FROM NODE REF
        const cals = draggingCard.dataset.calories || "0";
        const prot = draggingCard.dataset.protein || "0";

        let cardToProcess = draggingCard;
        if (sourceSlot === null) {
            // Dragged from sidebar pool - CLONE IT so original card stays behind!
            cardToProcess = draggingCard.cloneNode(true);
            cardToProcess.classList.remove("dragging");
        }

        // Cache source column mapping info BEFORE modifying DOM structures
        const sourceColumn = sourceSlot ? sourceSlot.closest(".calendar-day-column") : null;

        // FIX: Run UI assignments immediately to eliminate render lags
        if (typeof processUIAssignment === "function") {
            processUIAssignment(slot, cardToProcess, recipeTitle, cals, prot, sourceSlot);
        } else {
            // Manual fallback if section 5 is lower in the file script
            const occupiedZone = slot.querySelector(".slot-occupied-zone");
            if (occupiedZone) occupiedZone.appendChild(cardToProcess);
        }

        // Trigger real-time calculation for BOTH target and old source columns immediately
        if (typeof calculateAndRenderDayMacros === "function") {
            calculateAndRenderDayMacros(targetColumn);
            if (sourceColumn && sourceColumn !== targetColumn) {
                calculateAndRenderDayMacros(sourceColumn);
            }
        }

        // Forward safely to database synchronization pipeline
        await executeCardPlacementPipeline(cardToProcess, slot, sourceSlot, targetColumn);
    });
}

// ==========================================
// 2.5 GLOBAL EVENT DELEGATION: PERMANENT MEAL REMOVAL
// ==========================================
document.addEventListener("click", async (e) => {
    const removeBtn = e.target.closest(".remove-meal-btn");
    if (removeBtn) {
        e.preventDefault();
        e.stopPropagation();
        
        const cardToRemove = removeBtn.closest(".recipe-card");
        const column = cardToRemove.closest(".calendar-day-column");
        const slot = cardToRemove.closest(".meal-slot");

        if (cardToRemove && column && slot) {
            try {
                // MATCHING YOUR URLS.PY: Use /api/calendar/move/
                const response = await fetch("/api/calendar/move/", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCsrfToken()
                    },
                    // Send plan_id as null to trigger Case 1 deletion algorithm in views.py
                    body: JSON.stringify({ 
                        plan_id: null, 
                        new_date: column.dataset.dayCode,
                        meal_type: slot.dataset.mealType
                    })
                });

                if (response.ok) {
                    // FIX: Flush out the container dataset trackers to keep the DOM clean
                    slot.dataset.currentCalories = "0";
                    slot.dataset.currentProtein = "0";

                    // Remove from UI only after database confirms success
                    cardToRemove.remove(); 
                    
                    // Recalculate side panel progress metrics safely
                    if (typeof calculateAndRenderDayMacros === "function") {
                        calculateAndRenderDayMacros(column); 
                    }
                }
            } catch (err) {
                console.error("Database sync anomaly:", err);
            }
        }
    }
});

// ==========================================
// 3. MOBILE & TABLET GESTURE ENGINE (CONFLICT PROTECTED MECHANICS)
// ==========================================
function initMobileTouchEngine() {
    const mainContainer = document.querySelector("main") || document;

    mainContainer.addEventListener("touchstart", (e) => {
        // CONFLICT GUARD: completely ignore if interaction does not use valid Touch events
        if (!e.touches || e.touches.length === 0) return;

        const targetCard = e.target.closest(".recipe-card");
        if (!targetCard) return; 
        if (e.target.closest(".remove-meal-btn") || e.target.tagName === "SELECT") return;

        document.querySelectorAll(".recipe-card").forEach(c => c.style.border = "none");
        mobileSelectedCard = targetCard;
        mobileSelectedCard.style.border = "2px solid #0d6efd";
        
        touchActiveCard = targetCard;
        touchSourceSlot = touchActiveCard.closest(".meal-slot");
        touchActiveCard.style.opacity = "0.6";

        const rect = touchActiveCard.getBoundingClientRect();
        touchOffset.x = e.touches[0].clientX - rect.left;
        touchOffset.y = e.touches[0].clientY - rect.top;
    }, { passive: true });

    mainContainer.addEventListener("touchmove", (e) => {
        // CONFLICT GUARD: block processing if touch metrics are undefined
        if (!touchActiveCard || !e.touches || e.touches.length === 0) return;
        
        e.preventDefault(); 
        const touch = e.touches[0];

        touchActiveCard.style.width = `${touchSourceSlot ? touchSourceSlot.offsetWidth : 160}px`;
        touchActiveCard.style.position = "fixed";
        touchActiveCard.style.left = `${touch.clientX - touchOffset.x}px`;
        touchActiveCard.style.top = `${touch.clientY - touchOffset.y}px`;
        touchActiveCard.style.zIndex = "99999";
        touchActiveCard.style.pointerEvents = "none";

        const currentTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        const activeSlot = currentTarget ? currentTarget.closest(".meal-slot") : null;

        if (currentHoveredSlot && currentHoveredSlot !== activeSlot) {
            currentHoveredSlot.classList.remove("drag-hover");
        }
        if (activeSlot) {
            activeSlot.classList.add("drag-hover");
            currentHoveredSlot = activeSlot;
        }
    }, { passive: false });

    mainContainer.addEventListener("touchend", async (e) => {
        // CONFLICT GUARD: block execution if no mobile touch data exists
        if (!touchActiveCard) return;
        if (!e.changedTouches || e.changedTouches.length === 0) {
            touchActiveCard = null;
            return;
        }
        
        if (currentHoveredSlot) {
            currentHoveredSlot.classList.remove("drag-hover");
        }

        const touch = e.changedTouches[0];
        const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetSlot = dropTarget ? dropTarget.closest(".meal-slot") : null;

        // Isolate attributes safely from active tracking card before any manipulation
        const recipeId = touchActiveCard.dataset.recipeId;
        const calories = touchActiveCard.dataset.calories || "0";
        const protein = touchActiveCard.dataset.protein || "0";
        const recipeTitle = touchActiveCard.querySelector("strong")?.innerText || "Selected Recipe";

        // Reset visual transformation layout tracking properties
        touchActiveCard.style.opacity = "1";
        touchActiveCard.style.transform = "none";
        touchActiveCard.style.position = "static"; 
        touchActiveCard.style.left = "";
        touchActiveCard.style.top = "";
        touchActiveCard.style.width = "100%"; 
        touchActiveCard.style.zIndex = "";
        touchActiveCard.style.pointerEvents = "";

        const targetColumn = targetSlot ? targetSlot.closest(".calendar-day-column") : null;

        if (!targetSlot || !targetColumn) {
            revertCardToOrigin(touchActiveCard, touchSourceSlot);
            touchActiveCard = null;
            touchSourceSlot = null;
            return;
        }

        // FIX: Mobile Safety Guard Duplicate Interception Check
        const isDuplicate = Array.from(targetColumn.querySelectorAll(".recipe-card"))
            .some(c => c.dataset.recipeId === recipeId && c.closest(".meal-slot") !== touchSourceSlot);

        if (isDuplicate) {
            alert(`⚠ "${recipeTitle}" is already scheduled for ${targetColumn.dataset.dayName || 'this day'}!`);
            revertCardToOrigin(touchActiveCard, touchSourceSlot);
            touchActiveCard = null;
            touchSourceSlot = null;
            return;
        }

        let cardToProcess = touchActiveCard;
        if (touchSourceSlot === null) {
            cardToProcess = touchActiveCard.cloneNode(true);
        }

        // Force assign metadata metrics tightly onto the instance node reference 
        cardToProcess.dataset.recipeId = recipeId;
        cardToProcess.dataset.calories = calories;
        cardToProcess.dataset.protein = protein;

        // Run UI layout assignment block instantly to fit into the calendar day
        if (typeof processUIAssignment === "function") {
            processUIAssignment(targetSlot, cardToProcess, recipeTitle, calories, protein, touchSourceSlot);
        }

        // Forward to backend pipeline data sync handler
        await executeCardPlacementPipeline(cardToProcess, targetSlot, touchSourceSlot, targetColumn);

        // Terminate tracking states cleanly
        touchActiveCard = null;
        touchSourceSlot = null;
        currentHoveredSlot = null;
    });
}

// ==========================================
// 4. MOBILE ACCESSIBILITY SELECTION ENGINE (FIXED SYNC & MACROS)
// ==========================================
function initMobileDropdownAccessibility() {
    document.addEventListener("change", async (e) => {
        if (!e.target.classList.contains("mobile-slot-selector")) return;
        const selector = e.target;
        if (!selector.value) return;

        const [targetDayCode, targetMealType] = selector.value.split("|");
        
        // Scan for target slot structure on the page matrix template
        const realSlot = Array.from(document.querySelectorAll(".meal-slot")).find(
            slot => slot.dataset.mealType === targetMealType && 
            slot.closest(".calendar-day-column")?.dataset.dayCode === targetDayCode
        );

        if (realSlot) {
            const recipeCard = selector.closest(".recipe-card");
            if (!recipeCard) return;

            const sourceSlot = recipeCard.closest(".meal-slot");
            const targetColumn = realSlot.closest(".calendar-day-column");
            const recipeId = recipeCard.dataset.recipeId;
            const recipeTitle = recipeCard.querySelector("strong")?.innerText || "Recipe";
            const cals = recipeCard.dataset.calories || "0";
            const prot = recipeCard.dataset.protein || "0";

            // STEP 1: DROPDOWN SAFETY DUPLICATE CHECK
            const isDuplicate = Array.from(targetColumn.querySelectorAll(".recipe-card"))
                .some(c => c.dataset.recipeId === recipeId && c.closest(".meal-slot") !== sourceSlot);

            if (isDuplicate) {
                alert(`⚠ "${recipeTitle}" is already scheduled for ${targetColumn.dataset.dayName || 'this day'}!`);
                selector.value = ""; // Reset dropdown window selector index safely
                return; // Halt immediately before modifying database status models
            }

            // STEP 2: DETERMINISTIC CLONING STRATEGY FOR DROPDOWN ACCESSIBILITY
            let cardToProcess = recipeCard;
            if (sourceSlot === null) {
                // Pulled from sidebar - CLONE IT so the original recipe stays behind in the pool!
                cardToProcess = recipeCard.cloneNode(true);
            }

            // Bind tracking parameters explicitly to the new element reference copy instance
            cardToProcess.dataset.recipeId = recipeId;
            cardToProcess.dataset.calories = cals;
            cardToProcess.dataset.protein = prot;

            // Cache source column mapping metrics before altering DOM layout trees
            const sourceColumn = sourceSlot ? sourceSlot.closest(".calendar-day-column") : null;

            // STEP 3: EXECUTE COMPACT BADGE RENDER AND MACRO RUNS IMMEDIATELY
            if (typeof processUIAssignment === "function") {
                processUIAssignment(realSlot, cardToProcess, recipeTitle, cals, prot, sourceSlot);
            }

            if (typeof calculateAndRenderDayMacros === "function") {
                calculateAndRenderDayMacros(targetColumn);
                if (sourceColumn && sourceColumn !== targetColumn) {
                    calculateAndRenderDayMacros(sourceColumn);
                }
            }

            // Reset selector dropdown option box window value state safely
            selector.value = ""; 

            // Forward safely to the database sync data pipeline handler endpoint
            await executeCardPlacementPipeline(cardToProcess, realSlot, sourceSlot, targetColumn);
        }
    });
}

// ==========================================
// 5. UNIFIED DATA PIPELINE & DATABASE SYNC (CONSOLIDATED RENDERING)
// ==========================================
async function executeCardPlacementPipeline(card, targetSlot, sourceSlot, targetColumn) {
    if (!card) return;

    // Safety: If no valid slot was found (dropped in dead space), send it back or remove it
    if (!targetSlot) {
        revertCardToOrigin(card, sourceSlot);
        return;
    }

    const recipeId = card.dataset.recipeId;
    let recipeTitle = card.querySelector("strong")?.innerText || "Selected Recipe";
    
    const newCals = parseFloat(card.dataset.calories) || 0;
    const newProt = parseFloat(card.dataset.protein) || 0;
    
    const targetDay = targetColumn?.dataset.dayCode;
    const dayName = targetColumn?.dataset.dayName || "this day";
    const mealType = targetSlot.dataset.mealType;
    const csrfToken = getCsrfToken();

    if (recipeId && targetDay && csrfToken) {
        // Enforce scheduling uniqueness (skip checking against the active element instance self)
        const isDuplicate = Array.from(targetColumn.querySelectorAll(".recipe-card"))
            .some(c => c.dataset.recipeId === recipeId && c !== card);

        if (isDuplicate) {
            alert(`⚠ "${recipeTitle}" is already scheduled for ${dayName}!`);
            revertCardToOrigin(card, sourceSlot);
            return;
        }

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

            // FIX: If the layout was already placed by our engine upfront, we don't repeat processUIAssignment.
            // We simply verify success or handle a backend rejection fallback.
            if (response.ok && data.status === "success") {
                const sourceColumn = sourceSlot ? sourceSlot.closest(".calendar-day-column") : null;
                
                // Recalculate tracking bars safely
                if (typeof calculateAndRenderDayMacros === "function") {
                    calculateAndRenderDayMacros(targetColumn);
                    if (sourceColumn && sourceColumn !== targetColumn) {
                        calculateAndRenderDayMacros(sourceColumn);
                    }
                }
            } else {
                revertCardToOrigin(card, sourceSlot);
                if (targetColumn && typeof calculateAndRenderDayMacros === "function") {
                    calculateAndRenderDayMacros(targetColumn);
                }
            }
        } catch (error) {
            if (error.message && error.message.includes("message channel closed")) {
                // Recover status if third-party extensions close background messaging channels
                if (typeof calculateAndRenderDayMacros === "function") calculateAndRenderDayMacros(targetColumn);
            } else {
                console.error("Database sync anomaly:", error);
                revertCardToOrigin(card, sourceSlot);
                if (targetColumn && typeof calculateAndRenderDayMacros === "function") {
                    calculateAndRenderDayMacros(targetColumn);
                }
            }
        }
    } else {
        revertCardToOrigin(card, sourceSlot);
    }
}

function revertCardToOrigin(card, sourceSlot) {
    if (!card) return;
    
    // FIX: If it came from the sidebar pool (sourceSlot is null), remove the broken clone completely
    if (!sourceSlot) {
        card.remove();
        return;
    }
    
    const occupiedZone = sourceSlot.querySelector(".slot-occupied-zone");
    if (occupiedZone && !occupiedZone.contains(card)) {
        occupiedZone.appendChild(card);
    }
}

function processUIAssignment(targetSlot, cardElement, recipeTitle, cals, prot, sourceSlot) {
    if (sourceSlot) {
        sourceSlot.dataset.currentCalories = "0";
        sourceSlot.dataset.currentProtein = "0";
        const oldZone = sourceSlot.querySelector(".slot-occupied-zone");
        if (oldZone) oldZone.innerHTML = "";
    }

    // Capture and protect data parameters before we clear out innerHTML fields
    const recipeId = cardElement.dataset.recipeId;

    targetSlot.dataset.currentCalories = cals;
    targetSlot.dataset.currentProtein = prot;
    const targetZone = targetSlot.querySelector(".slot-occupied-zone");

    if (targetZone && cardElement) {
        // Clear out bulky sidebar layout code structure trees
        cardElement.innerHTML = `
            <strong class="text-white" style="pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%; display: block; font-size: 0.7rem;">${recipeTitle}</strong>
            <button type="button" class="btn-close btn-close-white remove-meal-btn" aria-label="Remove" style="font-size: 0.5rem; padding: 0.1rem; cursor: pointer; flex-shrink: 0;"></button>
        `;

        // FIX: Re-bind dataset tracking properties firmly back onto the mutated object instance
        cardElement.dataset.recipeId = recipeId;
        cardElement.dataset.calories = cals;
        cardElement.dataset.protein = prot;
        cardElement.setAttribute("draggable", "true");

        // Strip previous sidebar formatting classes completely
        cardElement.removeAttribute("style");
        cardElement.className = "recipe-card badge bg-primary w-100 py-1 text-wrap d-flex justify-content-between align-items-center";
        
        cardElement.style.display = "flex";
        cardElement.style.width = "100%";
        cardElement.style.boxSizing = "border-box";
        cardElement.style.cursor = "grab";

        targetZone.appendChild(cardElement);
    }
}

// ==========================================
// 6. ASYNCHRONOUS DIALOG INTERACTION HANDLERS (OPTIMIZER MODAL)
// ==========================================
function initOptimizerModalMechanics() {
    const optimizerBtn = document.getElementById('run-optimizer-btn');
    const modal = document.getElementById('optimization-modal');
    const closeBtn = document.getElementById('close-modal-btn');

    if (!modal) return;

    if (optimizerBtn) {
        optimizerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Stops mobile engines from blocking this event
            modal.showModal(); 
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Forces immediate closing execution isolation
            modal.close(); 
        });
    }

    // UX MOBILE ENHANCEMENT: Clean backdrop interaction closure click pattern
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            e.stopPropagation();
            modal.close();
        }
    });
}

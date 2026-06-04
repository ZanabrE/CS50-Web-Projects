/**
 * Smart Meal Planner - CS50W Capstone Production Engine
 * Synchronized tightly with base.html DOM architecture
 */

// ==========================================
// 1. GLOBAL SCOPE SYSTEM VARIABLES (DECLARED ONCE)
// ==========================================
let touchActiveCard = null;
let touchSourceSlot = null;
let currentHoveredSlot = null;
let mobileSelectedCard = null;
const touchOffset = { x: 0, y: 0 };

// Secure CSRF extraction looking directly at your base.html hidden input element
function getCsrfToken() {
    return document.getElementById('csrf-token')?.value || '';
}

// Ensure execution hooks only fire after the HTML tree is safely parsed
document.addEventListener("DOMContentLoaded", () => {
    initDesktopDragAndDrop();
    initMobileTouchEngine();
    initMobileDropdownAccessibility();
    initOptimizerModalMechanics();

    document.querySelectorAll(".calendar-day-column").forEach(column => {
        column.addEventListener("click", (e) => {
            // Avoid triggering when clicking internal cards
            if (e.target.closest(".recipe-card")) return;

            const dayName = column.dataset.dayName;
            document.getElementById("active-day-tracker-label").innerText = `Selected: ${dayName}`;

            // Recalculate and update the progress bars for THIS day
            if (typeof calculateAndRenderDayMacros === "function") {
                calculateAndRenderDayMacros(column);
            }
        });
    });
});

// ==========================================
// 1.5 NUTRITIONAL CALCULATION ENGINE
// ==========================================
function calculateAndRenderDayMacros(column) {
    if (!column) return;

    let totalCalories = 0;
    let totalProtein = 0;

    // Find all recipe cards currently scheduled in this day's slots
    const scheduledCards = column.querySelectorAll(".recipe-card");

    scheduledCards.forEach(card => {
        // Parse numerical values from data attributes
        totalCalories += parseFloat(card.dataset.calories) || 0;
        totalProtein += parseFloat(card.dataset.protein) || 0;
    });

    // Update the progress bars in the left sidebar
    const calProgress = document.getElementById("calories-progress");
    const protProgress = document.getElementById("protein-progress");
    const calText = document.getElementById("calories-text-value");
    const protText = document.getElementById("protein-text-value");

    if (calProgress) calProgress.value = totalCalories;
    if (protProgress) protProgress.value = totalProtein;
    if (calText) calText.innerText = `${Math.round(totalCalories)} / 2000 kcal`;
    if (protText) protText.innerText = `${Math.round(totalProtein)} / 150g`;
}

// ==========================================
// 2. DESKTOP NATIVE DRAG & DROP ENGINE (FIXED UI RESETS)
// ==========================================
function initDesktopDragAndDrop() {
    document.addEventListener("dragstart", (e) => {
        const card = e.target.closest(".recipe-card");
        if (!card) return;
        e.stopPropagation();
        card.classList.add("dragging");
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
        e.preventDefault(); // MANDATORY: Allows the drop to occur
        slot.classList.add("drag-hover");
    });

    document.addEventListener("drop", async (e) => {
        const slot = e.target.closest(".meal-slot");
        if (!slot) return;
        e.preventDefault();
        slot.classList.remove("drag-hover");

        const draggingCard = document.querySelector(".recipe-card.dragging");
        if (!draggingCard) return;

        // FIX: PERMANENT OVERSIZE SOLUTION
        // Completely strip sidebar styles and force calendar badge styling
        draggingCard.style.all = "unset"; 
        draggingCard.style.display = "flex"; 
        draggingCard.style.width = "100%";
        draggingCard.classList.remove("p-2", "mb-2", "border", "bg-light"); 
        draggingCard.classList.add("badge", "bg-primary", "w-100", "py-1");

        const occupiedZone = slot.querySelector(".slot-occupied-zone");
        if (occupiedZone) {
            occupiedZone.appendChild(draggingCard);
        }

        // Trigger database sync
        await executeCardPlacementPipeline(draggingCard, slot);
        
        // Trigger real-time calculation for the day
        const column = slot.closest(".calendar-day-column");
        calculateAndRenderDayMacros(column);
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
                // TELL DJANGO TO DELETE PERMANENTLY
                const response = await fetch("/api/calendar/delete/", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCsrfToken()
                    },
                    body: JSON.stringify({ 
                        recipe_id: cardToRemove.dataset.recipeId,
                        date_code: column.dataset.dayCode,
                        meal_type: slot.dataset.mealType
                    })
                });

                if (response.ok) {
                    cardToRemove.remove(); // Only remove from UI if DB success
                    calculateAndRenderDayMacros(column); // Recalculate totals
                }
            } catch (err) {
                console.error("Critical Deletion Error:", err);
            }
        }
    }
});

// ==========================================
// 3. MOBILE & TABLET GESTURE ENGINE (FIXED VIEWPANEL INTERSECTIONS)
// ==========================================
function initMobileTouchEngine() {
    // FIX: Listen to touches only on the main container where cards live, not the global window body
    const mainContainer = document.querySelector("main") || document;

    mainContainer.addEventListener("touchstart", (e) => {
        const targetCard = e.target.closest(".recipe-card");
        if (!targetCard) return; // Ignores empty page clicks completely

        // Ignore interactive child nodes like dropdown selects or delete triggers
        if (e.target.closest(".remove-meal-btn") || e.target.tagName === "SELECT") return;

        // Visual selection indicator treatment
        document.querySelectorAll(".recipe-card").forEach(c => c.style.border = "none");
        mobileSelectedCard = targetCard;
        mobileSelectedCard.style.border = "2px solid #0d6efd";
        
        touchActiveCard = targetCard;
        touchSourceSlot = touchActiveCard.closest(".meal-slot");
        touchActiveCard.style.opacity = "0.6";

        // Map precise initial bounding metrics
        const rect = touchActiveCard.getBoundingClientRect();
        touchOffset.x = e.touches[0].clientX - rect.left;
        touchOffset.y = e.touches[0].clientY - rect.top;
    }, { passive: true });

    mainContainer.addEventListener("touchmove", (e) => {
        if (!touchActiveCard) return;

        // MANDATORY: Block native scrolling so your card moves instead of the page.
        // This ONLY works if the listener was registered with { passive: false }.
        e.preventDefault(); 

        // Target the first active finger point
        const touch = e.touches; 

        // Visual Constraint: Prevent the card from expanding on mobile grids
        touchActiveCard.style.width = "170px"; 

        // Independent Viewport Positioning
        touchActiveCard.style.position = "fixed";
        touchActiveCard.style.left = `${touch.clientX - touchOffset.x}px`;
        touchActiveCard.style.top = `${touch.clientY - touchOffset.y}px`;
        touchActiveCard.style.zIndex = "99999";
        
        // CRITICAL: Set pointerEvents to none so document.elementFromPoint can 
        // "see through" the card to find the .meal-slot underneath.
        touchActiveCard.style.pointerEvents = "none"; 

        // Target Detection Matrix
        const currentTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        const activeSlot = currentTarget ? currentTarget.closest(".meal-slot") : null;

        if (currentHoveredSlot && currentHoveredSlot !== activeSlot) {
            currentHoveredSlot.classList.remove("drag-hover");
        }

        if (activeSlot) {
            activeSlot.classList.add("drag-hover");
            currentHoveredSlot = activeSlot;
        }

        // Performance-Optimized Auto-Scrolling
        const scrollThreshold = 80;
        const scrollSpeed = 12;
        if (touch.clientY > (window.innerHeight - scrollThreshold)) {
            window.scroll(0, window.scrollY + scrollSpeed);
        } else if (touch.clientY < scrollThreshold) {
            window.scroll(0, window.scrollY - scrollSpeed);
        }
    }, { passive: false });

    mainContainer.addEventListener("touchend", async (e) => {
        if (!touchActiveCard) return;

        if (currentHoveredSlot) {
            currentHoveredSlot.classList.remove("drag-hover");
        }

        const touch = e.changedTouches[0];
        const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetSlot = dropTarget ? dropTarget.closest(".meal-slot") : null;

        // Immediately return styles back to CSS stylesheets rules
        touchActiveCard.style.opacity = "1";
        touchActiveCard.style.transform = "none";
        touchActiveCard.style.position = "";
        touchActiveCard.style.left = "";
        touchActiveCard.style.top = "";
        touchActiveCard.style.width = "";
        touchActiveCard.style.zIndex = "";
        touchActiveCard.style.pointerEvents = ""; 

        const targetColumn = targetSlot ? targetSlot.closest(".calendar-day-column") : null;
        
        await executeCardPlacementPipeline(touchActiveCard, targetSlot, touchSourceSlot, targetColumn);

        // Terminate tracking states
        touchActiveCard = null;
        touchSourceSlot = null;
        currentHoveredSlot = null;
    });
}

// ==========================================
// 4. MOBILE ACCESSIBILITY SELECTION ENGINE
// ==========================================
function initMobileDropdownAccessibility() {
    document.addEventListener("change", async (e) => {
        if (!e.target.classList.contains("mobile-slot-selector")) return;

        const selector = e.target;
        if (!selector.value) return;

        const [targetDayCode, targetMealType] = selector.value.split("|");
        
        // Scan for target slot structure on the page
        const realSlot = Array.from(document.querySelectorAll(".meal-slot")).find(
            slot => slot.dataset.mealType === targetMealType && 
            slot.closest(".calendar-day-column")?.dataset.dayCode === targetDayCode
        );

        if (realSlot) {
            const recipeCard = selector.closest(".recipe-card");
            const sourceSlot = recipeCard ? recipeCard.closest(".meal-slot") : null;
            const targetColumn = realSlot.closest(".calendar-day-column");

            await executeCardPlacementPipeline(recipeCard, realSlot, sourceSlot, targetColumn);
            selector.value = ""; // Clear option window state safely
        }
    });
}

// ==========================================
// 5. UNIFIED DATA PIPELINE & DATABASE SYNC
// ==========================================
async function executeCardPlacementPipeline(card, targetSlot, sourceSlot, targetColumn) {
    if (!card) return;

    // Safety: If no valid slot was found (dropped in dead space), send it back
    if (!targetSlot) {
        revertCardToOrigin(card, sourceSlot);
        return;
    }

    const recipeId = card.dataset.recipeId;
    let recipeTitle = card.querySelector("strong")?.innerText || "Selected Recipe";
    
    // Extract nutritional data for live tracker updates
    const newCals = parseFloat(card.dataset.calories) || 0;
    const newProt = parseFloat(card.dataset.protein) || 0;
    
    const targetDay = targetColumn?.dataset.dayCode;
    const dayName = targetColumn?.dataset.dayName || "this day";
    const mealType = targetSlot.dataset.mealType;
    const csrfToken = getCsrfToken();

    if (recipeId && targetDay && csrfToken) {
        // Enforce scheduling uniqueness (Don't allow same recipe twice on the same day)
        const isDuplicate = Array.from(targetColumn.querySelectorAll(".recipe-card"))
            .some(c => c.dataset.recipeId === recipeId && c.closest(".meal-slot") !== sourceSlot);

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

            if (response.ok && data.status === "success") {
                const sourceColumn = sourceSlot ? sourceSlot.closest(".calendar-day-column") : null;
                
                // Success: Transform the card into a clean badge and place it
                processUIAssignment(targetSlot, recipeId, recipeTitle, newCals, newProt, sourceSlot);

                // FORCE UPDATE: Update Progress Bars on the left sidebar immediately
                if (typeof calculateAndRenderDayMacros === "function") {
                    calculateAndRenderDayMacros(targetColumn);
                    if (sourceColumn && sourceColumn !== targetColumn) {
                        calculateAndRenderDayMacros(sourceColumn);
                    }
                }
            } else {
                revertCardToOrigin(card, sourceSlot);
            }
        } catch (error) {
            // Handle browser-specific "channel closed" edge cases gracefully
            if (error.message && error.message.includes("message channel closed")) {
                processUIAssignment(targetSlot, recipeId, recipeTitle, newCals, newProt, sourceSlot);
                if (typeof calculateAndRenderDayMacros === "function") calculateAndRenderDayMacros(targetColumn);
            } else {
                console.error("Database sync anomaly:", error);
                revertCardToOrigin(card, sourceSlot);
            }
        }
    } else {
        revertCardToOrigin(card, sourceSlot);
    }
}

function revertCardToOrigin(card, sourceSlot) {
    if (!sourceSlot || !card) return;
    const occupiedZone = sourceSlot.querySelector(".slot-occupied-zone");
    if (occupiedZone && !occupiedZone.contains(card)) {
        occupiedZone.appendChild(card);
    }
}

function processUIAssignment(targetSlot, recipeId, recipeTitle, cals, prot, sourceSlot) {
    // 1. Clear source slot if moving an existing meal
    if (sourceSlot) {
        sourceSlot.dataset.currentCalories = "0";
        sourceSlot.dataset.currentProtein = "0";
        const oldZone = sourceSlot.querySelector(".slot-occupied-zone");
        if (oldZone) oldZone.innerHTML = "";
    }

    // 2. Map data to the new slot
    targetSlot.dataset.currentCalories = cals;
    targetSlot.dataset.currentProtein = prot;
    const targetZone = targetSlot.querySelector(".slot-occupied-zone");

    if (targetZone) {
        // Find the element being moved (using ID and dragging class state)
        const draggingCard = document.querySelector(`[data-recipe-id="${recipeId}"].dragging`) || 
                             document.querySelector(`[data-recipe-id="${recipeId}"]`);

        if (draggingCard) {
            // FIX: COMPLETELY RE-RENDER INTERNAL HTML
            // This strips out "Ingredients" and "Instructions" so the card isn't giant.
            draggingCard.innerHTML = `
                <strong class="text-white" style="pointer-events: none;">${recipeTitle}</strong>
                <button type="button" class="btn-close btn-close-white remove-meal-btn" 
                        aria-label="Remove" style="font-size: 0.5rem; padding: 0.2rem; cursor: pointer;"></button>
            `;
            
            // Apply standard badge styling and remove sidebar classes
            draggingCard.className = "recipe-card badge bg-primary w-100 py-1 text-wrap d-flex justify-content-between align-items-center";
            
            // Reset sizing overrides
            draggingCard.style.all = "unset"; 
            draggingCard.style.display = "flex";
            draggingCard.style.width = "100%";
            draggingCard.style.height = "auto";
            draggingCard.style.position = "static";
            draggingCard.style.cursor = "grab";

            targetZone.appendChild(draggingCard);
        }
    }
}

// ==========================================
// 6. ASYNCHRONOUS DIALOG INTERACTION HANDLERS (OPTIMIZER MODAL)
// ==========================================
function initOptimizerModalMechanics() {
    const optimizerBtn = document.getElementById('run-optimizer-btn');
    const modal = document.getElementById('optimization-modal');
    const closeBtn = document.getElementById('close-modal-btn');

    // Ensure all critical elements exist before attaching listeners
    if (!modal) return;

    if (optimizerBtn) {
        optimizerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.showModal(); // Use showModal for native backdrop support
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.close(); // Use native .close() method
        });
    }

    // IMPROVED UX: One single listener for the backdrop click
    modal.addEventListener('click', (e) => {
        // Only close if the click target is exactly the <dialog> itself
        // (meaning they clicked the backdrop, not a button inside)
        if (e.target === modal) {
            modal.close();
        }
    });
}

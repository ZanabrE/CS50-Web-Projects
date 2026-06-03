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
});


// ==========================================
// 2. DESKTOP NATIVE DRAG & DROP ENGINE
// ==========================================
function initDesktopDragAndDrop() {
    // Global delegation ensures dynamically rendered block elements retain handlers
    document.addEventListener("dragstart", (e) => {
        const card = e.target.closest(".recipe-card");
        if (!card) return;
        
        card.classList.add("dragging");
        e.dataTransfer.setData("text/plain", card.dataset.recipeId);
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
        e.preventDefault(); // Unlocks drop payload reception permissions
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

        const sourceSlot = draggingCard.closest(".meal-slot");
        const targetColumn = slot.closest(".calendar-day-column");
        
        await executeCardPlacementPipeline(draggingCard, slot, sourceSlot, targetColumn);
    });
}


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
// 5. UNIFIED DATA PIPELINE & DATABASE DATABASE SYNC
// ==========================================
async function executeCardPlacementPipeline(card, targetSlot, sourceSlot, targetColumn) {
    if (!card) return;

    if (!targetSlot) {
        revertCardToOrigin(card, sourceSlot);
        return;
    }

    const recipeId = card.dataset.recipeId;
    let recipeTitle = card.querySelector("strong")?.innerText || "Selected Recipe";
    recipeTitle = recipeTitle.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); // Sanitize string bounds
    
    const newCals = parseFloat(card.dataset.calories) || 0;
    const newProt = parseFloat(card.dataset.protein) || 0;
    
    const targetDay = targetColumn?.dataset.dayCode;
    const dayName = targetColumn?.dataset.dayName || "this day";
    const mealType = targetSlot.dataset.mealType;
    const csrfToken = getCsrfToken();

    if (recipeId && targetDay && csrfToken) {
        // Enforce scheduling uniqueness limits
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
                body: JSON.stringify({ plan_id: recipeId, new_date: targetDay, meal_type: mealType })
            });
            
            const data = await response.json();
            
            if (response.ok && data.status === "success") {
                const sourceColumn = sourceSlot ? sourceSlot.closest(".calendar-day-column") : null;
                processUIAssignment(targetSlot, recipeId, newCals, newProt, sourceSlot);

                // Keep daily column budgets accurately updated on layout alterations
                if (typeof calculateAndRenderDayMacros === "function"){
                    calculateAndRenderDayMacros(targetColumn);
                    if (sourceColumn && sourceColumn !== targetColumn) {
                        calculateAndRenderDayMacros(sourceColumn);
                    }
                }
            } else {
                revertCardToOrigin(card, sourceSlot);
            }
        } catch (error) {
            if (error.message && error.message.includes("message channel closed")) {
                processUIAssignment(targetSlot, recipeId, newCals, newProt, sourceSlot);
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

function processUIAssignment(targetSlot, recipeId, cals, prot, sourceSlot) {
    if (sourceSlot) {
        sourceSlot.dataset.currentCalories = "0";
        sourceSlot.dataset.currentProtein = "0";

        const oldZone = sourceSlot.querySelector(".slot-occupied-zone");

        if (oldZone) oldZone.innerHTML = "";
    }

    targetSlot.dataset.currentCalories = cals;
    targetSlot.dataset.currentProtein = prot;

    const targetZone = targetSlot.querySelector(".slot-occupied-zone");

    if (targetZone) {
        const draggingCard = document.querySelector(`[data-recipe-id="${recipeId}"]`) || mobileSelectedCard;

        if (draggingCard) {
            targetZone.appendChild(draggingCard);
        }
    }
}

// ==========================================
// 6. ASYNCHRONOUS DIALOG INTERACTION HANDLERS (OPTIMIZER MODAL)
// ==========================================
function initOptimizerModalMechanics() {
    const modal = document.getElementById("optimization-modal");
    const openBtn = document.getElementById("run-optimizer-btn"); // Targets the navbar link directly
    const closeBtn = modal.querySelector(".close-modal-btn");

    if (openBtn && modal) {
        openBtn.addEventListener("click", (e) => {
            e.preventDefault();
            modal.showModal();
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            const dialogDimentions = modal.getBoundingClientRect();

            if (e.clientX < dialogDimentions.left || e.clientX > dialogDimentions.right || e.clientY < dialogDimentions.top || e.clientY > dialogDimentions.bottom) {
                modal.close();
            }
        });
    }
}

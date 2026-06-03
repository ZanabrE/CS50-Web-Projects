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

    // ==========================================
    // 1. DESKTOP DRAG & DROP API ENGINE
    // ==========================================
    function initializeDesktopDragAndDrop() {
        // Event delegation on the document for desktop drag events
        document.addEventListener("dragstart", (e) => {
            const card = e.target.closest(".recipe-card");
            if (!card) return;
                
                card.classList.add("dragging");
                e.dataTransfer.setData("text/plain", card.dataset.recipeId);
                // Track the starting location slot context
                const sourceSlot = card.closest(".meal-slot");
                if (sourceSlot) sourceSlot.classList.add("source-slot-active");
            });
            
            document.addEventListener("dragend", (e) => {
                const card = e.target.closest(".recipe-card");
                if (!card) return;
                card.classList.remove("dragging");
                
                document.querySelectorAll(".meal-slot").forEach(slot => {
                    slot.classList.remove("drag-hover", "source-slot-active");
                });
            });

            document.addEventListener("dragover", (e) => {
                const slot = e.target.closest(".meal-slot");
                if (!slot) return;
                e.preventDefault(); // Required to allow dropping
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
                const parentColumn = slot.closest(".calendar-day-column");
                
                await handleCardPlacement(draggingCard, slot, sourceSlot, parentColumn);
            });
        }
        
        // ==========================================
        // 2. MOBILE & TABLET TOUCH GESTURE ENGINE
        // ==========================================
        function initializeMobileTouchEngine() {
            // Document Level Delegation for Touch Events prevents listener decoupling on DOM changes
            document.addEventListener("touchstart", (e) => {
                const targetCard = e.target.closest(".recipe-card");
                if (!targetCard) return;

                // Visual selection indicator treatment
                document.querySelectorAll(".recipe-card").forEach(c => c.style.border = "none");
                mobileSelectedCard = targetCard;
                mobileSelectedCard.style.border = "2px solid #0d6efd";
                
                touchActiveCard = targetCard;
                touchSourceSlot = touchActiveCard.closest(".meal-slot");
                touchActiveCard.style.opacity = "0.6";

                // Calculate specific internal contact coordinates to prevent visual jumping
                const rect = touchActiveCard.getBoundingClientRect();
                touchOffset.x = e.touches[0].clientX - rect.left;
                touchOffset.y = e.touches[0].clientY - rect.top;
            }, { passive: true });

            document.addEventListener("touchmove", (e) => {
                if (!touchActiveCard) return;
                
                // Block mobile browser rubber-banding/scrolling sequences while dragging
                e.preventDefault(); 
                const touch = e.touches[0];

                // Lock down structural dimensions dynamically so container doesn't break
                const currentRect = touchActiveCard.getBoundingClientRect();
                if (!touchActiveCard.style.width) {
                    touchActiveCard.style.width = `${currentRect.width}px`;
                }

                // Apply direct transformations on viewport tracking layers
                touchActiveCard.style.position = "fixed";
                touchActiveCard.style.left = `${touch.clientX - touchOffset.x}px`;
                touchActiveCard.style.top = `${touch.clientY - touchOffset.y}px`;
                touchActiveCard.style.zIndex = "99999";
                touchActiveCard.style.pointerEvents = "none"; // Peers cleanly through card element to find DOM under

                // Pointer targeting layout discovery matrix
                const currentTarget = document.elementFromPoint(touch.clientX, touch.clientY);
                const activeSlot = currentTarget ? currentTarget.closest(".meal-slot") : null;

                if (currentHoveredSlot && currentHoveredSlot !== activeSlot) {
                    currentHoveredSlot.classList.remove("drag-hover");
                }

                if (activeSlot) {
                    activeSlot.classList.add("drag-hover");
                    currentHoveredSlot = activeSlot;
                }

                // Auto-Scroll Navigation Engine Engine
                const scrollThreshold = 80;
                const scrollSpeed = 12;
                if (touch.clientY > (window.innerHeight - scrollThreshold)) {
                    window.scroll(0, window.scrollY + scrollSpeed);
                } else if (touch.clientY < scrollThreshold) {
                    window.scroll(0, window.scrollY - scrollSpeed);
                }
            }, { passive: false });

            document.addEventListener("touchend", async (e) => {
                if (!touchActiveCard) return;

                if (currentHoveredSlot) {
                    currentHoveredSlot.classList.remove("drag-hover");
                }

                const touch = e.changedTouches[0];
                const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetSlot = dropTarget ? dropTarget.closest(".meal-slot") : null;

                // Instantly reset visual inline configuration attributes back to base CSS sheets
                touchActiveCard.style.opacity = "1";
                touchActiveCard.style.transform = "none";
                touchActiveCard.style.position = "";
                touchActiveCard.style.left = "";
                touchActiveCard.style.top = "";
                touchActiveCard.style.width = "";
                touchActiveCard.style.zIndex = "";
                touchActiveCard.style.pointerEvents = ""; 

                const parentColumn = targetSlot ? targetSlot.closest(".calendar-day-column") : null;
                
                await handleCardPlacement(touchActiveCard, targetSlot, touchSourceSlot, parentColumn);

                // Clear layout state handlers cleanly
                touchActiveCard = null;
                touchSourceSlot = null;
                currentHoveredSlot = null;
            });
        }

        // ==========================================
        // 3. MOBILE DROPDOWN ACCESSIBILITY ENGINE
        // ==========================================
        function initializeMobileDropdownEngine() {
            document.addEventListener("change", async (e) => {
                if (!e.target.classList.contains("mobile-slot-selector")) return;

                const selector = e.target;
                if (!selector.value) return;

                const [targetDayCode, targetMealType] = selector.value.split("|");
                
                // Locate the structural DOM node destination slot properties
                const realSlot = Array.from(document.querySelectorAll(".meal-slot")).find(
                    slot => slot.dataset.mealType === targetMealType && 
                    slot.closest(".calendar-day-column")?.dataset.dayCode === targetDayCode
                );

                if (realSlot) {
                    const recipeCard = selector.closest(".recipe-card");
                    const sourceSlot = recipeCard ? recipeCard.closest(".meal-slot") : null;
                    const parentColumn = realSlot.closest(".calendar-day-column");

                    await handleCardPlacement(recipeCard, realSlot, sourceSlot, parentColumn);
                    selector.value = ""; // Reset selector focus node elements cleanly
                }
            });
        }

        // ==========================================
        // 4. CORE DATA PROCESSING & SYNC PLATFORM
        // ==========================================
        async function handleCardPlacement(card, targetSlot, sourceSlot, targetColumn) {
            if (!card) return;

            // Safety fallback: if no valid slot was targeted, return item back to its origin slot safely
            if (!targetSlot) {
                resetCardToSource(card, sourceSlot);
                return;
            }

            const recipeId = card.dataset.recipeId;
            let recipeTitle = card.querySelector("strong")?.innerText || "Selected Recipe";
            // Sanitize values to prevent quotes breaking dynamic attributes insertions
            recipeTitle = recipeTitle.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            
            const newCals = parseFloat(card.dataset.calories) || 0;
            const newProt = parseFloat(card.dataset.protein) || 0;
            
            const targetDay = targetColumn?.dataset.dayCode;
            const dayName = targetColumn?.dataset.dayName || "this day";
            const mealType = targetSlot.dataset.mealType;
            const csrfToken = getCsrfToken();

            if (recipeId && targetDay && csrfToken) {
                // Prevent stacking the exact same recipe card in the same day multiple times
                const isDuplicate = Array.from(targetColumn.querySelectorAll(".recipe-card"))
                    .some(c => c.dataset.recipeId === recipeId && c.closest(".meal-slot") !== sourceSlot);

                if (isDuplicate) {
                    alert(`⚠ "${recipeTitle}" is already scheduled for ${dayName}!`);
                    resetCardToSource(card, sourceSlot);
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
            
                    // Handle success responses from network architectures
                    if (response.ok && data.status === "success") {
                        const sourceColumn = sourceSlot ? sourceSlot.closest(".calendar-day-column") : null;
                                    
                        processSlotAssignment(targetSlot, recipeId, recipeTitle, newCals, newProt, targetColumn, sourceSlot);
                        
                        // Recalculate layout metrics for both source and destination bounds safely
                        if (typeof calculateAndRenderDayMacros === "function") {
                            calculateAndRenderDayMacros(targetColumn);
                            if (sourceColumn && sourceColumn !== targetColumn) {
                                calculateAndRenderDayMacros(sourceColumn);
                            }
                        }
                    } else {
                        resetCardToSource(card, sourceSlot);
                    }
                } catch (error) {
                    // Mobile Browser background worker mitigation tracking
                    if (error.message && error.message.includes("message channel closed")) {
                        processSlotAssignment(targetSlot, recipeId, recipeTitle, newCals, newProt, targetColumn, sourceSlot);
                    } else {
                        console.error("Database alignment sync fault:", error);
                        resetCardToSource(card, sourceSlot);
                    }
                }
            } else {
                resetCardToSource(card, sourceSlot);
            }
        }
        
        function resetCardToSource(card, sourceSlot) {
            if (!sourceSlot || !card) return;
            const occupiedZone = sourceSlot.querySelector('.slot-occupied-zone');
            if (occupiedZone && !occupiedZone.contains(card)) {
                occupiedZone.appendChild(card);
            }
        }
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
    });
    }
});
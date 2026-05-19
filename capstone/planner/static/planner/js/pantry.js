document.addEventListener("DOMContentLoaded", () => {
    const pantryForm = document.getElementById("add-pantry-form");
    const csrfToken = document.getElementById("csrf-token")?.value;

    if (pantryForm) {
        pantryForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Collect active form values
            const ingredientId = document.getElementById("pantry-ingredient-select")?.value;
            const quantity = document.getElementById("pantry-quantity-input")?.value;
            const unit = document.getElementById("pantry-unit-input")?.value;
            const expDate = document.getElementById("pantry-exp-input")?.value;

            if (csrfToken) {
                try {
                    const response = await fetch("/api/pantry/add/", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": csrfToken
                        },
                        body: JSON.stringify({
                            ingredient_id: ingredientId,
                            quantity: quantity,
                            unit: unit,
                            expiration_date: expDate
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.status === "success") {
                        // Dynamically append new rows to your frontend index workspace lists
                        location.reload(); // Simple refresh to update both pantry views and match results cleanly
                    }
                } catch (error) {
                    console.error("Inventory addition failed:", error);
                }
            }
        });
    }
});

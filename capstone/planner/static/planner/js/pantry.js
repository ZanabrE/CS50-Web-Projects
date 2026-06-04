document.addEventListener("DOMContentLoaded", () => {
    const pantryForm = document.getElementById("add-pantry-form");

    if (pantryForm) {
        pantryForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Dynamically capture token at form execution time
            const csrfToken = document.getElementById("csrf-token")?.value || 
                              document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

            // Collect active form values
            const ingredientId = document.getElementById("pantry-ingredient-select")?.value;
            const quantity = document.getElementById("pantry-quantity-input")?.value;
            const unit = document.getElementById("pantry-unit-input")?.value;
            const expDateInput = document.getElementById("pantry-exp-input")?.value;

            // Safe evaluation string check eliminates attributeStyleMap function crash
            const expDate = (expDateInput && expDateInput.trim() !== "") ? expDateInput : null;

            if (csrfToken && ingredientId && quantity) {
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
                            unit: unit || "grams",
                            expiration_date: expDate
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.status === "success") {
                        // Simple refresh to update both pantry views and match results cleanly
                        location.reload(); 
                    } else {
                        alert(`Inventory validation failed: ${data.message || 'Unknown verification error.'}`);
                    }
                } catch (error) {
                    console.error("Inventory addition failed:", error);
                    alert("A network connectivity error occurred while syncing with the server.");
                }
            } else {
                console.warn("Form validation failed: Missing mandatory parameters.");
            }
        });
    }
});

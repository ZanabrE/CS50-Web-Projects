document.addEventListener("DOMContentLoaded", () => {
    const pantryForm = document.getElementById("add-pantry-form");
    if (pantryForm) {
        pantryForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Capture CSRF token
            const csrfToken = document.getElementById("csrf-token")?.value || 
                              document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

            const ingredientId = document.getElementById("pantry-ingredient-select")?.value;
            const quantity = document.getElementById("pantry-quantity-input")?.value;
            const unit = document.getElementById("pantry-unit-input")?.value;
            const expDateInput = document.getElementById("pantry-exp-input")?.value;
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

                    // Check if the response is okay BEFORE parsing
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error("Server returned an error:", errorText);
                        throw new Error(`Server Error: ${response.status}`);
                    }

                    const data = await response.json();
                    if (data.status === "success") {
                        location.reload();
                    } else {
                        alert(`Inventory validation failed: ${data.message || 'Unknown verification error.'}`);
                    }
                } catch (error) {
                    console.error("Inventory addition failed:", error);
                    alert("A server error occurred. Check the console for details.");
                }
            } else {
                console.warn("Form validation failed: Missing mandatory parameter.");
            }
        });
    }
});

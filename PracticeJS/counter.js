let count = 0;

function myFunction() {
    count++;
    //alert("Count: " + count);
    document.getElementById("counter").innerHTML = "Count: " + count;

    // Using if stament to check if the count is a multiple of 10 and display an alert message
    if (count % 10 === 0) {
        alert(`Count is a multiple of 10: ${count}`);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    //document.querySelector("button").addEventListener("click", myFunction); // one way to add event listener to the button
    document.querySelector("button").onclick = myFunction; // another way to add event listener to the button
});
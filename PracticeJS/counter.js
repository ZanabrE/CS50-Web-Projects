if (!localStorage.getItem("count")){
    localStorage.setItem("count", 0);
}

function myFunction() {
    let count = localStorage.getItem("count");
    count++;
    //alert("Count: " + count);
    document.getElementById("counter").innerHTML = "Count: " + count;
    localStorage.setItem("count", count);

    // Using if stament to check if the count is a multiple of 10 and display an alert message
    /*if (count % 10 === 0) {
        alert(`Count is a multiple of 10: ${count}`);
    }*/
}

document.addEventListener("DOMContentLoaded", function() {
    //document.querySelector("button").addEventListener("click", myFunction); // one way to add event listener to the button
    document.querySelector("#counter").innerHTML = localStorage.getItem("count"); // display the count value when the page is loaded
    document.querySelector("button").onclick = myFunction; // another way to add event listener to the button
});
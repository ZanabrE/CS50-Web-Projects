function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function toggleLike(postId) {
    fetch(`/like/${postId}`, {
        method: 'POST',
        headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(data => {
        const heart = document.querySelector(`#heart-${postId}`);
        const count = document.querySelector(`#count-${postId}`);
        
        // Use color for &hearts; and update count
        heart.style.color = data.liked ? 'red' : 'gray';
        count.innerHTML = data.like_count;
    })
    .catch(error => console.error('Error:', error));
}

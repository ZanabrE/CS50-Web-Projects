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

function editPost(postId) {
    const contentDiv = document.querySelector(`#content-${postId}`);
    const originalContent = contentDiv.innerText.trim();

    // Replace content with textarea.
    contentDiv.innerHTML = `
        <textarea id="textarea-${postId}" class="form-control mb-2">${originalContent}</textarea>
        <button class="btn btn-sm btn-success" onclick="savePost(${postId})">Save</button>
    `;
}

function savePost(postId) {
    const newContent = document.querySelector(`#textarea-${postId}`).value;

    fetch(`/edit/${postId}`, {
        method: 'PUT',
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie('csrftoken') // Safe and reliable
        },
        body: JSON.stringify({ content: newContent })
    })
    .then(response => {
        if (response.ok) {
            const contentDiv = document.querySelector(`#content-${postId}`);
            contentDiv.innerHTML = `<p class="text-secondary" style="font-size: 1.05rem;">${newContent}</p>`;
            document.querySelector(`#edit-btn-${postId}`).style.display = 'block';
        }
    });
}


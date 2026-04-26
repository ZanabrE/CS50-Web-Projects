// In your .js file or <script> tag
function likePost(postId) {
    fetch(`/like/${postId}`, {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        // Update the heart icon color or class
        const heart = document.querySelector(`#heart-${postId}`);
        heart.style.color = data.liked ? 'red' : 'gray';
        
        // Update the number next to it
        document.querySelector(`#count-${postId}`).innerHTML = data.like_count;
    });
}

document.addEventListener('DOMContentLoaded', function() {
  // Select the form once and store it.
  const composeForm = document.querySelector('#compose-form');

  // Use the 'submit' event listener.
  composeForm.onsubmit = function(event) {

    // THIS MUST BE THE FIRST LINE to stop the '?' and page reload.
    event.preventDefault();

    // Send email data to the server using the Fetch API
    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
        recipients: document.querySelector('#compose-recipients').value,
        subject: document.querySelector('#compose-subject').value,
        body: document.querySelector('#compose-body').value
      })
    })
    .then(response => {
      if (response.ok) {
        // Only redirect if the email was successfully created (status 201)
        load_mailbox('sent');
      } else {
        // Handle errors (e.g., recipiant doesn't exist)
        return response.json().then(error => {
          alert(error.error);
        });
      }
    })
    .catch(error => console.error('Error:',error));

    return false; // Prevent the default form submission behavior
  };

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox')); 
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  // Clear previous emails and set the header of the mailbox.
  const emailsView = document.querySelector('#emails-view');
  emailsView.innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Fetch the latest emails from the API and display them.
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    // Loop through emails and render each one.
    emails.forEach(email => {
      const email_div = document.createElement('div');

      // Styling for the email box.
      email_div.style.border = '1px solid black';
      email_div.style.padding = '10px';
      email_div.style.margin = '10px 0';
      email_div.style.display = 'flex';
      email_div.style.justifyContent = 'space-between';
      email_div.style.cursor = 'pointer';

      // Background color based on read/unread status.
      email_div.style.backgroundColor = email.read ? '#f0f0f0' : 'white';

      // Populate email content (Sender, Subject, and Timestamp).
      email_div.innerHTML = `
        <div>
          <strong>${email.sender}</strong>
          <span style="margin-left: 10px;">${email.subject}</span>
        </div>
        <div style="color: gray;">${email.timestamp}</div>
      `;

      // Add click listener to view the email details.
      email_div.addEventListener('click', () => {
        view_email(email.id); // You will implement this next!
      });

      // Append the email div to the mailbox view.
      emailsView.append(email_div);

    });
  })
  .catch(error => console.error('Error loading mailbox:', error));
}
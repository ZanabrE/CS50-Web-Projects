document.addEventListener('DOMContentLoaded', function() {
  // Using POST method to send email data to the server and then load the sent mailbox after the email is sent successfully
  document.querySelector('#compose-form').onsubmit = function() {

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

  // Using GET method to fetch the emails of the selected mailbox from the server and then display them in the mailbox view
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>
                                                      <div id="loading">Loading messages...</div>`;

    // fetch the emails of the selected mailbox from the server
    fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      // Remove loading message once data arrives.
      document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

      // Loop through emails and create a row for each email
      emails.forEach(email => {
        const email_element = document.createElement('div');
        email_element.className = 'email'; // Add a class for CSS styling

        //Set background color based on read status
        email_element.style.backgroundColor = email.read ? '#e5e5e5' : 'white';
        email_element.style.border = '1px solid black';
        email_element.style.padding = '10px';
        email_element.style.margin = '5px 0';
        email_element.style.cursor = 'pointer';

      // Add email content to the email element
        email_element.innerHTML = `
          <strong>${email.sender}</strong>
          <span>${email.subject}</span>
          <span style="float:right; color:gray;">${email.timestamp}</span>
          `;

        // Add click event to view the email (for the next part of the project)
        email_element.addEventListener('click', () => {
          console.log(`Email ${email.id} clicked!`);
        });

        document.querySelector('#emails-view').append(email_element);

      });

  });

}
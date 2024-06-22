function sendEmail(to, subject, body) {
  const url = 'https://itcpremail.pythonanywhere.com/send-email';
  const data = {
    to: to,
    subject: subject,
    body: body
  };

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    console.log('Status code:', response.status);
    return response.json();
  })
  .then(responseData => {
    console.log('Response:', responseData);
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

function sendBulkEmail(grp, type, title) {
  const usersSnapshot = entireDbSnapshot.child(`/users`);
  
  usersSnapshot.forEach(userSnapshot => {
    const { name, group, email } = userSnapshot.val();
    if (grp === group) {

      const body = `Dear ${name},<br><br>
      A new ${type} is added on the portal of ITCPR.
      <br><br>
      ${capitalizeFirstLetter(type)} Title: ${title}
      <br><br>
      Log in to https://portal.itcpr.org to see details.
      <br><br>
      Regards, <br>
      Administrative Team <br>
      Institute for Theoretical and Computational Physics Research (ITCPR)
      `;
      sendEmail(email, `New ${type} added!`, body);
      console.log(`Email sent to ${email}`);
    }
  })
}
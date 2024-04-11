function sendEmail(to, subject, body) {
  Email.send({
    SecureToken : "09ce4617-9d96-4bc7-a654-926ff3ab8f2d",
    To : to,
    From : "ITCPR Portal <no-reply@itcpr.org>",
    Subject : subject,
    Body : body
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
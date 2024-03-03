var provider = new firebase.auth.GoogleAuthProvider();
var database = firebase.database();
var userdata = null;

function checkAuthState() {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      userdata = user;
      verifyUser(user);
    } else {
      window.location.href = "../login";
    }
  });
}

function verifyUser(user) {
  var isEmail = false;
  var isName = false;
  database
    .ref("/verified-users")
    .orderByKey()
    .once("value")
    .then((snapshot) => {
      snapshot.forEach(function (childSnapshot) {
        var email = snapshot.child(childSnapshot.key + "/email").val();
        var name = snapshot.child(childSnapshot.key + "/name").val();

        if (email === user.email && name) {
          isEmail = true;
          isName = true;
        } else if (email === user.email && !name) {
          isEmail = true;
          isName = false;
        }
      });

      if (isEmail === true && isName === false) {
        registerUser(user);
      } else if (isEmail === true && isName === true) {
        document.getElementById("html").classList.remove("hide");
        startWorking(user);
      } else if (isEmail === false) {
        deleteEmail();
        window.location.href = "../login";
      }
    });
}

function registerUser(user) {
  window.location.href = "../signup";
}

function deleteEmail() {
  const user = firebase.auth().currentUser;
  user
    .delete()
    .then(() => {})
    .catch((error) => {});
}

function GoogleLogout() {
  firebase
    .auth()
    .signOut()
    .then(() => {})
    .catch((e) => {
      console.log(e);
    });
}

// MAIN FUNCTIONS

function goTo(url) {
  window.location.href = url;
}

function startWorking(user) {
  showUserInfoCorner(user);
  showRequests();
}

function showUserInfoCorner(user) {
    database
      .ref("/users/" + user.uid)
      .once("value")
      .then((snapshot) => {
        var image = snapshot.child("image").val();
        var role = snapshot.child("role").val();

        document.getElementById(
          "userCorner"
        ).innerHTML = `<span class="tooltiptext">Profile</span>
        <img src="${image}" alt="" />`;
        if (role === "Member") {
          document.getElementById("adminLogo").remove();
        }
    });
}

function showRequests() {
  document.getElementById("inRequests").innerHTML = "";
  document.getElementById("outRequests").innerHTML = "";

  database.ref("/users/"+userdata.uid+"/requests").once("value")
  .then((snapshot) => {
    var ifin = snapshot.child("incoming").exists();

    if (ifin) {
      database.ref("/users/"+userdata.uid+"/requests/incoming").orderByKey()
      .once("value").then((snape) => {
        snape.forEach(function (csSnap) {
          database.ref("/users/"+userdata.uid+"/requests/incoming/"+csSnap.key)
          .orderByKey().once("value").then((snap) => {
            snap.forEach(function (cSnap) {
              var bookid = snap.child(cSnap.key+"/book").val();
              var name = snap.child(cSnap.key+"/name").val();
              var time = snap.child(cSnap.key+"/time").val();
              var type = snap.child(cSnap.key+"/type").val();
              var uid = snap.child(cSnap.key+"/user").val();

              database.ref("/books/"+bookid).once("value").then((snapshot2) => {
                var title = snapshot2.child("title").val();
                var author = snapshot2.child("author").val();
                var image = snapshot2.child("image").val();

                document.getElementById("inRequests").innerHTML += `
                <div class="admin-item" id="req-${csSnap.key}-${cSnap.key}">
                  <div class="admin-info">
                    <img src="${image}" alt="">
                    <div>
                      ${type === 'request' ? name+'('+uid+') requested a book from you' : name+'('+uid+') requested to transfer a book to you'} at ${time} <br>
                      <b>${title}</b> (Book ID: ${bookid}) <br>
                      ${author}
                    </div>
                  </div>
                  <div class="admin-edit">
                    <div class="conf-yes2" onclick="acceptReq('in','${type}','${uid}','${bookid}','${title}','${author}')">Accept</div>
                    <div class="conf-no2" onclick="popUpRejectReq('in','${type}','${uid}','${bookid}','${title}','${author}','You are about to reject a ${type === 'request' ? 'book request' : 'request to transfer a book to you'} from ${name} (${uid}).')">Reject</div>
                  </div>
                </div>`;
              })
            })
          })
        })
      })
    } else {
      document.getElementById("inRequests").innerHTML = `
        <div style='text-align:center;padding:20px 0px;'>
          You currently have no incoming book requests!
        </div>`
    }
  })

  database.ref("/users/"+userdata.uid+"/requests").once("value")
  .then((snapshot) => {
    var ifout = snapshot.child("outgoing").exists();

    if (ifout) {
      database.ref("/users/"+userdata.uid+"/requests/outgoing").orderByKey()
      .once("value").then((snape) => {
        snape.forEach(function (csSnap) {
          database.ref("/users/"+userdata.uid+"/requests/outgoing/"+csSnap.key)
          .orderByKey().once("value").then((snap) => {
            snap.forEach(function (cSnap) {
              var bookid = snap.child(cSnap.key+"/book").val();
              var name = snap.child(cSnap.key+"/name").val();
              var time = snap.child(cSnap.key+"/time").val();
              var type = snap.child(cSnap.key+"/type").val();
              var uid = snap.child(cSnap.key+"/user").val();

              database.ref("/books/"+bookid).once("value").then((snapshot2) => {
                var title = snapshot2.child("title").val();
                var author = snapshot2.child("author").val();
                var image = snapshot2.child("image").val();

                document.getElementById("outRequests").innerHTML += `
                <div class="admin-item">
                  <div class="admin-info">
                    <img src="${image}" alt="">
                    <div>
                      ${type === 'request' ? 'You requested a book from '+name+' ('+uid+')' : 'You requested to transfer a book to '+name+' ('+uid+')'} at ${time} <br>
                      <b>${title}</b> (Book ID: ${bookid}) <br>
                      ${author}
                    </div>
                  </div>
                  <div class="admin-edit">
                  </div>
                </div>`;
              })
            })
          })
        })
      })
    } else {
      document.getElementById("outRequests").innerHTML = `
        <div style='text-align:center;padding:20px 0px;'>
          You currently have no outgoing book requests!
        </div>`
    }
  })

}


function acceptReq(loc,type,userid,bookid,title,author) {
  if (loc === 'in' && type === 'request') {
    database.ref("/verified-users/" + userid).once("value").then((snap1) => {
      var uid = snap1.child("id").val();
      var email = snap1.child("email").val();
      var toname = snap1.child("name").val();

      database.ref('/users/'+userdata.uid+'/books/'+bookid).remove();
      database.ref('/users/'+uid+'/books/'+ bookid).set(true);
      database.ref("/books/" + bookid).update({
        host: userid,
      });

      database.ref("/users/" + userdata.uid).once("value").then((snapshot) => {
        var hid = snapshot.child("id").val();
        var name = snapshot.child("name").val();
        var contact = snapshot.child("contact").val();
        var email2 = snapshot.child("email").val();

        database.ref('/users/'+userdata.uid+'/requests/incoming/'+bookid).orderByKey().once("value")
        .then((snap2) => {
          snap2.forEach(function (cSnap) {
            database.ref("/verified-users/" + cSnap.key).once("value").then((snap1) => {
              var temp_id = snap1.child("id").val();
              var temp_email = snap1.child("email").val();
              var temp_name = snap1.child("name").val();
  
              database.ref('/users/'+temp_id+'/requests/outgoing/'+bookid).remove();

              if (temp_email !== email) {
                sendEmail(
                  temp_email,
                  "Your Book Request Has Been Rejected",
                  `Dear ${temp_name}, <br><br>
                  We hope this email finds you well. We are writing to inform you that ${name} 
                  (${hid}) has given a book that you requested to another member, who also
                  requested for the same book, in the
                  <a href="https://library.fermionku.com">Fermion Physics Club Library</a>.
                  <br><br>
                  <b>Book Informations:</b> <br>
                  Book ID: ${bookid} <br>
                  Title: ${title} <br>
                  Author: ${author} <br><br>
                  If you need this book urgently, place a new request to the new host of the book.
                  <br><br>
                  However, we encourage you to continue browsing our library and placing requests
                  for other books that may interest you. If you have any questions or concerns,
                  please don't hesitate to reach out to us. <br><br>
                  Thank you for your participation in our library, and we hope that you enjoy the
                  books that you borrow from our community. <br><br>
                  Yours scientifically, <br>
                  The Fermion Physics Club Library <br><br>`
                );  
              }
              document.getElementById('req-'+bookid+'-'+cSnap.key).remove();
            })
          })
        }).then((value) => {
          database.ref('/users/'+userdata.uid+'/requests/incoming/'+bookid).remove();
          alertMessage(t = "success", 'Book request approved!');
        })

        sendEmail(
          email,
          "Confirmation: Your Book Request Has Been Accepted",
          `Dear ${toname}, <br><br>
          We are pleased to inform you that ${name} (${hid}) has accepted your request for
          a book in the <a href="https://library.fermionku.com">Fermion Physics Club Library</a>.
          Make sure to collect the book from ${name}, as you will now be responsible for
          providing the book to other members who need it in the future. <br><br>
          <b>Book Informations:</b> <br>
          Book ID: ${bookid} <br>
          Title: ${title} <br>
          Author: ${author} <br><br>
          <b>Contact Informations:</b> <br>
          Name: ${name} <br>
          Contact No: ${contact} <br>
          Email: ${email2} <br><br>
          Please remember that our decentralized library operates on a system of trust and
          community responsibility. We rely on users like you to ensure that books are returned
          in good condition so that they can be enjoyed by others. <br><br>
          Thank you for your participation in our library, and we hope that you enjoy the
          books that you borrow from our community. <br><br>
          Yours scientifically, <br>
          The Fermion Physics Club Library <br><br>`
        );
      })
    })

  } else if (loc === 'in' && type === 'transfer') {

  } else if (loc === 'out' && type === 'request') {

  } else if (loc === 'out' && type === 'transfer') {

  }
}

function popUpRejectReq(loc,type,userid,bookid,title,author,text) {
  console.log(loc,type,userid,bookid,title,author,text);
  document.getElementById("confirmation").classList.add("show-confirmation");
  document.getElementById("confirmation").innerHTML = `
    <div class="conf-content" id="conf-content">
      ${text} <br>
      Please provide a valid reason for this.
      <textarea id="reason" class="reason"></textarea>
      <div class="conf-btns">
        <div class="conf-yes" onclick="rejectReq('${loc}','${type}','${userid}','${bookid}','${title}','${author}')">Delete</div>
        <div class="conf-no" onclick="hideDeletePopUp()">Cancel</div>
      </div>
    </div>`;
}

function hideDeletePopUp() {
  document.getElementById("confirmation").classList.remove("show-confirmation");
}

function rejectReq(loc,type,userid,bookid,title,author) {
  var reason = document.getElementById("reason").value;
  if (reason) {
    if (loc === 'in' && type === 'request') {
      database.ref("/verified-users/" + userid).once("value").then((snap1) => {
        var uid = snap1.child("id").val();
        var email = snap1.child("email").val();
        var toname = snap1.child("name").val();

        database.ref("/users/" + userdata.uid).once("value").then((snapshot) => {
          var hid = snapshot.child("id").val();
          var name = snapshot.child("name").val();

          database.ref('/users/'+uid+'/requests/outgoing/'+bookid+'/'+hid).remove();
          database.ref('/users/'+userdata.uid+'/requests/incoming/'+bookid+'/'+userid).remove();

          sendEmail(
            email,
            "Your Book Request Has Been Rejected",
            `Dear ${toname}, <br><br>
            We hope this email finds you well. We are writing to inform you that ${name} 
            (${hid}) has rejected your book request, in the
            <a href="https://library.fermionku.com">Fermion Physics Club Library</a>.
            <br><br>
            <b>Book Informations:</b> <br>
            Book ID: ${bookid} <br>
            Title: ${title} <br>
            Author: ${author} <br><br>
            ${name} (${hid}) has provided a reason for this. The reason is: "${reason}"
            <br><br>
            If you are not satisfied with the reason, or need this book urgently, please
            contact the librarians of the Fermion Physics Club. Librarian informations
            can be found here:
            <a href="https://library.fermionku.com/librarian">Librarians Page</a>
            <br><br>
            However, we encourage you to continue browsing our library and placing requests
            for other books that may interest you. If you have any questions or concerns,
            please don't hesitate to reach out to us. <br><br>
            Thank you for your participation in our library, and we hope that you enjoy the
            books that you borrow from our community. <br><br>
            Yours scientifically, <br>
            The Fermion Physics Club Library <br><br>`
          );
        })
      })
      hideDeletePopUp();
      alertMessage(t = "danger", 'Book request rejected!');
      showRequests();
  
    } else if (loc === 'in' && type === 'transfer') {
  
    } else if (loc === 'out' && type === 'request') {
  
    } else if (loc === 'out' && type === 'transfer') {
  
    }  
  } else {
    alertMessage((t = "danger"), "Please enter a valid reason for rejecting this request!");
  }
}







function sendEmail(mail, subj, body) {
  Email.send({
    Host: "smtp.elasticemail.com",
    Username: "fermionku@gmail.com",
    Password: "4443783DE3DFD54D80EDEAB65A8F082A7512",
    To: mail,
    From: "Fermion Physics Club Library <fermionku@gmail.com>",
    Subject: subj,
    Body: body,
  })
}

function alertMessage(t = "success", message) {
  let x = document.getElementById("alerts");
  let content = ``;
  if (t === "success") {
    x.classList.add("show-alerts-success");
    setTimeout(function () {
      x.className = x.className.replace("show-alerts-success", "");
    }, 2000);
    content += `${message}`;
    x.innerHTML = content;
  } else {
    x.classList.add("show-alerts-danger");
    setTimeout(function () {
      x.className = x.className.replace("show-alerts-danger", "");
    }, 2000);
    content += `${message}`;
    x.innerHTML = content;
  }
}

checkAuthState();

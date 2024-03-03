var provider = new firebase.auth.GoogleAuthProvider();
var database = firebase.database();
var userdata = null;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const pageid = urlParams.get('id');

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
  showBook();
}

function showUserInfoCorner(user) {
  database
    .ref("/users/" + user.uid)
    .once("value")
    .then((snapshot) => {
      var image = snapshot.child("image").val();
      var role = snapshot.child("role").val();
      var ifnotify = snapshot.child("requests/incoming").exists();

      document.getElementById(
        "userCorner"
      ).innerHTML = `<span class="tooltiptext">Profile</span>
      <img src="${image}" alt="" />`;
      if (role === "Member") {
        document.getElementById("adminLogo").remove();
      }
      if (ifnotify) {
        document.getElementById("newNotify").classList.add('notify');
      }
    });
}

function showBook() {
  database
    .ref("/books/"+pageid)
    .once("value")
    .then((snapshot) => {
      var title = snapshot.child("title").val();
      var author = snapshot.child("author").val();
      var image = snapshot.child("image").val();
      var isbn = snapshot.child("ISBN").val();
      var courses = snapshot.child("courses").val();
      var donated = snapshot.child("donated").val();
      var host = snapshot.child("host").val();
      var pdf = snapshot.child("pdf").val();
      var added = snapshot.child("added").val();

      document.title = title + " - Book - Fermion Physics Club Library";

      database
      .ref("/verified-users/"+host)
      .once("value")
      .then((snapshot) => {
        var name = snapshot.child("name").val();

        database
        .ref("/users/"+userdata.uid)
        .once("value")
        .then((snapshot) => {
          var ifbook = snapshot.child("books/"+pageid).exists();
          var ifreq = snapshot.child("/requests/outgoing/"+pageid).exists();

          if (ifbook) {
            document.getElementById("SingleBook").innerHTML = `
            <div class="book-image">
                <img src="${image}" alt="">
                <div class="owned-btn">You have this book</div>
            </div>
            <div class="book-details">
              <span>#${pageid}</span> <br>
              <h2>${title}</h2>
              Authors: ${author} <br>
              ISBN: ${isbn} <br>
              ${courses ? 'Courses: '+courses.toUpperCase()+' <br>' : ''}
              Added on: ${added} <br>
              Donated by: ${donated} <br>
              Current host: ${name} (${host})
              ${pdf ? '<br><br>PDF: <a href="'+pdf+'" class="pdf" target="_blank">Download</a>' : ''}
            </div>`;  
          } else {
            document.getElementById("SingleBook").innerHTML = `
            <div class="book-image">
              <img src="${image}" alt="">
              ${ifreq ? '<div class="owned-btn">Request sent</div>' : '<div class="preview-btn" onclick="requestBook()">Request this book</div>'}
            </div>
            <div class="book-details">
              <span>#${pageid}</span> <br>
              <h2>${title}</h2>
              Authors: ${author} <br>
              ISBN: ${isbn} <br>
              ${courses ? 'Courses: '+courses.toUpperCase()+' <br>' : ''}
              Added on: ${added} <br>
              Donated by: ${donated} <br>
              Current host: ${name} (${host})
              ${pdf ? '<br><br>PDF: <a href="'+pdf+'" class="pdf" target="_blank">Download</a>' : ''}
            </div>`;
          }
        })
      })
    });
}

function requestBook() {
  var time = moment().format("LT, DD MMMM YYYY");

  database
  .ref("/books/"+pageid)
  .once("value")
  .then((snapshot) => {
    var host = snapshot.child("host").val();
    var title = snapshot.child("title").val();
    var author = snapshot.child("author").val();

    database
    .ref("/verified-users/"+host)
    .once("value")
    .then((snapshot) => {
      var uid = snapshot.child("id").val();
      var hostname = snapshot.child("name").val();
      var email = snapshot.child("email").val();

      database
      .ref("/users/"+userdata.uid)
      .once("value")
      .then((snapshot) => {
        var rid = snapshot.child("id").val();
        var name = snapshot.child("name").val();

        database.ref("/users/"+uid+"/requests/incoming/"+pageid+'/'+rid).update({
          book: pageid,
          user: rid,
          name: name,
          type: 'request',
          time: time,
        })
        database.ref("/users/"+userdata.uid+"/requests/outgoing/"+pageid+'/'+host).update({
          book: pageid,
          user: host,
          name: hostname,
          type: 'request',
          time: time,
        })
        alertMessage(t = "success", 'The host has received your request for the book.')
        sendEmail(
          email,
          "Book Request at the Fermion Physics Club Library",
          `Dear ${hostname}, <br><br>
          We hope this email finds you well. This is to inform you that ${name} (${rid}) has
          requested a book which is currently in your possession, at the 
          <a href="https://library.fermionku.com">Fermion Physics Club Library</a>. <br><br>
          <b>Book Informations:</b> <br>
          Book ID: ${pageid} <br>
          Title: ${title} <br>
          Author: ${author} <br><br>
          As a decentralized library, we encourage our members to facilitate the sharing of
          resources among each other. We kindly request that you lend the book to ${name},
          if possible. <br><br>
          However, if you are unable to lend the book, please provide the reason at the library
          website as soon as possible. We will do our best to resolve any issues that may
          arise and ensure that our members have access to the resources they need. <br><br>
          We appreciate your willingness to contribute to the culture of collaboration and
          knowledge sharing that we are trying to foster at the Fermion Physics Club Library.
          <br><br>
          Thank you for your cooperation. If you have any questions or concerns, please don't
          hesitate to contact us. <br><br>
          Yours scientifically, <br>
          The Fermion Physics Club Library <br><br>`
        );
        showBook();

      })
    })
  })
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
    content += `
              ${message}`;
    x.innerHTML = content;
  } else {
    x.classList.add("show-alerts-danger");
    setTimeout(function () {
      x.className = x.className.replace("show-alerts-danger", "");
    }, 2000);
    content += `
              ${message}`;
    x.innerHTML = content;
  }
}

checkAuthState();

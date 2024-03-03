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
        verifyAdmin(user);
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

function verifyAdmin(user) {
  database
    .ref("/users/" + user.uid)
    .once("value")
    .then((snapshot) => {
      var role = snapshot.child("role").val();

      if (role === "Admin") {
        document.getElementById("html").classList.remove("hide");
        startWorking(user);
      } else {
        window.location.href = "../login";
      }
    });
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
  showAllBooks();
  showAllUsers();
  showActivityLogs();
}

function showUserInfoCorner(user) {
  database
    .ref("/users/" + user.uid)
    .once("value")
    .then((snapshot) => {
      var image = snapshot.child("image").val();
      var ifnotify = snapshot.child("requests/incoming").exists();

      document.getElementById(
        "userCorner"
      ).innerHTML = `<span class="tooltiptext">Profile</span>
      <img src="${image}" alt="" />`;
      if (ifnotify) {
        document.getElementById("newNotify").classList.add("notify");
      }
    });
}

function showAllBooks() {
  document.getElementById("adminBooks").innerHTML = "";
  database
    .ref("/books")
    .orderByKey()
    .once("value")
    .then((snap) => {
      snap.forEach(function (childSnap) {
        var title = snap.child(childSnap.key + "/title").val();
        var author = snap.child(childSnap.key + "/author").val();
        var image = snap.child(childSnap.key + "/image").val();

        document.getElementById("adminBooks").innerHTML += `
        <div class="admin-item" onclick="seeBook('../book?id=${childSnap.key}')" id="book-${childSnap.key}">
          <div class="admin-info">
            <img src="${image}" alt="">
            <div>
              #${childSnap.key} <br>
              <b>${title}</b> <br>
              ${author}
            </div>
          </div>
          <div class="admin-edit" onclick="event.stopPropagation();">
            <i class="admin-icon fas fa-edit" onclick="showEditForm('${childSnap.key}')"></i>
            <i class="admin-icon fas fa-trash-alt" onclick="showDeletePopUp('book','${childSnap.key}')"></i>
          </div>
        </div>`;
      });
    });
}

function seeBook(url) {
  window.open(url, "_blank");
}

document
  .getElementById("search-text-input")
  .addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      showSearchResult();
    }
  });

function showSearchResult() {
  var text = document.getElementById("search-text-input").value.toLowerCase();

  if (text) {
    document.getElementById("title").innerHTML =
      "Search Books - Admin - Fermion Physics Club Library";
    document
      .getElementById("menu-books")
      .classList.remove("admin-menu-div-selected");
    document.getElementById("adminBooks").innerHTML = "";

    database
      .ref("/books")
      .once("value")
      .then((snapshot) => {
        var data1 = JSON.stringify(snapshot.val()).toLowerCase();
        const data = JSON.parse(data1);

        for (const [key, value] of Object.entries(data)) {
          delete value.image;
          delete value.isbn;
          delete value.host;
          delete value.courses;
          delete value.added;
          delete value.donated;
          delete value.pdf;
        }
        const modifiedJsonString = JSON.stringify(data).replace(
          /[{}":]|author|title/g,
          ""
        );

        if (modifiedJsonString.includes(text)) {
          database
            .ref("/books")
            .orderByKey()
            .once("value")
            .then((snap) => {
              snap.forEach(function (childSnap) {
                var title = snap.child(childSnap.key + "/title").val();
                var author = snap.child(childSnap.key + "/author").val();
                var image = snap.child(childSnap.key + "/image").val();

                if (
                  childSnap.key === text ||
                  title.toLowerCase().includes(text) ||
                  author.toLowerCase().includes(text)
                ) {
                  document.getElementById("adminBooks").innerHTML += `
                    <div class="admin-item" onclick="seeBook('../book?id=${childSnap.key}')">
                      <div class="admin-info">
                        <img src="${image}" alt="">
                        <div>
                          #${childSnap.key} <br>
                          <b>${title}</b> <br>
                          ${author}
                        </div>
                      </div>
                      <div class="admin-edit" onclick="event.stopPropagation();">
                        <i class="admin-icon fas fa-edit" onclick="showEditForm('${childSnap.key}')"></i>
                        <i class="admin-icon fas fa-trash-alt" onclick="showDeletePopUp('book','${childSnap.key}')"></i>
                      </div>
                    </div>`;
                }
              });
            });
        } else {
          document.getElementById("adminBooks").innerHTML = `
          <div style="text-align:center;">
            Your search didn't match any books. <br>
            Please try searching by book ID, title, or author, and double-check your spelling.
          </div>'`;
        }
      });
  } else {
    alertMessage((t = "danger"), "Please enter a search term.");
  }
}

function showAllUsers() {
  document.getElementById("adminUsers").innerHTML = "";
  database
    .ref("/verified-users")
    .orderByKey()
    .once("value")
    .then((snap) => {
      snap.forEach(function (childSnap) {
        var email = snap.child(childSnap.key + "/email").val();
        var uid = snap.child(childSnap.key + "/id").val();
        var ifname = snap.child(childSnap.key + "/name").exists();

        database
          .ref("/users/" + uid)
          .once("value")
          .then((snapshot) => {
            var book = snapshot.child("books").numChildren();

            document.getElementById("adminUsers").innerHTML += `
          <div class="admin-item2" id="user-${childSnap.key}">
            <div class="admin-info2">
              <div class="student-id">
                ${childSnap.key}
              </div>
              <div class="student-email">
                ${email}
              </div>
              <div class="student-reg">
                ${ifname === true ? "Registered user!" : "Not registered yet!"}
              </div>
              <div>
                ${book !== 1 ? book + " books!" : book + " book!"}
              </div>
            </div>
            <div class="admin-edit">
              <i class="admin-icon2 fas fa-trash-alt" onclick="showDeletePopUp('user','${
                childSnap.key
              }')"></i>
            </div>
          </div>`;
          });
      });
    });
}

function showDeletePopUp(tag, id) {
  document.getElementById("confirmation").classList.add("show-confirmation");
  document.getElementById("confirmation").innerHTML = "";
  if (tag === "user") {
    database
      .ref("/verified-users/" + id)
      .once("value")
      .then((snapshot) => {
        var uid = snapshot.child("id").val();

        database
          .ref("/users/" + uid)
          .once("value")
          .then((snapshot) => {
            var book = snapshot.child("books").numChildren();
            var admin = snapshot.child("role").val();
            if (book === 0 && admin !== "Admin") {
              document.getElementById("confirmation").innerHTML = `
          <div class="conf-content" id="conf-content">
            This user (${id}) currently has no books in their possession. <br>
            Are you certain that you wish to delete this user?
            <div class="conf-btns">
              <div class="conf-yes" onclick="deleteUser('${id}','${uid}')">Delete</div>
              <div class="conf-no" onclick="hideDeletePopUp()">Cancel</div>
            </div>
          </div>
          `;
            } else if (admin === "Admin") {
              document.getElementById("confirmation").innerHTML = `
          <div class="conf-content" id="conf-content">
            This user (${id}) is an admin. <br>
            You don't have authority to delete an admin.
            <div class="conf-btns">
              <div class="conf-no" onclick="hideDeletePopUp()">Cancel</div>
            </div>
          </div>
          `;
            } else {
              document.getElementById("confirmation").innerHTML = `
          <div class="conf-content" id="conf-content">
            This user (${id}) currently has ${
                book !== 1 ? book + " books" : book + " book"
              } in their possession. <br>
            Transfer the ${
              book !== 1 ? "books" : "book"
            } to another user before deleting user.
            <div class="conf-btns">
              <div class="conf-no" onclick="hideDeletePopUp()">Cancel</div>
            </div>
          </div>
          `;
            }
          });
      });
  } else if (tag === "book") {
    database
      .ref("/books/" + id)
      .once("value")
      .then((snapshot) => {
        var title = snapshot.child("title").val();
        var author = snapshot.child("author").val();
        var host = snapshot.child("host").val();
        document.getElementById("confirmation").innerHTML = `
      <div class="conf-content" id="conf-content">
        Book ID: #${id} <br>
        Title: ${title} <br>
        Authors: ${author} <br><br>
        Describe the reason for deleting this book..
        <textarea id="reason" class="reason"></textarea>
        <div class="conf-btns">
        <div class="conf-yes" onclick="deleteBook('${id}','${host}','${title}')">Delete</div>
        <div class="conf-no" onclick="hideDeletePopUp()">Cancel</div>
        </div>
      </div>
      `;
      });
  }
}

function deleteBook(id, host, title) {
  var reason = document.getElementById("reason").value;
  if (reason) {
    database.ref("/books/" + id).remove();
    database
      .ref("/verified-users/" + host)
      .once("value")
      .then((snapshot) => {
        var uid = snapshot.child("id").val();
        database.ref("/users/" + uid + "/books/" + id).remove();
      });
    hideDeletePopUp();
    document.getElementById("book-" + id).remove();
    alertMessage((t = "danger"), "Book removed successfully!");
    database
      .ref("/users/" + userdata.uid)
      .once("value")
      .then((snapshot) => {
        var name = snapshot.child("name").val();
        var uid = snapshot.child("id").val();

        addToLogs(
          name +
            " (" +
            uid +
            ") removed a book. Book ID: " +
            id +
            ". Title: " +
            title +
            ". Host ID: " +
            host +
            ". Reason: " +
            reason
        );
      });
  } else {
    alertMessage(
      (t = "danger"),
      "Please enter a valid reason for deleting this book!"
    );
  }
}

function deleteUser(id, uid) {
  database.ref("/verified-users/" + id).remove();
  database.ref("/users/" + uid).remove();
  hideDeletePopUp();
  document.getElementById("user-" + id).remove();
  alertMessage((t = "danger"), "User removed successfully!");
  database
    .ref("/users/" + userdata.uid)
    .once("value")
    .then((snapshot) => {
      var name = snapshot.child("name").val();
      var uid = snapshot.child("id").val();

      addToLogs(
        name + " (" + uid + ") removed an user. Student ID: " + id + "."
      );
    });
}

function hideDeletePopUp() {
  document.getElementById("confirmation").classList.remove("show-confirmation");
}

function showActivityLogs() {
  document.getElementById("activityLogs").innerHTML = "";
  database
    .ref("/logs")
    .orderByKey()
    .limitToLast(100)
    .once("value")
    .then((snap) => {
      snap.forEach(function (childSnap) {
        var details = snap.child(childSnap.key + "/details").val();
        var time = snap.child(childSnap.key + "/time").val();

        document.getElementById("activityLogs").innerHTML += `
        <div class="admin-item3">
          <span>${time}</span>
          ${details}
        </div>`;
      });
    });
}

function showAdminRight(key) {
  if (key === "allbooks") {
    document.getElementById("title").innerHTML =
      "All Books - Admin - Fermion Physics Club Library";
    document.getElementById("allBooks").classList.remove("hide");
    document.getElementById("allUsers").classList.add("hide");
    document.getElementById("allActivityLogs").classList.add("hide");
    document.getElementById("addBook").classList.add("hide");
    document.getElementById("editBook").classList.add("hide");
    document
      .getElementById("menu-books")
      .classList.add("admin-menu-div-selected");
    document
      .getElementById("menu-users")
      .classList.remove("admin-menu-div-selected");
    document
      .getElementById("menu-activity")
      .classList.remove("admin-menu-div-selected");
    document.getElementById("search-text-input").value = "";
  } else if (key === "allusers") {
    document.getElementById("title").innerHTML =
      "All Users - Admin - Fermion Physics Club Library";
    document.getElementById("allBooks").classList.add("hide");
    document.getElementById("allUsers").classList.remove("hide");
    document.getElementById("allActivityLogs").classList.add("hide");
    document.getElementById("addBook").classList.add("hide");
    document.getElementById("editBook").classList.add("hide");
    document
      .getElementById("menu-books")
      .classList.remove("admin-menu-div-selected");
    document
      .getElementById("menu-users")
      .classList.add("admin-menu-div-selected");
    document
      .getElementById("menu-activity")
      .classList.remove("admin-menu-div-selected");
  } else if (key === "activitylogs") {
    document.getElementById("title").innerHTML =
      "Activity Logs - Admin - Fermion Physics Club Library";
    document.getElementById("allBooks").classList.add("hide");
    document.getElementById("allUsers").classList.add("hide");
    document.getElementById("allActivityLogs").classList.remove("hide");
    document.getElementById("addBook").classList.add("hide");
    document.getElementById("editBook").classList.add("hide");
    document
      .getElementById("menu-books")
      .classList.remove("admin-menu-div-selected");
    document
      .getElementById("menu-users")
      .classList.remove("admin-menu-div-selected");
    document
      .getElementById("menu-activity")
      .classList.add("admin-menu-div-selected");
  } else if (key === "addbook") {
    document.getElementById("title").innerHTML =
      "Add New Book - Admin - Fermion Physics Club Library";
    document.getElementById("allBooks").classList.add("hide");
    document.getElementById("allUsers").classList.add("hide");
    document.getElementById("allActivityLogs").classList.add("hide");
    document.getElementById("addBook").classList.remove("hide");
    document.getElementById("editBook").classList.add("hide");
    document
      .getElementById("menu-books")
      .classList.remove("admin-menu-div-selected");
    document
      .getElementById("menu-users")
      .classList.remove("admin-menu-div-selected");
    document
      .getElementById("menu-activity")
      .classList.remove("admin-menu-div-selected");
    document.getElementById("booktitle").value = "";
    document.getElementById("author").value = "";
    document.getElementById("image").value = "";
    document.getElementById("ISBN").value = "";
    document.getElementById("courses").value = "";
    document.getElementById("donated").value = "";
    document.getElementById("host").value = "";
    document.getElementById("pdf").value = "";
    showBookID();
  } else if (key === "editbook") {
    document.getElementById("title").innerHTML =
      "Edit Book - Admin - Fermion Physics Club Library";
    document.getElementById("allBooks").classList.add("hide");
    document.getElementById("allUsers").classList.add("hide");
    document.getElementById("allActivityLogs").classList.add("hide");
    document.getElementById("addBook").classList.add("hide");
    document.getElementById("editBook").classList.remove("hide");
    document
      .getElementById("menu-books")
      .classList.remove("admin-menu-div-selected");
    document
      .getElementById("menu-users")
      .classList.remove("admin-menu-div-selected");
    document
      .getElementById("menu-activity")
      .classList.remove("admin-menu-div-selected");
  }
}

function showEditForm(id) {
  database
    .ref("/books/" + id)
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

      document.getElementById("editBook").innerHTML = `
      <form class="add-book-form" onSubmit="return false;">
        <input type="number" value="${id}" onKeyPress="return false;"/>
        <input type="text" id="booktitle2" value="${title}" placeholder="Enter book title.." autocomplete="off" required />
        <input type="text" id="author2" value="${author}" placeholder="Enter book authors.. (Separated by comma)" autocomplete="off" required />
        <input type="text" id="image2" value="${image}" placeholder="Enter book image url.." autocomplete="off" required />
        <input type="text" id="ISBN2" value="${isbn}" placeholder="Enter book ISBN.." autocomplete="off" />
        <input type="text" id="courses2" value="${courses}" placeholder="Enter related course IDs.. (Separated by comma)" autocomplete="off" />
        <input type="text" id="donated2" value="${donated}" placeholder="Enter name of donor.." autocomplete="off" required />
        <select>
          <option value="" selected>Current Host: ${host}</option>
        </select>
        <input type="text" id="pdf2" value="${pdf}" placeholder="Enter url of PDF.." autocomplete="off" />
        <button type="submit" class="signup-btn" onclick="editBookNow('${id}')">
          Edit Book
        </button>
      </form>`;
      showAdminRight("editbook");
    });
}

function showBookID() {
  database
    .ref("/books/")
    .once("value")
    .then((snapshot) => {
      var id = generateID(snapshot.numChildren() + 1);
      document.getElementById("id").value = id;
    });
  document.getElementById("host").innerHTML =
    '<option value="" selected>Select host of this book..</option>';
  database
    .ref("/verified-users/")
    .orderByKey()
    .once("value")
    .then((snap) => {
      snap.forEach(function (childSnap) {
        var sid = childSnap.key;
        var ifid = snap.child(childSnap.key + "/id").exists();
        var name = snap.child(childSnap.key + "/name").val();

        if (ifid) {
          document.getElementById(
            "host"
          ).innerHTML += `<option value="${sid}">${name} (${sid})</option>`;
        }
      });
    });
}

document.getElementById("add_book_btn").onclick = function () {
  var id = document.getElementById("id").value;
  var title = document.getElementById("booktitle").value;
  var author = document.getElementById("author").value;
  var image = document.getElementById("image").value;
  var ISBN = document.getElementById("ISBN").value;
  var courses = document.getElementById("courses").value;
  var donated = document.getElementById("donated").value;
  var host = document.getElementById("host").value;
  var pdf = document.getElementById("pdf").value;
  database
    .ref("/books")
    .once("value")
    .then((snapshot) => {
      var ifbook = snapshot.child(id).exists();

      if (ifbook) {
        alertMessage((t = "danger"), "Book ID is already used!");
      } else {
        if (id && title && author && image && donated && host !== "") {
          database.ref("/books/" + id).update({
            title: title.replace("'", ""),
            author: author.replace("'", ""),
            image: image,
            ISBN: ISBN,
            courses: courses,
            donated: donated,
            host: host,
            pdf: pdf,
            added: moment().format("DD MMMM YYYY"),
          });
          database
            .ref("/verified-users/" + host)
            .once("value")
            .then((snapshot) => {
              var sid = snapshot.child("id").val();
              database.ref("/users/" + sid + "/books/" + id).set(true);
            });

          database
            .ref("/users/" + userdata.uid)
            .once("value")
            .then((snapshot) => {
              var name = snapshot.child("name").val();
              var uid = snapshot.child("id").val();

              addToLogs(
                name +
                  " (" +
                  uid +
                  ') added a new book titled "' +
                  title +
                  '", authored by ' +
                  author +
                  ". Book ID: " +
                  id +
                  "."
              );
            });
          showAdminRight("allbooks");
        }
      }
    });
};

function editBookNow(id) {
  var title = document.getElementById("booktitle2").value;
  var author = document.getElementById("author2").value;
  var image = document.getElementById("image2").value;
  var ISBN = document.getElementById("ISBN2").value;
  var courses = document.getElementById("courses2").value;
  var donated = document.getElementById("donated2").value;
  var pdf = document.getElementById("pdf2").value;

  if (title && author && image && donated) {
    database.ref("/books/" + id).update({
      title: title.replace("'", ""),
      author: author.replace("'", ""),
      image: image,
      ISBN: ISBN,
      courses: courses,
      donated: donated,
      pdf: pdf,
    });

    database
      .ref("/users/" + userdata.uid)
      .once("value")
      .then((snapshot) => {
        var name = snapshot.child("name").val();
        var uid = snapshot.child("id").val();

        addToLogs(
          name +
            " (" +
            uid +
            ') edited a book titled "' +
            title +
            '", authored by ' +
            author +
            ". Book ID: " +
            id +
            "."
        );
      });
    showAdminRight("allbooks");
    alertMessage((t = "success"), "Book edited successfully!");
  }
}

function generateID(num) {
  var s = "000000000" + num;
  return s.substr(s.length - 4);
}

document.getElementById("add_user_btn").onclick = function () {
  var id = document.getElementById("student-id").value;
  var email = document.getElementById("student-email").value;

  database
    .ref("/verified-users")
    .once("value")
    .then((snapshot) => {
      var ifemail = snapshot.child(id + "/email").exists();

      if (id && email) {
        if (ifemail === true) {
          alertMessage((t = "danger"), "Student ID is already used!");
        } else if (email.includes("@gmail.com") === false) {
          alertMessage((t = "danger"), "Please enter a valid gmail address!");
        } else if (JSON.stringify(snapshot.val()).includes(email) === true) {
          alertMessage((t = "danger"), "Gmail address is already used!");
        } else {
          database.ref("/verified-users/" + id).update({
            email: email,
          });
          database
            .ref("/users/" + userdata.uid)
            .once("value")
            .then((snapshot) => {
              var name = snapshot.child("name").val();
              var uid = snapshot.child("id").val();

              addToLogs(
                name +
                  " (" +
                  uid +
                  ') added a new user. Student ID: "' +
                  id +
                  ". Email: " +
                  email +
                  "."
              );
            });
          sendEmail(
            email,
            "Join the Fermion Physics Club Library and Unleash Your Inner Genius",
            `Greetings fellow lifeform! <br><br>
            Do you ever feel like a lone electron floating through space, searching for a
            community of people who share your love of physics? Well, look no further than
            the Fermion Physics Club! <br><br>
            We're thrilled to announce the newest addition to our club - the Fermion
            Physics Club Library. Our library is like a black hole of knowledge, filled
            with physical books and digital PDFs that will satisfy even the most hardcore
            physics enthusiasts. Whether you're into relativity, quantum mechanics, or
            classical mechanics, we've got you covered. And don't worry if you're not
            sure where to start - our user-friendly interface makes browsing and
            borrowing a breeze. <br><br>
            But the real magic of the Fermion Physics Club Library is the community. We're
            a group of passionate physicists who love nothing more than sharing our
            knowledge and discussing the latest breakthroughs. Whether you're a seasoned
            expert or just starting your physics journey, we welcome you with open arms
            (and maybe even a high five or two). <br><br>
            So come join us and unleash your inner genius. Who knows, maybe you'll even
            discover the secret to time travel (no promises, though). <br><br>
            <b>Your Log In Informations:</b> <br>
            <a href="https://library.fermionku.com">Fermion Physics Club Library</a> <br>
            Student ID: ${id} <br>
            Email: ${email} <br><br>
            Yours scientifically, <br>
            The Fermion Physics Club Library <br><br>
            P.S. Just a heads up, our library is known to cause extreme levels of
            excitement, so make sure you're prepared with a cold glass of water and
            a cozy blanket before diving in. <br><br>`
          );
          showAllUsers();
          showActivityLogs();
          document.getElementById("student-id").value = "";
          document.getElementById("student-email").value = "";
        }
      } else {
        alertMessage((t = "danger"), "Please enter values!");
      }
    });
};

function addToLogs(msg) {
  database.ref("/logs/" + moment().format("x")).update({
    time: moment().format("LT, DD MMMM YYYY"),
    details: msg,
  });
  document.getElementById("activityLogs").innerHTML += `
  <div class="admin-item3">
    <span>${moment().format("LT, DD MMMM YYYY")}</span>
    ${msg}
  </div>`;
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

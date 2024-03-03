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
  showBooks();
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


function showBooks() {
  document.getElementById("Books").innerHTML = "";
  database
    .ref("/books")
    .orderByKey()
    .limitToLast(50)
    .once("value")
    .then((snap) => {
      snap.forEach(function (childSnap) {
        var title = snap.child(childSnap.key + "/title").val();
        var author = snap.child(childSnap.key + "/author").val();
        var image = snap.child(childSnap.key + "/image").val();

        document.getElementById("Books").innerHTML += `
          <div class="book">
            <img src="${image}" alt="" />
            <div class="book-desc">
              <b>${title}</b> <br />
              ${author}
            </div>
            <div class="preview-btn" onclick="goTo('../book?id=${childSnap.key}')">Preview Book</div>
          </div>`;
      });
    });
  document.getElementById("Books").innerHTML += "<span id='lalala'></span>";
}

document.getElementById("search-text-input").addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    showSearchResult();
  }
});

window.addEventListener('click', function(e){   
  if (document.getElementById('userInner').contains(e.target)){
    // Clicked in box
  } else{
    var text = document.getElementById("search-text-input").value.toLowerCase();
    if(text === '' && document.getElementById('Books').contains(document.getElementById('lalala')) === false){
      showBooks();
    }
  }
});

function showSearchResult() {
  var text = document.getElementById("search-text-input").value.toLowerCase();

  if (text) {
    document.getElementById("Books").innerHTML = "";

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
                  document.getElementById("Books").innerHTML += `
                  <div class="book">
                    <img src="${image}" alt="" />
                    <div class="book-desc">
                      <b>${title}</b> <br />
                      ${author}
                    </div>
                    <div class="preview-btn" onclick="goTo('../book?id=${childSnap.key}')">Preview Book</div>
                  </div>`;
                }
              });
            });
        } else {
          document.getElementById("Books").innerHTML = `
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

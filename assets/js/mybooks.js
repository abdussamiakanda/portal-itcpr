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
  .ref("/users/"+userdata.uid)
  .once("value")
  .then((snapshot) => {
      var ifbook = snapshot.child("books").exists();
      if (ifbook) {
        database
        .ref("/users/"+userdata.uid+"/books")
        .orderByKey()
        .once("value")
        .then((snap) => {
          snap.forEach(function (cSnap) {
    
            database
            .ref("/books/" + cSnap.key)
            .once("value")
            .then((snapshot) => {
                var title = snapshot.child("title").val();
                var author = snapshot.child("author").val();
                var image = snapshot.child("image").val();
    
                document.getElementById("Books").innerHTML += `
                <div class="book">
                  <img src="${image}" alt="" />
                  <div class="book-desc">
                    <b>${title}</b> <br />
                    ${author}
                  </div>
                  <div class="preview-btn" onclick="goTo('../book?id=${cSnap.key}')">Preview Book</div>
                </div>`;
            })
          });
        });
      } else {
        document.getElementById("Books").innerHTML = `
          <div style='text-align:center;padding:20px 0px;'>
            You currently have no books in possession!
          </div>`
      }
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

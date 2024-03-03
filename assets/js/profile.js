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
  showProfile();
}

function showUserInfoCorner(user) {
    database
      .ref("/users/" + user.uid)
      .once("value")
      .then((snapshot) => {
        var image = snapshot.child("image").val();
        var role = snapshot.child("role").val();
        var name = snapshot.child("name").val();

        if (role === "Member") {
          document.getElementById("adminLogo").remove();
        }

        document.title = name + " - Profile - Fermion Physics Club Library";

        document.getElementById(
          "userCorner"
        ).innerHTML = `<span class="tooltiptext">Profile</span>
        <img src="${image}" alt="" />`;
    });
}

function showProfile() {
  database
  .ref("/users/" + userdata.uid)
  .once("value")
  .then((snapshot) => {
    var image = snapshot.child("image").val();
    var name = snapshot.child("name").val();
    var id = snapshot.child("id").val();
    var batch = snapshot.child("batch").val();
    var contact = snapshot.child("contact").val();
    var email = snapshot.child("email").val();

    document.getElementById('profile-top').innerHTML = `
      <img src="${image}" alt="">
      <b>Welcome, ${name}!</b>
      `;
    document.getElementById("name").value = name;
    document.getElementById('stu-id').innerHTML = id;
    document.getElementById('batch').innerHTML = batch;
    document.getElementById("contact").value = contact;
    document.getElementById('email').innerHTML = email;
  })
}

function noEditLol() {
  alertMessage(t = "danger", "You can't edit this value.")
}

function editProfile() {
  var name = document.getElementById("name").value;
  var contact = document.getElementById("contact").value;

  database
  .ref("/users/" + userdata.uid)
  .once("value")
  .then((snapshot) => {
    var name2 = snapshot.child("name").val();
    var contact2 = snapshot.child("contact").val();
    var id = snapshot.child("id").val();

    if((name && contact) && (name !== name2 || contact !== contact2)) {
      database.ref("/verified-users/" + id).update({
        name: name,
      });
      database.ref("/users/" + userdata.uid).update({
        name: name,
        contact: contact,
      });
      alertMessage(t = "success", "Your profile is updated!");
      showProfile();
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

var provider = new firebase.auth.GoogleAuthProvider();
var database = firebase.database();
var userdata = null;
var emailKey = null;
let entireDbSnapshot = null;

function sanitizeEmail(email) {
  return email.replace(/[^a-zA-Z0-9]/g, '');
}

function GoogleLogin() {
  firebase.auth().signInWithPopup(provider).then(res => {
    verifyUser(res.user);
  }).catch((e) => {
    console.error("Login failed:", e);
  });
}

function checkAuthState(){
  firebase.auth().onAuthStateChanged(user=>{
    if(user){
      userdata = user;
      emailKey = sanitizeEmail(userdata.email.replace("@gmail.com", ""));
      verifyUser(user);
    } else {
      showDiv('login');
    }
  })
}

function verifyUser(user){
  var isEmail = false;
  var email = user.email
  database.ref('/users').orderByKey().once("value").then((snapshot) => {
    isEmail = snapshot.child(sanitizeEmail(email.replace("@gmail.com", ""))).exists();
    const position = snapshot.child(sanitizeEmail(email.replace("@gmail.com", ""))+"/position").val();

    if(isEmail === true && position !== "Terminated"){
      verified(user);
    }else {
      showDiv('login');
      deleteEmail();
      alertMessage(t="success","You don't have access to this website!");
      GoogleLogout();
    }
  })
}

function deleteEmail(){
  const user = firebase.auth().currentUser;
  user.delete().then(() => {}).catch((error) => {});
  GoogleLogout();
}

function GoogleLogout() {
  firebase
    .auth()
    .signOut()
    .then(() => {
      checkAuthState();
      document.getElementById('pc-menu').innerHTML = '';
    })
    .catch((e) => {
      console.log(e);
    });
}

function verified(user){
  database.ref('/users/' + sanitizeEmail(user.email.replace("@gmail.com", ""))).update({image: user.photoURL});
  database.ref().once("value").then(snapshot => {
    entireDbSnapshot = snapshot;
  }).catch(error => {
    console.error("Error loading the entire database: ", error);
  }).then(() => {
    checkUser(user);
    showTopHeader(user);
    handleLastLogin(user);
  });
}

function checkUser(user) {
  const snapshot = entireDbSnapshot.child('/users/'+emailKey);
  const isNew = snapshot.child('new').val();

  if (isNew === true) {
    showDiv('checklist');
  } else {
    showDiv('dashboard');
  }
}

function handleLastLogin(user) {
  var userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = moment.tz(userTimeZone).valueOf();
  const date = new Date(time);
  const options = { hour: 'numeric', minute: 'numeric', year: 'numeric', month: 'long', day: 'numeric', hour12: true };
  const formattedDateTime = new Intl.DateTimeFormat('en-US', options).format(date);

  database.ref('/users/' + emailKey).update({
    lastlogin: formattedDateTime,
    timezone: userTimeZone,
    location: "Portal",
  });
}

function showDiv(div_id){
  const divs = ["login","checklist","dashboard","people","group","admin","apply","profile"];
  for (let i = 0; i < divs.length; i++) {
    if (divs[i] !== div_id){
      document.getElementById(divs[i]).innerHTML = "";
    } else {
      show(divs[i]);
    }
  }
}

function showLogin(){
  document.getElementById('menu-top').innerHTML = "";
  document.getElementById('login').innerHTML = `<div class="login-div">
    <div class="login-form" id="login_form">
      <div class="login-item" id="login_btn">
        <i class="login-i fa fa-google"></i> <b>Log in with Google</b>
      </div>
      <br><br><br>
      <div class="login-item" onclick="showDiv('apply')">
        <i class="fa-brands fa-wpforms"></i> <b>Apply Now</b>
      </div>
    </div>
  </div>`;
  document.getElementById("login_btn").setAttribute("onclick", "GoogleLogin()");
}

function show(div){
  if (div === 'login'){
    showLogin();
  } else if (div === 'checklist'){
    showChecklist();
  } else if (div === 'dashboard'){
    showDashboard();
    showHeaderMenu('dashboard');
  } else if (div === 'people'){
    showPeople();
    showHeaderMenu('people');
  } else if (div === 'admin'){
    showAdmin('events');
    showHeaderMenu('admin');
  } else if (div === 'group'){
    showGroup('tasks');
    showHeaderMenu('group');
  } else if (div === 'apply'){
    showApplyForm();
  } else if (div === 'profile'){
    showProfile();
  }
}

checkAuthState();

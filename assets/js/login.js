var provider = new firebase.auth.GoogleAuthProvider();
var database = firebase.database();
var userdata = null;

function GoogleLogin() {
  firebase.auth().signInWithPopup(provider).then(res=>{
    verifyUser(user);
  }).catch((e)=>{})
}

function checkAuthState(){
  firebase.auth().onAuthStateChanged(user=>{
    if(user){
      userdata = user;
      verifyUser(user);
    }else{
      showDiv('login');
    }
  })
}

function verifyUser(user){
  var isEmail = false;
  var email = user.email
  database.ref('/users').orderByKey().once("value").then((snapshot) => {
    isEmail = snapshot.child(email.replace("@gmail.com", "")).exists();

    if(isEmail === true){
      verified(user);
    }else {
      showDiv('login');
      deleteEmail();
    }
  })
}

function deleteEmail(){
  const user = firebase.auth().currentUser;
  user.delete().then(() => {}).catch((error) => {});
  GoogleLogout();
}

function GoogleLogout() {
  console.log('ok');
  firebase
    .auth()
    .signOut()
    .then(() => {
      checkAuthState();
    })
    .catch((e) => {
      console.log(e);
    });
}

function verified(user){
  checkUser(user);
  showTopHeader(user);
}

function checkUser(user){
  database.ref('/users/'+user.email.replace("@gmail.com", "")).orderByKey().once("value").then((snapshot) => {
    isNew = snapshot.child('new').val();

    if(isNew === true){
      showDiv('checklist');
    }else {
      showDiv('dashboard');
      showHeaderMenu();
    }
  })
}

function showDiv(div_id){
  const divs = ["login","checklist","dashboard"];
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
  }
}
checkAuthState()

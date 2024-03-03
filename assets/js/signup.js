var provider = new firebase.auth.GoogleAuthProvider();
var database = firebase.database();
var userdata = null;

function checkAuthState(){
  firebase.auth().onAuthStateChanged(user=>{
    if(user){
      userdata = user;
      verifyUser(user);
    }else{
      window.location.href = "../login";
    }
  })
}

function verifyUser(user){
  var isEmail = false;
  var isName = false;
  database.ref('/verified-users').orderByKey().once("value").then((snapshot) => {
    snapshot.forEach(function(childSnapshot){
      var email = snapshot.child(childSnapshot.key+'/email').val();
      var name = snapshot.child(childSnapshot.key+'/name').val();

      if(email === user.email && name){
        isEmail = true;
        isName = true;
      }else if(email === user.email && !name){
        isEmail = true;
        isName = false;
      }
    })

    if(isEmail === true && isName === false){
      console.log('ok');
    }else if(isEmail === true && isName === true){
      verified(user);
    }else if(isEmail === false){
      deleteEmail();
      window.location.href = "../login";
    }
  })
}

function deleteEmail(){
  const user = firebase.auth().currentUser;
  user.delete().then(() => {}).catch((error) => {});
}

function verified(user){
  window.location.href = "../books";
}


// LOGIN FORM

document.getElementById("signup_btn").onclick = function (){
  var name = document.getElementById('name').value;
  var id = document.getElementById('id').value;
  var batch = document.getElementById('batch').value;
  var contact = document.getElementById('contact').value;

  database.ref('/verified-users/'+id).once("value").then((snapshot) => {
    var useremail = snapshot.child('email').exists();
    var username = snapshot.child('name').exists();

    if(useremail === false && username === false){
      alertMessage(t="danger", "Student ID does not match!");
    }else if(useremail === true && username === true){
      alertMessage(t="danger", "Student ID is already in use!");
    }else if (useremail === true && username === false){
      if(name && id && batch > 9 && contact){
        database.ref('/users/'+userdata.uid).update({
          name: name,
          id: id,
          batch: batch,
          contact: contact,
          email: userdata.email,
          image: userdata.photoURL,
          role: 'Member',
        })
        database.ref('/verified-users/'+id).update({
          name: name,
          id: userdata.uid,
        })
        checkAuthState();
        alertMessage(t="success", "Welcome, "+userdata.displayName);
      } else if(batch <= 10){
        alertMessage(t="danger", "You have entered a invalid batch!");
      } else {
        alertMessage(t="danger", "Please fill up necessary fields!");
      }
    }
  })
}

function alertMessage(t="success", message){
  let x = document.getElementById("alerts")
  let content = ``
  if(t==="success") {
      x.classList.add("show-alerts-success")
      setTimeout(function(){ x.className = x.className.replace("show-alerts-success", ""); }, 2000);
      content += `
              ${message}`
      x.innerHTML = content;
  }
  else {
      x.classList.add("show-alerts-danger")
      setTimeout(function(){ x.className = x.className.replace("show-alerts-danger", ""); }, 2000);
      content += `
              ${message}`
      x.innerHTML = content;
  }
}

checkAuthState()


function GoogleLogout() {
  firebase.auth().signOut().then(()=>{
  }).catch((e)=>{
    console.log(e)
  })
}


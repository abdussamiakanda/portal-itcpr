function myHeader() {
  document.getElementById("header").innerHTML = `<div class="menu">
  <div class="menu-top" id="menu-top"></div>
  <div class="menu-bar">
    <div class="icon" onclick="goTo('./')">
      ITCPR
    </div>
    <div class="pc-menu" id="pc-menu"></div>
  </div>
</div>`;
}

function showTopHeader(){
  document.getElementById('menu-top').innerHTML = `<div>`+ userdata.displayName +`</div>
    <div class="bar"></div>
    <div onclick="GoogleLogout()">LOGOUT</div>`;
}

function showHeaderMenu(div) {
  database.ref('/users/' + userdata.email.replace("@gmail.com", "")).once("value").then((snapshot) => {
    var position = snapshot.child('position').val();

    document.getElementById('pc-menu').innerHTML = `
      <div class="menu-item${div === 'dashboard' ? ' selected' : ''}" ${div !== 'dashboard' ? `onclick="showDiv('dashboard')"` : ''}>
        DASHBOARD
      </div>
      <div class="menu-item${div === 'people' ? ' selected' : ''}" ${div !== 'people' ? `onclick="showDiv('people')"` : ''}>
        PEOPLE
      </div>
      ${position !== "Intern" && position !== "Member" ? `
      <div class="menu-item${div === 'admin' ? ' selected' : ''}" ${div !== 'admin' ? `onclick="showDiv('admin')"` : ''}>
        ADMIN
      </div>
      ` : ''}`;

  });
}

function goTo(path) {
  window.location.assign(path);
}

function goToExternal(path) {
  window.open(path, "_blank");
}

myHeader();

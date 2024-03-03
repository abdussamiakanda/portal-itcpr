function myHeader() {
  document.getElementById("header").innerHTML = `<div class="menu">
  <div class="menu-top" id="menu-top"></div>
  <div class="menu-bar">
    <div class="icon" onclick="goTo('./../../../')">
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

function showHeaderMenu(){
  document.getElementById('pc-menu').innerHTML = `<div class="menu-item" onclick="goTo('./../../../outreach')">
    OUTREACH
  </div>
  <div class="menu-item" onclick="goTo('./../../../people')">
    PEOPLE
  </div>`;
}

function goTo(path) {
  window.location.assign(path);
}

function goToExternal(path) {
  window.open(path, "_blank");
}

myHeader();

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

function showHeaderMenu(selectedDiv = '') {
  // Directly access the user data from the snapshot
  const userSnapshot = entireDbSnapshot.child('/users/' + emailKey);
  const position = userSnapshot.child('position').val();
  const group = userSnapshot.child('group').val();
  const type = userSnapshot.child('type').val();

  const menuItems = [
    { name: 'DASHBOARD', onclick: "showDiv('dashboard')", id: 'dashboard' },
    { name: group.toUpperCase(), onclick: "showDiv('group')", id: 'group' }, // Using id: 'group' for identification
    { name: 'PEOPLE', onclick: "showDiv('people')", id: 'people' },
    { name: 'ADMIN', onclick: "showDiv('admin')", id: 'admin', allowed: position !== "Intern" && (position !== "Member" || type === 'admin') },
  ];

  const pcMenu = document.getElementById('pc-menu');
  pcMenu.innerHTML = menuItems
    .filter(item => item.allowed !== false) // Filters out any items where allowed is explicitly set to false
    .map(item => {
      // Use item.id to determine if this item is selected
      const isSelected = item.id === selectedDiv;
      const itemClass = isSelected ? ' selected' : '';
      return `<div class="menu-item${itemClass}" onclick="${item.onclick}">${item.name}</div>`;
    })
    .join('');
}



function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function goTo(path) {
  window.location.assign(path);
}

function goToExternal(path) {
  window.open(path, "_blank");
}

myHeader();

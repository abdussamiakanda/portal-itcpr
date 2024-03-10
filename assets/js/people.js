function showPeople() {
  document.getElementById('people').innerHTML = `
  <div class="academic1">
    <div class="filters">
      <div>
        <i class="fa-solid fa-filter"></i> FILTERS:
      </div>
      <div>
        <select id="myDropdown1" class="dropdown">
          <option value="">Filter by Group</option>
          <option value="Spintronics">Spintronics Group</option>
          <option value="Photonics">Photonics Group</option>
        </select>
      </div>
      <div>
        <select id="myDropdown2" class="dropdown">
          <option value="">Filter by User Type</option>
          <option value="Intern">Interns</option>
          <option value="Member">Members</option>
        </select>
      </div>
      <div class="filter-btn" onclick="applyFilters()">Apply</div>
    </div>
    <div class="allpeople" id="allpeople"></div>
  </div>`;

  // Accessing all users from the snapshot
  const usersSnapshot = entireDbSnapshot.child('/users');
  
  usersSnapshot.forEach(function (childSnapshot) {
    var name = childSnapshot.child("/name").val();
    var group = childSnapshot.child("/group").val();
    var position = childSnapshot.child("/position").val();
    var email = childSnapshot.child("/email").val();
    var url = childSnapshot.child("/url").val();

    if (emailKey !== childSnapshot.key && position !== 'Terminated') {
      document.getElementById('allpeople').innerHTML += `
      <div class="people">
        <img src="./../../assets/image/users/${childSnapshot.key}.jpg" onerror="this.onerror=null;this.src='./../../assets/image/users/default.jpg';" alt="">
        <div>
          <b>${name}</b> <br>
          ${position}, ${capitalizeFirstLetter(group)} Group
          <div class='event-icons'>
            <i class="fa-solid fa-envelope" onclick="copyToClipboard('${email}')"></i>
            ${url ? `<i class="fa-solid fa-link" onclick="goToExternal('`+url+`')"></i>` : ''}
          </div>
        </div>
      </div>`;
    }
  });
}


function applyFilters() {
  var drop1 = document.getElementById("myDropdown1").value;
  var drop2 = document.getElementById("myDropdown2").value;
  var htmlContent = '';

  const usersSnapshot = entireDbSnapshot.child('/users');

  usersSnapshot.forEach(function (childSnapshot) {
    var name = childSnapshot.child("name").val();
    var group = childSnapshot.child("group").val();
    var position = childSnapshot.child("position").val();
    var email = childSnapshot.child("email").val();
    var url = childSnapshot.child("url").val();

    // Determine if the current childSnapshot should be filtered based on dropdown values
    var matchesGroupFilter = drop1 === "" || drop1 === capitalizeFirstLetter(group);
    var matchesPositionFilter = drop2 === "" || drop2 === position;

    // Exclude the current user (emailKey) and terminated positions from being shown
    if (emailKey !== childSnapshot.key && position !== 'Terminated' && matchesGroupFilter && matchesPositionFilter) {
      htmlContent += `
      <div class="people">
        <img src="./../../assets/image/users/${childSnapshot.key}.jpg" onerror="this.onerror=null;this.src='./../../assets/image/users/default.jpg';" alt="">
        <div>
          <b>${name}</b> <br>
          ${position}, ${capitalizeFirstLetter(group)} Group
          <div class='event-icons'>
            <i class="fa-solid fa-envelope" onclick="copyToClipboard('${email}')"></i>
            ${url ? `<i class="fa-solid fa-link" onclick="goToExternal('`+url+`')"></i>` : ''}
          </div>
        </div>
      </div>`;
    }
  });

  // Update the HTML content with filtered users or indicate no users matched if htmlContent is still empty
  document.getElementById('allpeople').innerHTML = htmlContent || 'No matched user found!';
}


function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alertMessage(t="success","Email copied to clipboard!");
}
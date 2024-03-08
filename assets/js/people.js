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

  database.ref('/users').orderByKey().once("value").then((snapshot) => {
    snapshot.forEach(function (childSnapshot) {
      var name = snapshot.child(childSnapshot.key + "/name").val();
      var group = snapshot.child(childSnapshot.key + "/group").val();
      var position = snapshot.child(childSnapshot.key + "/position").val();
      var email = snapshot.child(childSnapshot.key + "/email").val();
      var url = snapshot.child(childSnapshot.key + "/url").val();

      if (emailKey !== childSnapshot.key && position !== 'Terminated') {
        document.getElementById('allpeople').innerHTML += `
        <div class="people">
          <img src="./../../assets/image/users/${childSnapshot.key}.jpg" alt="">
          <div>
            <b>${name}</b> <br>
            ${position}, ${capitalizeFirstLetter(group)} Group
            <div class='event-icons'>
              <i class="fa-solid fa-envelope" onclick="copyToClipboard('${email}')"></i>
              ${url ? `<i class="fa-solid fa-link" onclick="goToExternal('`+url+`')"></i>` : ''}
            </div>
          </div>
        </div>`
      }
    })
  })
}

function applyFilters() {
  var drop1 = document.getElementById("myDropdown1").value;
  var drop2 = document.getElementById("myDropdown2").value;

  if (!drop1 && !drop2) {
    showPeople();
  } else if (drop1 || drop2) {
    document.getElementById('allpeople').innerHTML = '';
    database.ref('/users').orderByKey().once("value").then((snapshot) => {
      snapshot.forEach(function (childSnapshot) {
        var name = snapshot.child(childSnapshot.key + "/name").val();
        var group = snapshot.child(childSnapshot.key + "/group").val();
        var position = snapshot.child(childSnapshot.key + "/position").val();
        var email = snapshot.child(childSnapshot.key + "/email").val();
        var url = snapshot.child(childSnapshot.key + "/url").val();
        var isIntern = position === 'Intern';
        var isInt = drop2 === 'Intern';
        
        if (drop1 && !drop2 && emailKey !== childSnapshot.key && position !== 'Terminated' && drop1 === capitalizeFirstLetter(group)) {
          document.getElementById('allpeople').innerHTML += `
          <div class="people">
            <img src="./../../assets/image/users/${childSnapshot.key}.jpg" alt="">
            <div>
              <b>${name}</b> <br>
              ${position}, ${capitalizeFirstLetter(group)} Group
              <div class='event-icons'>
                <i class="fa-solid fa-envelope" onclick="copyToClipboard('${email}')"></i>
                ${url ? `<i class="fa-solid fa-link" onclick="goToExternal('`+url+`')"></i>` : ''}
              </div>
            </div>
          </div>`
        } else if (!drop1 && drop2 && emailKey !== childSnapshot.key && position !== 'Terminated' && isIntern === isInt) {
          document.getElementById('allpeople').innerHTML += `
          <div class="people">
            <img src="./../../assets/image/users/${childSnapshot.key}.jpg" alt="">
            <div>
              <b>${name}</b> <br>
              ${position}, ${capitalizeFirstLetter(group)} Group
              <div class='event-icons'>
                <i class="fa-solid fa-envelope" onclick="copyToClipboard('${email}')"></i>
                ${url ? `<i class="fa-solid fa-link" onclick="goToExternal('`+url+`')"></i>` : ''}
              </div>
            </div>
          </div>`
        } else if (drop1 && drop2 && emailKey !== childSnapshot.key && position !== 'Terminated' && drop1 === capitalizeFirstLetter(group) && isIntern === isInt) {
          document.getElementById('allpeople').innerHTML += `
          <div class="people">
            <img src="./../../assets/image/users/${childSnapshot.key}.jpg" alt="">
            <div>
              <b>${name}</b> <br>
              ${position}, ${capitalizeFirstLetter(group)} Group
              <div class='event-icons'>
                <i class="fa-solid fa-envelope" onclick="copyToClipboard('${email}')"></i>
                ${url ? `<i class="fa-solid fa-link" onclick="goToExternal('`+url+`')"></i>` : ''}
              </div>
            </div>
          </div>`
        } else if (emailKey !== childSnapshot.key) {
          document.getElementById('allpeople').innerHTML = 'No matched user found!';
        }
      })
    })
  }
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alertMessage(t="success","Email copied to clipboard!");
}
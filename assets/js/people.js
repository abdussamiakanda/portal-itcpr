function showPeople() {
  document.getElementById('people').innerHTML = `
  <div class="academic1">
    <div class="filters">
      <div>
        <i class="fa-solid fa-filter"></i> FILTERS:
      </div>
      <div>
        <select id="myDropdown" class="dropdown">
          <option value="">Filter by Group</option>
          <option value="Spintronics">Spintronics Group</option>
          <option value="Photonics">Photonics Group</option>
        </select>
      </div>
      <div>
        <select id="myDropdown" class="dropdown">
          <option value="">Filter by User Type</option>
          <option value="Intern">Interns</option>
          <option value="Member">Members</option>
        </select>
      </div>
    </div>
    <div class="allpeople" id="allpeople"></div>
  </div>`;

  database.ref('/users').orderByKey().once("value").then((snapshot) => {
    snapshot.forEach(function (childSnapshot) {
      var name = snapshot.child(childSnapshot.key + "/name").val();
      var group = snapshot.child(childSnapshot.key + "/group").val();
      var position = snapshot.child(childSnapshot.key + "/position").val();
      var email = snapshot.child(childSnapshot.key + "/email").val();

      if (userdata.email.replace("@gmail.com", "") === childSnapshot.key) {
        document.getElementById('allpeople').innerHTML += `
        <div class="people">
          <img src="./../../assets/image/users/${childSnapshot.key}.jpg" alt="">
          <div>
            <b>${name}</b> <br>
            ${position}, ${capitalizeFirstLetter(group)} Group <br>
            ${email}, URL
          </div>
        </div>`
      }
    })
  })
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
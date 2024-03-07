function showAdmin(div) {
  database.ref('/users/'+userdata.email.replace("@gmail.com", "")).once("value").then((snapshot) => {
    var type = snapshot.child('type').val();

    document.getElementById('admin').innerHTML = `
    <div class="academic1">
      <div class="admin-top">
        <div class="${div === 'events' ? 'selected' : ''}" onclick="showAdmin('events')">EVENTS</div>
        <div class="${div === 'notices' ? 'selected' : ''}" onclick="showAdmin('notices')">NOTICES</div>
        ${type === 'admin' ? `<div class="${div === 'users' ? 'selected' : ''}" onclick="showAdmin('users')">USERS</div>` : ''}
      </div>
      <div class="admin-contents" id="admin-contents"></div>
    </div>
    `;
  }).then(() => {
    if (div === 'events') {
      showAdminEvents();
    } else if (div === 'notices') {
      showAdminNotices();
    } else if (div === 'users') {
      showAdminUsers();
    }
  });
}

function showAdminEvents() {
  document.getElementById('admin-contents').innerHTML = `
  <div class="adduser-btn-container"><div class="adduser-btn"><i class="fa-solid fa-plus"></i> Add Event</div></div>
  <div id="admin-events" class="admin-events"></div>
  `;
  showAdminEvent();
}

function showAdminNotices() {
  document.getElementById('admin-contents').innerHTML = `
  <div class="adduser-btn-container"><div class="adduser-btn"><i class="fa-solid fa-plus"></i> Add Notice</div></div>
  <div id="admin-notices" class="admin-events"></div>
  `;
  showAdminNotice();
}

function showAdminUsers() {
  document.getElementById('admin-contents').innerHTML = `
  <div class="adduser-btn-container"><div class="adduser-btn"><i class="fa-solid fa-plus"></i> Add User</div></div>
  <div class="users-top">
    <div>NAME</div>
    <div>POSITION</div>
    <div>GROUP</div>
    <div>QUARTILE</div>
    <div>EDIT</div>
  </div>
  <div id="admin-users"></div>
  `;
  showAdminUser();
}

function showAdminEvent() {
  document.getElementById('admin-events').innerHTML = '';
  database.ref('/users/' + userdata.email.replace("@gmail.com", "")).once("value").then((snapshot) => {
    var group = snapshot.child('group').val();

    database.ref('/groups/' + group + '/events').orderByKey().once("value").then((snapshot1) => {
      const events = [];
      snapshot1.forEach((childSnapshot) => {
        const eventData = childSnapshot.val();
        eventData.key = childSnapshot.key;
        events.push(eventData);
      });

      const reversedEvents = events.reverse();

      reversedEvents.forEach((event) => {
        const { title, time, meeting, attachment, key } = event;

        document.getElementById('admin-events').innerHTML += `
          <div class='admin-event'>
            <b>${title}</b> <br>
            <span class='time'>${time}</span>
            <span class='event-icons'>
              <i class="fa-solid fa-video" onclick="goToExternal('${meeting}')"> Google Meet</i>
              <i class="fa-solid fa-paperclip" onclick="goToExternal('${attachment}')"> Attachment</i>
            </span>
          </div>`;
      });
      var whatif = document.getElementById('admin-events').innerHTML;

      if (whatif === '') {
        document.getElementById('admin-events').innerHTML = 'No events found!'
      }
    });
  });
}

function showAdminNotice() {
  document.getElementById('admin-notices').innerHTML = '';
  database.ref('/users/'+userdata.email.replace("@gmail.com", "")).once("value").then((snapshot) => {
    var group = snapshot.child('group').val();
    var position = snapshot.child('position').val();

    database.ref('/notices').orderByKey().once("value").then((snapshot1) => {
      snapshot1.forEach(function (childSnapshot) {
        var title = snapshot1.child(childSnapshot.key + "/title").val();
        var text = snapshot1.child(childSnapshot.key + "/text").val();
        var till = snapshot1.child(childSnapshot.key + "/till").val();
        var criteria = snapshot1.child(childSnapshot.key + "/criteria").val();

        document.getElementById('admin-notices').innerHTML += `
        <div class='event notice'>
          <b>${title}</b> <br>
          <span>${text}</span>
        </div>`;
      });
    }).then(() => {
      var whatif = document.getElementById('admin-notices').innerHTML;
  
      if (whatif === '') {
        document.getElementById('admin-notices').innerHTML = 'No notices found!'
      }
    })
  })
}

function showAdminUser() {
  document.getElementById('admin-users').innerHTML = '';
  database.ref('/users').orderByKey().once("value").then((snapshot1) => {
    snapshot1.forEach(function (childSnapshot) {
      var name = snapshot1.child(childSnapshot.key + "/name").val();
      var position = snapshot1.child(childSnapshot.key + "/position").val();
      var group = snapshot1.child(childSnapshot.key + "/group").val();
      var quartile = snapshot1.child(childSnapshot.key + "/quartile").val();

      document.getElementById('admin-users').innerHTML += `
      <div class="admin-user">
        <div>${name}</div>
        <div>${position}</div>
        <div>${capitalizeFirstLetter(group)}</div>
        <div>${quartile === 1 ? '1st' : '2nd'} Quartile</div>
        <div>${userdata.email.replace("@gmail.com", "") !== childSnapshot.key ? `<i class="fa-solid fa-pen-to-square"></i>` : ''}</div>
      </div>`;
    });
  });
}



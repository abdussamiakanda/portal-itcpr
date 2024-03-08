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
  <div class="adduser-btn-container"><div class="adduser-btn" onclick="eventDiv()"><i class="fa-solid fa-plus"></i> Add Event</div></div>
  <div id="admin-events" class="admin-events"></div>
  `;
  showAdminEvent();
}

function eventDiv() {
  document.getElementById('admin-contents').innerHTML = `
  <div id="admin-event-form">
    <form>
      <div class="form-top">
        <input type="text" id="title" placeholder="Enter Meeting Title..">
        <input type="datetime-local" id="time">
      </div>
      <input type="text" id="meeting" placeholder="Enter Meeting URL..">
      <input type="text" id="attachment" placeholder="Enter Meeting Attachment URL..">
      <div class="form-bottom">
        <div class="cancel" onclick="handleNewEvent('cancel')">Cancel</div>
        <div class="add" onclick="handleNewEvent('add')">Add Event</div>
      </div>
    </form>
  </div>
  `;
}

function handleNewEvent(what) {
  if (what === 'add'){
    var title = document.getElementById('title').value;
    var time = document.getElementById('time').value;
    var meeting = document.getElementById('meeting').value;
    var attachment = document.getElementById('attachment').value;
    var userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = new Date(time);
    const options = { hour: 'numeric', minute: 'numeric', year: 'numeric', month: 'long', day: 'numeric', hour12: true };
    const formattedDateTime = new Intl.DateTimeFormat('en-US', options).format(date);
    const timestamp = convertDateTimeToTimestamp(time, userTimeZone);

    database.ref('/users/'+userdata.email.replace("@gmail.com", "")).once("value").then((snapshot) => {
      var group = snapshot.child('group').val();

      database.ref("/groups/" + group + "/events/"+ timestamp).update({
        title: title,
        time: formattedDateTime,
        meeting: meeting,
        attachment: attachment,
        timezone: userTimeZone,
      });
    })
  }
  showAdminEvents();
}

function convertDateTimeToTimestamp(dateTime, timeZone) {
  const timestamp = moment.tz(dateTime, timeZone).valueOf();
  return timestamp;
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
  const adminEventsElement = document.getElementById('admin-events');
  adminEventsElement.innerHTML = ''; // Clear existing content
  
  const userEmail = userdata.email.replace("@gmail.com", "");
  database.ref('/users/' + userEmail).once("value").then((snapshot) => {
    var group = snapshot.child('group').val();

    database.ref('/groups/' + group + '/events').orderByKey().once("value").then((snapshot1) => {
      let eventsHTML = ''; // Use a variable to construct HTML

      snapshot1.forEach((childSnapshot) => {
        const { title, time, meeting, attachment, timezone } = childSnapshot.val();
        
        eventsHTML += `
          <div class='admin-event'>
            <b>${title}</b> <br>
            <span class='time'>${convertToLocalTime(time, timezone)}</span>
            <span class='event-icons'>
              <i class="fa-solid fa-video" onclick="goToExternal('${meeting}')"> Google Meet</i>
              <i class="fa-solid fa-paperclip" onclick="goToExternal('${attachment}')"> Attachment</i>
            </span>
          </div>`;
      });

      adminEventsElement.innerHTML = eventsHTML || 'No events found!';
    });
  });
}

function convertToLocalTime(time, timezone) {
  var timeInGivenTimezone = moment.tz(time, "MMMM D, YYYY at h:mm A", timezone);
  var timeInLocalTimezone = timeInGivenTimezone.local().format("MMMM D, YYYY [at] h:mm A");

  return timeInLocalTimezone;
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
        <div class='admin-event'>
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

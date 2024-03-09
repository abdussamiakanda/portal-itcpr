function showAdmin(div) {
  const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
  const { type } = userSnapshot.val();

  document.getElementById('admin').innerHTML = `
  <div class="academic1">
    <div class="admin-top">
      <div class="${div === 'events' ? 'selected' : ''}" onclick="showAdmin('events')">EVENTS</div>
      <div class="${div === 'tasks' ? 'selected' : ''}" onclick="showAdmin('tasks')">TASKS</div>
      <div class="${div === 'notices' ? 'selected' : ''}" onclick="showAdmin('notices')">NOTICES</div>
      ${type === 'admin' ? `<div class="${div === 'users' ? 'selected' : ''}" onclick="showAdmin('users')">USERS</div>` : ''}
    </div>
    <div class="admin-contents" id="admin-contents"></div>
  </div>
  `;

  if (div === 'events') {
    showAdminEvents();
  } else if (div === 'notices') {
    showAdminNotices();
  } else if (div === 'users') {
    showAdminUsers();
  } else if (div === 'tasks') {
    showAdminTasks();
  }
}

function showAdminTasks() {
  document.getElementById('admin-contents').innerHTML = `
  <div class="adduser-btn-container"><div class="adduser-btn" onclick="eventDiv()"><i class="fa-solid fa-plus"></i> Add Tasks</div></div>
  <div id="admin-tasks" class="admin-events"></div>
  `;
  showAdminTask();
}

function showAdminTask() {
  const tasksElement = document.getElementById('admin-tasks');
  tasksElement.innerHTML = '';

  const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
  const { group } = userSnapshot.val();
  const tasksSnapshot = entireDbSnapshot.child('/groups/' + group + '/tasks');

  let htmlContent = '';
  
  tasksSnapshot.forEach(taskSnapshot => {
    const { title, text } = taskSnapshot.val();

    htmlContent += `
      <div class='admin-event'>
        <b>${title}</b> <br>
        <span>${text}</span>
      </div>`;
  });
  tasksElement.innerHTML = htmlContent || 'No events found!';
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
  if (what === 'add') {
    var title = document.getElementById('title').value;
    var time = document.getElementById('time').value;
    var meeting = document.getElementById('meeting').value;
    var attachment = document.getElementById('attachment').value;
    var userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = new Date(time);
    const options = { hour: 'numeric', minute: 'numeric', year: 'numeric', month: 'long', day: 'numeric', hour12: true };
    const formattedDateTime = new Intl.DateTimeFormat('en-US', options).format(date);
    const timestamp = convertDateTimeToTimestamp(time, userTimeZone);

    const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
    const { group } = userSnapshot.val(); // Destructure for easier access

    // New notice object
    const newEvent = {
      title: title,
      time: formattedDateTime,
      meeting: meeting,
      attachment: attachment,
      timezone: userTimeZone,
    };

    database.ref("/groups/" + group + "/events/"+ timestamp).set(newEvent).then(() => {
      database.ref().once("value").then(snapshot => {
        entireDbSnapshot = snapshot;
      }).then(() => {
        showAdminEvents();
      })
    }).catch(error => {
      console.error("Error updating event in Firebase:", error);
    });
  } else {
    showAdminEvents();
  }
}

function convertDateTimeToTimestamp(dateTime, timeZone) {
  const timestamp = moment.tz(dateTime, timeZone).valueOf();
  return timestamp;
}

function showAdminNotices() {
  document.getElementById('admin-contents').innerHTML = `
  <div class="adduser-btn-container"><div class="adduser-btn" onclick="noticeDiv()"><i class="fa-solid fa-plus"></i> Add Notice</div></div>
  <div id="admin-notices" class="admin-events"></div>
  `;
  showAdminNotice();
}

function noticeDiv() {
  document.getElementById('admin-contents').innerHTML = `
  <div id="admin-event-form">
    <form>
      <input type="text" id="title" placeholder="Enter Notice Title..">
      <textarea id="text" placeholder="Enter Notice Text.."></textarea>
      <input type="datetime-local" id="till">
      <div class="form-bottom">
        <div class="cancel" onclick="handleNewNotice('cancel')">Cancel</div>
        <div class="add" onclick="handleNewNotice('add')">Add Notice</div>
      </div>
    </form>
  </div>
  `;
}

function handleNewNotice(what) {
  if (what === 'add') {
    var title = document.getElementById('title').value;
    var till = document.getElementById('till').value;
    var text = document.getElementById('text').value;
    var userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = moment.tz(userTimeZone).valueOf();
    const timestamp = convertDateTimeToTimestamp(till, userTimeZone);

    const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
    const { group } = userSnapshot.val(); // Destructure for easier access

    // New notice object
    const newNotice = {
      title: title,
      till: timestamp,
      text: text,
      criteria: capitalizeFirstLetter(group),
      timezone: userTimeZone,
    };

    database.ref("/notices/" + now).set(newNotice).then(() => {
      database.ref().once("value").then(snapshot => {
        entireDbSnapshot = snapshot;
      }).then(() => {
        showAdminNotices();
      })
    }).catch(error => {
      console.error("Error updating notice in Firebase:", error);
    });
  } else {
    showAdminNotices();
  }
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
  const noticesElement = document.getElementById('admin-events');
  noticesElement.innerHTML = '';

  const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
  const { group } = userSnapshot.val();
  const noticesSnapshot = entireDbSnapshot.child('/groups/' + group + '/events');

  let htmlContent = '';
  
  noticesSnapshot.forEach(noticeSnapshot => {
    const { title, time, meeting, attachment, timezone } = noticeSnapshot.val();

    htmlContent += `
      <div class='admin-event'>
        <b>${title}</b> <br>
        <span class='time'>${convertToLocalTime(time, timezone)}</span>
        <span class='event-icons'>
          <i class="fa-solid fa-video" onclick="goToExternal('${meeting}')"> Google Meet</i>
          <i class="fa-solid fa-paperclip" onclick="goToExternal('${attachment}')"> Attachment</i>
        </span>
      </div>`;
  });
  noticesElement.innerHTML = htmlContent || 'No events found!';
}

function convertToLocalTime(time, timezone) {
  var timeInGivenTimezone = moment.tz(time, "MMMM D, YYYY at h:mm A", timezone);
  var timeInLocalTimezone = timeInGivenTimezone.local().format("MMMM D, YYYY [at] h:mm A");

  return timeInLocalTimezone;
}

function showAdminNotice() {
  const noticesElement = document.getElementById('admin-notices');
  noticesElement.innerHTML = '';

  const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
  const { group } = userSnapshot.val();
  const noticesSnapshot = entireDbSnapshot.child('/notices');

  let htmlContent = '';
  
  noticesSnapshot.forEach(noticeSnapshot => {
    const { title, text, criteria } = noticeSnapshot.val();

    if (criteria === capitalizeFirstLetter(group)) {
      htmlContent += `
        <div class='admin-event'>
          <b>${title}</b> <br>
          <span>${text}</span>
        </div>`;
    }
  });
  noticesElement.innerHTML = htmlContent || 'No notices found!';
}

function showAdminUser() {
  const userElement = document.getElementById('admin-users');
  userElement.innerHTML = '';

  const usersSnapshot = entireDbSnapshot.child(`/users`);

  let htmlContent = '';
  
  usersSnapshot.forEach(userSnapshot => {
    const { name, position, group, quartile } = userSnapshot.val();

    htmlContent += `
      <div class="admin-user">
        <div>${name}</div>
        <div>${position}</div>
        <div>${capitalizeFirstLetter(group)}</div>
        <div>${quartile === 1 ? '1st' : '2nd'} Quartile</div>
        <div>${emailKey !== userSnapshot.key ? `<i class="fa-solid fa-pen-to-square"></i>` : ''}</div>
      </div>`;
  });
  userElement.innerHTML = htmlContent || 'No users found!';
}

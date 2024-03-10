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
  <div class="adduser-btn-container"><div class="adduser-btn" onclick="taskDiv()"><i class="fa-solid fa-plus"></i> Add Tasks</div></div>
  <div id="admin-tasks" class="admin-events"></div>
  `;
  showAdminTask();
}

function taskDiv() {
  document.getElementById('admin-contents').innerHTML = `
  <div id="admin-event-form">
    <form>
      <input type="text" id="title" placeholder="Enter Task Title..">
      <textarea id="text" placeholder="Enter Task Text.."></textarea>
      <select id="quartile" class="dropdown">
        <option value="">Select Quartile</option>
        <option value=1>1st Quartile</option>
        <option value=2>2nd Quartile</option>
      </select>
      <div class="form-bottom">
        <div class="cancel" onclick="handleNewTask('cancel')">Cancel</div>
        <div class="add" onclick="handleNewTask('add')">Add Task</div>
      </div>
    </form>
  </div>
  `;
}

function handleNewTask(what) {
  if (what === 'add') {
    var title = document.getElementById('title').value;
    var text = document.getElementById('text').value;
    var quartile = document.getElementById('quartile').value;

    const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
    const { group } = userSnapshot.val();

    database.ref(`/groups/${group}/tasks`).once("value").then(snapshot => {
      const tasksSnapshot = snapshot.val() || {};
      const quartileTasks = Object.keys(tasksSnapshot).filter(key => key.startsWith(quartile));
      const newTaskNumber = quartileTasks.length + 1;
      const newTaskId = quartile + newTaskNumber;

      const newEvent = {
        title: title,
        text: text,
        quartile: Number(quartile),
      };

      return database.ref(`/groups/${group}/tasks/${newTaskId}`).update(newEvent);
    }).then(() => {
      database.ref().once("value").then(snapshot => {
        entireDbSnapshot = snapshot;
      }).then(() => {
        showAdminTasks();
        alertMessage(t="success","New task added!");
      })
    }).catch(error => {
      console.error("Error updating task in Firebase:", error);
    });
  } else {
    showAdminTasks();
  }
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
      <div class='admin-event flex'>
        <div>
          <h3>${title}</h3>
          <span>${text.substring(0, 150)} ...</span>
        </div>
        <div class="admin-icons">
          <i class="fa-solid fa-eye delete" onclick="showDetail('task', '${taskSnapshot.key}')"></i>
          <i class="fa-solid fa-trash-can delete" onclick="deleteTask('${group}', '${taskSnapshot.key}')"></i>
        </div>
      </div>`;
  });
  tasksElement.innerHTML = htmlContent || 'No events found!';
}


function deleteTask(group,key) {
  database.ref('/groups/' + group + '/tasks/' + key).remove().then(() => {
    database.ref().once("value").then(snapshot => {
      entireDbSnapshot = snapshot;
    }).then(() => {
      showAdminTasks();
      alertMessage(t="success","Task deleted successfully!");
    })
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
        alertMessage(t="success","New event added!");
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
        alertMessage(t="success","New notice added!");
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
  <div class="adduser-btn-container"><div class="adduser-btn" onclick="userDiv()"><i class="fa-solid fa-plus"></i> Add User</div></div>
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

function userDiv() {
  document.getElementById('admin-contents').innerHTML = `
  <div id="admin-event-form">
    <form>
      <input type="text" id="name" placeholder="Enter User Name..">
      <input type="text" id="email" placeholder="Enter User Email..">
      <input type="text" id="id" placeholder="Enter User ID..">
      <select id="position" class="dropdown">
        <option value="">Select User Type</option>
        <option value="Intern">Intern</option>
        <option value="Member">Member</option>
      </select>
      <select id="usrgroup" class="dropdown">
        <option value="">Select Group</option>
        <option value="spintronics">Spintronics</option>
        <option value="photonics">Photonics</option>
      </select>
      <select id="quartile" class="dropdown">
        <option value="">Select Quartile</option>
        <option value=1>1st Quartile</option>
        <option value=2>2nd Quartile</option>
      </select>
      <input type="text" id="start" placeholder="Enter Start Date..">
      <input type="text" id="end" placeholder="Enter End Date..">
      <input type="text" id="url" placeholder="Enter User URL..">
      <div class="form-bottom">
        <div class="cancel" onclick="handleNewUser('cancel')">Cancel</div>
        <div class="add" onclick="handleNewUser('add')">Add User</div>
      </div>
    </form>
  </div>
  `;
}

function handleNewUser(what) {
  if (what === 'add') {
    var name = document.getElementById('name').value;
    var id = document.getElementById('id').value;
    var email = document.getElementById('email').value;
    var group = document.getElementById('usrgroup').value;
    var position = document.getElementById('position').value;
    var quartile = document.getElementById('quartile').value;
    var start = document.getElementById('start').value;
    var end = document.getElementById('end').value;
    var url = document.getElementById('url').value;

    const newUser = {
      name: name,
      id: id,
      group: group,
      position: position,
      quartile: quartile,
      start: start,
      end: end,
      url: url,
      attendance: '0/0',
      participation: '0/0',
      email: id+'@itcpr.org',
      new: true,
    };

    database.ref("/users/" + sanitizeEmail(email.replace("@gmail.com", ""))).update(newUser).then(() => {
      database.ref().once("value").then(snapshot => {
        entireDbSnapshot = snapshot;
      }).then(() => {
        showAdminUsers();
        alertMessage(t="success","New user added!");
      })
    }).catch(error => {
      console.error("Error updating user in Firebase:", error);
    });
  } else {
    showAdminUsers();
  }
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
        <div>${emailKey !== userSnapshot.key ? `<i class="fa-solid fa-pen-to-square usr-btn"></i> <i class="fa-solid fa-trash-can usr-btn"></i>` : ''}</div>
      </div>`;
  });
  userElement.innerHTML = htmlContent || 'No users found!';
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
      <div class='admin-event flex'>
        <div>
          <h3>${title}</h3>
          <span class='time'>${convertToLocalTime(time, timezone)}</span>
          <span class='event-icons'>
            <i class="fa-solid fa-video" onclick="goToExternal('${meeting}')"> Google Meet</i>
            ${attachment ? `<i class="fa-solid fa-paperclip" onclick="goToExternal('${attachment}')"> Attachment</i>` : ''}
          </span>
        </div>
        <div class="admin-icons">
          <i class="fa-solid fa-eye delete" onclick="showEventDetail('${group}', '${noticeSnapshot.key}')"></i>
          <i class="fa-solid fa-trash-can delete" onclick="deleteEvent('${group}', '${noticeSnapshot.key}')"></i>
        </div>
      </div>`;
  });
  noticesElement.innerHTML = htmlContent || 'No events found!';
}

function showEventDetail(group,key) {
  const noticesSnapshot = entireDbSnapshot.child('/groups/' + group + '/events/' + key);
  const { title, time, meeting, attachment, timezone } = noticesSnapshot.val();

  document.getElementById('admin-contents').innerHTML = `
  <div class='admin-events'>
    <div>
      <div class="users-top">
        <div>NAME</div>
        <div>POSITION</div>
        <div>ATTENDANCE</div>
        <div>PARTICIPATION</div>
      </div>
      <div id="admin-users"></div>
    </div>
    <div class='admin-event'>
      <h3>${title}</h3>
      <span class='time'>${convertToLocalTime(time, timezone)}</span>
      <span class='event-icons'>
        <i class="fa-solid fa-video" onclick="goToExternal('${meeting}')"> Google Meet</i>
        ${attachment ? `<i class="fa-solid fa-paperclip" onclick="goToExternal('${attachment}')"> Attachment</i>` : ''}
      </span>
    </div>
    <div class="go-back" onclick="showAdminEvents()">Go Back</div>
  </div>`;
  showAdminEventUsers(group, key);
}

function showAdminEventUsers(type, key) {
  const userElement = document.getElementById('admin-users');
  userElement.innerHTML = '';

  const usersSnapshot = entireDbSnapshot.child(`/users`);

  let htmlContent = '';
  
  usersSnapshot.forEach(userSnapshot => {
    const { name, position, group } = userSnapshot.val();
    const performSnapshot = entireDbSnapshot.child('/groups/' + type + '/events/' + key + '/gigs/' + userSnapshot.key);
    const { attendance, participation } = performSnapshot.val()  || {};
    let attcont = '';
    let partcont = '';

    if (attendance === undefined) {
      attcont = `<i class="fa-solid fa-check perform-btn" onclick="handlePerformance('att','${type}','${key}','${userSnapshot.key}',true)"></i> <i class="fa-solid fa-xmark perform-btn" onclick="handlePerformance('att','${type}','${key}','${userSnapshot.key}',false)"></i>`
    } else if (attendance === true) {
      attcont = `<i class="fa-solid fa-check"></i></i>`
    } else if (attendance === false) {
      attcont = `<i class="fa-solid fa-xmark"></i>`
    }
    if (participation === undefined) {
      partcont = `<i class="fa-solid fa-check perform-btn" onclick="handlePerformance('part','${type}','${key}','${userSnapshot.key}',true)"></i> <i class="fa-solid fa-xmark perform-btn" onclick="handlePerformance('part','${type}','${key}','${userSnapshot.key}',false)"></i>`
    } else if (participation === true) {
      partcont = `<i class="fa-solid fa-check"></i></i>`
    } else if (participation === false) {
      partcont = `<i class="fa-solid fa-xmark"></i>`
    }

    if (type === group) {
      htmlContent += `
      <div class="admin-user usr-perform">
        <div>${name}</div>
        <div>${position}</div>
        <div>${attcont}</div>
        <div>${partcont}</div>
      </div>`;
    }
  });
  userElement.innerHTML = htmlContent || 'No users found!';
}

function handlePerformance(type,group,event,user,value) {
  if (type === 'att') {
    const updateValue = {
      attendance: value,
    };

    database.ref('/groups/' + group + '/events/' + event + '/gigs/' + user).update(updateValue).then(() => {
      const userSnapshot = entireDbSnapshot.child(`/users/`+user);
      const attendanceRaw = userSnapshot.child('attendance').val() || '0/0';
      let [left, right] = attendanceRaw.split('/').map(Number);

      if (value === false) {
        left += 1;
        right += 1;
      } else if (value === true) {
        right += 1;
      }
      const updatedAttendance = {
        attendance: left+'/'+right,
      }

      database.ref(`/users/`+user).update(updatedAttendance).then(() => {
        database.ref().once("value").then(snapshot => {
          entireDbSnapshot = snapshot;
        }).then(() => {
          showAdminEventUsers(group, event);
        })
      })
    }).catch(error => {
      console.error("Error updating in Firebase:", error);
    });
  } else if (type === 'part') {
    const updateValue = {
      participation: value,
    };

    database.ref('/groups/' + group + '/events/' + event + '/gigs/' + user).update(updateValue).then(() => {
      const userSnapshot = entireDbSnapshot.child(`/users/`+user);
      const participationRaw = userSnapshot.child('participation').val() || '0/0';
      let [left, right] = participationRaw.split('/').map(Number);

      if (value === false) {
        left += 1;
        right += 1;
      } else if (value === true) {
        right += 1;
      }
      const updatedParticipation = {
        participation: left+'/'+right,
      }

      database.ref(`/users/`+user).update(updatedParticipation).then(() => {
        database.ref().once("value").then(snapshot => {
          entireDbSnapshot = snapshot;
        }).then(() => {
          showAdminEventUsers(group, event);
        })
      })
    }).catch(error => {
      console.error("Error updating in Firebase:", error);
    });
  }
}

function deleteEvent(group, key) {
  database.ref('/groups/' + group + '/events/'+key).remove().then(() => {
    database.ref().once("value").then(snapshot => {
      entireDbSnapshot = snapshot;
    }).then(() => {
      showAdminEvents();
      alertMessage(t="success","Event deleted successfully!");
    })
  });
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
        <div class='admin-event flex'>
          <div>
            <h3>${title}</h3>
            <span>${text.substring(0, 150)} ...</span>
          </div>
          <div class="admin-icons">
            <i class="fa-solid fa-eye delete" onclick="showDetail('notice', '${noticeSnapshot.key}')"></i>
            <i class="fa-solid fa-trash-can delete" onclick="deleteNotice('${noticeSnapshot.key}')"></i>
          </div>
        </div>`;
    }
  });
  noticesElement.innerHTML = htmlContent || 'No notices found!';
}

function showDetail(type, key) {
  if (type === 'notice') {
    const noticesSnapshot = entireDbSnapshot.child('/notices/'+key);
    const { title, text } = noticesSnapshot.val();

    document.getElementById('detail').innerHTML = `
      <div class="details">
        <div class="detail">
          <div class="detail-top"><i class="fa-solid fa-xmark" onclick="hideDetail()"></i></div>
          <div class="detail-content">
            <span class="type">Notice</span>
            <h3>${title}</h3> <br>
            <span>${text}</span>
          </div>
        </div>
      </div>`;
  } else if (type === 'task') {
    const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
    const { group } = userSnapshot.val();
    const tasksSnapshot = entireDbSnapshot.child('/groups/' + group + '/tasks/' + key);
    const { title, text } = tasksSnapshot.val();
  
    document.getElementById('detail').innerHTML = `
      <div class="details">
        <div class="detail">
          <div class="detail-top"><i class="fa-solid fa-xmark" onclick="hideDetail()"></i></div>
          <div class="detail-content">
            <span class="type">Task</span>
            <h3>${title}</h3> <br>
            <span>${text}</span>
          </div>
        </div>
      </div>`;
  }
}

function hideDetail() {
  document.getElementById('detail').innerHTML = '';
}

function deleteNotice(key) {
  database.ref('/notices/' + key).remove().then(() => {
    database.ref().once("value").then(snapshot => {
      entireDbSnapshot = snapshot;
    }).then(() => {
      showAdminNotices();
      alertMessage(t="success","Notice deleted successfully!");
    })
  });
}

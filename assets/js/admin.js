function showAdmin(div) {
  const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
  const { type } = userSnapshot.val();

  document.getElementById('admin').innerHTML = `
  <div class="academic1">
    <div class="admin-top">
      <div class="${div === 'events' ? 'selected' : ''}" onclick="showAdmin('events')">EVENTS</div>
      <div class="${div === 'tasks' ? 'selected' : ''}" onclick="showAdmin('tasks')">TASKS</div>
      <div class="${div === 'projects' ? 'selected' : ''}" onclick="showAdmin('projects')">PROJECTS</div>
      <div class="${div === 'notices' ? 'selected' : ''}" onclick="showAdmin('notices')">NOTICES</div>
      ${type === 'admin' ? `<div class="${div === 'users' ? 'selected' : ''}" onclick="showAdmin('users')">USERS</div>` : ''}
      ${type === 'admin' ? `<div class="${div === 'applicants' ? 'selected' : ''}" onclick="showAdmin('applicants')">APPLICANTS</div>` : ''}
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
  } else if (div === 'projects') {
    showAdminProjects();
  } else if (div === 'applicants') {
    showApplicants();
  }
}

function showAdminProjects() {
  document.getElementById('admin-contents').innerHTML = `
  <div class="adduser-btn-container"><div class="adduser-btn" onclick="projectDiv()"><i class="fa-solid fa-plus"></i> Add Project</div></div>
  <div id="admin-projects" class="admin-events"></div>
  `;
  showAdminProject();
}

function projectDiv() {
  document.getElementById('admin-contents').innerHTML = `
  <div id="admin-event-form">
    <form>
      <input type="text" id="title" placeholder="Enter Project Title..">
      <textarea id="text" placeholder="Enter Project Text.."></textarea>
      <div class="form-bottom">
        <div class="cancel" onclick="handleNewProject('cancel')">Cancel</div>
        <div class="add" onclick="handleNewProject('add')">Add Project</div>
      </div>
    </form>
  </div>
  `;
  const textarea = document.getElementById('text');
  textarea.addEventListener('input', autoResize, false);
}

function handleNewProject(what) {
  if (what === 'add') {
    var title = document.getElementById('title').value;
    var text = document.getElementById('text').value;

    const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
    const { group } = userSnapshot.val();

    const newProject = {
      title: title,
      text: text,
    };

    database.ref(`/groups/${group}/projects/`).push(newProject).then(() => {
      database.ref().once("value").then(snapshot => {
        entireDbSnapshot = snapshot;
      }).then(() => {
        showAdminProjects();
        alertMessage(t="success","New project added!");
      })
    }).catch(error => {
      console.error("Error updating project in Firebase:", error);
    });
  }
  else {
    showAdminProjects();
  }
}

function showAdminProject() {
  const projectsElement = document.getElementById('admin-projects');
  projectsElement.innerHTML = '';

  const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
  const { group } = userSnapshot.val();
  const projectsSnapshot = entireDbSnapshot.child('/groups/' + group + '/projects');

  let htmlContent = '';
  
  projectsSnapshot.forEach(projectSnapshot => {
    const { title, text } = projectSnapshot.val();

    htmlContent += `
      <div class='admin-event flex'>
        <div>
          <h3>${title}</h3>
          <span>${text.substring(0, 150)} ...</span>
        </div>
        <div class="admin-icons">
        <i class="fa-solid fa-edit delete" onclick="editProject('${group}', '${projectSnapshot.key}')"></i>
        <i class="fa-solid fa-trash-can delete" onclick="deleteProject('${group}', '${projectSnapshot.key}')"></i>
        </div>
      </div>`;
  });
  projectsElement.innerHTML = htmlContent || 'No projects found!';
}

function editProject(group,key) {
  const projectSnapshot = entireDbSnapshot.child(`/groups/${group}/projects/${key}`);
  const { title, text } = projectSnapshot.val();

  document.getElementById('admin-contents').innerHTML = `
  <div id="admin-event-form">
    <form>
      <input type="text" id="title" value="${title}">
      <textarea id="text">${text}</textarea>
      <div class="form-bottom">
        <div class="cancel" onclick="handleEditProject('cancel','','')">Cancel</div>
        <div class="add" onclick="handleEditProject('add','${group}','${key}')">Edit Project</div>
      </div>
    </form>
  </div>
  `;
  const textarea = document.getElementById('text');
  textarea.addEventListener('input', autoResize, false);
}

function autoResize() {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
}

function handleEditProject(what,group,key) {
  if (what === 'add') {
    var title = document.getElementById('title').value;
    var text = document.getElementById('text').value;

    const updateValue = {
      title: title,
      text: text,
    };

    database.ref('/groups/' + group + '/projects/' + key).update(updateValue).then(() => {
      database.ref().once("value").then(snapshot => {
        entireDbSnapshot = snapshot;
      }).then(() => {
        showAdminProjects();
        alertMessage(t="success","Project updated successfully!");
      })
    }).catch(error => {
      console.error("Error updating project in Firebase:", error);
    });
  } else {
    showAdminProjects();
  }
}


function deleteProject(group,key) {
  database.ref('/groups/' + group + '/projects/' + key).remove().then(() => {
    database.ref().once("value").then(snapshot => {
      entireDbSnapshot = snapshot;
    }).then(() => {
      showAdminProjects();
      alertMessage(t="success","Project deleted successfully!");
    })
  });
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
        sendBulkEmail(group, 'task', title);
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
          <span>${text.replace(/<[^>]*>/g, '').substring(0, 150)} ...</span>
        </div>
        <div class="admin-icons">
          <i class="fa-solid fa-eye delete" onclick="showDetail('task', '${taskSnapshot.key}')"></i>
          <i class="fa-solid fa-pen-to-square delete" onclick="editTask('${group}', '${taskSnapshot.key}')"></i>
          <i class="fa-solid fa-trash-can delete" onclick="deleteTask('${group}', '${taskSnapshot.key}')"></i>
        </div>
      </div>`;
  });
  tasksElement.innerHTML = htmlContent || 'No events found!';
}

function editTask(group,key) {
  const taskSnapshot = entireDbSnapshot.child(`/groups/${group}/tasks/${key}`);
  const { title, text } = taskSnapshot.val();

  document.getElementById('admin-contents').innerHTML = `
  <div id="admin-event-form">
    <form>
      <input type="text" id="title" value="${title}">
      <textarea id="text">${text}</textarea>
      <div class="form-bottom">
        <div class="cancel" onclick="handleEditTask('cancel','')">Cancel</div>
        <div class="add" onclick="handleEditTask('add','${group}','${key}')">Edit Task</div>
      </div>
    </form>
  </div>
  `;
  const textarea = document.getElementById('text');
  textarea.addEventListener('input', autoResize, false);
}

function handleEditTask(what,group,key) {
  if (what === 'add') {
    var title = document.getElementById('title').value;
    var text = document.getElementById('text').value;

    const updateValue = {
      title: title,
      text: text,
    };

    database.ref('/groups/' + group + '/tasks/' + key).update(updateValue).then(() => {
      database.ref().once("value").then(snapshot => {
        entireDbSnapshot = snapshot;
      }).then(() => {
        showAdminTasks();
        alertMessage(t="success","Task updated successfully!");
      })
    }).catch(error => {
      console.error("Error updating task in Firebase:", error);
    });
  } else {
    showAdminTasks();
  }
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
    const { group } = userSnapshot.val();

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
        sendBulkEmail(group, 'event', title);
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
        sendBulkEmail(group, 'notice', title);
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
    <div>LAST LOGIN</div>
    <div>EDIT</div>
  </div>
  <div id="admin-users"></div>
  `;
  showAdminUser();
}

function showApplicants() {
  document.getElementById('admin-contents').innerHTML = `
  <div class="users-top2">
    <div>NAME</div>
    <div>EMAIL</div>
    <div>CONTACTS</div>
    <div>UNIVERSITY</div>
    <div>YEAR</div>
    <div>OPTIONS</div>
  </div>
  <div id="admin-users2"></div>
  `;
  showApplicant();
}

function showApplicant() {
  const userElement = document.getElementById('admin-users2');
  userElement.innerHTML = '';

  const usersSnapshot = entireDbSnapshot.child(`/applicants`);

  let htmlContent = '';
  
  usersSnapshot.forEach(userSnapshot => {
    const { name, email, contact, university, year, address, education, major, graduationdate, courses, experiences, publications, skills, reason, field, expectation, approval } = userSnapshot.val();

    let content = `Personal Information
Name: ${name}
Email: ${email}
Contact: ${contact}
Address: ${address}

Educational Background
Education: ${education}
University: ${university}
Major: ${major}
Year: ${year}
Graduation Date: ${graduationdate}

Academic and Professional Experience
Relevant Courses: ${courses}
Previous Experiences: ${experiences}
Publications: ${publications}
Skills: ${skills}

Statement of Interest
Reason for Applying: ${reason}
Field of Interest: ${field}
Expectations: ${expectation}`;

    content = content.replace(/(?:\r\n|\r|\n)/g, '<br>').replace(/'/g, '');
    let options = '';

    if (approval === 'pending') {
      options = `
        <i class="fa-solid fa-download usr-btn" onclick="downloadApplication('${userSnapshot.key}.txt','${content}')"></i>
        <i class="fa-solid fa-circle-check usr-btn" onclick="acceptApplication('${name}','${email}','${field}')"></i>
        <i class="fa-solid fa-circle-xmark usr-btn" onclick="rejectApplication('${name}','${email}')"></i>`;
    } else if (approval === 'accepted') {
      options = `
        <i class="fa-solid fa-download usr-btn" onclick="downloadApplication('${userSnapshot.key}.txt','${content}')"></i>
        <i class="fa-solid fa-check-circle"></i>`;
    } else if (approval === 'rejected') {
      options = `
        <i class="fa-solid fa-download usr-btn" onclick="downloadApplication('${userSnapshot.key}.txt','${content}')"></i>
        <i class="fa-solid fa-xmark-circle"></i>`;
    }

    htmlContent += `
      <div class="admin-user2">
        <div>${name}</div>
        <div>${email.length > 20 ? email.substring(0, 20)+'...' : email}</div>
        <div>${contact}</div>
        <div>${university}</div>
        <div>${year}</div>
        <div>${options}</div>
      </div>`;
  });
  userElement.innerHTML = htmlContent || 'No applications found!';
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
      iemail: id+'@itcpr.org',
      email: email,
      new: true,
    };

    const body = `Dear ${name},<br><br>
    We are delighted to welcome you to the Institute for Theoretical and
    Computational Physics Research (ITCPR). As a pioneering virtual
    institution, ITCPR is dedicated to breaking new ground in theoretical
    and computational physics, providing unique research opportunities
    that propel untapped talent into the forefront of scientific innovation.
    <br><br>
    At ITCPR, you will immerse yourself in a vibrant scientific community,
    receive mentorship from seasoned professionals, and engage in cutting-edge
    research that expands the boundaries of knowledge. We are here to support
    your journey of professional growth, innovation, and discovery.
    <br><br>
    We encourage you to explore our latest initiatives, participate in our
    groups, and take the first steps towards making significant contributions
    to the world of physics. Welcome aboard, and we look forward to seeing
    the impact of your work.
    <br><br>
    Warm regards, <br>
    Administrative Team <br>
    Institute for Theoretical and Computational Physics Research (ITCPR)
    `;

    database.ref("/users/" + sanitizeEmail(email.replace("@gmail.com", ""))).update(newUser).then(() => {
      database.ref().once("value").then(snapshot => {
        entireDbSnapshot = snapshot;
      }).then(() => {
        showAdminUsers();
        alertMessage(t="success","New user added!");
        sendEmail(email, "Welcome to ITCPR - Your Gateway to Innovation in Physics!", body);
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
    const { name, position, group, quartile, lastlogin, timezone, location } = userSnapshot.val();
    const loginTime = convertToLocalTime(lastlogin, timezone);
    const options = `
    <i class="fa-solid fa-address-card usr-btn" onclick="downloadCSV('${userSnapshot.key}')"></i>
    <i class="fa-solid fa-pen-to-square usr-btn" onclick="editUser('${userSnapshot.key}')"></i>
    `;

    htmlContent += `
      <div class="admin-user">
        <div>${name}</div>
        <div>${position}</div>
        <div>${capitalizeFirstLetter(group)}</div>
        <div>${position === 'Intern' ? `${quartile === '1' ? '1st' : '2nd'} Quartile` : ''}</div>
        <div>${loginTime} (${location})</div>
        <div>${options}</div>
      </div>`;
  });
  userElement.innerHTML = htmlContent || 'No users found!';
}

function editUser(key) {
  const userSnapshot = entireDbSnapshot.child(`/users/${key}`);
  const { name, id, email, group, position, quartile, start, end, url } = userSnapshot.val();

  const sanitizedStart = start ?? '';
  const sanitizedEnd = end ?? '';
  const sanitizedUrl = url ?? '';

  document.getElementById('admin-contents').innerHTML = `
  <div id="admin-event-form">
    <form>
      <div class="input-similar">${name}</div>
      <div class="input-similar">${id}</div>
      <div class="input-similar">${email}</div>
      <select id="position" class="dropdown">
        <option value="">Select User Type</option>
        <option value="Intern" ${position === 'Intern' ? 'selected' : ''}>Intern</option>
        <option value="Member" ${position === 'Member' ? 'selected' : ''}>Member</option>
        <option value="Terminated" ${position === 'Terminated' ? 'selected' : ''}>Terminated</option>
        <option value="Lead" ${position === 'Lead' ? 'selected' : ''}>Lead</option>
      </select>
      <select id="usrgroup" class="dropdown">
        <option value="">Select Group</option>
        <option value="spintronics" ${group === 'spintronics' ? 'selected' : ''}>Spintronics</option>
        <option value="photonics" ${group === 'photonics' ? 'selected' : ''}>Photonics</option>
      </select>
      <select id="quartile" class="dropdown">
        <option value="">Select Quartile</option>
        <option value=1 ${quartile === '1' ? 'selected' : ''}>1st Quartile</option>
        <option value=2 ${quartile === '2' ? 'selected' : ''}>2nd Quartile</option>
      </select>
      <input type="text" id="start" value="${sanitizedStart}" placeholder="Enter Start Date..">
      <input type="text" id="end" value="${sanitizedEnd}" placeholder="Enter End Date..">
      <input type="text" id="url" value="${sanitizedUrl}" placeholder="Enter User URL..">
      <div class="form-bottom">
        <div class="cancel" onclick="handleEditUser('cancel','')">Cancel</div>
        <div class="add" onclick="handleEditUser('add','${key}')">Edit User</div>
      </div>
    </form>
  </div>
  `;
}


function handleEditUser(what,key) {
  if (what === 'add') {
    var position = document.getElementById('position').value;
    var group = document.getElementById('usrgroup').value;
    var quartile = document.getElementById('quartile').value;
    var start = document.getElementById('start').value;
    var end = document.getElementById('end').value;
    var url = document.getElementById('url').value;

    const updateValue = {
      position: position,
      group: group,
      quartile: quartile,
      start: start,
      end: end,
      url: url,
    };

    database.ref('/users/' + key).update(updateValue).then(() => {
      database.ref().once("value").then(snapshot => {
        entireDbSnapshot = snapshot;
      }).then(() => {
        showAdminUsers();
        alertMessage(t="success","User updated successfully!");
      })
    }).catch(error => {
      console.error("Error updating user in Firebase:", error);
    });
  } else {
    showAdminUsers();
  }
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
          <i class="fa-solid fa-copy delete" onclick="showEventDuplicate('${group}', '${noticeSnapshot.key}')"></i>
          <i class="fa-solid fa-trash-can delete" onclick="deleteEvent('${group}', '${noticeSnapshot.key}')"></i>
        </div>
      </div>`;
  });
  noticesElement.innerHTML = htmlContent || 'No events found!';
}

function showEventDuplicate(group,key) {
  const noticesSnapshot = entireDbSnapshot.child('/groups/' + group + '/events/' + key);
  const { title, meeting, attachment } = noticesSnapshot.val();

  document.getElementById('admin-contents').innerHTML = `
  <div id="admin-event-form">
    <form>
      <div class="form-top">
        <input type="text" id="title" value="${title}">
        <input type="datetime-local" id="time">
      </div>
      <input type="text" id="meeting" value="${meeting}">
      <input type="text" id="attachment" value="${attachment}">
      <div class="form-bottom">
        <div class="cancel" onclick="handleNewEvent('cancel')">Cancel</div>
        <div class="add" onclick="handleNewEvent('add')">Add Event</div>
      </div>
    </form>
  </div>
  `;
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
      let scoreRaw = userSnapshot.child('score').val() ? userSnapshot.child('score').val() : 0;
      let [left, right] = attendanceRaw.split('/').map(Number);

      if (value === false) {
        left += 1;
        right += 1;
      } else if (value === true) {
        right += 1;
        scoreRaw += 1;
      }
      const updatedAttendance = {
        attendance: left+'/'+right,
      }
      database.ref(`/users/`+user).update({
        score : scoreRaw,
      })

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
        scoreRaw += 1;
      }
      const updatedParticipation = {
        participation: left+'/'+right,
      }
      database.ref(`/users/`+user).update({
        score : scoreRaw,
      })

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
            <span><md-block>${text}</md-block></span>
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

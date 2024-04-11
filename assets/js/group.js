function showGroup() {
  document.getElementById('group').innerHTML = `
  <div class="academic1">
    <div class="tabs">

      <div class="tab">
        <h2>Tasks for the Weeks</h2>
        <div id='group-tasks' class='events'></div>
      </div>
      <div class="tab">
        <h2>Ongoing Projects</h2>
        <div id='group-projects' class='events'></div>
      </div>
      <div class="tab">
        <h2>Group People</h2>
        <div id='group-lead' class='group-people'></div>
        <div id='group-member' class='group-people'></div>
        <div id='group-intern' class='group-people'></div>
      </div>

    </div>
  </div>`;
  showGroupTasks();
  showGroupPeople();
  showGroupProjects();
}

function showGroupProjects() {
  const eventsElement = document.getElementById('group-projects');
  
  eventsElement.innerHTML = '';
  
  const groupSnapshot = entireDbSnapshot.child('users/' + emailKey);
  const group = groupSnapshot.child('group').val();
  const projectsSnapshot = entireDbSnapshot.child('/groups/' + group + '/projects');

  let htmlContent = '';

  projectsSnapshot.forEach(childSnapshot => {
    const { title, text } = childSnapshot.val();

    htmlContent += `
      <div class="">
        <h3 onclick="handleGroupTask('${childSnapshot.key}')">Project: ${title}</h3>
        <div id="task-${childSnapshot.key}"><md-block>${text}</md-block></div>
      </div>`;
  });
  
  eventsElement.innerHTML = htmlContent || 'No projects yet!!';
}

function showGroupTasks() {
  const eventsElement = document.getElementById('group-tasks');
  
  eventsElement.innerHTML = '';
  
  const groupSnapshot = entireDbSnapshot.child('users/' + emailKey);
  const group = groupSnapshot.child('group').val();
  const quart = groupSnapshot.child('quartile').val();
  const position = groupSnapshot.child('position').val();
  const tasksSnapshot = entireDbSnapshot.child('/groups/' + group + '/tasks');

  let htmlContent = '';

  tasksSnapshot.forEach(childSnapshot => {
    const { title, text, quartile } = childSnapshot.val();

    if (quart === quartile && position === 'Intern') {
      htmlContent += `
      <div class="group-task">
        <b onclick="handleGroupTask('${childSnapshot.key}')">${title}  <i class="fa-solid fa-chevron-right" id="arrow-${childSnapshot.key}"></i></b>
        <div id="task-${childSnapshot.key}">${text}</div>
      </div>`;
    } else if (position !== 'Intern') {
      htmlContent += `
      <div class="group-task">
        <b onclick="handleGroupTask('${childSnapshot.key}')">${title}  <i class="fa-solid fa-chevron-right" id="arrow-${childSnapshot.key}"></i></b>
        <div id="task-${childSnapshot.key}">${text}</div>
      </div>`;
    }
  });
  
  eventsElement.innerHTML = htmlContent || 'No tasks yet!!';
}

function handleGroupTask(key) {
  const elem = document.getElementById('task-'+key);
  const arrow = document.getElementById('arrow-'+key);
  if (elem) {
    const currentDisplay = window.getComputedStyle(elem).display;

    if (currentDisplay === "none") {
      elem.style.display = 'block';
      arrow.classList.replace('fa-chevron-right', 'fa-chevron-down');
    } else {
      elem.style.display = 'none';
      arrow.classList.replace('fa-chevron-down', 'fa-chevron-right');
    }
  } else {
    console.error("Element with id '" + key + "' not found.");
  }
}

function showGroupPeople() {
  const mygroup = entireDbSnapshot.child('/users/' + emailKey + '/group').val();

  let htmlContent1 = '';
  let htmlContent2 = '';
  let htmlContent3 = '';

  const usersSnapshot = entireDbSnapshot.child('/users');

  usersSnapshot.forEach(childSnapshot => {
    const { name, group, position, email, url } = childSnapshot.val();

    if (mygroup === group) {
      let targetHtmlContent = '';
      switch (position) {
        case 'Lead':
          targetHtmlContent = htmlContent1;
          break;
        case 'Member':
          targetHtmlContent = htmlContent2;
          break;
        case 'Intern':
          targetHtmlContent = htmlContent3;
          break;
      }

      targetHtmlContent += `
      <div class="people">
        <img src="./../../assets/image/users/${childSnapshot.key}.jpg" onerror="this.onerror=null;this.src='./../../assets/image/users/default.jpg';" alt="${name}">
        <div>
          <b>${name}</b> <br>
          ${position}, ${capitalizeFirstLetter(group)} Group
          <div class='event-icons'>
            <i class="fa-solid fa-envelope" onclick="copyToClipboard('${email}')"></i>
            ${url ? `<i class="fa-solid fa-link" onclick="goToExternal('${url}')"></i>` : ''}
          </div>
        </div>
      </div>`;
      
      if (position === 'Lead') {
        htmlContent1 = targetHtmlContent;
      } else if (position === 'Member') {
        htmlContent2 = targetHtmlContent;
      } else if (position === 'Intern') {
        htmlContent3 = targetHtmlContent;
      }
    }
  });
  
  document.getElementById('group-lead').innerHTML = htmlContent1;
  document.getElementById('group-member').innerHTML = htmlContent2;
  document.getElementById('group-intern').innerHTML = htmlContent3;
}

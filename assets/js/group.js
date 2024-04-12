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

    </div>
  </div>`;
  showGroupTasks();
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


function showGroup(div) {
  document.getElementById('group').innerHTML = `
  <div class="academic1">
    <div class="admin-top">
      <div class="${div === 'tasks' ? 'selected' : ''}" onclick="showGroup('tasks')">TASKS</div>
      <div class="${div === 'projects' ? 'selected' : ''}" onclick="showGroup('projects')">PROJECTS</div>
    </div>

    <br>

    <div class="tabs" id="group-items">

      <div class="tab">
        <h2>Tasks</h2>
        <div id='group-tasks' class='events'></div>
      </div>

      <div class="tab">
        <h2>Tasks</h2>
        <div id='group-tasks' class='events'></div>
      </div>
      <div class="tab">
        <h2>Ongoing Projects</h2>
        <div id='group-projects' class='events'></div>
      </div>

    </div>
  </div>`;
  if (div === 'tasks') {
    showGroupTasks();
  } else if (div === 'projects') {
    showGroupProjects();
  }
}

function showGroupProjects() {
  const eventsElement = document.getElementById('group-items');
  
  eventsElement.innerHTML = '';
  
  const groupSnapshot = entireDbSnapshot.child('users/' + emailKey);
  const group = groupSnapshot.child('group').val();
  const projectsSnapshot = entireDbSnapshot.child('/groups/' + group + '/projects');

  let htmlContent = '';

  projectsSnapshot.forEach(childSnapshot => {
    const { title, text } = childSnapshot.val();

    htmlContent += `
      <div class="tab">
        <h3>Project Title: ${title}</h3>
        <div><md-block>${text}</md-block></div>
      </div>`;
  });
  
  eventsElement.innerHTML = htmlContent || 'No projects yet!!';
}

function showGroupTasks() {
  const eventsElement = document.getElementById('group-items');
  
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
      <div class="tab">
        <h3 onclick="handleGroupTask('${childSnapshot.key}')">${title}</h3>
        <div><md-block>${text}</md-block></div>
      </div>`;
    } else if (position !== 'Intern') {
      htmlContent += `
      <div class="tab">
        <h3 onclick="handleGroupTask('${childSnapshot.key}')">${title}</h3>
        <div><md-block>${text}</md-block></div>
      </div>`;
    }
  });
  
  eventsElement.innerHTML = htmlContent || 'No tasks yet!!';
}



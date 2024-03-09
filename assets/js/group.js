function showGroup() {
  document.getElementById('group').innerHTML = `
  <div class="academic1">
    <div class="tabs">

      <div class="tab">
        <h2>Tasks for the Weeks</h2>
        <div id='group-tasks' class='events'></div>
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
}

function showGroupTasks() {
  const eventsElement = document.getElementById('group-tasks');
  // Clear the container once
  eventsElement.innerHTML = '';

  // Directly access the user's group from the snapshot
  const groupSnapshot = entireDbSnapshot.child('users/' + emailKey).child('group');
  const group = groupSnapshot.val();

  // Directly access the tasks for the user's group from the snapshot
  const tasksSnapshot = entireDbSnapshot.child('/groups/' + group + '/tasks');

  let htmlContent = ''; // Initialize an empty string to build the HTML

  tasksSnapshot.forEach(childSnapshot => {
    const { title, text } = childSnapshot.val();

    htmlContent += `
    <div class="group-task">
      <b onclick="handleGroupTask('${childSnapshot.key}')">${title}  <i class="fa-solid fa-chevron-right" id="arrow-${childSnapshot.key}"></i></b>
      <div id="task-${childSnapshot.key}">${text}</div>
    </div>`;
  });

  // Update the DOM once after building the HTML string
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
  const mygroup = entireDbSnapshot.child('/users/' + emailKey + '/group').val(); // Directly assign the group value

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
        <img src="./../../assets/image/users/${childSnapshot.key}.jpg" alt="${name}">
        <div>
          <b>${name}</b> <br>
          ${position}, ${capitalizeFirstLetter(group)} Group
          <div class='event-icons'>
            <i class="fa-solid fa-envelope" onclick="copyToClipboard('${email}')"></i>
            ${url ? `<i class="fa-solid fa-link" onclick="goToExternal('${url}')"></i>` : ''}
          </div>
        </div>
      </div>`;

      // Reassign the updated content back to the original variables
      if (position === 'Lead') {
        htmlContent1 = targetHtmlContent;
      } else if (position === 'Member') {
        htmlContent2 = targetHtmlContent;
      } else if (position === 'Intern') {
        htmlContent3 = targetHtmlContent;
      }
    }
  });

  // Ensure the correct sections are updated
  document.getElementById('group-lead').innerHTML = htmlContent1;
  document.getElementById('group-member').innerHTML = htmlContent2;
  document.getElementById('group-intern').innerHTML = htmlContent3;
}







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

  database.ref('/users/' + emailKey).once("value").then(snapshot => {
    const group = snapshot.child('group').val();
    return database.ref('/groups/' + group + '/tasks').orderByKey().once("value");
  }).then(snapshot => {
    let htmlContent = ''; // Initialize an empty string to build the HTML

    snapshot.forEach(childSnapshot => {
      const { title, text } = childSnapshot.val();

      htmlContent += `
      <div class="group-task">
        <b onclick="handleGroupTask('${childSnapshot.key}')">${title}  <i class="fa-solid fa-chevron-right" id="arrow-${childSnapshot.key}"></i></b>
        <div id="task-${childSnapshot.key}">${text}</div>
      </div>`;
    });

    // Update the DOM once after building the HTML string
    eventsElement.innerHTML = htmlContent || 'No tasks yet!!';

  }).catch(error => {
    console.error("Error fetching events: ", error);
    // Optionally, display an error message to the user
    eventsElement.innerHTML = 'Failed to load events.';
  });
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
  let mygroup = ''; // Define `mygroup` in the outer scope to make it accessible later

  database.ref('/users/' + emailKey).once("value").then(snapshot => {
    mygroup = snapshot.child('group').val(); // Assign the group value to `mygroup`
    return database.ref('/users').orderByKey().once("value"); // Return the promise for chaining
  }).then(snapshot => {
    let htmlContent1 = '';
    let htmlContent2 = '';
    let htmlContent3 = '';

    snapshot.forEach(childSnapshot => {
      const { name, group, position, email, url } = childSnapshot.val();

      // Use `mygroup` directly here as it's now defined in an accessible scope
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

  }).catch(error => {
    console.error("Error fetching people: ", error);
    // Optionally, handle the error more gracefully
  });
}






function showChecklist() {
  document.getElementById('checklist').innerHTML = `
  <div class="academic1">
    <h1>Complete the tasks below to get integrated with ITCPR</h1>
    <p>
      Make sure you have completed all the tasks, and then clicked
      "Completed Checklist!", as you'll not find this checklist after you've
      clicked "Completed Checklist!".
    </p>
    <br /><br />
    <form class="checklist">
      <div class="item">
        <input type="checkbox" id="task1" name="task1" onchange="handleCheck()"/>
        <div>
          <h3>Setup Email Box</h3>
          <ul>
            <li>Check your email and make sure you're added to two google groups.</li>
            <li>One for your position at ITCPR and another for your research group.</li>
          </ul>
        </div>
      </div>
      <div class="item">
        <input type="checkbox" id="task2" name="task2" onchange="handleCheck()"/>
        <div>
          <h3>Join our Discord server</h3>
          <ul>
            <li>Discord is our day-to-day communication medium.</li>
            <li>Install Discord on your devices, e.g., laptop, or smartphone.</li>
            <li>Be sure to have your nickname as the username on the server.</li>
            <li>Check frequently and daily for updates.</li>
            <li>Join our discord server: <a href="https://discord.gg/bfCJQvQybU" target="_blank">https://discord.gg/bfCJQvQybU</a></li>
          </ul>
        </div>
      </div>
      <div class="item">
        <input type="checkbox" id="task3" name="task3" onchange="handleCheck()"/>
        <div>
          <h3>Important Notes</h3>
          <ul>
            <li>Google Calendar</li>
            <ul>
              <li>We use Google Calendar for group meeting schedules.</li>
              <li>Keep an eye out to get notified about the calendar events.</li>
            </ul>
            <li>Google Meet</li>
            <ul>
              <li>We use Google Meet for meetings.</li>
              <li>Meeting details can be found in the calendar event description.</li>
            </ul>
          </ul>
        </div>
      </div>
    </form>
    <div id="complete-btn">
      <button class="disabled-btn" id="disabled-btn" disabled>
        Completed Checklist!
      </button>
    </div>
  </div>`;
}

function handleCheck() {
  const isTask1Checked = document.getElementById('task1').checked;
  const isTask2Checked = document.getElementById('task2').checked;
  const isTask3Checked = document.getElementById('task3').checked;
  
  const allTasksChecked = isTask1Checked && isTask2Checked && isTask3Checked;
  const button = document.getElementById("disabled-btn");
  
  if (allTasksChecked) {
    button.removeAttribute("disabled");
    button.onclick = completeTasks; // Assign the completeTasks function to the onclick handler
  } else {
    button.setAttribute("disabled", "");
    button.onclick = null; // Remove the onclick handler if not all tasks are checked
  }
}

function completeTasks() {
  database.ref("/users/" + emailKey).update({
    new: false,
  });
  checkAuthState();
}
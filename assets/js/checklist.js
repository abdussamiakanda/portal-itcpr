function showChecklist() {
  document.getElementById('checklist').innerHTML = `<div class="academic1">
    <h1>Complete the tasks below to get integrated with ITCPR</h1>
    <p>
      Make sure you have completed all the tasks, and then clicked
      "Completed Checklist!", as you'll not find this checklist after you've
      clicked "Completed Checklist!".
    </p>
    <br /><br />
    <form class="checklist">
      <div class="item">
        <input type="checkbox" id="task1" name="task1" onclick="handleCheck1()"/>
        <div>
          <h3>Setup Institutional Email</h3>
          <ul>
            <li>Check your email</li>
          </ul>
        </div>
      </div>
      <div class="item">
        <input type="checkbox" id="task2" name="task2" onclick="handleCheck2()"/>
        <div>
          <h3>Join our Discord server</h3>
          <ul>
            <li>Discord is our day-to-day communication medium.</li>
            <li>
              Install Discord on your devices, e.g., laptop, or smartphone.
            </li>
            <li>Be sure to have your nickname as the username on the server.</li>
            <li>
              Check frequently and daily for updates.
            </li>
            <li>Join our discord server: </li>
          </ul>
        </div>
      </div>
      <div class="item">
        <input type="checkbox" id="task3" name="task3" onclick="handleCheck3()"/>
        <div>
          <h3>Important Notes</h3>
          <ul>
            <li>Google Calendar</li>
            <ul>
              <li>We use Google Calendar for group meeting schedules.</li>
              <li>Keep an eye out to get notified about the calendar events.</li>
            </ul>
            <li>
              Google Meet
            </li>
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

function handleCheck1() {
  var task1 = document.getElementById("task1").checked;
  if (task1 === true) {
    document.getElementById("task1").setAttribute("checked", false);
  } else {
    document.getElementById("task1").setAttribute("checked", true);
  }
  handleCheck();
}
function handleCheck2() {
  var task2 = document.getElementById("task2").checked;
  if (task2 === true) {
    document.getElementById("task2").setAttribute("checked", false);
  } else {
    document.getElementById("task2").setAttribute("checked", true);
  }
  handleCheck();
}
function handleCheck3() {
  var task3 = document.getElementById("task3").checked;
  if (task3 === true) {
    document.getElementById("task3").setAttribute("checked", false);
  } else {
    document.getElementById("task3").setAttribute("checked", true);
  }
  handleCheck();
}


function handleCheck() {
  var task1 = document.getElementById('task1').getAttribute("checked");
  var task2 = document.getElementById('task2').getAttribute("checked");
  var task3 = document.getElementById('task3').getAttribute("checked");
  if (task1 === "false" && task2 === "false" && task3 === "false") {
    document.getElementById("disabled-btn").setAttribute("onclick", "completeTasks()");
    document.getElementById("disabled-btn").removeAttribute("disabled");
  } else {
    document.getElementById("disabled-btn").removeAttribute("onclick");
    document.getElementById("disabled-btn").setAttribute("disabled", "");
  }
}

function completeTasks() {
  database.ref("/users/" + userdata.email.replace("@gmail.com", "")).update({
    new: false,
  });
  checkAuthState();
}
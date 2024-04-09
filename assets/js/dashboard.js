function showDashboard() {
  document.getElementById('dashboard').innerHTML = `
  <div class="academic1">
    <div class="root-tab">
      <div class="tabs">

        <div class="tab">
          <h2>Upcoming Events</h2>
          <div id='events' class='events'></div>
        </div>
        <div class="tab">
          <h2>Notices</h2>
          <div id='notices' class='events'></div>
        </div>

      </div>

      <div class="tabs">
        <div class="tab">
          <h2>Informations</h2>
          <div id='informations'></div>
        </div>
        <div class="tab">
          <h2>Performances</h2>
          <div id='performances'></div>
        </div>
        <div class="tab">
          <h2>Useful Links</h2>
          <div class="link-icons" id="useful-links"></div>
        </div>
      </div>

    </div>
  </div>`;
  showInformations();
  showEvents();
  showPerformances();
  showNotices();
  showUsefulLinks();
}

function showInformations() {
  const userPath = `users/${emailKey}`;

  const userSnapshot = entireDbSnapshot.child(userPath);
  const userData = {
    name: userSnapshot.child('name').val(),
    group: userSnapshot.child('group').val(),
    position: userSnapshot.child('position').val(),
    start: userSnapshot.child('start').val(),
    end: userSnapshot.child('end').val(),
    email: userSnapshot.child('email').val()
  };

  const groupPath = `/groups/${userData.group}`;

  const groupSnapshot = entireDbSnapshot.child(groupPath);
  const groupData = groupSnapshot.val();

  let htmlContent = `
    <b>Name:</b> ${userData.name} <br>
    <b>Position:</b> ${userData.position} <br>
    <b>Research Group:</b> ${groupData.name} <br>
    <b>Group Lead:</b> ${groupData.lead}
    ${userData.position === 'Intern' ? '<br> <b>Program Duration:</b> ' + userData.start + ' - ' + userData.end : ''}
    `;
    // <br> <b>Email:</b> ${userData.iemail}

  document.getElementById('informations').innerHTML = htmlContent;
}

function showEvents() {
  const eventsElement = document.getElementById('events');
  // Clear the container once
  eventsElement.innerHTML = '';

  // Directly access the user's group from the snapshot
  const userSnapshot = entireDbSnapshot.child('users/' + emailKey);
  const group = userSnapshot.child('group').val();

  // Directly access the group's events from the snapshot
  const eventsSnapshot = entireDbSnapshot.child('/groups/' + group + '/events');

  let htmlContent = ''; // Initialize an empty string to build the HTML

  eventsSnapshot.forEach(childSnapshot => {
    const { title, time, meeting, attachment, timezone } = childSnapshot.val();
    const now = moment.tz(timezone).valueOf(); // Current time in the event's timezone

    // Assuming childSnapshot.key is meant to be compared as a timestamp
    if (now < Number(childSnapshot.key) + (3600000)) {
      const eventTime = convertToLocalTime(time, timezone);
      htmlContent += `
        <div class='event'>
          <b>${title}</b> <br>
          <span class='time'>${eventTime}</span>
          <span class='event-icons'>
            <i class="fa-solid fa-video" onclick="goToExternal('${meeting}')"> Google Meet</i>
            ${attachment ? `<i class="fa-solid fa-paperclip" onclick="goToExternal('${attachment}')"> Attachment</i>` : ''}
          </span>
        </div>`;
    }
  });

  eventsElement.innerHTML = htmlContent || 'No upcoming events!';
}

function showPerformances() {
  const userSnapshot = entireDbSnapshot.child('users/' + emailKey);

  const attendanceRaw = userSnapshot.child('attendance').val() || '0/0';
  const participationRaw = userSnapshot.child('participation').val() || '0/0';

  const attendance = attendanceRaw.split('/').map(Number);
  const participation = participationRaw.split('/').map(Number);

  const performancesHTML = `
    <div class='performances'>
      <div class='performance' id='performance1'>
        <svg width="100" height="100"></svg>
        <span>Attendance</span>
      </div>
      <div class='performance' id='performance2'>
        <svg width="100" height="100"></svg>
        <span>Participation</span>
      </div>
    </div>`;

  document.getElementById('performances').innerHTML = performancesHTML;

  const data1 = [
    { label: 'Missed', percent: attendance[0] },
    { label: 'Attended', percent: Math.max(0, attendance[1] - attendance[0]) },
  ];
  const data2 = [
    { label: 'Missed', percent: participation[0] },
    { label: 'Participated', percent: Math.max(0, participation[1] - participation[0]) },
  ];

  // Create charts
  createPieChart("performance1", data1);
  createPieChart("performance2", data2);
}

function createPieChart(targetId, data) {
  var d0 = parseInt(data[0].percent);
  var d1 = parseInt(data[1].percent);
  var percentage = data.length > 1 && d1 !== 0 ? (d1 / (d1+d0) * 100).toFixed(0) : 0;
  var svg = d3.select("#" + targetId + " svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    radius = Math.min(width, height) / 2;

  var g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
  var color = d3.scaleOrdinal(["rgba(0, 0, 0, 0.5)", "rgb(157, 157, 189)"]);
  var pie = d3.pie().value(function(d) { return d.percent; });
  var path = d3.arc().outerRadius(radius).innerRadius(30);

  var arc = g.selectAll(".arc")
    .data(pie(data))
    .enter().append("g")
    .attr("class", "arc");

  arc.append("path")
    .attr("d", path)
    .attr("fill", function(d) { return color(d.data.label); });

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .text(percentage + "%");
}

function showNotices() {
  const noticesElement = document.getElementById('notices');
  
  // Clear notices content initially
  noticesElement.innerHTML = '';

  // Directly access user-specific data from the snapshot
  const userSnapshot = entireDbSnapshot.child(`users/${emailKey}`);
  const { group, position } = userSnapshot.val(); // Destructure for easier access

  // Access all notices directly from the snapshot
  const noticesSnapshot = entireDbSnapshot.child('/notices');

  let htmlContent = ''; // Initialize HTML content string
  
  noticesSnapshot.forEach(noticeSnapshot => {
    const { title, text, till, timezone, criteria } = noticeSnapshot.val();
    const now = moment.tz(timezone).valueOf(); // Current time in the event's timezone

    // Check if the notice is still active and if it matches the user's criteria
    if (now < till && (criteria === 'All' || criteria === position || criteria === capitalizeFirstLetter(group))) {
      htmlContent += `
        <div class='event notice'>
          <b>${title}</b> <br>
          <span>${text}</span>
        </div>`;
    }
  });

  // Update DOM only once with the final HTML content
  noticesElement.innerHTML = htmlContent || 'No new notices!';
}

function showUsefulLinks() {
  const userSnapshot = entireDbSnapshot.child('/users/' + emailKey);
  const group = userSnapshot.child('group').val();

  let links = [];

  if (group === 'spintronics') {
    links = [
      { url: 'https://itcpr.org', iconClass: 'fa-solid fa-earth-asia', text: 'Website' },
      // { url: 'https://mail.itcpr.org', iconClass: 'fa-solid fa-envelope', text: 'Email' },
      { url: 'https://itcpr.org/post/getting_started_with_spintronics', iconClass: 'fa-solid fa-person-snowboarding', text: 'Kickstart' },
      { url: 'https://discord.gg/bfCJQvQybU', iconClass: 'fa-brands fa-discord', text: 'Discord' },
      { url: 'https://literature.itcpr.org', iconClass: 'fa-solid fa-book-open', text: 'Literature' },
      { url: 'http://server.itcpr.org/status.html', iconClass: 'fa-solid fa-server', text: 'Server' },
    ];
  } else {
    links = [
      { url: 'https://itcpr.org', iconClass: 'fa-solid fa-earth-asia', text: 'Website' },
      // { url: 'https://mail.itcpr.org', iconClass: 'fa-solid fa-envelope', text: 'Email' },
      { url: 'https://discord.gg/bfCJQvQybU', iconClass: 'fa-brands fa-discord', text: 'Discord' },
      { url: 'https://literature.itcpr.org', iconClass: 'fa-solid fa-book-open', text: 'Literature' },
      { url: 'http://server.itcpr.org/status.html', iconClass: 'fa-solid fa-server', text: 'Server' },
    ];
  }
  proceed_links(links);
}

function proceed_links(links) {
  const usefulLinksElement = document.getElementById('useful-links');
  usefulLinksElement.innerHTML = links.map(link => `
    <div class="icon" onclick="goToExternal('${link.url}')">
      <i class="${link.iconClass}"></i>
      <span>${link.text}</span>
    </div>
  `).join('');
}

let alertTimeout = null;

function alertMessage(type = "success", message) {
  const alertSection = document.getElementById("alerts");
  alertSection.innerHTML = message;

  clearTimeout(alertTimeout);

  alertSection.classList.add(type === "success" ? "show-alerts-success" : "show-alerts-danger");

  alertTimeout = setTimeout(() => {
    alertSection.classList.remove("show-alerts-success", "show-alerts-danger");
    alertSection.innerHTML = '';
  }, 3000);
}


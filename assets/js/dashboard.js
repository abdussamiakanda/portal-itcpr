function showDashboard() {
  document.getElementById('dashboard').innerHTML = `
  <div class="academic1">
    <div class="root-tab">
      <div class="tabs">

        <div class="tab">
          <h3>Upcoming Events</h3>
          <div id='events' class='events'></div>
        </div>
        <div class="tab">
          <h3>Notices</h3>
          <div id='notices' class='events'></div>
        </div>

      </div>

      <div class="tabs">
        <div class="tab">
          <h3>Informations</h3>
          <div id='informations'></div>
        </div>
        <div class="tab">
          <h3>Performances</h3>
          <div id='performances'></div>
        </div>
        <div class="tab">
          <h3>Useful Links</h3>
          <div class="link-icons" id="useful-links"></div>
        </div>
      </div>

    </div>
  </div>`;
  showInformations();
  showEvents();
  showPerformances();
  showNotices();
  showUsefulLinks()
}

function showInformations() {
  database.ref('/users/'+userdata.email.replace("@gmail.com", "")).once("value").then((snapshot) => {
    var name = snapshot.child('name').val();
    var group = snapshot.child('group').val();
    var position = snapshot.child('position').val();
    var start = snapshot.child('start').val();
    var end = snapshot.child('end').val();
    var email = snapshot.child('email').val();

    database.ref('/groups/'+group).once("value").then((snapshot1) => {
      var gname = snapshot1.child('name').val();
      var lead = snapshot1.child('lead').val();

      document.getElementById('informations').innerHTML = `
      <b>Name:</b> ${name} <br>
      <b>Position:</b> ${position} <br />
      <b>Research Group:</b> ${gname} <br />
      <b>Group Lead:</b> ${lead}
      ${position === 'Intern' ? '<br> <b>Program Duration:</b> '+ start + ' - ' + end : '' }
      <br> <b>Email:</b> ${email}`;
    })
  })
}

function showEvents() {
  document.getElementById('events').innerHTML = '';
  database.ref('/users/'+userdata.email.replace("@gmail.com", "")).once("value").then((snapshot) => {
    var group = snapshot.child('group').val();

    database.ref('/groups/'+group+'/events').orderByKey().once("value").then((snapshot1) => {
      snapshot1.forEach(function (childSnapshot) {
        var title = snapshot1.child(childSnapshot.key + "/title").val();
        var time = snapshot1.child(childSnapshot.key + "/time").val();
        var meeting = snapshot1.child(childSnapshot.key + "/meeting").val();
        var attachment = snapshot1.child(childSnapshot.key + "/attachment").val();

        var now = Date.now();

        if (now < childSnapshot.key) {
          document.getElementById('events').innerHTML += `
          <div class='event'>
            <b>${title}</b> <br>
            <span class='time'>${time}</span>
            <span class='event-icons'>
              <i class="fa-solid fa-video" onclick="goToExternal('${meeting}')"> Google Meet</i>
              <i class="fa-solid fa-paperclip" onclick="goToExternal('${attachment}')"> Attachment</i>
            </span>
          </div>`;
        }
      });
    });
  });
}

function showPerformances() {
  database.ref('/users/'+userdata.email.replace("@gmail.com", "")).once("value").then((snapshot) => {
    var attendance = snapshot.child('attendance').val().split('/');
    var participation = snapshot.child('participation').val().split('/');

    document.getElementById('performances').innerHTML = `
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

    var data1 = [{label: 'Red', percent: attendance[1]-attendance[0]}, {label: 'Blue', percent: attendance[0]}];
    var data2 = [{label: 'Red', percent: participation[1]-participation[0]}, {label: 'Blue', percent: participation[0]}];

    createPieChart("performance1", data1);
    createPieChart("performance2", data2);
  })
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
  document.getElementById('notices').innerHTML = '';
  database.ref('/users/'+userdata.email.replace("@gmail.com", "")).once("value").then((snapshot) => {
    var group = snapshot.child('group').val();
    var position = snapshot.child('position').val();

    database.ref('/notices').orderByKey().once("value").then((snapshot1) => {
      snapshot1.forEach(function (childSnapshot) {
        var title = snapshot1.child(childSnapshot.key + "/title").val();
        var text = snapshot1.child(childSnapshot.key + "/text").val();
        var till = snapshot1.child(childSnapshot.key + "/till").val();
        var criteria = snapshot1.child(childSnapshot.key + "/criteria").val();

        var now = Date.now();

        if (now < till) {
          if (criteria === 'All') {
            doIt(title,text);
          } else if (criteria === position) {
            doIt(title,text);
          } else if (criteria === group) {
            doIt(title,text);
          }
        }
      });
    }).then(() => {
      var whatif = document.getElementById('notices').innerHTML;
  
      if (whatif === '') {
        document.getElementById('notices').innerHTML = 'No new notices!'
      }
    })
  })
}

function doIt(title,text) {
  document.getElementById('notices').innerHTML += `
  <div class='event notice'>
    <b>${title}</b> <br>
    <span>${text}</span>
  </div>`;
}

function showUsefulLinks() {
  document.getElementById('useful-links').innerHTML = `
  <div class="icon" onclick="goToExternal('https://itcpr.org')">
    <i class="fa-solid fa-earth-asia"></i>
    <span>Website</span>
  </div>
  <div class="icon" onclick="goToExternal('https://mail.itcpr.org')">
    <i class="fa-solid fa-envelope"></i>
    <span>Email</span>
  </div>
  <div class="icon" onclick="goToExternal('https://discord.gg/bfCJQvQybU')">
    <i class="fa-brands fa-discord"></i>
    <span>Discord</span>
  </div>`;
}

function alertMessage(type = "success", message) {
  const alertSection = document.getElementById("alerts");
  let content = message;
  alertSection.innerHTML = content;

  if(type === "success") {
      alertSection.classList.add("show-alerts-success");
  } else {
      alertSection.classList.add("show-alerts-danger");
  }

  setTimeout(() => {
      alertSection.classList.remove("show-alerts-success", "show-alerts-danger");
      alertSection.innerHTML = '';
  }, 3000);
}

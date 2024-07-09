function showProfile() {
  showHeaderMenu('')
  var profile = document.getElementById("profile");

  const profileSnapshot = entireDbSnapshot.child('/users/' + emailKey);
  const { name, email, contact, position, group, quartile, start, end, timezone, image, discord } = profileSnapshot.val();
  let element1 = '';
  let element2 = '';
  let element3 = '';
  let element4 = '';

  if (position === 'Intern') {
    element1 = `<div class="profile-item">
        <div class="profile-label">Quartile</div>
        <div class="profile-value">${quartile}</div>
      </div>`;
    element2 = `<div class="profile-item">
        <div class="profile-label">Start of Internship</div>
        <div class="profile-value">${start}</div>
      </div>`;
    element3 = `<div class="profile-item">
        <div class="profile-label">End of Internship</div>
        <div class="profile-value">${end}</div>
      </div>`;
    Ggroup1 = 'Intern';
    url1 = 'interns';
  } else {
    Ggroup1 = 'Members';
    url1 = 'members';
  }
  if (discord === undefined) {
    element4 = `<span class="discord"><i class="fa-brands fa-discord"></i> Discord</span>`;
  } else {
    element4 = '<span class="google"><i class="fa-brands fa-discord"></i> Discord</span>';
  }

  profile.innerHTML = `<div class="academic1">
    <div class="profile">
      <div class="profile-image">
        <img src="${image}" alt="">
      </div>
      <br>
      <div class="profile-item">
        <div class="profile-label">Name</div>
        <div class="profile-value">${name}</div>
      </div>
      <div class="profile-item">
        <div class="profile-label">Email</div>
        <div class="profile-value">${email}</div>
      </div>
      <div class="profile-item">
        <div class="profile-label">Contact</div>
        <div class="profile-value">${contact}</div>
      </div>
      <div class="profile-item">
        <div class="profile-label">Position</div>
        <div class="profile-value">${position}</div>
      </div>
      <div class="profile-item">
        <div class="profile-label">Group</div>
        <div class="profile-value">${capitalizeFirstLetter(group)}</div>
      </div>
      ${element1, element2, element3}
      <div class="profile-item">
        <div class="profile-label">Timezone</div>
        <div class="profile-value">${timezone}</div>
      </div>
      <div class="profile-item">
        <div class="profile-label">Link Accounts</div>
        <div class="profile-value">
          <span class="google"><i class="fa-brands fa-google"></i> Google</span> | ${element4}
        </div>
      </div>
      <div class="profile-item">
        <div class="profile-label">Join Google Groups</div>
        <div class="profile-value">
          <span class="discord" onclick="goToExternal('https://groups.google.com/a/itcpr.org/g/${url1}')">${Ggroup1}</span> | <span class="discord" onclick="goToExternal('https://groups.google.com/a/itcpr.org/g/${group}')">${capitalizeFirstLetter(group)}</span>
        </div>
      </div>
      <div class="profile-item2">
        <div class="profile-label">Progress</div><br>
        <div class="profile-progress" id="profile-progress"></div>
      </div>
    </div>
  </div>`;
  showProfileProgress();
}

function showProfileProgress() {
  document.getElementById('profile-progress').innerHTML = `
    <div class="prog-head">
      <div class="title">MEETING TITLE</div>
      <div class="att">ATTENDANCE</div>
      <div class="part">PARTICIPATION</div>
    </div>`;

  const profileSnapshot = entireDbSnapshot.child('/users/' + emailKey);
  const { group } = profileSnapshot.val();
  const usersSnapshot = entireDbSnapshot.child('/groups/' + group + '/events');
  usersSnapshot.forEach(function (childSnapshot) {
    var title = childSnapshot.child("/title").val();
    var isAtt = childSnapshot.child("/gigs/"+ emailKey + "/attendance").val();
    var isPart = childSnapshot.child("/gigs/"+ emailKey + "/participation").val();
    console.log(title, isAtt, isPart);
    document.getElementById('profile-progress').innerHTML += `
      <div class="prog-detail">
        <div class="title">${title}</div>
        <div class="att">${isAtt}</div>
        <div class="part">${isPart}</div>
      </div>`;
  });
}


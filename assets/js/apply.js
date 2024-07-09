let aplicationStatus = false;

function getId() {
  let urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get('id');
  return id;
}

function editApply() {
  const id = getId();
  const applicantsRef = database.ref('/applicants');

  applicantsRef.child(id).once('value', function(snapshot) {
    const { approval } = snapshot.val();
    if (approval === 'pending') {
      editApplication();
    } else {
      alertMessage(t="fail","You can't edit this application.");
      showDiv('login');
    }
  });
}

function editApplication() {
  const id = getId();
  const applicantsRef = database.ref('/applicants');

  applicantsRef.child(id).once('value', function(snapshot) {
    const { name, email, contact, address, education, university, major, year, graduationdate, courses, experiences, publications, skills, reason, field, expectation } = snapshot.val();

    document.getElementById('apply').innerHTML = `
    <div class="applyform">
      <div>
        Begin your journey with the Institution for Theoretical and Computational Physics Research's internship program. Engage in enriching, hands-on experiences that deepen your academic and professional expertise. As you apply, ensure you're familiar with all terms and conditions in the Institutional Charter as detailed on
        the institution's website rules and criteria to become an integral part of our team, driving forward the frontiers of scientific research.
      </div>
      <br><br>
      <form>
        <h3>Personal Information</h3>
        <p>Ensure that the information you provide in your application accurately matches your official documents, such as your National ID or passport.</p>
        <input type="text" id="name" placeholder="Enter Full Name.." value="${name}" onkeyup="checkApplication()">
        <input type="text" id="email" placeholder="Enter Email Address (Use gmail).." value="${email}" onkeyup="checkApplication()">
        <input type="text" id="contact" placeholder="Enter Contact Number.." value="${contact}" onkeyup="checkApplication()">
        <input type="text" id="address" placeholder="Enter Address.." value="${address}" onkeyup="checkApplication()">

        <h3>Educational Background</h3>
        <p>Our internship program primarily targets undergraduate students, offering a platform to engage in meaningful research in theoretical and computational physics. We also extend this opportunity to graduate students who may lack access to quality research in their current programs.</p>
        <select id="education" class="dropdown" onkeyup="checkApplication()">
          <option value="">Current Level of Education</option>
          <option value="Undergraduate" ${education === 'Undergraduate' ? 'selected' : ''}>Undergraduate</option>
          <option value="Graduate" ${education === 'Graduate' ? 'selected' : ''}>Graduate</option>
        </select>
        <input type="text" id="university" placeholder="Current University.." value="${university}" onkeyup="checkApplication()">
        <input type="text" id="major" placeholder="Enter Major.." value="${major}" onkeyup="checkApplication()">
        <select id="year" class="dropdown" onkeyup="checkApplication()">
          <option value="">Current Year</option>
          <option value="1st Year" ${year === '1st Year' ? 'selected' : ''}>1st Year</option>
          <option value="2nd Year" ${year === '2nd Year' ? 'selected' : ''}>2nd Year</option>
          <option value="3rd Year" ${year === '3rd Year' ? 'selected' : ''}>3rd Year</option>
          <option value="4th Year" ${year === '4th Year' ? 'selected' : ''}>4th Year</option>
          <option value="5th Year" ${year === '5th Year' ? 'selected' : ''}>5th Year</option>
        </select>
        <input type="text" id="graduationdate" placeholder="Expected Graduation Date.." value="${graduationdate}" onkeyup="checkApplication()">

        <h3>Academic and Professional Experience</h3>
        <p>In your application, detail all relevant experiences comprehensively. For any sections that do not apply to you, simply write 'N/A' (not applicable) to indicate this.</p>
        <textarea id="courses" placeholder="Relevant Courses Taken (List academic and online courses).." onkeyup="checkApplication()">${courses}</textarea>
        <textarea id="experiences" placeholder="Previous Internships or Research Experiences.." onkeyup="checkApplication()">${experiences}</textarea>
        <textarea id="publications" placeholder="Any Published Work.." onkeyup="checkApplication()">${publications}</textarea>
        <textarea id="skills" placeholder="Skills Relevant to the Research Field (List programming and graphic skills).." onkeyup="checkApplication()">${skills}</textarea>

        <h3>Statement of Interest</h3>
        <p>In your application, provide succinct and focused descriptions of your interests. This clarity will help us better understand your passion and how it aligns with our research goals.</p>
        <textarea id="reason" placeholder="Reasons for Applying to the Internship (100 words minimum).." onkeyup="checkApplication()">${reason}</textarea>
        <select id="field" class="dropdown" onkeyup="checkApplication()">
          <option value="">Specific Areas of Interest</option>
          <option value="Spintronics" ${field === 'Spintronics' ? 'selected' : ''}>Spintronics</option>
          <option value="Photonics" ${field === 'Photonics' ? 'selected' : ''}>Photonics</option>
        </select>
        <textarea id="expectation" placeholder="Expectations and Goals for the Internship (100 words minimum).." onkeyup="checkApplication()">${expectation}</textarea>

        <h3>Supporting Documents</h3>
        <p>Please email us the listed documents below in PDF format, to

        <ul>
          <li>Curriculum Vitae (CV)</li>
          <li>Academic Transcript</li>
          <li>Cover Letter</li>
          <li>Additional Documents</li>
        </ul>

        <div class="form-bottom">
          <div class="cancel" onclick="showDiv('login')">Cancel</div>
          <div class="add" onclick="handleEditApplicant('${id}')">Submit Edited Application</div>
        </div>
      </form>
    </div>`;
  });
}

function handleEditApplicant(id) {
  const name = document.getElementById('name').value.trimEnd();
  const email = document.getElementById('email').value;
  const contact = document.getElementById('contact').value;
  const address = document.getElementById('address').value;
  const education = document.getElementById('education').value;
  const university = document.getElementById('university').value;
  const major = document.getElementById('major').value;
  const year = document.getElementById('year').value;
  const graduationdate = document.getElementById('graduationdate').value;
  const courses = document.getElementById('courses').value;
  const experiences = document.getElementById('experiences').value;
  const publications = document.getElementById('publications').value;
  const skills = document.getElementById('skills').value;
  const reason = document.getElementById('reason').value;
  const field = document.getElementById('field').value;
  const expectation = document.getElementById('expectation').value;

  if (aplicationStatus) {
    const editedApplicant = {
      name: name,
      email: email,
      contact: contact,
      address: address,
      education: education,
      university: university,
      major: major,
      year: year,
      graduationdate: graduationdate,
      courses: courses,
      experiences: experiences,
      publications: publications,
      skills: skills,
      reason: reason,
      field: field,
      expectation: expectation,
      approval: 'pending',
    };

    const body = `Dear ${name},<br><br>
    Your application to the Institute for Theoretical and Computational
    Physics Research has been successfully edited. Our team will review
    your application and get back to you soon.
    <br><br>
    Here are the details you provided:
    <br><br>
    <b>Personal Information</b><br>
    Name: ${name}<br>
    Email: ${email}<br>
    Contact: ${contact}<br>
    Address: ${address}<br>
    <br>
    <b>Educational Background</b><br>
    Education: ${education}<br>
    University: ${university}<br>
    Major: ${major}<br>
    Year: ${year}<br>
    Graduation Date: ${graduationdate}<br>
    <br>
    <b>Academic and Professional Experience</b><br>
    Relevant Courses: ${courses}<br>
    Previous Experiences: ${experiences}<br>
    Publications: ${publications}<br>
    Skills: ${skills}<br>
    <br>
    <b>Statement of Interest</b><br>
    Reason for Applying: ${reason}<br>
    Field of Interest: ${field}<br>
    Expectations: ${expectation}
    <br><br>
    You need to email us the following documents in PDF format to
    info@itcpr.org to complete your application:
    <br>
    - Curriculum Vitae (CV)<br>
    - Academic Transcript<br>
    - Cover Letter<br>
    - Additional Documents
    <br><br>
    To edit your application, click here: <a href="https://portal.itcpr.org?id=${id}">Edit Application</a>
    <br><br>
    Regards, <br>
    Administrative Team <br>
    Institute for Theoretical and Computational Physics Research (ITCPR)`;

    database.ref(`/applicants/`+id).update(editedApplicant).then(() => {
      showDiv('login');
      alertMessage(t="success","Application edited successfully!");
      sendEmail(email, "Application Edited and Submitted to ITCPR!", body);
      sendEmail('info@itcpr.org', name+" Edited A Submitted Application", 'An application submitted by '+name+' has been edited. Check the portal for details.');
    }).catch(error => {
      console.error("Error updating applicant in Firebase:", error);
    });
  } else {
    checkApplication();
    alertMessage(t="fail","Please fill in all required fields.");
  }
}

function showApplyForm() {
  document.getElementById('apply').innerHTML = `
  <div class="applyform">
    <div>
      Begin your journey with the Institution for Theoretical and Computational Physics Research's internship program. Engage in enriching, hands-on experiences that deepen your academic and professional expertise. As you apply, ensure you're familiar with all terms and conditions in the Institutional Charter as detailed on
      the institution's website rules and criteria to become an integral part of our team, driving forward the frontiers of scientific research.
    </div>
    <br><br>
    <form>
      <h3>Personal Information</h3>
      <p>Ensure that the information you provide in your application accurately matches your official documents, such as your National ID or passport.</p>
      <input type="text" id="name" placeholder="Enter Full Name.." onkeyup="checkApplication()">
      <input type="text" id="email" placeholder="Enter Email Address (Use gmail).." onkeyup="checkApplication()">
      <input type="text" id="contact" placeholder="Enter Contact Number.." onkeyup="checkApplication()">
      <input type="text" id="address" placeholder="Enter Address.." onkeyup="checkApplication()">

      <h3>Educational Background</h3>
      <p>Our internship program primarily targets undergraduate students, offering a platform to engage in meaningful research in theoretical and computational physics. We also extend this opportunity to graduate students who may lack access to quality research in their current programs.</p>
      <select id="education" class="dropdown" onkeyup="checkApplication()">
        <option value="">Current Level of Education</option>
        <option value="Undergraduate">Undergraduate</option>
        <option value="Graduate">Graduate</option>
      </select>
      <input type="text" id="university" placeholder="Current University.." onkeyup="checkApplication()">
      <input type="text" id="major" placeholder="Enter Major.." onkeyup="checkApplication()">
      <select id="year" class="dropdown" onkeyup="checkApplication()">
        <option value="">Current Year</option>
        <option value="1st Year">1st Year</option>
        <option value="2nd Year">2nd Year</option>
        <option value="3rd Year">3rd Year</option>
        <option value="4th Year">4th Year</option>
        <option value="5th Year">5th Year</option>
      </select>
      <input type="text" id="graduationdate" placeholder="Expected Graduation Date.." onkeyup="checkApplication()">

      <h3>Academic and Professional Experience</h3>
      <p>In your application, detail all relevant experiences comprehensively. For any sections that do not apply to you, simply write 'N/A' (not applicable) to indicate this.</p>
      <textarea id="courses" placeholder="Relevant Courses Taken (List academic and online courses).." onkeyup="checkApplication()"></textarea>
      <textarea id="experiences" placeholder="Previous Internships or Research Experiences.." onkeyup="checkApplication()"></textarea>
      <textarea id="publications" placeholder="Any Published Work.." onkeyup="checkApplication()"></textarea>
      <textarea id="skills" placeholder="Skills Relevant to the Research Field (List programming and graphic skills).." onkeyup="checkApplication()"></textarea>

      <h3>Statement of Interest</h3>
      <p>In your application, provide succinct and focused descriptions of your interests. This clarity will help us better understand your passion and how it aligns with our research goals.</p>
      <textarea id="reason" placeholder="Reasons for Applying to the Internship (100 words minimum).." onkeyup="checkApplication()"></textarea>
      <select id="field" class="dropdown" onkeyup="checkApplication()">
        <option value="">Specific Areas of Interest</option>
        <option value="Spintronics">Spintronics</option>
        <option value="Photonics">Photonics</option>
      </select>
      <textarea id="expectation" placeholder="Expectations and Goals for the Internship (100 words minimum).." onkeyup="checkApplication()"></textarea>

      <h3>Supporting Documents</h3>
      <p>Please email us the listed documents below in PDF format, to info@itcpr.org. If you are providing additional documents like certificates, kindly merge them into a single PDF file. We'll review your application once you submit the documents.</p>
      <ul>
        <li>Curriculum Vitae (CV)</li>
        <li>Academic Transcript</li>
        <li>Cover Letter</li>
        <li>Additional Documents</li>
      </ul>
      
      <div class="form-bottom">
          <div class="cancel" onclick="showDiv('login')">Cancel</div>
          <div class="add" onclick="handleNewApplicant()">Submit Application</div>
      </div>
    </form>
  </div>`;
}

function checkApplication() {
  const name = document.getElementById('name').value.trimEnd();
  const email = document.getElementById('email').value;
  const contact = document.getElementById('contact').value;
  const address = document.getElementById('address').value;
  const education = document.getElementById('education').value;
  const university = document.getElementById('university').value;
  const major = document.getElementById('major').value;
  const year = document.getElementById('year').value;
  const graduationdate = document.getElementById('graduationdate').value;
  const courses = document.getElementById('courses').value;
  const experiences = document.getElementById('experiences').value;
  const publications = document.getElementById('publications').value;
  const skills = document.getElementById('skills').value;
  const reason = document.getElementById('reason').value;
  const field = document.getElementById('field').value;
  const expectation = document.getElementById('expectation').value;

  if (!name) {
    document.getElementById('name').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('name').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (!email.includes('@gmail.com')) {
    document.getElementById('email').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('email').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (contact.length < 11 || contact.length > 14) {
    document.getElementById('contact').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('contact').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (!address) {
    document.getElementById('address').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('address').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (!education) {
    document.getElementById('education').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('education').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (!university) {
    document.getElementById('university').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('university').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (!major) {
    document.getElementById('major').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('major').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (!year) {
    document.getElementById('year').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('year').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (!graduationdate) {
    document.getElementById('graduationdate').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('graduationdate').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (!courses || courses.trimEnd() == 'N/A' || courses.length < 100) {
    document.getElementById('courses').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('courses').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (!experiences) {
    document.getElementById('experiences').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('experiences').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (!publications) {
    document.getElementById('publications').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('publications').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (skills.trim().split(/\s+/).length < 40) {
    document.getElementById('skills').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('skills').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (reason.trim().split(/\s+/).length < 100) {
    document.getElementById('reason').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('reason').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (!field) {
    document.getElementById('field').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('field').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }

  if (expectation.trim().split(/\s+/).length < 100) {
    document.getElementById('expectation').style.boxShadow = '0px 0px 5px red';
  } else {
    document.getElementById('expectation').style.boxShadow = '0px 0px 5px rgba(0, 0, 0, 0.5)';
  }
  
  if (name && email && email.includes('@gmail.com') && contact 
      && contact.length >= 11 && contact.length <= 14 && address && education 
      && university && major && year && graduationdate && courses && courses.trimEnd() != 'N/A' && courses.length >= 100 
      && experiences && publications && skills.trim().split(/\s+/).length >= 100 && reason && reason.trim().split(/\s+/).length >= 100 
      && field && expectation && expectation.trim().split(/\s+/).length >= 100) {
    aplicationStatus = true;
  } else {
    aplicationStatus = false;
  }
}

function handleNewApplicant() {
  const name = document.getElementById('name').value.trimEnd();
  const email = document.getElementById('email').value;
  const contact = document.getElementById('contact').value;
  const address = document.getElementById('address').value;
  const education = document.getElementById('education').value;
  const university = document.getElementById('university').value;
  const major = document.getElementById('major').value;
  const year = document.getElementById('year').value;
  const graduationdate = document.getElementById('graduationdate').value;
  const courses = document.getElementById('courses').value;
  const experiences = document.getElementById('experiences').value;
  const publications = document.getElementById('publications').value;
  const skills = document.getElementById('skills').value;
  const reason = document.getElementById('reason').value;
  const field = document.getElementById('field').value;
  const expectation = document.getElementById('expectation').value;

  if (aplicationStatus) {
    emailKey = sanitizeEmail(email.replace("@gmail.com", ""));
    const applicantsRef = database.ref('/applicants');

    applicantsRef.child(emailKey).once('value', function(snapshot) {
      const exists = snapshot.exists();
      if (exists) {
        alertMessage(t="fail","An application is already submitted with this email.");
      } else {
        const newApplicant = {
          name: name,
          email: email,
          contact: contact,
          address: address,
          education: education,
          university: university,
          major: major,
          year: year,
          graduationdate: graduationdate,
          courses: courses,
          experiences: experiences,
          publications: publications,
          skills: skills,
          reason: reason,
          field: field,
          expectation: expectation,
          approval: 'pending',
        };

        const body = `Dear ${name},<br><br>
        Your application to the Institute for Theoretical and Computational
        Physics Research has been successfully submitted. Our team will review
        your application and get back to you soon.
        <br><br>
        Here are the details you provided:
        <br><br>
        <b>Personal Information</b><br>
        Name: ${name}<br>
        Email: ${email}<br>
        Contact: ${contact}<br>
        Address: ${address}<br>
        <br>
        <b>Educational Background</b><br>
        Education: ${education}<br>
        University: ${university}<br>
        Major: ${major}<br>
        Year: ${year}<br>
        Graduation Date: ${graduationdate}<br>
        <br>
        <b>Academic and Professional Experience</b><br>
        Relevant Courses: ${courses}<br>
        Previous Experiences: ${experiences}<br>
        Publications: ${publications}<br>
        Skills: ${skills}<br>
        <br>
        <b>Statement of Interest</b><br>
        Reason for Applying: ${reason}<br>
        Field of Interest: ${field}<br>
        Expectations: ${expectation}
        <br><br>
        You need to email us the following documents in PDF format to
        info@itcpr.org to complete your application:
        <br>
        - Curriculum Vitae (CV)<br>
        - Academic Transcript<br>
        - Cover Letter<br>
        - Additional Documents
        <br><br>
        To edit your application, click here: <a href="https://portal.itcpr.org?id=${emailKey}">Edit Application</a>
        <br><br>
        Regards, <br>
        Administrative Team <br>
        Institute for Theoretical and Computational Physics Research (ITCPR)`;
  
        database.ref(`/applicants/`+emailKey).update(newApplicant).then(() => {
          showDiv('login');
          alertMessage(t="success","Application submitted successfully!");
          sendEmail(email, "Application Submitted to ITCPR!", body);
          sendEmail('info@itcpr.org', "New Application Submitted", 'A new application has been submitted to ITCPR. Check the portal for details.');
        }).catch(error => {
          console.error("Error updating applicant in Firebase:", error);
        });
      }
    });
  
  } else {
    checkApplication();
    alertMessage(t="fail","Please fill in all required fields.");
  } 
}

function acceptApplication(user,email,field) {
  const groupSnapshot = entireDbSnapshot.child(`/groups/${field.toLowerCase()}`);
  const { lead } = groupSnapshot.val();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const duration = new Date(currentYear + 1, newMonth).toLocaleString('default', { month: 'long' }) + ' ' + (currentYear + 1);

  const body = `Dear ${user},<br><br>
  We are delighted to inform you that your application to the Institute for Theoretical and
  Computational Physics Research (ITCPR) has been accepted. Your skills and background make
  you an ideal fit for our team, and we are excited about the potential contributions you
  will bring.
  <br><br>
  As a pioneering virtualinstitution, ITCPR is dedicated to breaking new ground in theoretical
  and computational physics, providing unique research opportunities that propel untapped
  talent into the forefront of scientific innovation.
  <br><br>
  At ITCPR, you will immerse yourself in a vibrant scientific community, receive mentorship
  from seasoned professionals, and engage in cutting-edge research that expands the boundaries
  of knowledge. We are here to support your journey of professional growth, innovation, and
  discovery.
  <br><br>
  <b>Position Details:</b>
  <ul>
    <li>Title: Intern</li>
    <li>Research Group: ${field} Group</li>
    <li>Team Lead: ${lead}</li>
    <li>Duration: Till ${duration}</li>
    <li>Expected Hours: 10 hours per week</li>
  </ul>
  <br><br>
  <b>Responsibilities:</b>
  <ul>
    <li>Enhancing your skills during the training period.</li>
    <li>Contributing to team meetings with insights and ideas.</li>
    <li>Assisting in data analysis and research documentation.</li>
    <li>Collaborating on theoretical and computational physics projects.</li>
    <li>Complying with institutional policies and ethical standards.</li>
  </ul>
  <br><br>
  <b>Terms of Internship:</b>
  <ul>
    <li>The internship concludes in 1 year, with the option for interns to reapply for continuation into the next year.</li>
    <li>Interns are expected to maintain a regular engagement schedule as agreed with their research group lead.</li>
    <li>This is a self-funded institution; therefore, the internship position is unpaid.</li>
    <li>Interns will receive comprehensive training in various software and research methodologies crucial for their role.</li>
    <li>Each intern will be under the supervision of the lead of their assigned research group.</li>
    <li>Adherence to confidentiality and data protection standards is mandatory, particularly regarding sensitive research information.</li>
    <li>Upon successful completion, interns will be awarded a certificate recognizing their contribution and learning.</li>
    <li>Completion of the internship does not guarantee subsequent membership with ITCPR.</li>
  </ul>
  <br><br>
  We encourage you to explore our latest initiatives, participate in our groups, and take the
  first steps towards making significant contributions to the world of physics. Welcome aboard,
  and we look forward to seeing the impact of your work.
  <br><br>
  Login to https://portal.itcpr.org to start exploring.
  <br><br>
  Warm regards, <br>
  Administrative Team <br>
  Institute for Theoretical and Computational Physics Research (ITCPR)
  `;

  database.ref(`/applicants/${sanitizeEmail(email.replace("@gmail.com", ""))}`).update({ approval: 'accepted' }).then(() => {
    alertMessage(t="success","Application accepted!");
    sendEmail(email, "Welcome to ITCPR - Your Gateway to Innovation in Physics!", body);
    applicanttoUser(sanitizeEmail(email.replace("@gmail.com", "")));
  }).catch(error => {
    console.error("Error updating in Firebase:", error);
  });
}

function applicanttoUser(applicantKey) {
  const applicantSnapshot = entireDbSnapshot.child(`/applicants/${applicantKey}`);
  const { name, email, field, contact } = applicantSnapshot.val();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const newMonth = currentMonth === 0 ? 12 : currentMonth - 1;
  const start = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' }) + ' ' + (currentYear);
  const end = new Date(currentYear + 1, newMonth).toLocaleString('default', { month: 'long' }) + ' ' + (currentYear + 1);

  let quartile;

  if (currentMonth >= 0 && currentMonth <= 5) {
      quartile = 1;
  } else {
      quartile = 2;
  }

  const words = name.split(' ');
  let initials = '';

  for (let i = 0; i < words.length - 1; i++) {
      initials += words[i].charAt(0);
  }

  initials += words[words.length - 1];
  let id = initials.toLowerCase();

  const newUser = {
    name: name,
    email: email,
    contact: contact,
    new: true,
    group: field.toLowerCase(),
    id: id,
    position: 'Intern',
    quartile: quartile.toString(),
    start: start,
    end: end,
    attendance: '0/0',
    participation: '0/0',
    iemail: id+'@itcpr.org',
  };

  database.ref(`/users/${applicantKey}`).update(newUser).then(() => {
    database.ref().once("value").then(snapshot => {
      entireDbSnapshot = snapshot;
    }).then(() => {
      showApplicants();
    })
  }).catch(error => {
    console.error("Error updating user in Firebase:", error);
  });
}

function rejectApplication(user,email) {
  const body = `Dear ${user},<br><br>
  We regret to inform you that your application to the Institute for Theoretical and
  Computational Physics Research (ITCPR) has not been accepted at this time. We appreciate
  the time and effort you invested in your application and wish you the best in your future
  academic and professional endeavors.
  <br><br>
  Please understand that this decision does not diminish the value of your skills and
  accomplishments. We encourage you to apply for future opportunities at ITCPR that
  align with your qualifications and interests.
  <br><br>
  Warm regards, <br>
  Administrative Team <br>
  Institute for Theoretical and Computational Physics Research (ITCPR)
  `;

  database.ref(`/applicants/${email.replace("@gmail.com", "")}`).update({ approval: 'rejected' }).then(() => {
    database.ref().once("value").then(snapshot => {
      entireDbSnapshot = snapshot;
    }).then(() => {
      showApplicants();
      alertMessage(t="success","Application rejected!");
      sendEmail(email, "Application Status - ITCPR", body);
    })
  }).catch(error => {
    console.error("Error updating in Firebase:", error);
  });
}

function downloadApplication(filename,details) {
  const content = details.replace(/<br>/g, '\n');
  const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
  const element = document.createElement('a');

  element.setAttribute('href', dataUri);
  element.setAttribute('download', filename);
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function downloadCSV(user) {
  const userSnapshot = entireDbSnapshot.child(`/users/`+user);
  const { name, position, group, email, contact } = userSnapshot.val();

  const content = `Name,Given Name,Additional Name,Family Name,Yomi Name,Given Name Yomi,Additional Name Yomi,Family Name Yomi,Name Prefix,Name Suffix,Initials,Nickname,Short Name,Maiden Name,Birthday,Gender,Location,Billing Information,Directory Server,Mileage,Occupation,Hobby,Sensitivity,Priority,Subject,Notes,Language,Photo,Group Membership,E-mail 1 - Type,E-mail 1 - Value,Phone 1 - Type,Phone 1 - Value,Organization 1 - Type,Organization 1 - Name,Organization 1 - Yomi Name,Organization 1 - Title,Organization 1 - Department,Organization 1 - Symbol,Organization 1 - Location,Organization 1 - Job Description
${name},${name.split(' ').slice(0, -1).join(' ')},,${name.split(' ').pop()},,,,,,,,,,,,,,,,,,,,,,,,,${capitalizeFirstLetter(group)} ::: ${position}s ::: * myContacts,* ,${email},,${contact},,Institution for Theoretical and Computational Physics Research,,${position},${capitalizeFirstLetter(group)},,,`;

  const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
  const element = document.createElement('a');

  element.setAttribute('href', dataUri);
  element.setAttribute('download', user+'.csv');
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}


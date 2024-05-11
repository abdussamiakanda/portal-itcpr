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
      <input type="text" id="name" placeholder="Enter Full Name..">
      <input type="text" id="email" placeholder="Enter Email (Use Gmail Address)..">
      <input type="text" id="contact" placeholder="Enter Contact Number..">
      <input type="text" id="address" placeholder="Enter Address..">

      <h3>Educational Background</h3>
      <p>Our internship program primarily targets undergraduate students, offering a platform to engage in meaningful research in theoretical and computational physics. We also extend this opportunity to graduate students who may lack access to quality research in their current programs.</p>
      <select id="education" class="dropdown">
        <option value="">Current Level of Education</option>
        <option value="Undergraduate">Undergraduate</option>
        <option value="Graduate">Graduate</option>
      </select>
      <input type="text" id="university" placeholder="Current University..">
      <input type="text" id="major" placeholder="Enter Major..">
      <select id="year" class="dropdown">
        <option value="">Current Year</option>
        <option value="1st Year">1st Year</option>
        <option value="2nd Year">2nd Year</option>
        <option value="3rd Year">3rd Year</option>
        <option value="4th Year">4th Year</option>
        <option value="5th Year">5th Year</option>
      </select>
      <input type="text" id="graduationdate" placeholder="Expected Graduation Date..">

      <h3>Academic and Professional Experience</h3>
      <p>In your application, detail all relevant experiences comprehensively. For any sections that do not apply to you, simply write 'N/A' (not applicable) to indicate this.</p>
      <textarea id="courses" placeholder="Relevant Courses Taken.."></textarea>
      <textarea id="experiences" placeholder="Previous Internships or Research Experiences.."></textarea>
      <textarea id="publications" placeholder="Any Published Work.."></textarea>
      <textarea id="skills" placeholder="Skills Relevant to the Research Field.."></textarea>

      <h3>Statement of Interest</h3>
      <p>In your application, provide succinct and focused descriptions of your interests. This clarity will help us better understand your passion and how it aligns with our research goals.</p>
      <textarea id="reason" placeholder="Reasons for Applying to the Internship.."></textarea>
      <select id="field" class="dropdown">
        <option value="">Specific Areas of Interest</option>
        <option value="Spintronics">Spintronics</option>
        <option value="Photonics">Photonics</option>
      </select>
      <textarea id="expectation" placeholder="Expectations and Goals for the Internship.."></textarea>

      <h3>Supporting Documents</h3>
      <p>Please email us the listed documents below in PDF format, to info@itcpr.org. If you are providing additional documents like certificates, kindly merge them into a single PDF file.</p>
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

function handleNewApplicant() {
  const name = document.getElementById('name').value;
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

  if (name && email && contact && address && education && university && major && year && graduationdate && courses && experiences && publications && skills && reason && field && expectation) {
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
        };
  
        database.ref(`/applicants/`+emailKey).update(newApplicant).then(() => {
          showDiv('login');
          alertMessage(t="success","Application submitted successfully!");
        }).catch(error => {
          console.error("Error updating applicant in Firebase:", error);
        });
      }
    });
  
  } else {
    alertMessage(t="fail","Please fill in all required fields.");
  } 
}

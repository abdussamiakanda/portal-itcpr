import '../css/style.css';

export default function Privacy() {
    return (
        <div style={{ 
            minHeight: '100vh',
            background: 'var(--bg-light)',
            padding: 'var(--spacing-lg)'
        }}>
            <div style={{ 
                maxWidth: '800px', 
                margin: '20px auto', 
                padding: '30px',
                background: 'var(--bg-main)',
                borderRadius: '10px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}>
                <h1 style={{ 
                    fontSize: '2em', 
                    color: 'var(--text-dark)', 
                    marginTop: 0, 
                    marginBottom: '20px' 
                }}>
                    Privacy Policy
                </h1>
                <p><strong>Last updated:</strong> December 7, 2024</p>

                <p>Welcome to ITCPR Portal! Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our platform.</p>

                <h2 style={{ 
                    fontSize: '1.5em', 
                    color: 'var(--text-dark)', 
                    marginTop: '30px', 
                    marginBottom: '15px',
                    borderBottom: '2px solid var(--primary)',
                    paddingBottom: '5px'
                }}>
                    Information We Collect
                </h2>
                <p>The ITCPR Portal collects two types of information:</p>

                <h3>1. Data Collected During Authentication</h3>
                <p>We exclusively use <strong>Google Authentication</strong> for accessing the ITCPR Portal. As part of this process, we collect the following information from your Google account:</p>
                <ul>
                    <li><strong>Email Address:</strong> To uniquely identify your account and provide secure access.</li>
                    <li><strong>Profile Photo URL:</strong> To personalize your profile with your display picture.</li>
                </ul>
                <p>No other permissions or access are requested from your Google account.</p>

                <h3>2. Data Collected via Application Form</h3>
                <p>When you complete the application form on the ITCPR Portal, we collect additional information necessary for processing your application. This includes:</p>
                <ul>
                    <li><strong>Personal Information:</strong> Full name, contact number, address.</li>
                    <li><strong>Academic Information:</strong> University, education level, major, field of interest, current year, expected graduation date.</li>
                    <li><strong>Experience:</strong> Relevant courses, research experience, publications, technical skills.</li>
                    <li><strong>Motivation:</strong> Reasons for applying, expectations.</li>
                    <li><strong>Uploaded Documents:</strong> CV, cover letter, transcripts, and other relevant documents.</li>
                </ul>

                <h2 style={{ 
                    fontSize: '1.5em', 
                    color: 'var(--text-dark)', 
                    marginTop: '30px', 
                    marginBottom: '15px',
                    borderBottom: '2px solid var(--primary)',
                    paddingBottom: '5px'
                }}>
                    How We Use Your Information
                </h2>
                <p>The information collected is used for the following purposes:</p>
                <ul>
                    <li><strong>Authentication Data:</strong> To provide secure access to the portal and personalize your experience.</li>
                    <li><strong>Application Data:</strong> To review and evaluate your application for the program.</li>
                </ul>
                <p>We do not sell, share, or use your data for marketing or any unrelated purposes.</p>

                <h2 style={{ 
                    fontSize: '1.5em', 
                    color: 'var(--text-dark)', 
                    marginTop: '30px', 
                    marginBottom: '15px',
                    borderBottom: '2px solid var(--primary)',
                    paddingBottom: '5px'
                }}>
                    Data Storage and Security
                </h2>
                <p>Your information is securely stored and managed through <strong>Firebase</strong>, a trusted cloud service provider by Google. Firebase uses industry-standard security measures to safeguard your data.</p>

                <p>We take reasonable steps to ensure your data is protected, but no system can guarantee absolute security. We recommend you maintain strong security practices for your Google account.</p>

                <h2 style={{ 
                    fontSize: '1.5em', 
                    color: 'var(--text-dark)', 
                    marginTop: '30px', 
                    marginBottom: '15px',
                    borderBottom: '2px solid var(--primary)',
                    paddingBottom: '5px'
                }}>
                    Your Rights
                </h2>
                <ul>
                    <li><strong>Access:</strong> Log in using your Google account to access your profile.</li>
                    <li><strong>Application Data Access:</strong> You can review your submitted application by contacting us.</li>
                    <li><strong>Account Deletion:</strong> To delete your account or request data removal, please contact us at <a href="mailto:info@itcpr.org" style={{ color: 'var(--primary)' }}>info@itcpr.org</a>.</li>
                </ul>

                <h2 style={{ 
                    fontSize: '1.5em', 
                    color: 'var(--text-dark)', 
                    marginTop: '30px', 
                    marginBottom: '15px',
                    borderBottom: '2px solid var(--primary)',
                    paddingBottom: '5px'
                }}>
                    Cookies and Tracking
                </h2>
                <p>The ITCPR Portal does not use cookies or tracking technologies.</p>

                <h2 style={{ 
                    fontSize: '1.5em', 
                    color: 'var(--text-dark)', 
                    marginTop: '30px', 
                    marginBottom: '15px',
                    borderBottom: '2px solid var(--primary)',
                    paddingBottom: '5px'
                }}>
                    Changes to This Policy
                </h2>
                <p>We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised "Last updated" date.</p>

                <h2 style={{ 
                    fontSize: '1.5em', 
                    color: 'var(--text-dark)', 
                    marginTop: '30px', 
                    marginBottom: '15px',
                    borderBottom: '2px solid var(--primary)',
                    paddingBottom: '5px'
                }}>
                    Contact Us
                </h2>
                <p>If you have any questions or concerns about this Privacy Policy, please contact us:</p>
                <p>Email: <a href="mailto:info@itcpr.org" style={{ color: 'var(--primary)' }}>info@itcpr.org</a></p>

                <div style={{ 
                    marginTop: '40px', 
                    textAlign: 'center', 
                    fontSize: '0.9em', 
                    color: 'var(--text-medium)',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '20px'
                }}>
                    <p>&copy; {new Date().getFullYear()} ITCPR Portal. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}


import { collection, doc, query, where, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../contexts/AuthContext';
import { DateTime } from 'luxon';
import { API_ENDPOINTS } from '../config/env';

export async function sendEmail(email, subject, message) {
    console.log('Sending email to:', email);
    try {
        const response = await fetch(API_ENDPOINTS.email, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify({
                to: email,
                subject: subject,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('Email sent successfully:', data.message);
            return true;
        } else {
            throw new Error(data.message || 'Failed to send email');
        }

    } catch (error) {
        console.error('Email error:', error.message);
        return false;
    }
}

export function getEmailTemplate(name, message) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="border-bottom: 1px solid rgb(157, 157, 189); text-align: center; width: 100%;">
                    <span style="font-size: 35px; font-weight: bold; color: rgb(157, 157, 189);">ITCPR</span>
                </div>
                
                <div style="padding: 10px; background-color: #ffffff;">
                    <p>Dear ${name},</p>
                    ${message}
                    <p>Best regards,<br>The ITCPR Team</p>
                </div>

                <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                    <p>© ${new Date().getFullYear()} ITCPR. All rights reserved.</p>
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

export async function sendContributorEmail(projectId, projectGroup, subject, message) {
    try {
        const contributorsRef = collection(db, 'groups', projectGroup, 'projects', projectId, 'contributors');
        const contributorsSnapshot = await getDocs(contributorsRef);
        const uniqueContributors = new Map();

        const fetchPromises = contributorsSnapshot.docs.map(async (userDoc) => {
            const userId = userDoc.data().userId;

            if (uniqueContributors.has(userId)) return;

            if (userId !== 'dummy') {
                // First check if user exists in users collection (not terminated)
                const contributorRef = doc(db, 'users', userId);
                const contributorSnap = await getDoc(contributorRef);

                if (contributorSnap.exists()) {
                    const contributorData = contributorSnap.data();
                    if (contributorData.role === 'supervisor') return;
                    uniqueContributors.set(userId, {
                        id: userDoc.id,
                        ...contributorData
                    });
                }
                // If not found in users, don't add to uniqueContributors (skip terminated users)
            }
        });

        await Promise.all(fetchPromises);

        const emailPromises = Array.from(uniqueContributors.values()).map(async (user) => {
            if (user.email) {
                return sendEmail(user.email, subject, getEmailTemplate(user.name, message));
            }
            return Promise.resolve();
        });

        await Promise.all(emailPromises);
        return true;
    } catch (error) {
        console.error('Error sending contributor emails:', error);
        return false;
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function sendMeetingEmail(meetingData, userData) {
    try {
        let adminData = { mailed: false };
        const subject = meetingData.type === 'group' 
            ? `New ${capitalize(meetingData.group)} Group Meeting Scheduled` 
            : (meetingData.type === 'admin' 
                ? 'New Administrative Meeting Scheduled' 
                : 'New General Meeting Scheduled');

        const chicagoDateTime = DateTime.fromFormat(
            `${meetingData.date} ${meetingData.time}`, 
            'yyyy-MM-dd HH:mm',
            { zone: meetingData.timezone || 'America/Chicago' }
        );

        const membersRef = collection(db, 'users');
        let q;
        if (meetingData.type === 'admin') {
            q = query(membersRef, where('position', '==', 'staff'));
        } else if (meetingData.type === 'general') {
            q = query(membersRef);
        } else {
            q = query(membersRef, where('group', '==', meetingData.group));
        }
        const membersSnap = await getDocs(q);
        
        // Send email to each member
        const emailPromises = membersSnap.docs.map(async (memberDoc) => {
            const memberData = memberDoc.data();
            const timezone = memberData.timezone || 'Asia/Dhaka';

            if (!memberData.email) {
                return Promise.resolve();
            }
            
            const userDateTime = chicagoDateTime.setZone(timezone);
            const endDateTime = userDateTime.plus({ hours: 1 });

            const googleCalendarURL = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                meetingData.title
            )}&details=${encodeURIComponent(
                meetingData.description
            )}&location=${encodeURIComponent(
                meetingData.link
            )}&dates=${userDateTime.toFormat('yyyyMMdd\'T\'HHmmss')}/${endDateTime.toFormat('yyyyMMdd\'T\'HHmmss')}&ctz=${timezone}`;

            const message = `
                <p>A new meeting has been scheduled:</p>
                <h3>Title: ${meetingData.title}</h3>
                <p>
                    <ul>
                        <li><b>Date:</b> ${userDateTime.toFormat('dd MMMM yyyy')}</li>
                        <li><b>Time:</b> ${userDateTime.toFormat('hh:mm a')} (Timezone: ${timezone})</li>
                        <li><b>Description:</b> ${meetingData.description}</li>
                        <li><b>Meeting Link:</b> <a href="${meetingData.link}" style="color: #0d6efd;">${meetingData.link}</a></li>
                    </ul>
                </p>
                <p>
                    Make sure to save this meeting to your Google Calendar. <br>
                    <a href="${googleCalendarURL}" target="_blank">Add it now</a>.
                </p>
            `;

            if (memberData.email === 'masakanda@mail.itcpr.org') {
                adminData = {
                    mailed: true,
                    subject: subject,
                    message: getEmailTemplate(memberData.name, message)
                };
            }

            return sendEmail(memberData.email, subject, getEmailTemplate(memberData.name, message));
        });

        await Promise.all(emailPromises);

        if (!adminData.mailed) {
            return sendEmail('masakanda@mail.itcpr.org', adminData.subject, adminData.message);
        }

        return true;
    } catch (error) {
        console.error('Error sending meeting emails:', error);
        return false;
    }
}

export async function sendMeetingDeleteEmail(meetingData, userData) {
    try {
        const subject = meetingData.type === 'group' 
            ? `${capitalize(meetingData.group)} Group Meeting Cancelled` 
            : (meetingData.type === 'admin' 
                ? 'Administrative Meeting Cancelled' 
                : 'General Meeting Cancelled');

        // Get all group members' emails
        const membersRef = collection(db, 'users');
        let q;
        if (meetingData.type === 'admin') {
            q = query(membersRef, where('position', '==', 'staff'));
        } else if (meetingData.type === 'general') {
            q = query(membersRef);
        } else {
            q = query(membersRef, where('group', '==', meetingData.group));
        }
        const membersSnap = await getDocs(q);
        
        // Send email to each member
        const emailPromises = membersSnap.docs.map(async (memberDoc) => {
            const memberData = memberDoc.data();
            const timezone = memberData.timezone || 'Asia/Dhaka';

            if (!memberData.email) {
                return Promise.resolve();
            }

            const chicagoDateTime = DateTime.fromFormat(
                `${meetingData.date} ${meetingData.time}`, 
                'yyyy-MM-dd HH:mm',
                { zone: meetingData.timezone || 'America/Chicago' }
            );

            const userDateTime = chicagoDateTime.setZone(timezone);

            const message = `
                <p>A scheduled meeting has been cancelled:</p>
                <h3>Title: ${meetingData.title}</h3>
                <p>
                    <b>Date:</b> ${userDateTime.toFormat('dd MMMM yyyy')}<br>
                    <b>Time:</b> ${userDateTime.toFormat('hh:mm a')} (Timezone: ${timezone})<br>
                    <b>Description:</b> ${meetingData.description}<br>
                </p>
                <p>Please update your calendar accordingly.</p>
            `;
            
            return sendEmail(
                memberData.email, 
                subject, 
                getEmailTemplate(memberData.name, message)
            );
        });

        await Promise.all(emailPromises);
        return true;

    } catch (error) {
        console.error('Error sending meeting cancellation emails:', error);
        // Don't throw error to prevent blocking meeting deletion
        return false;
    }
}

export async function sendAttendanceEmail(emailList, groupId, meetingId) {
    try {
        const meetingRef = doc(db, 'meetings', meetingId);
        const meetingSnap = await getDoc(meetingRef);
        const meetingData = meetingSnap.data();

        const membersRef = collection(db, 'users');
        const q = query(membersRef, where('group', '==', groupId));
        const membersSnap = await getDocs(q);
        const membersData = membersSnap.docs.map(doc => doc.data());

        const chicagoDateTime = DateTime.fromFormat(
            `${meetingData.date} ${meetingData.time}`,
            'yyyy-MM-dd HH:mm',
            { zone: 'America/Chicago' }
        );

        const subject = `Attendance Notice for ITCPR Meeting`;

        for (const member of membersData) {
            if (!member.uid || member.role === 'supervisor') continue;

            const memberRef = doc(db, 'users', member.uid);
            const memberSnap = await getDoc(memberRef);
            const memberData = memberSnap.data();

            const timeZone = memberData.timezone || 'Asia/Dhaka';
            const localDateTime = chicagoDateTime.setZone(timeZone);
            const formattedDate = localDateTime.toFormat('LLL d, yyyy');
            const formattedTime = localDateTime.toFormat('h:mm a');

            const meetingInfo = `
                <b>Meeting Details:</b>
                <ul>
                    <li><b>Title:</b> ${meetingData.title}</li>
                    <li><b>Date:</b> ${formattedDate}</li>
                    <li><b>Time:</b> ${formattedTime}</li>
                    <li><b>Timezone:</b> ${timeZone}</li>
                </ul>
            `;

            const status = emailList[memberData.email];
            let message = '';

            if (status === 'yes') {
                message = `
                    <p>
                        We appreciate your participation in the last weekly ${capitalize(groupId)} Group meeting.
                    </p>
                    <p>${meetingInfo}</p>
                    <p>
                        Your engagement in these discussions plays a crucial role in our collaborative efforts. If you have any additional
                        insights or updates regarding your assigned tasks, please feel free to share them in the designated project.
                    </p>
                    <p>
                        Thank you for your commitment and contributions. We look forward to your continued participation in future meetings.
                    </p>
                `;
            } else if (status === 'no') {
                message = `
                    <p>
                        We would like to inform you that you were absent from the last weekly ${capitalize(groupId)} Group meeting.
                    </p>
                    <p>${meetingInfo}</p>
                    <p>
                        If you have not yet completed your assigned tasks, please ensure that you do so at the earliest opportunity.
                        Additionally, please submit a summary of your progress in the designated project.
                    </p>
                    <p>
                        As per ITCPR's policy, attending weekly meetings is mandatory. Regular participation is essential to ensure
                        smooth collaboration and progress within the team. If you were unable to attend due to unforeseen circumstances,
                        kindly inform us in advance.
                    </p>
                    <p>
                        If you have any questions or need assistance, do not hesitate to reach out.
                    </p>
                `;
            } else if (status === 'excused') {
                message = `
                    <p>
                        Your absence from the last weekly ${capitalize(groupId)} Group meeting has been marked as excused.
                    </p>
                    <p>${meetingInfo}</p>
                    <p>
                        If you have not yet completed your assigned tasks, please ensure that you do so at the earliest opportunity.
                        Additionally, please submit a summary of your progress in the designated project.
                    </p>
                    <p>
                        If you have any questions or need assistance, do not hesitate to reach out.
                    </p>
                `;
            } else {
                continue;
            }

            await sendEmail(memberData.email, subject, getEmailTemplate(memberData.name, message));
        }
        return true;
    } catch (error) {
        console.error('Error sending attendance emails:', error);
        return false;
    }
}


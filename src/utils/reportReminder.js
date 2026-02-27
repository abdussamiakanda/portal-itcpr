import { db } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';

export function getInternshipPeriod() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const periods = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${periods[month]}, ${year}`;
}

/**
 * Returns true if the user should be prompted to submit their monthly report
 * (intern, has Discord, within submission window 21st–end of month, not yet submitted).
 */
export async function checkReportStatus(userData, userId) {
    try {
        const reportsRef = collection(db, 'reports');
        const q = query(reportsRef, where('uid', '==', userId));
        const reportsSnap = await getDocs(q);
        const reports = reportsSnap.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        const now = new Date();
        const day = now.getDate();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        if (day < 21 || day > lastDay) {
            return false;
        }

        const currentPeriod = getInternshipPeriod();
        const alreadySubmitted = reports.some(r =>
            typeof r.title === 'string' && r.title.includes(currentPeriod) && r.uid === userId
        );

        return !alreadySubmitted;
    } catch (error) {
        console.error('Error checking report status:', error);
        return false;
    }
}

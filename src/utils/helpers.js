import { marked } from 'marked';

export function viewReport(path) {
    let reportPath = path.replace(/\\/g, '/');
    const safePath = encodeURIComponent(reportPath).replace(/%2F/g, '/');
    const reportUrl = `https://jupyter.itcpr.org/view?path=${safePath}`;
    window.open(reportUrl, '_blank');
}

export function viewProjectReport(url, fileType) {
    const encodedUrl = encodeURIComponent(url);
    if (fileType === 'ipynb') {
        window.open(`https://jupyter.itcpr.org/file?link=${encodedUrl}`, '_blank');
    } else {
        window.open(url, '_blank');
    }
}

export function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function formatDate(date) {
    try {
        if (!date) return '';
        
        let meetingDateTime;
        meetingDateTime = new Date(date);
        
        if (isNaN(meetingDateTime.getTime())) {
            meetingDateTime = new Date(date + 'T00:00:00Z');
            
            if (isNaN(meetingDateTime.getTime())) {
                throw new Error('Invalid date format');
            }
        }
        
        const formatter = new Intl.DateTimeFormat('default', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'
        });

        return formatter.format(meetingDateTime);
    } catch (error) {
        console.error('Error formatting meeting date:', error);
        return typeof date === 'string' ? date : 'Invalid Date';
    }
}

export function goToPage(page, id) {
    window.location.href = `./${page}?id=${id}`;
}

export async function joinMeeting(link, meetingId) {
    if (!link) {
        alert('Meeting link not available');
        return;
    }
    
    // Track meeting join for gamification
    try {
        const { trackMeetingJoin } = await import('./gamification');
        const { db } = await import('../contexts/AuthContext');
        const { doc, getDoc } = await import('firebase/firestore');
        
        // Get meeting data if meetingId is provided
        if (meetingId) {
            try {
                const meetingRef = doc(db, 'meetings', meetingId);
                const meetingSnap = await getDoc(meetingRef);
                if (meetingSnap.exists()) {
                    const meetingData = meetingSnap.data();
                    await trackMeetingJoin(meetingId, {
                        date: meetingData.date,
                        time: meetingData.time,
                        timezone: meetingData.timezone || 'America/Chicago'
                    }, link);
                }
            } catch (error) {
                console.error('Error tracking meeting join:', error);
            }
        }
    } catch (error) {
        // Silently fail if gamification module is not available
        console.error('Error loading gamification module:', error);
    }
    
    window.open(link, '_blank');
}

const codeExtensions = [
    '.py', '.m', '.mx3', '.m3', '.tex', '.jl', '.fortran', '.md', '.txt', '.r', '.go', '.rust',
    '.js', '.java', '.cpp', '.c', '.csharp', '.html', '.css', '.json', '.xml', '.bash', '.shell', '.typescript',
    '.csv',
];

export function addTargetBlankToLinks(className) {
    const elements = document.querySelectorAll(`.${className}`);
    
    elements.forEach(element => {
        const links = element.querySelectorAll('a');
        
        links.forEach(link => {
            link.setAttribute('target', '_blank');

            const href = link.getAttribute('href') || '';
            const encoded = encodeURIComponent(href);
            if (href.toLowerCase().endsWith('.ipynb')) {
                link.setAttribute('href', `https://jupyter.itcpr.org/file?link=${encoded}`);
            } else if (codeExtensions.some(ext => href.toLowerCase().endsWith(ext))) {
                link.setAttribute('href', `https://code.itcpr.org/code?link=${encoded}`);
            }
        });
    });
}

export function formatContent(content) {
    if (!content) return '';
    
    if (typeof marked === 'undefined') {
        console.warn('marked library not loaded');
        return content;
    }
    
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
        sanitize: false,
        smartLists: true,
        smartypants: true,
    });

    try {
        return marked.parse(content);
    } catch (error) {
        console.error('Error parsing markdown:', error);
        return content;
    }
}

export function renderAndReplaceLatex(content) {
    if (typeof katex === 'undefined') {
        console.warn('katex library not loaded');
        return content;
    }
    
    const regex = /(\${1,2})([^$]+)\1/g;
    let result = content;
    let match;
  
    while ((match = regex.exec(content)) !== null) {
        try {
            const isDisplayMode = match[0].startsWith('$$');
            const rendered = katex.renderToString(match[2], {
                throwOnError: false,
                displayMode: isDisplayMode
            });
  
            const htmlToInsert = isDisplayMode ? `<div class="katex-display">${rendered}</div>` : rendered;
  
            result = result.replace(match[0], htmlToInsert);
        } catch (e) {
            console.error("Error rendering LaTeX with KaTeX:", e);
            result = result.replace(match[0], `<span class="latex-error">Error rendering LaTeX</span>`);
        }
    }
  
    return result;
}

export function addTargetBlankToLinksInHtml(html) {
    if (!html) return html;
    
    // Use regex to add target="_blank" to all anchor tags
    // This handles both <a href="..."> and <a href='...'> formats
    return html.replace(/<a\s+([^>]*?)href\s*=\s*["']([^"']*)["']([^>]*?)>/gi, (match, before, href, after) => {
        // Check if target already exists
        if (/target\s*=/i.test(before + after)) {
            // Replace existing target with _blank
            return match.replace(/target\s*=\s*["'][^"']*["']/gi, 'target="_blank"');
        }
        // Add target="_blank" before the closing >
        return `<a ${before}href="${href}"${after} target="_blank" rel="noopener noreferrer">`;
    });
}

export function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}



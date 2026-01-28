import { useAuth } from '../contexts/AuthContext';
import '../css/style.css';
import '../css/other.css';

const itcprResources = [
    {
        category: "ITCPR Platforms & Tools",
        items: [
            { url: 'https://itcpr.org', iconClass: 'fa-solid fa-earth-asia', text: 'Website' },
            { url: 'https://webmail.itcpr.org', iconClass: 'fa-solid fa-envelope', text: 'Webmail' },
            { url: 'https://account.itcpr.org', iconClass: 'fa-solid fa-credit-card', text: 'Account' },
            { url: 'https://terminal.itcpr.org', iconClass: 'fa-solid fa-laptop-code', text: 'Terminal' },
            { url: 'https://server.itcpr.org', iconClass: 'fa-solid fa-server', text: 'Server' },
            { url: 'https://library.itcpr.org', iconClass: 'fa-solid fa-book-open-reader', text: 'Library' },
            { url: 'https://cloud.itcpr.org', iconClass: 'fa-solid fa-cloud', text: 'Cloud' },
            { url: 'https://code.itcpr.org', iconClass: 'fa-solid fa-atom', text: 'CodeLab' },
            { url: 'https://jupyter.itcpr.org', iconClass: 'fa-brands fa-python', text: 'JupyterLab' },
            { url: 'https://overleaf.itcpr.org', iconClass: 'fas fa-superscript', text: 'Overleaf' },
            { url: 'https://latex.itcpr.org', iconClass: 'fa-solid fa-file-code', text: 'LaTeX Editor' },
            { url: 'https://buildbox.itcpr.org', iconClass: 'fa-solid fa-gamepad', text: 'BuildBox' },
            { url: 'https://forum.itcpr.org', iconClass: 'fa-solid fa-comments', text: 'Forum' },
            { url: 'https://events.itcpr.org', iconClass: 'fa-solid fa-calendar', text: 'Events' },
            { url: 'https://news.itcpr.org', iconClass: 'fa-solid fa-newspaper', text: 'News' },
            { url: 'https://physics.itcpr.org', iconClass: 'fa-solid fa-gear', text: 'Physics Engine' },
            { url: 'https://free.itcpr.org', iconClass: 'fa-solid fa-calendar-check', text: 'Free Time' },
            { url: 'https://discord.com/download', iconClass: 'fa-brands fa-discord', text: 'Discord' },
            { url: 'https://github.com/ITCPR', iconClass: 'fa-brands fa-github', text: 'GitHub' },
            { url: 'https://library.itcpr.org/extension', iconClass: 'fa-brands fa-chrome', text: 'PaperPort' }
        ]
    },
    {
        category: "Networking & Remote Access",
        items: [
            { url: 'https://www.zerotier.com/download', iconClass: 'fa-solid fa-network-wired', text: 'ZeroTier' },
            { url: 'https://www.termius.com', iconClass: 'fa-solid fa-terminal', text: 'Termius' },
            { url: 'https://www.resilio.com/sync', iconClass: 'fa-solid fa-sync', text: 'Resilio Sync' }
        ]
    },
    {
        category: "Programming & Development",
        items: [
            { url: 'https://www.python.org/downloads', iconClass: 'fa-brands fa-python', text: 'Python' },
            { url: 'https://jupyter.org/install', iconClass: 'fa-solid fa-book-open', text: 'Jupyter Notebook' },
            { url: 'https://code.visualstudio.com/Download', iconClass: 'fa-solid fa-code', text: 'VS Code' },
            { url: 'https://www.mathworks.com/products/matlab.html', iconClass: 'fa-brands fa-m', text: 'MATLAB' }
        ]
    },
    {
        category: "Data Analysis & Visualization",
        items: [
            { url: 'https://www.originlab.com', iconClass: 'fa-solid fa-chart-line', text: 'OriginLab Pro' },
            { url: 'http://www.gnuplot.info/', iconClass: 'fa-solid fa-chart-area', text: 'Gnuplot' }
        ]
    },
    {
        category: "Cloud & Storage",
        items: [
            { url: 'https://drive.google.com', iconClass: 'fa-brands fa-google-drive', text: 'Google Drive' },
            { url: 'https://www.dropbox.com', iconClass: 'fa-brands fa-dropbox', text: 'Dropbox' }
        ]
    },
    {
        category: "Collaboration & Productivity",
        items: [
            { url: 'https://www.notion.so/', iconClass: 'fa-solid fa-note-sticky', text: 'Notion' },
            { url: 'https://www.overleaf.com', iconClass: 'fa-solid fa-file-lines', text: 'Overleaf' },
            { url: 'https://www.zotero.org/', iconClass: 'fa-solid fa-book', text: 'Zotero' }
        ]
    }
];

export default function Tools() {
    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h2>Tools</h2>
                    <p className="text-medium">Miscellaneous Resources and Tools</p>
                </div>
            </div>

            <div className="tools-container">
                {itcprResources.map((category, idx) => (
                    <div key={idx} className="tools-category">
                        <h3>{category.category}</h3>
                        <div className="tools-grid">
                            {category.items.map((item, itemIdx) => (
                                <a
                                    key={itemIdx}
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tool-item"
                                >
                                    <i className={item.iconClass}></i>
                                    <span>{item.text}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


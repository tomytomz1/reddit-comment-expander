// Logs page functionality
class LogsViewer {
  constructor() {
    this.logsContainer = document.getElementById('logsContainer');
    this.clearBtn = document.getElementById('clearLogs');
    
    this.setupEventListeners();
    this.loadLogs();
  }
  
  setupEventListeners() {
    this.clearBtn.addEventListener('click', () => {
      this.clearLogs();
    });
  }
  
  loadLogs() {
    chrome.storage.local.get(['extensionLogs'], (result) => {
      const logs = result.extensionLogs || [];
      this.displayLogs(logs);
    });
  }
  
  displayLogs(logs) {
    if (logs.length === 0) {
      this.logsContainer.innerHTML = '<div class="no-logs">No logs available</div>';
      return;
    }
    
    const logsHTML = logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const levelClass = `log-${log.level}`;
      
      return `
        <div class="log-entry">
          <div class="log-time">${time}</div>
          <div class="${levelClass}">${log.message}</div>
          ${log.details ? `<div class="log-details">${log.details}</div>` : ''}
        </div>
      `;
    }).join('');
    
    this.logsContainer.innerHTML = logsHTML;
    this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
  }
  
  clearLogs() {
    chrome.storage.local.remove(['extensionLogs'], () => {
      this.displayLogs([]);
    });
  }
}

// Initialize logs viewer
new LogsViewer(); 
function goToExternal(path) {
  window.open(path, "_blank");
}

function updateContent() {
  fetch('http://10.144.162.80/status.html')
    .then(response => response.text())
    .then(data => {
      document.getElementById('body').innerHTML = data;
    })
    .catch(console.error);
}

// Poll for changes every 5 seconds
setInterval(updateContent, 1000);

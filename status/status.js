function goToExternal(path) {
  window.open(path, "_blank");
}

function updateContent() {
  
    .then(response => response.text())
    .then(data => {
      document.getElementById('status').innerHTML = data;
    })
    .catch(console.error);
}

// Poll for changes every 5 seconds
setInterval(updateContent, 1000);

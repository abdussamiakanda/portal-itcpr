function goToExternal(path) {
  window.open(path, "_blank");
}

function updateContent() {
  fetch('http://server.itcpr.org/status.html')
    .then(response => response.text())
    .then(data => {
      document.getElementById('body').innerHTML = data;
    })
    .catch(console.error);
}

setInterval(updateContent, 1000);

function goToExternal(path) {
  window.open(path, "_blank");
}

function updatePageContent() {
  fetch('http://10.144.162.80/status.html')
    .then(response => response.text())
    .then(data => {
      document.documentElement.innerHTML = data;
    })
    .catch(console.error);
}

setInterval(updatePageContent, 1000); 

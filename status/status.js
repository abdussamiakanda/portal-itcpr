function goToExternal(path) {
  window.open(path, "_blank");
}

function updatePageContent() {
  fetch('path/to/your/updatedPage.html')
    .then(response => response.text())
    .then(data => {
      document.documentElement.innerHTML = data;
    })
    .catch(console.error);
}

setInterval(updatePageContent, 1000); 

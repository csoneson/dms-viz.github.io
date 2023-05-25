// UI Elements
const modal = document.querySelector(".modal"),
  trigger = document.querySelector(".trigger"),
  closeButton = document.querySelector(".close-button"),
  accordionBtns = document.querySelectorAll(".accordion"),
  sidebar = document.getElementById("sidebar"),
  toggle = document.getElementById("sidebar-toggle"),
  headerpd = document.getElementById("header"),
  mainpd = document.getElementById("main"),
  localFile = document.getElementById("local-file"),
  remoteFile = document.getElementById("remote-file");

// UI functions to attach to event listeners

// Toggle the modal class to show/hide
function toggleModal() {
  modal.classList.toggle("show-modal");
}
function windowOnClick(event) {
  if (event.target === modal) {
    toggleModal();
  }
}
function toggleSidebar() {
  sidebar.classList.toggle("sidebar--collapsed");
  toggle.classList.toggle("bx-x");
  headerpd.classList.toggle("body-pad");
  mainpd.classList.toggle("body-pad");
}
// Toggle the accordion buttons to show/hide
function toggleAccordion(btn) {
  // Check if the sidebar has a class of closed
  if (sidebar.classList.contains("sidebar--collapsed")) {
    // Toggle the sidebar classes
    toggleSidebar();
    // trigger resize event
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      btn.classList.toggle("is-open");
      let content = btn.nextElementSibling;

      if (content.style.maxHeight) {
        //this is if the accordion is open
        content.style.maxHeight = null;
      } else {
        //if the accordion is currently closed
        content.style.maxHeight = content.scrollHeight + "px";
      }
    }, 500);
  } else {
    btn.classList.toggle("is-open");
    let content = btn.nextElementSibling;

    if (content.style.maxHeight) {
      //this is if the accordion is open
      content.style.maxHeight = null;
    } else {
      //if the accordion is currently closed
      content.style.maxHeight = content.scrollHeight + "px";
    }
  }
}

// Attach UI elements function to event listeners
trigger.addEventListener("click", toggleModal);
closeButton.addEventListener("click", toggleModal);
window.addEventListener("click", windowOnClick);
accordionBtns.forEach((accordion) => {
  accordion.onclick = function () {
    toggleAccordion(this);
  };
});
toggle.addEventListener("click", () => {
  // Toggle the sidebar classes
  toggleSidebar();
  // Trigger the resize event
  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 500);
  // Finally, close the accoridon menu
  const accordions = document.querySelectorAll(".accordion");
  accordions.forEach((accordion) => {
    accordion.classList.remove("is-open");
    let content = accordion.nextElementSibling;
    content.style.maxHeight = null;
  });
});
// Shink the sidebar on load if the screen is less than 1000px
window.addEventListener("load", () => {
  const mediaQuery = window.matchMedia("(max-width: 1000px)");
  if (mediaQuery.matches) {
    toggleSidebar();
  }
});

// Toggle the instructions modal trigger button to highlight/unhighlight
function highlightHelp() {
  const message = document.getElementById("help-message");
  const help = document.querySelector(".help");
  trigger.classList.remove("glow");
  help.classList.remove("active");
  message.remove();

  // Remove the event listener after the first click
  document.removeEventListener("mousedown", highlightHelp);
}
document.addEventListener("mousedown", highlightHelp);

// Toggle the download button to show either local or url upload buttons
function toggleDownload({ target: element }) {
  const buttons = Array.from(element.parentNode.querySelectorAll("button"));
  buttons.forEach((button) => button.classList.remove("upload-method"));

  element.classList.add("upload-method");

  // Hide/show corresponding divs
  if (element.id === "local-file") {
    document.getElementById("local-file-input").style.display = "block";
    document.getElementById("remote-url-input").style.display = "none";
  } else if (element.id === "remote-file") {
    document.getElementById("remote-url-input").style.display = "block";
    document.getElementById("local-file-input").style.display = "none";
  }
}

localFile.addEventListener("click", toggleDownload);
remoteFile.addEventListener("click", toggleDownload);

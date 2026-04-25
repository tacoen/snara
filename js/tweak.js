// Disable spellcheck on all editable elements
document.addEventListener("DOMContentLoaded", function () {
  var selectors = "input, textarea, [contenteditable]";
  var elements = document.querySelectorAll(selectors);

  for (var i = 0; i < elements.length; i++) {
    elements[i].setAttribute("spellcheck", "false");
  }
});

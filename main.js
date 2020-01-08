
function update() {
    
    // Set background and <p> to random color
    var colors = ["#1BE7FF", "#6EEB83", "#E8AA14", "#FF5714"];
    var color = colors[Math.floor(Math.random() * colors.length)];
    document.body.style.backgroundColor = color;
    var p = document.getElementsByTagName("p");
    for (var i = 0; i < p.length; i++) {
        p[i].style.color = color;
    }

    // Change mobile chrome navbar color to compliment
    var allMetaElements = document.getElementsByTagName('meta');
    for (var i=0; i<allMetaElements.length; i++) {
        if (allMetaElements[i].getAttribute("name") == "theme-color") {
            allMetaElements[i].setAttribute('content', color);
            break;
        }
    }
}

update();

function update() {
    
    // Set background and <p> to random color
    var colors = ["#51e1f5", "#ff5c72", "#72d9b2", "#65a4f4", "#fee25e"];
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

function getRandomColor() {
  // creating a random number between 0 and 255
  var r = Math.floor(Math.random() * 256);
  var g = Math.floor(Math.random() * 256);
  var b = Math.floor(Math.random() * 256);

  // going from decimal to hex
  var hexR = r.toString(16);
  var hexG = g.toString(16);
  var hexB = b.toString(16);

  // making sure single character values are prepended with a "0"
  if (hexR.length == 1) {
    hexR = "0" + hexR;
  }

  if (hexG.length == 1) {
    hexG = "0" + hexG;
  }

  if (hexB.length == 1) {
    hexB = "0" + hexB;
  }

  // creating the hex value by concatenatening the string values
  var hexColor = "#" + hexR + hexG + hexB;

  return hexColor.toUpperCase();
}


function invertColor(hex) {
  if (hex.indexOf('#') === 0) {
      hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
      throw new Error('Invalid HEX color.');
  }
  // invert color components
  var r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
      g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
      b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
  // pad each with zeros and return
  return '#' + padZero(r) + padZero(g) + padZero(b);
}


function padZero(str, len) {
  len = len || 2;
  var zeros = new Array(len).join('0');
  return (zeros + str).slice(-len);
}

// Generate Random Color and its compliment
var color = getRandomColor();
var compliment = invertColor(color);

// Set background to color, set header and content to compliment
// document.body.style.background = color;
// document.body.style.color = compliment;

document.body.style.background = "#FFCC00";
document.body.style.color = "#000000";

var background = "#FFCC00";
var secondary = "#000000";

document.getElementById("content").style.color = background;

document.getElementById("button1").style.color = secondary;
document.getElementById("button2").style.color = secondary;
document.getElementById("button3").style.color = secondary;
document.getElementById("button1").style.background = background;
document.getElementById("button2").style.background = background;
document.getElementById("button3").style.background = background;

function button(num) {

  var background = document.body.style.background
  var secondary = document.body.style.color

  // Button 1 pressed
  if (num === 1) {
    document.getElementById("content").style.color = background;

    document.getElementById("button1").style.color = background;
    document.getElementById("button2").style.color = secondary;
    document.getElementById("button3").style.color = secondary;

    document.getElementById("button1").style.background = "#000000";
    document.getElementById("button2").style.background = background;
    document.getElementById("button3").style.background = background;
  }
  // Button 2 pressed
  if (num === 2) {
    document.getElementById("button1").style.color = secondary;
    document.getElementById("button2").style.color = background;
    document.getElementById("button3").style.color = secondary;

    document.getElementById("button1").style.background = background;
    document.getElementById("button2").style.background = secondary;
    document.getElementById("button3").style.background = background;
  }
  // Button 3 pressed
  if (num === 3) {
    document.getElementById("content").style.color = background;

    document.getElementById("button1").style.color = secondary;
    document.getElementById("button2").style.color = secondary;
    document.getElementById("button3").style.color = background;

    document.getElementById("button1").style.background = background;
    document.getElementById("button2").style.background = background;
    document.getElementById("button3").style.background = secondary;
  }
  // Import project content
  if (num === 1) {
    console.log("import button 1")
    $(function(){
         $("#content").load("projects.html");
       });
  }
  // Import blog content
  if (num === 2) {
    console.log("import button 2")
    $(function(){
         $("#content").load("blog.html");
       });
  }
  // Import about content
  if (num === 3) {
    console.log("import button 3")
    $(function(){
         $("#content").load("about.html");
       });
  }
}




// Change mobile chrome navbar color to compliment
var allMetaElements = document.getElementsByTagName('meta');
for (var i=0; i<allMetaElements.length; i++) {
  if (allMetaElements[i].getAttribute("name") == "theme-color") {
     allMetaElements[i].setAttribute('content', compliment);
     break;
  }
}

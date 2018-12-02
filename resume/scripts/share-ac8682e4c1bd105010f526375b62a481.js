$(window).resize(function() {
  var shareHeight = $("#share").height();
  $("#share").css("margin-top", -shareHeight);
});

var top_space = 0;
if ($(window).width() > 415) {
    top_space = 24;
}
else {
    top_space = 16;
}

$(document).ready(function () {
	
	var shareHeight = $("#share").height();
	
	$("#share").css("margin-top", -shareHeight);

    function openShare() {

        $("#share-controls").animate({
            top: shareHeight + top_space
        }, 250, function () {

        });
        $("body").animate({
            paddingTop: shareHeight
        }, 250, function () {

        });
    };


    function closeShare() {
        $("body").animate({
            paddingTop: "0"
        }, 250, function () {

        });
        $("#share-controls").animate({
            top: top_space + "px"
        }, 250, function () {

        });

    };

    $(".big-share-close").on('click',function() {
        openShare();
    });

    $(".big-share-close, .share-control").on('click', function(e) {
        return false;
    });

    $(".share-control").click(function () {
        openShare();
        return false;
    });

    $("#share .up").click(function () {
        closeShare();
    });

    $(document).on('click',function(e) {
        closeShare();
    });
		
});

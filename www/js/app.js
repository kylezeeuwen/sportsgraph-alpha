angular.module('sportGraph', [
    'leagueDataService',
    'uiSlider',
    'sportsGraphDirective'
]).run( function() {

    if (globals.debugF) { console.log("run in sportGraph called"); }

    // XXX: All this screen size calc should be a service, and that service
    // should watch any screen resize events. These can propogate through to 
    // controllers to the directives and cause redraws

    var magicHeight = 0; // basically adds up all the vertical padding added by components
    var magicWidth = 0;

    var vW = jQuery(window).width() - magicWidth;
    var vH = jQuery(window).height() - magicHeight;

    var columnOne = 50;
    var columnTwo = vW - columnOne;

    var rowOne   = 50;
    var rowTwo   = vH - rowOne;

    $('#year-slider').width(vW - 30);
    // leave slider height to auto calc

    //XXX: not currently working
    //$('#map-container').attr("width",columnTwo);
    //$('#map-container').attr("height",rowTwo - 30);
});

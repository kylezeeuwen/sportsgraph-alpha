function outerController($scope, league) {
    if (globals.debugF) { console.log("outerController Init called"); }

    $scope.currentSpeed = 100;

    $scope.go = false; // signal to all directives to proceed
    $scope.showRookies = true;
    $scope.showRetirees = true; 

    // the sportgrah directive calls this when it has
    // complete its initialization sequence
    $scope.startSimulation = function() {
        if (globals.debugF) { console.log("In outerController startSimulation"); }
        $scope.go = true;
    };
}

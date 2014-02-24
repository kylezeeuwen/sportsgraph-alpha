function outerController($scope, league) {
    if (globals.debugF) { console.log("outerController Init called"); }

    $scope.available = false;
    $scope.haveData = false;

    $scope.$watch(league.haveData, function(haveData) {
        if (globals.debugF) { console.log("In outerController watch haveData:" + haveData); }
        if (haveData) {

            $scope.minSeason = parseInt(league.getMinSeason());
            $scope.maxSeason = parseInt(league.getMaxSeason());
            $scope.currentYear = $scope.minSeason;
            $scope.currentSpeed = 100;
            $scope.available = true;
            $scope.haveData  = true;
        }
    });
}

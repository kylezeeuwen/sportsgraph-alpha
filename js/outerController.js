function outerController($scope, league) {
    if (globals.debugF) { console.log("outerController Init called"); }

    $scope.haveData = false;
    $scope.currentSpeed = 100;

    $scope.showRookies = true;
    $scope.showRetirees = true; 

    $scope.$watch(league.haveData, function(haveData) {
        if (globals.debugF) { console.log("In outerController watch haveData:" + haveData); }
        if (haveData) {

            //XXX: Defect : Data quality: Why does 1996 get skipped when I start from 1995?
            //  Until this is solved start from 1997
            //$scope.minSeason = parseInt(league.getMinSeason());
            $scope.minSeason = parseInt(1997);
            $scope.maxSeason = parseInt(league.getMaxSeason());
            $scope.currentYear = $scope.minSeason;
            $scope.haveData  = true;
        }
    });
}

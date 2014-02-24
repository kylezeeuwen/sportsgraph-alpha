var nhl  = require("/home/dev/projects/sportgraph/node_modules/nhl-api/lib/nhl.js");
var fs   = require('fs');
var sleep = require('sleep');
vat log = require('util');

var teams = [
  'blackhawks',
  'bluejackets',
  'redwings',
  'predators',
  'blues',
  'flames',
  'avalanche',
  'oilers',
  'wild',
  'canucks',
  'ducks',
  'stars',
  'kings',
  'coyotes',
  'sharks',
  'devils',
  'islanders',
  'rangers',
  'flyers',
  'penguins',
  'bruins',
  'sabres',
  'canadiens',
  'senators',
  'mapleleafs',
  'hurricanes',
  'panthers',
  'lightning',
  'capitals',
  'jets'
];
var seasons = [
  '19951996',
  '19961997',
  '19971998',
  '19981999',
  '19992000',
  '20002001',
  '20012002',
  '20022003',
  '20032004',
  '20042005',
  '20052006',
  '20062007',
  '20072008',
  '20082009',
  '20092010',
  '20102011',
  '20112012',
  '20122013'
];


for (var i = 0; i < teams.length; i++) {
//for (var i = 0; i < 2; i++) {
  for (var j = 0; j < seasons.length; j++) {
  //for (var j = 0; j < 2; j++) {
   
    log.log("Starting attempt for team %s season %s", teams[i], seasons[j]); 
    nhl.team(teams[i],seasons[j], function(team,season,players) {
      if(players) {
        var fileName = "/home/dev/projects/sportgraph/data/scrape/" + team + "-" + season;
        var struct = {
            'team' : team,
            'season' : season,
            'players' : players
        };
        fs.writeFile(fileName, JSON.stringify(struct), function(err) {
          if(err) {
            log.log("Fail to save file for team %s season %s: %s",
	      team, season, err
            );
          } else {
            log.log("The file for team %s season %s was saved",
	      team, season
            );
          }
        }); 
      }
      else {
        log.log("No players for team %s season %s",team, season);
      }
    });
  }
}

#!/usr/bin/perl

use strict;
use warnings;

use Data::Dump qw(dump);
use JSON qw(encode_json);
use YAML qw(LoadFile);

my $infile = "/home/dev/projects/sportgraph/data/infobox_hockey_team_player-yaml/infobox_hockey_team_player.yaml";
my $outfile = "/home/dev/projects/sportgraph/data/infobox_hockey_team_player-yaml/player_to_team.json";

my $documents = [ LoadFile($infile) ];
my $player_team_stats = {
    teams => {},,
    years => {},
    players => {},
    player_team => [],
};

for my $doc (@$documents) {
    my $team_year_string = [ keys %$doc]->[0];
    my ($yearfrom,$team) = $team_year_string =~ /^(\d\d\d\d)-\d\d_(.*)_season$/;
    unless ($yearfrom && $team) {
       #print "Bad string $team_year_string\n";
       next;
    }
    my $player = $doc->{$team_year_string}{name};

    #strip formatting
    $player =~ s/\]\]$//g;
    $player =~ s/^\[\[//g;
    $player =~ s/_\(.*\)$//g;
    #strip non ascii
    $player =~ s/%[A-Z][0-9]//g;
    $player =~ s/[^a-zA-Z]//g;
   
    #strip formatting
    $team =~ s/\.//g;
    $team =~ s/_/ /g;


    push(@{$player_team_stats->{player_team}}, {
        year => $yearfrom,
        team => $team,
        player => $player,
        jersey_number => $doc->{$team_year_string}{no}
    });

    $player_team_stats->{teams}{$team}     = 1;
    $player_team_stats->{players}{$player} = 1;
    $player_team_stats->{years}{$yearfrom} = 1;

}

$player_team_stats->{teams}   = [sort keys $player_team_stats->{teams}];
$player_team_stats->{players} = [sort keys $player_team_stats->{players}];
$player_team_stats->{years}   = [sort keys $player_team_stats->{years}];

open my $outfh, '>', $outfile or die $!;
print $outfh encode_json($player_team_stats);
#print dump($player_team_stats);
close $outfh or die $!;

<?php

/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * ForEx implementation : © <David Edelstein> <david.edelstein@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * stats.inc.php
 *
 * ForEx game statistics description
 *
 */

/*
    In this file, you are describing game statistics, that will be displayed at the end of the
    game.
    
    !! After modifying this file, you must use "Reload  statistics configuration" in BGA Studio backoffice
    ("Control Panel" / "Manage Game" / "Your Game")
    
    There are 2 types of statistics:
    _ table statistics, that are not associated to a specific player (ie: 1 value for each game).
    _ player statistics, that are associated to each players (ie: 1 value for each player in the game).

    Statistics types can be "int" for integer, "float" for floating point values, and "bool" for boolean
    
    Once you defined your statistics there, you can start using "initStat", "setStat" and "incStat" method
    in your game logic, using statistics names defined below.
    
    !! It is not a good idea to modify this file when a game is running !!

    If your game is already public on BGA, please read the following before any change:
    http://en.doc.boardgamearena.com/Post-release_phase#Changes_that_breaks_the_games_in_progress
    
    Notes:
    * Statistic index is the reference used in setStat/incStat/initStat PHP method
    * Statistic index must contains alphanumerical characters and no space. Example: 'turn_played'
    * Statistics IDs must be >=10
    * Two table statistics can't share the same ID, two player statistics can't share the same ID
    * A table statistic can have the same ID than a player statistics
    * Statistics ID is the reference used by BGA website. If you change the ID, you lost all historical statistic data. Do NOT re-use an ID of a deleted statistic
    * Statistic name is the English description of the statistic as shown to players
    
*/

$stats_type = array(

    // Statistics global to table
    "table" => array(

        "turns_number" => array("id"=> 10,
            "name" => totranslate("Number of turns"),
            "type" => "int" ),
        "strongest_currency" => array("id"=> 11,
            "name" => totranslate("Strongest Currency"),
            "type" => "int" ),
    ),

    // Statistics existing for each player
    "player" => array(
        "Bankrupt" => array("id"=> 30,
                    "name" => totranslate("Bankrupt"),
                    "type" => "bool" ),
        "GBP_certs" => array("id"=> 31,
                    "name" => totranslate("GBP Certificates"),
                    "type" => "int" ),
        "EUR_certs" => array("id"=> 32,
                    "name" => totranslate("EUR Certificates"),
                    "type" => "int" ),
        "USD_certs" => array("id"=> 33,
                    "name" => totranslate("USD Certificates"),
                    "type" => "int" ),
        "CHF_certs" => array("id"=> 34,
                    "name" => totranslate("CHF Certificates"),
                    "type" => "int" ),
        "JPY_certs" => array("id"=> 35,
                    "name" => totranslate("JPY Certificates"),
                    "type" => "int" ),
        "CAD_certs" => array("id"=> 36,
                    "name" => totranslate("CAD Certificates"),
                    "type" => "int" ),
        "CNY_certs" => array("id"=> 37,
                    "name" => totranslate("CNY Certificates"),
                    "type" => "int" ),
        "invested" => array("id"=> 40,
                    "name" => totranslate("Certificates Bought"),
                    "type" => "int" ),
        "divested" => array("id"=> 41,
                    "name" => totranslate("Certificates Sold"),
                    "type" => "int" ),
        "contracts_taken" => array("id"=> 42,
                    "name" => totranslate("Contracts Taken"),
                    "type" => "int" ),
        "contracts_paid" => array("id"=> 43,
                    "name" => totranslate("Contracts Paid"),
                    "type" => "int" ),
        "resolved" => array("id"=> 44,
                    "name" => totranslate("Resolve Actions"),
                    "type" => "int" ),
        "loans" => array("id"=> 45,
                    "name" => totranslate("Loans"),
                    "type" => "int" ),
        "spot_trades" => array("id"=> 46,
                    "name" => totranslate("Spot Trades"),
                    "type" => "int" ),
        ),

    "value_labels" => array(
		11 => array( 
            1 => totranslate('GBP'),
            2 => totranslate('EUR'),
            3 => totranslate('USD'),
            4 => totranslate('CHF'),
            5 => totranslate('JPY'),
            6 => totranslate('CAD'),
            7 => totranslate('CNY')
        ),
	)

);
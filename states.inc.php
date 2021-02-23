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
 * states.inc.php
 *
 * ForEx game states description
 *
 */

if (!defined('SETUP')) { // ensure this block is only invoked once, since it is included multiple times
    define("SETUP", 1);
    define("CHOOSE_ACTION", 2);
    define("NEXT_PLAYER", 3);
    define("STRENGTHEN_CURRENCY", 4);
    define("SPOT_RESPONSE", 20);
    define("HANDLE_OFFER", 21); // game manager between traders
    define("HANDLE_RESPONSE", 22);
    define("DIVEST", 50);
    define("NEXT_PLAYER_DIVEST", 51);
    define("LAST_RESOLVE", 70);
    define("CHOOSE_CURRENCY", 75);
    define("SCORING", 98);
    define("ENDGAME", 99);
 }
 
$machinestates = array(

    // The initial state. Please do not modify.
    SETUP => array(
        "name" => "gameSetup",
        "description" => "",
        "type" => "manager",
        "action" => "stGameSetup",
        "transitions" => array( "" => CHOOSE_ACTION )
    ),

    CHOOSE_ACTION => array(
        "name" => "playerAction",
        "description" => clienttranslate( '${actplayer} must choose an action' ),
        "descriptionmyturn" => clienttranslate( '${you} must choose an action' ),
        "type" => "activeplayer",
        "possibleactions" => array( "offerSpotTrade", "makeContract", "investCurrency", "divestCurrency", "resolve" ),
        "transitions" => array( "spotOffer" => HANDLE_OFFER, "nextPlayer" => NEXT_PLAYER, "divest" => DIVEST, "chooseCurrency" => STRENGTHEN_CURRENCY, "endGame" => LAST_RESOLVE)
    ),

    NEXT_PLAYER => array(
        "name" => "nextPlayer",
        "description" => "",
        "type" => "game",
        "updateGameProgression" => true,   
        "action" => "stNextPlayer",
        "transitions" => array( "" => CHOOSE_ACTION  )
    ),

    STRENGTHEN_CURRENCY => array(
        "name" => "strengthenCurrency",
        "description" => clienttranslate( '${actplayer} must choose the currency to strengthen' ),
        "descriptionmyturn" => clienttranslate( '${you} must choose the currency to strengthen' ),
        "type" => "activeplayer",
        "possibleactions" => array( "chooseCurrencyToStrengthen" ),
        "transitions" => array( "nextPlayer" => NEXT_PLAYER, "endGame" => LAST_RESOLVE)
    ),

    HANDLE_OFFER => array(
        "name" => "spotTrade",
        "description" => "",
        "type" => "game",
        "action" => "stSpotOffer",
        "transitions" => array( "getResponse" => SPOT_RESPONSE )
    ),

    SPOT_RESPONSE => array(
        "name" => "offerResponse",
        "description" => clienttranslate( '${from_player_name} offered ${to_player_name} a Spot Trade of ${x_monies_offer} for ${x_monies_request}' ),
        "descriptionmyturn" => clienttranslate( '${from_player_name} offered ${to_player_name} a Spot Trade of ${x_monies_offer} for ${x_monies_request}' ),
        "type" => "multipleactiveplayer",
        "possibleactions" => array( "respondSpotTrade", "cancelSpotTrade" ),
        "args" => "argsSpotOffer",
        "transitions" => array( "" => HANDLE_RESPONSE )
    ),

    HANDLE_RESPONSE => array(
        "name" => "spotResponse",
        "description" => "",
        "type" => "game",
        "action" => "stSpotResponse",
        "transitions" => array( "" => CHOOSE_ACTION )
    ),

    DIVEST => array(
        "name" => "divest",
        "description" => "",
        "type" => "game",
        "action" => "stDivest",
        "transitions" => array( "divest" => DIVEST, "nextDivest" => NEXT_PLAYER_DIVEST, "lastDivest" => NEXT_PLAYER )
    ),

    NEXT_PLAYER_DIVEST => array(
        "name" => "nextDivest",
        "description" => clienttranslate( '${actplayer} may sell ${currency} Certificates' ),
        "descriptionmyturn" => clienttranslate( '${you} may sell ${currency} Certificates' ),
        "type" => "activeplayer",
        "args" => "argsSellCertificates",
        "possibleactions" => array( "optDivestCurrency" ),
        "transitions" => array( "divest" => DIVEST )
    ),

    LAST_RESOLVE => array(
        "name" => "lastresolve",
        "description" => "",
        "type" => "game",
        "action" => "stLastResolve",
        "transitions" => array( "chooseStrongest" => CHOOSE_CURRENCY, "scoring" => SCORING )
    ),

    CHOOSE_CURRENCY => array(
        "name" => "strongestCurrency",
        "description" => clienttranslate( '${actplayer} must choose the strongest Currency for final scoring' ),
        "descriptionmyturn" => clienttranslate( '${you} must choose the strongest Currency for final scoring' ),
        "type" => "activeplayer",
        "args" => "argsChooseCurrency",
        "possibleactions" => array( "chooseStrongestCurrency" ),
        "transitions" => array( "" => SCORING )
    ),

    SCORING => array(
        "name" => "scoring",
        "description" => "",
        "type" => "game",
        "action" => "stScoring",
        "transitions" => array( "" => ENDGAME )
    ),

    // Final state.
    // Please do not modify (and do not overload action/args methods).
    ENDGAME => array(
        "name" => "gameEnd",
        "description" => clienttranslate("End of game"),
        "type" => "manager",
        "action" => "stGameEnd",
        "args" => "argGameEnd"
    )

);
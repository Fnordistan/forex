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
    define("SPOT_OFFER", 20);
    define("HANDLE_OFFER", 21); // game manager between traders
    define("HANDLE_RESPONSE", 22);
    define("CONTRACT", 30);
    define("INVEST", 40);
    define("DIVEST", 50);
    define("NEXT_PLAYER_DIVEST", 51);
    define("RESOLVE", 60);
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
        "possibleactions" => array( "offerSpotTrade", "makeContract", "investCurrency", "divestCurrency", "resolveContract" ),
        "transitions" => array( "spotOffer" => HANDLE_OFFER, "contract" => CONTRACT, "invest" => INVEST, "divest" => DIVEST, "resolve" => RESOLVE  )
    ),

    HANDLE_OFFER => array(
        "name" => "spotTrade",
        "description" => "",
        "type" => "manager",
        "action" => "stSpotOffer",
        "transitions" => array( "getResponse" => SPOT_OFFER )
    ),

    SPOT_OFFER => array(
        "name" => "offerResponse",
        "description" => clienttranslate( '${from_player} offered ${to_player} a Spot Trade of ${offer_amt} ${offer_curr} for ${request_amt} ${request_curr}' ),
        "descriptionmyturn" => clienttranslate( '${from_player} offered ${you} a Spot Trade of ${offer_amt} ${offer_curr} for ${request_amt} ${request_curr}' ),
        "type" => "activeplayer",
        "possibleactions" => array( "respondSpotTrade" ),
        "args" => "argSpotOffer",
        "transitions" => array( "" => HANDLE_RESPONSE )
    ),

    HANDLE_RESPONSE => array(
        "name" => "spotResponse",
        "description" => "",
        "type" => "manager",
        "action" => "stSpotResponse",
        "transitions" => array( "" => CHOOSE_ACTION )
    ),

    CONTRACT => array(
        "name" => "contract",
        "description" => clienttranslate( '${actplayer} may make a Contract' ),
        "descriptionmyturn" => clienttranslate( '${you} may make a Contract' ),
        "type" => "activeplayer",
        "possibleactions" => array( "makeContract", "cancelAction" ),
        "transitions" => array( "" => CHOOSE_ACTION )
    ),

    INVEST => array(
        "name" => "invest",
        "description" => clienttranslate( '${actplayer} may Invest in 1 or 2 Currencies' ),
        "descriptionmyturn" => clienttranslate( '${you} may may Invest in 1 or 2 Currencies' ),
        "type" => "activeplayer",
        "possibleactions" => array( "investCurrency", "cancelAction" ),
        "transitions" => array( "" => CHOOSE_ACTION )
    ),

    DIVEST => array(
        "name" => "divest",
        "description" => clienttranslate( '${actplayer} may Divest in 1 Currency' ),
        "descriptionmyturn" => clienttranslate( '${you} may may Divest in 1 Currency' ),
        "type" => "activeplayer",
        "possibleactions" => array( "divestCurrency", "cancelAction" ),
        "transitions" => array( "" => CHOOSE_ACTION )
    ),

    NEXT_PLAYER_DIVEST => array(
        "name" => "nextDivest",
        "description" => clienttranslate( '${actplayer} may sell ${currency} Certificates' ),
        "descriptionmyturn" => clienttranslate( '${you} may sell ${currency} Certificates' ),
        "type" => "activeplayer",
        "args" => "argSellCertificates",
        "possibleactions" => array( "sellCertificates" ),
        "transitions" => array( "nextDivest" => NEXT_PLAYER_DIVEST, "nextPlayer" => CHOOSE_ACTION )
    ),

    RESOLVE => array(
        "name" => "resolve",
        "description" => clienttranslate( '${actplayer} may Resolve Contract ${contract}' ),
        "descriptionmyturn" => clienttranslate( '${you} may Resolve Contract ${contract}' ),
        "type" => "activeplayer",
        "args" => "argResolveContract",
        "possibleactions" => array( "resolveContract", "cancelAction" ),
        "transitions" => array( "resolved" => CHOOSE_ACTION, "canceled" => CHOOSE_ACTION, "endgame" => LAST_RESOLVE )
    ),

    LAST_RESOLVE => array(
        "name" => "lastresolve",
        "description" => "",
        "type" => "game",
        "action" => "stLastResolve",
        "transitions" => array( "chooseCurrency" => CHOOSE_CURRENCY, "scoring" => SCORING )
    ),

    CHOOSE_CURRENCY => array(
        "name" => "strongestCurrency",
        "description" => clienttranslate( '${actplayer} must choose the strongest Currency for final scoring (${tied_curr})' ),
        "descriptionmyturn" => clienttranslate( '${you} must choose the strongest Currency for final scoring (${tied_curr})' ),
        "type" => "activeplayer",
        "args" => "argChooseCurrency",
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
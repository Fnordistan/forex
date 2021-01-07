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
  * forex.game.php
  *
  * This is the main file for your game logic.
  *
  * In this PHP file, you are going to defines the rules of the game.
  *
  */


require_once( APP_GAMEMODULE_PATH.'module/table/table.game.php' );

define('DIVIDENDS', 'Dividends');
define('AVAILABLE', 'available');
define('DISCARD', 'discard');

class ForEx extends Table
{
	function __construct( )
	{
        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.inc.php.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        parent::__construct();
        
        self::initGameStateLabels( array( 
            //    "my_first_global_variable" => 10,
            //    "my_second_global_variable" => 11,
            //      ...
            //    "my_first_game_variant" => 100,
            //    "my_second_game_variant" => 101,
            //      ...
        ) );

        $this->certificates = self::getNew("module.common.deck");
        $this->certificates->init("CERTIFICATES");

	}

    protected function getGameName( )
    {
		// Used for translations and stuff. Please do not modify.
        return "forex";
    }	

    /*
        setupNewGame:
        
        This method is called only once, when a new game is launched.
        In this method, you must setup the game according to the game rules, so that
        the game is ready to be played.
    */
    protected function setupNewGame( $players, $options = array() )
    {    
        // Set the colors of the players with HTML color code
        // The default below is red/green/blue/orange/brown
        // The number of colors defined here must correspond to the maximum number of players allowed for the gams
        $gameinfos = self::getGameinfos();
        $default_colors = $gameinfos['player_colors'];
 
        // Create players
        // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialize it there.
        $sql = "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES ";
        $values = array();
        foreach( $players as $player_id => $player )
        {
            $color = array_shift( $default_colors );
            $values[] = "('".$player_id."','$color','".$player['player_canal']."','".addslashes( $player['player_name'] )."','".addslashes( $player['player_avatar'] )."')";
        }
        $sql .= implode( $values, ',' );
        self::DbQuery( $sql );
        self::reattributeColorsBasedOnPreferences( $players, $gameinfos['player_colors'] );
        self::reloadPlayersBasicInfos();
        
        /************ Start the game initialization *****/

        // Init global values with their initial values
        //self::setGameStateInitialValue( 'my_first_global_variable', 0 );
        
        // Init game statistics
        // (note: statistics used in this file must be defined in your stats.inc.php file)
        //self::initStat( 'table', 'table_teststat1', 0 );    // Init a table statistics
        //self::initStat( 'player', 'player_teststat1', 0 );  // Init a player statistics (for all players)

        // setup the initial game situation here
        $this->setupCertificates();
        $this->giveStartingMonies($players);
        $this->setupCurrencyPairs();
        $this->initializeContracts();

        // Activate first player (which is in general a good idea :) )
        $this->activeNextPlayer();

        /************ End of the game initialization *****/
    }

    /**
     * Create certificates, 8 for each currency.
     */
    protected function createCertificates() {
        $certs = array();
        foreach ($this->currencies as $c => $curr) {
            $certs[] = array('type' => $curr, 'type_arg' => NULL, 'location' => AVAILABLE, 'location_arg' => null, 'nbr' => 8 );
        }
        return $certs;
    }

    /**
     * Create the certificates "deck"
     */
    protected function setupCertificates() {
        $certs = $this->createCertificates();
        $this->certificates->createCards( $certs, AVAILABLE );
        // shuffle and randomly discard 6
        $this->certificates->shuffle(AVAILABLE);
        $this->certificates->pickCardsForLocation(6, AVAILABLE, DISCARD);
    }

    /**
     * Give everyone their starting 2 bucks in each currency
     */
    protected function giveStartingMonies($players) {
        foreach ($players as $player_id => $player) {
            foreach ($this->currencies as $c => $curr) {
                self::DbQuery( "INSERT INTO BANK VALUES($player_id,\"$curr\",2)" );
            }
        }
    }

    /**
     * Initialize currency pairs to starting positions.
     */
    protected function setupCurrencyPairs() {
        // stock the currency pairs table
        // with initial starting values
        $starting_pairs = array();
        $starting_pairs["GBP"] = array("USD" => 1, "EUR" => 2, "CHF" => 2, "JPY" => 2, "CAD" => 3, "CNY" => 7);
        $starting_pairs["EUR"] = array("USD" => 1, "CHF" => 1, "JPY" => 2, "CAD" => 2, "CNY" => 6);
        $starting_pairs["USD"] = array("CHF" => 1, "JPY" => 2, "CAD" => 2, "CNY" => 6);
        $starting_pairs["CHF"] = array("JPY" => 2, "CAD" => 2, "CNY" => 6);
        $starting_pairs["JPY"] = array("CAD" => 2, "CNY" => 5);
        $starting_pairs["CAD"] = array("CNY" => 4);

        foreach ($starting_pairs as $curr1 => $pairs) {
            foreach ($pairs as $curr2 => $position) {
                self::DbQuery( "INSERT INTO CURRENCY_PAIRS VALUES(\"$curr1\",\"$curr2\",\"$curr1\",$position)" );
            }
        }
    }

    /**
     * Init the contracts
     */
    protected function initializeContracts() {
        foreach($this->contracts as $contract) {
            self::DbQuery( "INSERT INTO CONTRACTS (contract) VALUES(\"$contract\")" );
        }
        self::DbQuery( "INSERT INTO CONTRACTS (contract) VALUES(\"".DIVIDENDS."\")" );
    }


    /*
        getAllDatas: 
        
        Gather all informations about current game situation (visible by the current player).
        
        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)
    */
    protected function getAllDatas()
    {
        $result = array();
    
        $current_player_id = self::getCurrentPlayerId();    // !! We must only return informations visible by this player !!
    
        // Get information about players
        // Note: you can retrieve some extra field you added for "player" table in "dbmodel.sql" if you need it.
        $sql = "SELECT player_id id, player_score score FROM player ";
        $result['players'] = self::getCollectionFromDb( $sql );
  
        // TODO: Gather all information about current game situation (visible by player $current_player_id).
        $sql = "SELECT curr1, curr2, stronger, position FROM CURRENCY_PAIRS";
        $result['currency_pairs'] = self::getObjectListFromDB( $sql );
        // even though this is a Deck, we're going to pull directly from Db because all certs are public info
        // and get handled on client side
        $result['certificates'] = self::getObjectListFromDB("SELECT card_id id, card_type curr, card_location loc FROM CERTIFICATES");

        return $result;
    }

    /*
        getGameProgression:
        
        Compute and return the current game progression.
        The number returned must be an integer beween 0 (=the game just started) and
        100 (= the game is finished or almost finished).
    
        This method is called each time we are in a game state with the "updateGameProgression" property set to true 
        (see states.inc.php)
    */
    function getGameProgression()
    {
        // TODO: compute and return the game progression

        return 0;
    }


//////////////////////////////////////////////////////////////////////////////
//////////// Utility functions
////////////    

    /**
     * Return associative array for all pairs with this currency, with this currency as the key.
     * curr => $curr
     * stronger => stronger
     * pos => position
     * pair => other currency
     */
    function getCurrencyPairs($curr) {
        $stored_pairs = self::getObjectListFromDB("SELECT curr1, curr2, stronger, position FROM CURRENCY_PAIRS WHERE curr1 = $curr OR curr2 = $curr");
        $pairs = array();
        foreach ($stored_pairs as $stored_pr) {
            $pair = array("curr" => $curr, "stronger" => $stored_pr['stronger'], "pos" => $stored_pr['position'], "pair" => $stored_pr['curr1'] == $curr ? $stored_pr['curr2'] : $stored_pr['curr1']);
            $pairs[] = $pair;
        }
        return $pairs;
    }

    /**
     * Strengthen a currency, send notifications.
     */
    function strengthen($curr) {
        $pairs = $this->getCurrencypairs($curr);
        foreach ($pairs as $pair) {
            $this->increase($curr, $pair);
        }
        self::notifyAllPlayers('currencyStrengthened', '${player_name} strengthened {$curr}', array (
            'i18n' => array ('curr' ),
            'player_id' => self::getActivePlayerId(),
            'player_name' => self::getActivePlayerName(),
            'curr' => $curr));
    }

    /**
     * Weaken a currency, send notifications.
     */
    function weaken($curr) {
        $pairs = $this->getCurrencypairs($curr);
        foreach ($pairs as $pair) {
            $this->decrease($curr, $pair);
        }
        self::notifyAllPlayers('currencyWeakened', '${player_name} weakened {$curr}', array (
            'i18n' => array ('curr' ),
            'player_id' => self::getActivePlayerId(),
            'player_name' => self::getActivePlayerName(),
            'curr' => $curr));
    }

    /**
     * Increase a $curr relative to the other currency in the par. Update in Db.
     */
    function increase($curr, $pair) {
        $pos = $pair['pos'];
        $stronger = $pair['stronger'];
        if ($curr == $stronger) {
            $pos = min($pos+1, 10);
        } else {
            $pos--;
            if ($pos == 0) {
                $stronger = $curr;
                $pos = 1;
            }
        }
        $this->updateCurrencyPair($curr, $pair['pair'], $stronger, $pos);
    }

    /**
     * Decrease a $curr relative to the other currency in the par. Update in Db.
     */
    function decrease($curr, $pair) {
        $pos = $pair['pos'];
        $stronger = $pair['stronger'];
        if ($curr == $stronger) {
            $pos--;
            if ($pos == 0) {
                $stronger = $pair['pair'];
                $pos = 1;
            }
        } else {
            $pos = min($pos+1, 10);
        }
        $this->updateCurrencyPair($curr, $pair['pair'], $stronger, $pos);
    }

    /**
     * Update a pair in the Db.
     */
    function updateCurrencyPair($curr1, $curr2, $stronger, $pos) {
        self::DbQuery("
            UPDATE CURRENCY_PAIRS SET stronger = $stronger, position = $pos
            WHERE (curr1 = $curr1 AND curr2 = $curr2) OR (curr1 = $curr2 AND curr2 = $curr1)
        ");
    }

    /**
     * Given two currencies, returns two-member array: the stronger of the two, and its value (exchange rate) for the weaker.
     */
    function calculateExchangeRate($curr1, $curr2) {
        $pair = self::getNonEmptyObjectFromDB("
            SELECT stronger, position from CURRENCY_PAIRS
            WHERE (curr1 = $curr1 AND curr2 = $curr2 ) OR (curr1 = $curr2 AND curr2 = $curr1 )
        ");
        $xchang = $this->exchange[$pair['position']];
        $pair = array($pair['stronger'], $xchang);
        return $pair;
    }

    /**
     * For an offer and request, returns two-member array, value/value (one will be 1)
     */
    function getSpotValues($offer, $request) {
        $xchg = $this->calculateExchangeRate($curr1, $curr2);
        if ($offer == $xchg[0]) {
            return array(1, $xchg[1]);
        } else {
            return array($xchg[1], 1);
        }
    }

    /**
     * How much does this player have of this currency?
     */
    function getMonies($player_id, $curr) {
        return self::getUniqueValueFromDB("SELECT amt from BANK WHERE player = $player_id AND curr = $curr");
    }

    /**
     * How many Certificates does this player have of the given currency?
     */
    function countCertificates($player_id, $curr) {
        $certs = self::getCollectionFromDB("SELECT card_id from CERTIFICATES WHERE card_type = $curr AND card_location = $player_id");
        return count($certs);
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Player actions
//////////// 

    /*
        Each time a player is doing some game action, one of the methods below is called.
        (note: each method below must match an input method in forex.action.php)
    */

    /*
    
    Example:

    function playCard( $card_id )
    {
        // Check that this is the player's turn and that it is a "possible action" at this game state (see states.inc.php)
        self::checkAction( 'playCard' ); 
        
        $player_id = self::getActivePlayerId();
        
        // Add your game logic to play a card there 
        ...
        
        // Notify all players about the card played
        self::notifyAllPlayers( "cardPlayed", clienttranslate( '${player_name} plays ${card_name}' ), array(
            'player_id' => $player_id,
            'player_name' => self::getActivePlayerName(),
            'card_name' => $card_name,
            'card_id' => $card_id
        ) );
          
    }
    
    */

    function offerSpotTrade($offer, $request, $player) {
        self::checkAction( 'offerSpot' ); 

        $player_id = self::getActivePlayerId();
        
        $spot = $this->getSpotValues($offer, $request);
        $off_amt = $spot[0];
        $req_amt = $spot[1];
        $mybucks = $this->getMonies($me, $offer);
        if ($off_amt > $mybucks) {
            throw new BgaUserException(self::_("You do not have ${off_amt} ${offer}"));
        }
        $theirbucks = $this->getMonies($player, $request);
        if ($req_amt > $theirbucks) {
            throw new BgaUserException(self::_("${player} does not have ${req_amt} ${request}"));
        }
        // sendOffer($offer, $off_amt, $request, $req_amt, $player);
    }

    /**
     * Buy a certificate.
     */
    function invest($curr) {
        self::checkAction( 'investCurrency' ); 

        $player_id = self::getActivePlayerId();
        $mybucks = $this->getMonies($player_id, $curr);
        if ($mybucks < 2) {
            throw new BgaUserException(self::_("You do not have enough ${curr} to buy a Certificate"));
        }
        $mycerts = $this->countCertificates($player_id, $curr);
        if ($mycerts >= 4) {
            throw new BgaUserException(self::_("You may not hold more than 4 ${curr} Certificates"));
        }

        self::DbQuery("UPDATE BANK SET amt = ".($mybucks-2)." WHERE player = $player_id AND curr = $curr");

        // movedeck for certificates
        self::notifyAllPlayers('currencyInvested', '${player_name} invested in ${curr}', array (
            'i18n' => array ('curr' ),
            'player_id' => self::getActivePlayerId(),
            'player_name' => self::getActivePlayerName(),
            'curr' => $curr));
        $this->strengthen($curr);
    }


//////////////////////////////////////////////////////////////////////////////
//////////// Game state arguments
////////////

    /*
        Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
        These methods function is to return some additional information that is specific to the current
        game state.
    */

    /*
    
    Example for game state "MyGameState":
    
    function argMyGameState()
    {
        // Get some values from the current game situation in database...
    
        // return values:
        return array(
            'variable1' => $value1,
            'variable2' => $value2,
            ...
        );
    }    
    */

//////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////

    /*
        Here, you can create methods defined as "game state actions" (see "action" property in states.inc.php).
        The action method of state X is called everytime the current game state is set to X.
    */
    
    /*
    
    Example for game state "MyGameState":

    function stMyGameState()
    {
        // Do some stuff ...
        
        // (very often) go to another gamestate
        $this->gamestate->nextState( 'some_gamestate_transition' );
    }    
    */

//////////////////////////////////////////////////////////////////////////////
//////////// Zombie
////////////

    /*
        zombieTurn:
        
        This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
        You can do whatever you want in order to make sure the turn of this player ends appropriately
        (ex: pass).
        
        Important: your zombie code will be called when the player leaves the game. This action is triggered
        from the main site and propagated to the gameserver from a server, not from a browser.
        As a consequence, there is no current player associated to this action. In your zombieTurn function,
        you must _never_ use getCurrentPlayerId() or getCurrentPlayerName(), otherwise it will fail with a "Not logged" error message. 
    */

    function zombieTurn( $state, $active_player )
    {
    	$statename = $state['name'];
    	
        if ($state['type'] === "activeplayer") {
            switch ($statename) {
                default:
                    $this->gamestate->nextState( "zombiePass" );
                	break;
            }

            return;
        }

        if ($state['type'] === "multipleactiveplayer") {
            // Make sure player is in a non blocking status for role turn
            $this->gamestate->setPlayerNonMultiactive( $active_player, '' );
            
            return;
        }

        throw new feException( "Zombie mode not supported at this game state: ".$statename );
    }
    
///////////////////////////////////////////////////////////////////////////////////:
////////// DB upgrade
//////////

    /*
        upgradeTableDb:
        
        You don't have to care about this until your game has been published on BGA.
        Once your game is on BGA, this method is called everytime the system detects a game running with your old
        Database scheme.
        In this case, if you change your Database scheme, you just have to apply the needed changes in order to
        update the game database and allow the game to continue to run with your new version.
    
    */
    
    function upgradeTableDb( $from_version )
    {
        // $from_version is the current version of this game database, in numerical form.
        // For example, if the game was running with a release of your game named "140430-1345",
        // $from_version is equal to 1404301345
        
        // Example:
//        if( $from_version <= 1404301345 )
//        {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "ALTER TABLE DBPREFIX_xxxxxxx ....";
//            self::applyDbUpgradeToAllDB( $sql );
//        }
//        if( $from_version <= 1405061421 )
//        {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "CREATE TABLE DBPREFIX_xxxxxxx ....";
//            self::applyDbUpgradeToAllDB( $sql );
//        }
//        // Please add your future database scheme changes here
//
//


    }    
}

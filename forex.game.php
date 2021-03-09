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
define('DIVIDEND_COUNT', 'dividend_count');
define('AVAILABLE', 'available');
define('DISCARD', 'discard');
define('SPOT_FROM', 'spot_trade_from');
define('SPOT_TO', 'spot_trade_to');
define('SPOT_OFFER', 'spot_offer');
define('SPOT_REQUEST', 'spot_request');
define('SPOT_DONE', 'spot_trade_done');
// match js and css vars
define('DIVEST_CURRENCY', 'divest_currency');
define('DIVEST_PLAYER', 'divest_player');
define('BANKRUPT_PLAYER', 'bankrupt_player');
define('SCORING_CURRENCY', 'scoring_currency');
define('NOTE', 'note');
define('CERTIFICATE', 'cert');
define('LOAN', 'LN');

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
            DIVIDEND_COUNT => 10,
            SPOT_FROM => 21,
            SPOT_TO => 22,
            SPOT_OFFER => 23,
            SPOT_REQUEST => 24,
            SPOT_DONE => 25,
            DIVEST_CURRENCY => 30,
            DIVEST_PLAYER => 31,
            BANKRUPT_PLAYER => 32,
            SCORING_CURRENCY => 40,
        ));

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
        self::setGameStateInitialValue( DIVIDEND_COUNT, 5 );
        // player making a Spot Trade offer
        self::setGameStateInitialValue( SPOT_FROM, 0 );
        // player being offered Spot Trade
        self::setGameStateInitialValue( SPOT_TO, 0 );
        self::setGameStateInitialValue( SPOT_OFFER, 0 );
        self::setGameStateInitialValue( SPOT_REQUEST, 0 );
        self::setGameStateInitialValue( SPOT_DONE, 0 );
        self::setGameStateInitialValue( DIVEST_CURRENCY, 0 );
        self::setGameStateInitialValue( DIVEST_PLAYER, 0 );
        self::setGameStateInitialValue( BANKRUPT_PLAYER, 0 );
        self::setGameStateInitialValue( SCORING_CURRENCY, 0 );

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
        // dividends go in first queue position
        self::DbQuery( "INSERT INTO CONTRACTS (contract, location) VALUES(\"".DIVIDENDS."\", 1)" );
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
        // all the money each player has
        $result['notes'] = self::getObjectListFromDB("SELECT * FROM BANK");
        // Dividends left
        $result['dividends'] = self::getGameStateValue(DIVIDEND_COUNT);
        $contracts = self::getNonEmptyCollectionFromDB("
            SELECT contract, owner player_id, promise, promise_amt, payout, payout_amt, location FROM CONTRACTS
            WHERE location IS NOT NULL 
        ");
        $result['contracts'] = $contracts;
        foreach ($contracts as $conL => $contract) {
            if ($contract['promise'] == LOAN) {
                $loans = $this->getLoansOnContract($contract['player_id'], $conL);
                $result['contracts'][$conL]['loans'] = $loans;
            }
        }
        // spot trade - may be null
        $result['spot_transaction'] = $this->getSpotTrade();
        $result[SPOT_DONE] = self::getGameStateValue(SPOT_DONE);
        // divesting currency
        $dcurr = self::getGameStateValue(DIVEST_CURRENCY);
        $result[DIVEST_CURRENCY] = ($dcurr == 0) ? null : $this->currencies[$dcurr];

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
    function getGameProgression() {
        $dividends = self::getGameStateValue(DIVIDEND_COUNT);
        $div_loc = $this->getDividendLocation();
        // how many contracts ahead of it in queue?
        // can be 0 to 6
        $ahead = self::getObjectListFromDB("SELECT contract FROM CONTRACTS WHERE location > $div_loc", true);
        $inc = 10 - (count($ahead) * (1 + 2/3));
        return $inc + (5-$dividends)*20;
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
        $stored_pairs = self::getObjectListFromDB("SELECT curr1, curr2, stronger, position FROM CURRENCY_PAIRS WHERE curr1 = \"$curr\" OR curr2 = \"$curr\"");
        $pairs = array();
        foreach ($stored_pairs as $stored_pr) {
            $pair = array("curr" => $curr, "stronger" => $stored_pr['stronger'], "pos" => $stored_pr['position'], "pair" => $stored_pr['curr1'] == $curr ? $stored_pr['curr2'] : $stored_pr['curr1']);
            $pairs[] = $pair;
        }
        return $pairs;
    }

    /**
     * Create a SpotTrade associative array from the currency values, packed for the getAllDatas result
     */
    function getSpotTrade() {
        $to = self::getGameStateValue( SPOT_TO );
        $from = self::getGameStateValue( SPOT_FROM );
        $offer = self::getGameStateValue( SPOT_OFFER );
        $request = self::getGameStateValue( SPOT_REQUEST );
        $spot_trade = null;
        if ($to != 0 && $from != 0 && $offer != 0 && $request != 0) {
            $spot_trade = array(
                SPOT_TO => $to,
                SPOT_FROM => $from,
                SPOT_OFFER => $offer,
                SPOT_REQUEST => $request
            );
        }
        return $spot_trade;
    }

    /**
     * Set all the game state values for a Spot Trade
     */
    function setSpotTradeValues($from, $to, $offer, $request) {
        self::setGameStateValue( SPOT_FROM, $from );
        self::setGameStateValue( SPOT_TO, $to );
        self::setGameStateValue( SPOT_OFFER, $this->currencyToIndex($offer) );
        self::setGameStateValue( SPOT_REQUEST, $this->currencyToIndex($request) );
    }

    /**
     * Set all the intra-player turn values to 0.
     */
    function clearForNextPlayer() {
        foreach(array( SPOT_FROM, SPOT_TO, SPOT_OFFER, SPOT_REQUEST, SPOT_DONE, DIVEST_CURRENCY, DIVEST_PLAYER ) as $lbl ) {
            self::setGameStateValue( $lbl, 0 );
        }
    }

    /**
     * Strengthen a currency, send notifications.
     */
    function strengthen($curr) {
        $pairs = $this->getCurrencypairs($curr);
        foreach ($pairs as $pair) {
            $this->increase($curr, $pair);
        }
        self::notifyAllPlayers('currencyStrengthened', clienttranslate('${currency} is strengthened'), array (
            'i18n' => array ('curr' ),
            'player_id' => self::getActivePlayerId(),
            'player_name' => self::getActivePlayerName(),
            'currency' => $curr,
            'curr' => $curr)
        );
    }

    /**
     * Weaken a currency, send notifications.
     * Currencies can be decreased by more than 1 inc at a time.
     */
    function weaken($curr, $amt) {
        $pairs = $this->getCurrencypairs($curr);
        foreach ($pairs as $pair) {
            for ($i = 0; $i < $amt; $i++) {
                $this->decrease($curr, $pair);
            }
        }
        self::notifyAllPlayers('currencyWeakened', clienttranslate('${currency} is weakened ${amt} times'), array (
            'i18n' => array ('currency' ),
            'player_id' => self::getActivePlayerId(),
            'player_name' => self::getActivePlayerName(),
            'currency' => $curr,
            'curr' => $curr,
            'amt' => $amt)
        );
    }

    /**
     * Increase a $curr relative to the other currency in the pair. Update in Db.
     */
    protected function increase($curr, $pair) {
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
    protected function decrease($curr, $pair) {
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
            UPDATE CURRENCY_PAIRS SET stronger = \"$stronger\", position = $pos
            WHERE (curr1 = \"$curr1\" AND curr2 = \"$curr2\") OR (curr1 = \"$curr2\" AND curr2 = \"$curr1\")
        ");
    }

    /**
     * Given two currencies, returns two-member array: the stronger of the two, and its value (exchange rate) for the weaker.
     */
    function calculateExchangeRate($curr1, $curr2) {
        $pair = self::getNonEmptyObjectFromDB("
            SELECT stronger, position from CURRENCY_PAIRS
            WHERE (curr1 = \"$curr1\" AND curr2 = \"$curr2\" ) OR (curr1 = \"$curr2\" AND curr2 = \"$curr1\" )
        ");
        $xchang = $this->exchange[$pair['position']];
        $pair = array($pair['stronger'], $xchang);
        return $pair;
    }

    /**
     * For an offer and request, returns two-member array, value/value (one will be 1)
     */
    function getSpotValues($offer, $request) {
        $xchg = $this->calculateExchangeRate($offer, $request);
        if ($offer == $xchg[0]) {
            return array(1, $xchg[1]);
        } else {
            return array($xchg[1], 1);
        }
    }

    /**
     * Assumes all checks have already been done and trade is valid.
     */
    function spotTrade() {
        // should have been set in OfferSpottrade
        $spot_trade = $this->getSpotTrade();

        $to_player = $spot_trade[SPOT_TO];
        $from_player = $spot_trade[SPOT_FROM];
        $off_curr = $this->currencies[$spot_trade[SPOT_OFFER]];
        $req_curr = $this->currencies[$spot_trade[SPOT_REQUEST]];

        $spot = $this->getSpotValues($off_curr, $req_curr);
        $off_amt = $spot[0];
        $req_amt = $spot[1];

        $players = self::loadPlayersBasicInfos();
        self::notifyAllPlayers('spotTradeAccepted', clienttranslate('${from_player_name} trades ${to_player_name} ${x_monies1} for ${x_monies2}').'${x_monies}', array(
            'i18n' => array ('from_player_name', 'to_player_name', 'off_curr', 'req_curr'),
            SPOT_TO => $to_player,
            'to_player_name' => $players[$to_player]['player_name'],
            SPOT_FROM => $from_player,
            'from_player_name' => $players[$from_player]['player_name'],
            SPOT_OFFER => $off_curr,
            'off_amt' => $off_amt,
            SPOT_REQUEST => $req_curr,
            'req_amt' => $req_amt,
            'x_monies1' => $off_amt.'_'.$off_curr,
            'x_monies2' => $req_amt.'_'.$req_curr,
            'x_monies' => 2,
        ));
        $this->adjustMonies($from_player, $off_curr, -$off_amt);
        $this->adjustMonies($to_player, $off_curr, $off_amt);
        $this->adjustMonies($from_player, $req_curr, $req_amt);
        $this->adjustMonies($to_player, $req_curr, -$req_amt);
        self::setGameStateValue(SPOT_DONE, 1);
    }

    /**
     * How much does this player have of this currency?
     */
    function getMonies($player_id, $curr) {
        return self::getUniqueValueFromDB("SELECT amt from BANK WHERE player = $player_id AND curr = \"$curr\"");
    }

    /**
     * Changes amount of money in player's bank
     */
    function adjustMonies($player_id, $curr, $amt) {
        $players = self::loadPlayersBasicInfos();
        self::DBQuery("UPDATE BANK SET amt = amt+$amt WHERE player = $player_id AND curr = \"$curr\"");

        $x_adj = $this->create_X_monies_arg(abs($amt), $curr, NOTE);

        self::notifyAllPlayers('moniesChanged', clienttranslate('${player_name} ${adj} ${x_monies1}').'${x_monies}', array(
            'player_id' => $player_id,
            'player_name' => $players[$player_id]['player_name'],
            'adj' => $amt < 0 ? self::_("pays") : self::_("receives"),
            'amt' => $amt,
            'curr' => $curr,
            'x_monies1' => $x_adj,
            'x_monies' => 1
        ));
    }

    /**
     * Return an array of card ids of the certificates a player has of the currency.
     */
    function getCertificates($player_id, $curr) {
        $certs = $this->certificates->getCardsOfTypeInLocation( $curr, null, $player_id, null);
        return $certs;
    }

    /**
     * Return an array of certs of available certificates for a currency
     */
    function getAvailableCertificates($curr) {
        $certs = $this->certificates->getCardsOfTypeInLocation( $curr, null, AVAILABLE, null);
        return $certs;
    }

    /**
     * Checks the player has this many certs, then subtracts them (but does NOT add monies yet).
     * Returns the ids of the certificates to sell.
     */
    function sellCertificates($player_id, $curr, $amt) {
        $mycerts = $this->getCertificates($player_id, $curr);
        $count = count($mycerts);
        if ($count < $amt) {
            throw new BgaUserException(self::_("You only have ${count} ${curr} Certificates"));
        }
        // only choose n certs
        $certs_to_divest = array_values(array_slice($mycerts, 0, $amt));
        $sell_ids = array();
        foreach($certs_to_divest as $cert) {
            $cert_id = $cert['id'];
            $this->certificates->moveCard($cert_id, DISCARD);
            $sell_ids[] = $cert_id;
        }
        return $sell_ids;
    }

    /**
     * Take a Contract (by letter) and clear all values.
     * Also clears any Loans attached to this letter.
     */
    function clearContract($conL) {
        self::DbQuery("UPDATE CONTRACTS SET owner = NULL, promise = NULL, promise_amt = NULL, payout = NULL, payout_amt = NULL, location = NULL WHERE contract = \"$conL\"");
        self::DbQuery("DELETE FROM LOANS WHERE contract = \"$conL\"");
    }

    /**
     * Slide left: adds 1 to every Contract in the queue
     */
    function pushContractQueue() {
        self::DBQuery("UPDATE CONTRACTS SET location = location+1 WHERE location IS NOT NULL");
    }

    /**
     * Get current location in queue of the Dividends stack
     */
    function getDividendLocation() {
        return self::getUniqueValueFromDB("SELECT location FROM CONTRACTS WHERE contract =\"".DIVIDENDS."\"");
    }

    /**
     * For setting state - turn a currency into its corresponding int
     */
    function currencyToIndex($curr) {
        foreach($this->currencies as $c => $currency) {
            if ($curr == $currency) {
                return $c;
            }
        }
        return 0;
    }

    /**
     * Create the special underscored string used in the client log parsing to turn into a currency+icon
     */
    function create_X_monies_arg($amt, $curr, $type) {
        return $amt."_".$curr."_".$type;
    }


    /**
     * At endgame, find the strongest Currency.
     * Returns array of strongest currencies (may be only one).
     */
    function getStrongestCurrency() {
        $strongest = array();
        // first count the number of currency pairs for which each currency is strongest
        $max = 0;
        foreach ($this->currencies as $c => $curr) {
            $stronger = self::getObjectListFromDB("SELECT curr1 from CURRENCY_PAIRS WHERE stronger = \"$curr\"", true);
            $ct = count($stronger);
            if ($ct > $max) {
                $strongest = array($curr);
                $max = $ct;
            } elseif ($ct == $max) {
                $strongest[] = $curr;
            }
        }

        if (count($strongest) == 1) {
            $this->notifyAllPlayers("currencyChosen", clienttranslate('${currency} is strongest in most pairs'), array(
                'i18n' => array ('currency'),
                'currency' => $strongest[0],
            ));
        } else {
            // next tiebreaker is most certificates in hand
            $strongest = $this->countHeldCertificates($strongest);
            if (count($strongest) == 1) {
                $this->notifyAllPlayers("currencyChosen", clienttranslate('${currency} has most Certificates in hand'), array(
                    'i18n' => array ('currency'),
                    'currency' => $strongest[0],
                ));
            }
        }
        return $strongest;
    }

    /**
     * For final scoring: convert the $base currency into $curr.
     * Rounds fractions down
     */
    function convertCurrency($base, $base_amt, $curr) {
        $conv = $base_amt;
        if ($base != $curr) {
            $pair = self::getObjectFromDB("SELECT position, stronger FROM CURRENCY_PAIRS WHERE (curr1 = \"$base\" AND curr2 = \"$curr\") OR (curr1 = \"$curr\" AND curr2 = \"$base\")");
            $pos = $pair['position'];
            // stronger is equal to xchg * weaker
            $xchg = $this->exchange[$pos];
            if ($pair['stronger'] == $curr) {
                // converting weaker to the stronger currency
                $conv = floor($base_amt/$xchg);
            } else {
                // converting stronger to the weaker currency
                $conv = floor($base_amt * $xchg);
            }

        }
        return $conv;
    }

    /**
     * Checks whether this player can purchase a Certificate of this currency.
     * Throws a user exception if not, otherwise returns an array of the available Certificates of this currency.
     */
     function checkAvailableCerts($player_id, $curr) {
        $mybucks = $this->getMonies($player_id, $curr);
        if ($mybucks < 2) {
            throw new BgaUserException(self::_("You do not have enough ${curr} to buy a Certificate"));
        }
        $mycerts = $this->getCertificates($player_id, $curr);
        if (count($mycerts) >= 4) {
            throw new BgaUserException(self::_("You may not hold more than 4 ${curr} Certificates"));
        }
        $availablecerts = $this->getAvailableCertificates($curr);
        if (count($availablecerts) == 0) {
            throw new BgaUserException(self::_("No ${curr} Certificates available for purchase"));
        }
        return $availablecerts;
    }

    /**
     * Determine how many certs are held in hands.
     * Given an indexed array of currencies,
     * returns an array of the currency(s) with the MOST Certs in player hands.
     */
    function countHeldCertificates($currencies) {
        $players = self::loadPlayersBasicInfos();
        $curr_ct = array();
        foreach(array_keys($currencies) as $curr) {
            $curr_ct[$curr] = 0;
            foreach($players as $player_id => $player) {
                $certs = $this->getCertificates($player_id, $curr);
                $curr_ct[$curr] += count($certs);
            }
        }
        $max = 0;
        $most = array();
        foreach($curr_ct as $curr => $ct) {
            if ($ct > $max) {
                $most = array($curr);
                $max = $ct;
            } elseif ($ct == $max) {
                $most[] = $curr;
            }
        }
        return $most;
    }

    /**
     * Any Currencies in the 10 position do not pay.
     */
    function nonPayingCertificates() {
        $nopay = self::getObjectListFromDB( "SELECT curr1 curr FROM CURRENCY_PAIRS WHERE curr1 != stronger AND position = 10", true );
        $curr2 = self::getObjectListFromDB( "SELECT curr2 curr FROM CURRENCY_PAIRS WHERE curr2 != stronger AND position = 10", true );

        foreach($curr2 as $curr) {
            if (!in_array($curr, $nopay)) {
                $nopay[] = $curr;
            }
        }
        return $nopay;
    }

    /**
     * Resolve the next Dividend on stack.
     * Return true if the player must choose the Currency to strengthen, else false.
     */
    function resolveDividends() {
        $div_ct = self::getGameStateValue(DIVIDEND_COUNT);
        $mult = $this->dividends[$div_ct];
        if ($mult == 0) {
            self::notifyAllPlayers("noDividendsPaid", clienttranslate("No dividends paid"), array());
        } else {
            $nonpaying = $this->nonPayingCertificates();

            $players = self::loadPlayersBasicInfos();

            foreach($players as $player_id => $player) {
                foreach ($this->currencies as $c => $curr) {
                    if (in_array($curr, $nonpaying)) {
                    } else {
                        $certs = count($this->getCertificates($player_id, $curr));
                        if ($certs > 0) {
                            $monies = $certs * $mult;
                            $paid_str = $this->create_X_monies_arg($monies, $curr, NOTE);
                            $cert_str = $this->create_X_monies_arg($certs, $curr, CERTIFICATE);
                            self::notifyAllPlayers("dividendsPaid", clienttranslate('${player_name} receives dividends of ${x_monies1} for ${x_monies2}').'${x_monies}', array(
                                'player_name' => $player['player_name'],
                                'x_monies1' => $paid_str,
                                'x_monies2' => $cert_str,
                                'x_monies' => 2
                            ));
                            $this->adjustMonies($player_id, $curr, $monies);
                        }
                    }
                }
            }
        }
        // the currency held by most players is strengthened
        $mostHeld = $this->countHeldCertificates($this->currency_enum);
        $chooseCurrency = false;
        // could be 0 or >1
        if (count($mostHeld) != 1) {
            $chooseCurrency = true;
        } else {
            $this->strengthen($mostHeld[0]);
        }
        self::incGameStateValue(DIVIDEND_COUNT, -1);
        // push Dividends to back of queue
        self::DBQuery("UPDATE CONTRACTS SET location = 0 WHERE contract = \"".DIVIDENDS."\"");
        $this->pushContractQueue();
        self::notifyAllPlayers("dividendsStackPopped", clienttranslate('${dividends} Dividend Certificates left'), array(
            'dividends' => self::getGameStateValue(DIVIDEND_COUNT),
        ));
        return $chooseCurrency;
    }

    /**
     * Resolve a Contract.
     * Returns state: "nextPlayer" or "endGame" if owner goes bankrupt.
     */
    function resolveContract($conL) {
        $contract = self::getNonEmptyObjectFromDB("SELECT * from CONTRACTS WHERE contract = \"$conL\"");
        $player_id = $contract['owner'];
        $promise = $contract['promise'];
        $promise_amt = $contract['promise_amt'];

        $nextState = "nextPlayer";
        if ($promise == LOAN) {
            $nextState = $this->resolveLoan($contract);
        } else if ($promise_amt > $this->getMonies($player_id, $promise)) {
            $this->createLoan($contract);
        } else {
            // pay the contract, get the payout
            $payout = $contract['payout'];
            $payout_amt = $contract['payout_amt'];
            $location = $contract['location'];
            // can the owner pay it?
            $cash = $this->getMonies($player_id, $promise);
            $players = self::loadPlayersBasicInfos();
            $player_name = $players[$player_id]['player_name'];

            self::notifyAllPlayers("contractPaid", clienttranslate('${player_name} resolves Contract ${contract}').'${conL}', array(
                'player_id' => $player_id,
                'player_name' => $player_name,
                'contract' => $conL,
                'promise' => $promise,
                'promise_amt' => $promise_amt,
                'payout' => $payout,
                'payout_amt' => $payout_amt,
                'location' => $location,
                'conL' => $conL,
            ));
            $this->adjustMonies($player_id, $promise, -$promise_amt);
            $this->adjustMonies($player_id, $payout, $payout_amt);
            // clear the contract
            $this->clearContract($conL);
        }
        return $nextState;
    }

    /**
     * Consult the LOANS table because this contract might represent more than one loan.
     * Return associative array of curr => amount
     */
    function getLoansOnContract($player_id, $contract) {
        $loan = self::getNonEmptyObjectFromDB("SELECT * FROM LOANS WHERE owner = $player_id AND contract = \"$contract\"");
        $promises = array();
        for ($p = 1; $p <= 6; $p++) {
            $prom = "p$p";
            if ($loan[$prom] != null) {
                $promises[$loan[$prom]] = $loan[$prom."_amt"];
            }
        }
        return $promises;
    }

    /**
     * Get the first p slot in a loan that is not filled
     */
    function getFirstLoanSlot($loan) {
        for($p = 1; $p <= 6; $p++) {
            $prom = "p".$p;
            if ($loan[$prom] == null) {
                return $p;
            }
        }
        return null;
    }

    /**
     * The player cannot pay for this contract, so convert it to a loan
     */
    function createLoan($contract) {
        $player_id = $contract['owner'];
        $promise = $contract['promise'];
        $promise_amt = $contract['promise_amt'];
        $payout = $contract['payout'];
        $payout_amt = $contract['payout_amt'];
        $conL = $contract['contract'];
        $players = self::loadPlayersBasicInfos();
        $player_name = $players[$player_id]['player_name'];
        $location = $contract['location'];

        // does this player already have a loan?
        $oldloan = self::getObjectFromDB("SELECT * FROM LOANS WHERE owner = $player_id");
        $promise_amt++;
        $x_loan = $this->create_X_monies_arg($promise_amt, $promise, NOTE);
        if ($oldloan == null) {
            // turn this contract into a loan, enter it into LOANS table
            self::notifyAllPlayers("loanCreated", clienttranslate('${player_name} cannot pay Contract ${contract} - it is converted to a loan for ${x_monies1}').'${conL}${x_monies}', array(
                'player_id' => $player_id,
                'player_name' => $player_name,
                'contract' => $conL,
                'loan_curr' => $promise,
                'loan_amt' => $promise_amt,
                'payout' => $payout,
                'payout_amt' => $payout_amt,
                'location' => $location,
                'conL' => $conL,
                'x_monies1' => $x_loan,
                'x_monies' => 1,
            ));
            $this->adjustMonies($player_id, $payout, $payout_amt);
            // enter it in the LOANS table
            self::DbQuery("INSERT INTO LOANS (owner, contract, p1, p1_amt ) VALUES ($player_id, \"$conL\", \"$promise\", $promise_amt)");
            // mark the contract a LOAN
            self::DbQuery("UPDATE CONTRACTS SET promise = \"".LOAN."\", promise_amt = NULL, payout = NULL, payout_amt = NULL, location = 0 WHERE contract = \"$conL\"");
            $this->pushContractQueue();
        } else {
            // add this contract's loan to previous loan
            $loan_contract = $oldloan['contract'];
            self::notifyAllPlayers("loanMerged", clienttranslate('${player_name} cannot pay Contract ${contract} - it is added as loan for ${x_monies1} to ${loan}').'${conL}${x_monies}', array(
                'player_id' => $player_id,
                'player_name' => $player_name,
                'contract' => $conL,
                'loan' => $loan_contract,
                'loan_curr' => $promise,
                'loan_amt' => $promise_amt,
                'payout' => $payout,
                'payout_amt' => $payout_amt,
                'location' => $location,
                'conL' => $conL,
                'x_monies1' => $x_loan,
                'x_monies' => 1,
            ));
            $this->adjustMonies($player_id, $payout, $payout_amt);
            // add to first available slot in old loan
            $p = $this->getFirstLoanSlot($oldloan);
            if ($p == null) {
                // should not happen!
                throw new BgaVisibleSystemException("Contract $loan_contract has no unfilled Loan slots!");
            }
            $ploan = "p".$p;
            $p_amt = $ploan."_amt";
            self::DbQuery("UPDATE LOANS SET $ploan = \"$promise\", $p_amt = $promise_amt WHERE contract = \"$loan_contract\"");
            // clear current contract
            $this->clearContract($conL);
        }
    }

    /**
     * This is a Contract marked as a loan.
     * It must be paid.
     * Returns state "nextPlayer" unless player goes bankrupt, in which case "endGame"
     */
    function resolveLoan($contract) {
        $player_id = $contract['owner'];
        $conL = $contract['contract'];
        $players = self::loadPlayersBasicInfos();
        $player_name = $players[$player_id]['player_name'];
        $loans = $this->getLoansOnContract($player_id, $conL);
        $nextState = "nextPlayer";
        // can the player pay them all off?
        foreach ($loans as $curr => $amt) {
            if ($amt > $this->getMonies($player_id, $curr)) {
                // BANKRUPT!
                self::setGameStateValue(BANKRUPT_PLAYER, $player_id);
                break;
            }
        }
        if (self::getGameStateValue(BANKRUPT_PLAYER) == 0) {
            // we're good, so resolve it
            self::notifyAllPlayers("loanResolved", clienttranslate('${player_name} resolves loan ${contract}').'${conL}', array(
                'player_id' => $player_id,
                'player_name' => $player_name,
                'contract' => $conL,
                'conL' => $conL,
                'location' => $contract['location'], // note we are sending the original location in queue
                'loans' => $loans
            ));
            foreach ($loans as $curr => $amt) {
                $this->adjustMonies($player_id, $curr, -$amt);
            }
            // clear the contract
            $this->clearContract($conL);
        } else {
            self::notifyAllPlayers("bankruptcy", clienttranslate('BANKRUPTCY! ${player_name} cannot pay loan on Contract ${contract}').'${conL}', array(
                'player_id' => $player_id,
                'player_name' => $player_name,
                'contract' => $conL,
                'conL' => $conL
            ));
            $nextState = "endGame";
        }
        return $nextState;
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    //////////// 

    /*
        Each time a player is doing some game action, one of the methods below is called.
        (note: each method below must match an input method in forex.action.php)
    */

    /**
     * When player submits a Spot Trade. Checks whether both parties have required bucks,
     * then sends offer.
     */
    function offerSpotTrade($to_player, $offer, $request) {
        self::checkAction( 'offerSpotTrade' );
        if (self::getGameStateValue(SPOT_DONE) != 0) {
            throw new BgaVisibleSystemException("Spot Trade already performed; should not allow action again");
        }

        $player_id = self::getActivePlayerId();

        $players = self::loadPlayersBasicInfos();
        $theirname = $players[$to_player]['player_name'];
        $spot = $this->getSpotValues($offer, $request);
        $off_amt = $spot[0];
        $req_amt = $spot[1];
        $mybucks = $this->getMonies($player_id, $offer);
        if ($off_amt > $mybucks) {
            throw new BgaUserException(self::_("You do not have ${off_amt} ${offer}"));
        }
        $theirbucks = $this->getMonies($to_player, $request);
        if ($req_amt > $theirbucks) {
            throw new BgaUserException(self::_("${theirname} does not have ${req_amt} ${request}"));
        }

        $x_offer = $this->create_X_monies_arg($off_amt, $offer, NOTE);
        $x_request = $this->create_X_monies_arg($req_amt, $request, NOTE);

        self::notifyAllPlayers('spotTradeOffered', clienttranslate('${player_name} offered a Spot Trade to ${to_player_name} of ${x_monies1} for ${x_monies2}').'${x_monies}', array(
            'i18n' => array ('off_curr', 'req_curr'),
            SPOT_FROM => $player_id,
            'player_name' => self::getActivePlayerName(),
            SPOT_TO => $to_player,
            'to_player_name' => $theirname,
            SPOT_OFFER => $offer,
            'off_amt' => $off_amt,
            SPOT_REQUEST => $request,
            'req_amt' => $req_amt,
            'x_monies1' => $x_offer,
            'x_monies2' => $x_request,
            'x_monies' => 2
            ));
        $this->setSpotTradeValues($player_id, $to_player, $offer, $request);

        // go to manager to get response
        $this->gamestate->nextState("spotOffer");
    }

    /**
     * Player responded to a Spot Trade offer
     */
    function respondSpotTrade($accept) {
        self::checkAction( 'respondSpotTrade' ); 

        if ($accept) {
            $this->spotTrade();
        } else {
            $spot_trade = $this->getSpotTrade();
            $to_player = $spot_trade[SPOT_TO];
            $players = self::loadPlayersBasicInfos();

            // rejected
            self::notifyAllPlayers('spotTradeRejected', clienttranslate('${player_name} rejected trade'), array(
                'i18n' => array ('player_name'),
                SPOT_TO => $to_player,
                'player_name' => $players[$to_player]['player_name'],
            ));
        }

        // return action to the player who made the offer
        $this->gamestate->nextState();
    }

    /**
     * Spot Trade player cancels his offer before acceptance/rejection
     */
    function cancelSpotTrade() {
        self::checkAction( 'cancelSpotTrade' ); 
        self::notifyAllPlayers('spotTradeCanceled', clienttranslate('${player_name} canceled trade offer'), array(
            'i18n' => array ('player_name'),
            'player_name' => self::getActivePlayerName(),
        ));
        // return action to the player who made the offer
        $this->gamestate->nextState();
    }

    /**
     * Buy 1 or 2 certificates.
     * Received from client as a space-separated string
     */
    function investCurrency($curr_to_buy) {
        self::checkAction( 'investCurrency' );
        $currencies = explode(" ", $curr_to_buy);

        $player_id = self::getActivePlayerId();
        // first check valid purchases
        $availablecerts = array();
        foreach($currencies as $curr) {
            $availablecerts[$curr] = $this->checkAvailableCerts($player_id, $curr);
        }

        // now do each purchase
        foreach($currencies as $curr) {
            // take the first cert
            $cert = array_pop($availablecerts[$curr]);
            $this->certificates->moveCard($cert['id'], $player_id);
            $this->adjustMonies($player_id, $curr, -2);

            $x_certs = $this->create_X_monies_arg(1, $curr, CERTIFICATE);

            // movedeck for certificates
            self::notifyAllPlayers('certificatesBought', clienttranslate('${player_name} buys ${x_monies1} Certificate').'${x_monies}', array (
                'i18n' => array ('curr'),
                'player_id' => self::getActivePlayerId(),
                'player_name' => self::getActivePlayerName(),
                'curr' => $curr,
                'cert_id' => $cert['id'],
                'x_monies1' => $x_certs,
                'x_monies' => 1
            ));

            $this->strengthen($curr);
        }

        $this->gamestate->nextState("nextPlayer");
    }

    /**
     * Sell one or more certificates
     */
    function divestCurrency($curr, $amt) {
        $player_id = self::getActivePlayerId();

        $this->divestAction($player_id, $curr, $amt);

        self::setGameStateValue(DIVEST_PLAYER, $player_id);
        self::setGameStateValue(DIVEST_CURRENCY, $this->currency_enum[$curr]);
        $this->gamestate->nextState("divest");
    }

    /**
     * When additional players have option to sell.
     */
    function optDivestCurrency($curr, $amt) {
        $player_id = self::getActivePlayerId();
        if ($amt == 0) {
            // player declined to sell
            self::notifyAllPlayers('certificatesSold', clienttranslate('${player_name} declined to sell ${currency}'), array(
                'i18n' => array ('currency'),
                'player_id' => $player_id,
                'player_name' => self::getActivePlayerName(),
                'curr' => $curr,
                'currency' => $curr
            ));
        } else {
            $this->divestAction($player_id, $curr, $amt);
        }
        $this->gamestate->nextState("divest");
    }

    /**
     * Actual divestment action, by either initial or subsequent players.
     */
    function divestAction($player_id, $curr, $amt) {
        $divested_certs = $this->sellCertificates($player_id, $curr, $amt);
        $cash = $amt*2;
        $this->adjustMonies($player_id, $curr, $cash);

        $x_certs = $this->create_X_monies_arg($amt, $curr, CERTIFICATE);
        $x_notes = $this->create_X_monies_arg($cash, $curr, NOTE);

        self::notifyAllPlayers('certificatesSold', clienttranslate('${player_name} sold ${x_monies1} for ${x_monies2}').'${x_monies}', array(
            'i18n' => array (),
            'player_id' => $player_id,
            'player_name' => self::getActivePlayerName(),
            'curr' => $curr,
            'certs' => $divested_certs,
            'x_monies1' => $x_certs,
            'x_monies2' => $x_notes,
            'x_monies' => 2,
        ));
        $this->weaken($curr, $amt);
    }

    /**
     * Create a contract.
     */
    function makeContract($prom_curr, $prom_amt, $pay_curr, $pay_amt) {
        $player_id = self::getActivePlayerId();
        $contract = self::getUniqueValueFromDB("SELECT contract FROM CONTRACTS WHERE owner IS NULL AND contract != \"".DIVIDENDS."\" ORDER BY contract ASC LIMIT 1");
        if ($contract == NULL) {
            throw new BgaUserException(self::_("There are no Contracts available"));
        }
        if (min($prom_amt, $pay_amt) > 10) {
            throw new BgaUserException(self::_("You may not make a Contract for more than 10 units of the stronger Currency"));
        }
        self::DBQuery("UPDATE CONTRACTS SET promise = \"$prom_curr\", promise_amt = $prom_amt, payout = \"$pay_curr\", payout_amt = $pay_amt, owner = $player_id, location = 0 WHERE contract = \"$contract\"");
        // now push everything forward in queue
        $this->pushContractQueue();

        $position = self::getUniqueValueFromDB("SELECT location from CONTRACTS where contract = \"$contract\"");
        $x_promise = $this->create_X_monies_arg($prom_amt, $prom_curr, NOTE);
        $x_payout = $this->create_X_monies_arg($pay_amt, $pay_curr, NOTE);
        // conL is hack to send separate message to notify than Contract, which gets interpolated
        self::notifyAllPlayers("contractTaken", clienttranslate('${player_name} takes Contract ${contract} to pay ${x_monies1} for ${x_monies2}').'${conL}${x_monies}', array(
            'i18n' => array ('contract'),
            'player_id' => $player_id,
            'player_name' => self::getActivePlayerName(),
            'promise' => $prom_curr,
            'promise_amt' => $prom_amt,
            'payout' => $pay_curr,
            'payout_amt' => $pay_amt,
            'contract' => $contract,
            'location' => $position,
            'conL' => $contract,
            'x_monies1' => $x_promise,
            'x_monies2' => $x_payout,
            'x_monies' => 2,
        ));
        $this->gamestate->nextState("nextPlayer");
    }

    /**
     * Get the next Contract or Dividends and resolve it.
     * Advances state.
     */
    function resolve() {
        $player_id = self::getActivePlayerId();
        $contract = self::getUniqueValueFromDB("SELECT contract FROM CONTRACTS WHERE location IS NOT NULL ORDER BY location DESC LIMIT 1");
        $this->notifyAllPlayers("resolvedContractQueue", clienttranslate('${player_name} resolves Contract Queue: ${contract}').'${conL}', array(
            'i18n' => array ('contract'),
            'player_id' => $player_id,
            'player_name' => self::getActivePlayerName(),
            'contract' => $contract,
            'conL' => $contract,
        ));

        $nextState;
        if ($contract == DIVIDENDS) {
            $chooseCurrency = $this->resolveDividends();
            if ($chooseCurrency) {
                $nextState = "chooseCurrency";
            } else {
                $nextState = (self::getGameStateValue(DIVIDEND_COUNT) == 0) ? "endGame" : "nextPlayer";
            }
        } else {
            $nextState = $this->resolveContract($contract);
        }
        $this->gamestate->nextState($nextState);
    }

    /**
     * Strengthen the currency the player chose.
     */
    function chooseCurrencyToStrengthen($curr) {
        $this->notifyAllPlayers("currencyChosen", clienttranslate('${player_name} strengthens ${currency}'), array(
            'i18n' => array ('currency'),
            'player_name' => self::getActivePlayerName(),
            'currency' => $curr,
        ));
        $this->strengthen($curr);
        $nextState = (self::getGameStateValue(DIVIDEND_COUNT) == 0) ? "endGame" : "nextPlayer";
        $this->gamestate->nextState($nextState);
    }

    /**
     * The currency the player chose will be the one used for scoring.
     */
    function chooseStrongestCurrency($curr) {
        $this->notifyAllPlayers("currencyChosen", clienttranslate('${player_name} chooses ${currency} for final scoring'), array(
            'i18n' => array ('currency'),
            'player_name' => self::getActivePlayerName(),
            'currency' => $curr,
        ));
        self::setGameStateValue(SCORING_CURRENCY, $this->currency_enum($curr));
        $this->gamestate->nextState("scoring");
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Game state arguments
////////////

    /**
     * Arguments sent for a Spot Trade Offer
     */
    function argsSpotOffer() {
        $from_player = self::getGameStateValue(SPOT_FROM);
        $to_player = self::getGameStateValue(SPOT_TO);
        $offer = self::getGameStateValue(SPOT_OFFER);
        $offer_curr = $this->currencies[$offer];
        $request = self::getGameStateValue(SPOT_REQUEST);
        $request_curr = $this->currencies[$request];
        $xchg = $this->getSpotValues($offer_curr, $request_curr);

        $players = self::loadPlayersBasicInfos();

        $x_offer = $this->create_X_monies_arg($xchg[0], $offer_curr, NOTE);
        $x_request = $this->create_X_monies_arg($xchg[1], $request_curr, NOTE);

        return array(
            "i18n" => array('offer_curr', 'request_curr'),
            SPOT_FROM => $from_player,
            SPOT_TO => $to_player,
            'from_player_name' => $players[$from_player]['player_name'],
            'to_player_name' => $players[$to_player]['player_name'],
            'x_monies1' => $x_offer,
            'x_monies2' => $x_request,
            // this substitutes both of the above with some format_string_recursive trickery
            'x_monies' => 2,
        );
    }

    /**
     * Arguments for optional divest.
     */
    function argsSellCertificates() {
        $curr = self::getGameStateValue(DIVEST_CURRENCY);
        $currency = $this->currencies[$curr];
        return array(
            "i18n" => array('currency'),
            "curr" => $curr,
            "currency" => $currency
        );
    }

    /**
     * Arguments for player to choose the final currency for scoring.
     */
    function argsChooseCurrency() {
        $candidates = $this->getStrongestCurrency();
        return array(
            "currencies" => $candidates
        );
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////

    /*
        Here, you can create methods defined as "game state actions" (see "action" property in states.inc.php).
        The action method of state X is called everytime the current game state is set to X.
    */

    /**
     * This is the handler to send an offer to the recipient
     */
    function stSpotOffer() {
        $from_player = self::getGameStateValue(SPOT_FROM);
        $to_player = self::getGameStateValue(SPOT_TO);
        $this->gamestate->setPlayersMultiactive( array($from_player, $to_player), "getResponse", true );
        $this->gamestate->nextState("getResponse");
    }

    /**
     * The player offered a trade has accepted it and the monies transferred, or rejected it.
     * Or the offerer canceled it.
     * Hand play back to original player.
     */
    function stSpotResponse() {
        $next_player = self::getGameStateValue(SPOT_FROM);
        // clear info
        $this->gamestate->changeActivePlayer( $next_player );
        $this->gamestate->nextState();
    }

    /**
     * Check each player after someone sells certs, and let them sell or pass.
     */
     function stDivest() {
        $player_id = self::activeNextPlayer();
        $nextState = "";
        if ($player_id == self::getGameStateValue(DIVEST_PLAYER)) {
            // we're back to the original divester, so go to next player's turn
            $nextState = "lastDivest";
        } else {
            // does this player have any of the divested currency?
            $curr = $this->currencies[self::getGameStateValue(DIVEST_CURRENCY)];
            $certs = $this->getCertificates($player_id, $curr);
            if (count($certs) > 0) {
                self::giveExtraTime( $player_id );
                $nextState = "nextDivest";
            } else {
                // move on to next potential divester
                $nextState = "divest";
            }
        }

        $this->gamestate->nextState($nextState);
    }

    /**
     * End of player turn.
     */
    function stNextPlayer() {
        $this->clearForNextPlayer();

        $player_id = self::activeNextPlayer();
        self::giveExtraTime( $player_id );

        $this->gamestate->nextState();        
    }

    /**
     * Endgame.
     */
    function stLastResolve() {
        // is this a bankruptcy or last dividend was paid?
        if (self::getGameStateValue(BANKRUPT_PLAYER) == 0) {
            // last dividend - resolve remaining contracts
            $contract_queue = self::getObjectListFromDB("SELECT contract FROM CONTRACTS WHERE (location IS NOT NULL AND contract != \"".DIVIDENDS."\") ORDER BY location DESC", true);
            foreach ($contract_queue as $conL) {
                $this->resolveContract($conL);
                if (self::getGameStateValue(BANKRUPT_PLAYER) != 0) {
                    // someone went bankrupt - no further contracts are resolved
                    break;
                }
            }
        }
        $nextState = "scoring";
        // now choose currency
        $strongest = $this->getStrongestCurrency();
        if (count($strongest) > 1) {
            $nextState = "chooseStrongest";
        } else {
            self::setGameStateValue(SCORING_CURRENCY, $this->currency_enum[$strongest[0]]);
        }
        $this->gamestate->nextState($nextState);
    }

    /**
     * Convert everyone's currency to the scoring currency, count it up.
     */
    function stScoring() {
        $players = self::loadPlayersBasicInfos();
        $c = self::getGameStateValue(SCORING_CURRENCY);
        $currency = $this->currencies[$c];
        foreach ($players as $player_id => $player) {
            $score = 0;
            if ($player_id != self::getGameStateValue(BANKRUPT_PLAYER)) {
                $monies = $this->getMonies($player_id, $currency);
                foreach ($this->currencies as $c => $base) {
                    if ($base != $currency) {
                        $base_amt = $this->getMonies($player_id, $base);
                        if ($base_amt > 0) {
                            $conv_amt = $this->convertCurrency($base, $base_amt, $currency);
                            $x_base = $this->create_X_monies_arg($base_amt, $base, NOTE);
                            $x_score = $this->create_X_monies_arg($conv_amt, $currency, NOTE);
                            $this->notifyAllPlayers("currencyScored", clienttranslate('${player_name} has ${x_monies1} worth ${x_monies2}').'${x_monies}', array(
                                'i18n' => array ('currency'),
                                'player_id' => $player_id,
                                'player_name' => self::getActivePlayerName(),
                                'score_curr' => $currency,
                                'score_amt' => $conv_amt,
                                'base_curr' => $base,
                                'base_amt' => $base_amt,
                                'x_monies1' => $x_base,
                                'x_monies2' => $x_score,
                                'x_monies' => 2,
                            ));
                            $monies += $conv_amt;
                            $this->adjustMonies($player_id, $base, -$base_amt);
                            $this->adjustMonies($player_id, $currency, $conv_amt);
                        }
                    }
                }
                $score = $monies;
            }
            self::DbQuery( "UPDATE player SET player_score=$score WHERE player_id=$player_id" );
        }

        $this->gamestate->nextState("");
    }

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

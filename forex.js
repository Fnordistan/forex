/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * ForEx implementation : © <David Edelstein> <david.edelstein@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * forex.js
 *
 * ForEx user interface script
 * 
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

const CURRENCY = {
    "GBP" : 1,
    "EUR" : 2,
    "USD" : 3,
    "CHF" : 4,
    "JPY" : 5,
    "CAD" : 6,
    "CNY" : 7
}

// 0-indexed array of currencies
const CURRENCIES = ["GBP", "EUR", "USD", "CHF", "JPY", "CAD", "CNY"];

const COLORS = {
    "GBP" : '#EC1C26',
    "EUR" : '#5156A5',
    "USD" : '#2BB673',
    "CHF" : '#A04978',
    "JPY" : '#A38C7E',
    "CAD" : '#603A17',
    "CNY" : '#AD7C2C'
}

const CONTRACT = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
    F: 5
}

// 0-indexed array
const EXCHANGE_RATE = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8];

// map actions to function names
const ACTIONS = {
    SPOT: 'spotTrade',
    INVEST: 'investCurrency',
    DIVEST: 'divestCurrency',
    CONTRACT: 'makeContract',
    RESOLVE: 'resolveContract',
    CONFIRM: 'confirmAction',
    CANCEL: 'cancelAction',
    ACCEPT: 'acceptTrade',
    REJECT: 'rejectTrade',
}
const BTN = '_btn';

const CERT_SPRITES = 'img/forex_certificates.jpg'
// these to match css
const CURR_BASE_W = 150;
const CURR_BASE_H = 97.66;
const DIVIDEND_BASE_H = 150;
const DIVIDEND_BASE_W = 97.8;

// strings that get inserted into format_string_recursive
const X_SPOT_TRADE = "x_spot_trade"; // flags inserting player-to-trade buttons
const X_CURRENCY = "x_currency_buttons"; // flags adding currency buttons
const X_ACTION_TEXT = "x_action_text"; // span that contains summary of action
// matching args from forex.game.php
const X_SPOT_TO = "spot_trade_to";
const X_SPOT_FROM = "spot_trade_from";
const X_MONIES = "arg_monies_string";

/**
 * Struct for a Currency Pair (stronger, weaker, and weaker = EXCHANGE* stronger)
 */
const PAIR = {
    STRONGER: "stronger",
    WEAKER: "weaker",
    EXCHANGE: "currency_xch_rate"
}

// constants used for SpotTrade construct
const SPOT = {
    OFFER: "spot_offer",
    REQUEST: "spot_request",
    OFF_AMT: "spot_offer_amt",
    REQ_AMT: "spot_request_amt",
    FROM: "spot_trade_from",
    TO: "spot_trade_to",
    PAIR: "spot_pair",
}

// label for an already executed Spot trade
const SPOT_TRANSACTION = "spot_transaction";
const SPOT_DONE = "spot_trade_done";

const CURRENCY_TYPE = {
    NOTE: "note",
    CERTIFICATE: "cert"
}

define([
    "dojo","dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter",
    "ebg/stock",
    "ebg/zone",
    g_gamethemeurl + "modules/fcounter.js"
],
function (dojo, declare) {
    return declare("bgagame.forex", [
        ebg.core.gamegui,
        forex.fcounter
    ], {
        constructor: function(){
            console.log('forex constructor');
            // matches css
            var scale = 0.5;
            this.cardwidth = CURR_BASE_W*scale;
            this.cardheight = CURR_BASE_H*scale;
            this.dvdwidth = DIVIDEND_BASE_W*scale;
            this.dvdheight = DIVIDEND_BASE_H*scale;
            this.curr_tok_dim = 25;
        },
        
        /*
            setup:
            
            This method must set up the game user interface according to current game situation specified
            in parameters.
            
            The method is called each time the game interface is displayed to a player, ie:
            _ when the game starts
            _ when a player refreshes the game page (F5)
            
            "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
        */
        setup: function( gamedatas )
        {
            dojo.destroy('debug_output');
            console.log( "Starting game setup" );
            
            this.certCounters = [];
            this.noteCounters = [];

            // Setting up player boards
            for( var player_id in gamedatas.players )
            {
                var player = gamedatas.players[player_id];
                this.certCounters[player_id] = [];         
                this.noteCounters[player_id] = [];
                // Setting up player board
                var player_board_div = $('player_board_'+player_id);
                Object.keys(CURRENCY).forEach(curr => {
                    var container = dojo.place( this.format_block('jstpl_mon_container', {
                        "curr": curr,
                        "id": player_id
                    }), player_board_div);
                    dojo.place( this.format_block('jspl_curr_tag', {
                        "curr": curr
                    }), container);
                    dojo.place( this.format_block('jstpl_mon_counter', {
                        "curr": curr,
                        "type": 'note',
                        "id": player_id
                    }), container);
                    dojo.place( this.format_block('jstpl_mon_counter', {
                        "curr": curr,
                        "type": 'cert',
                        "id": player_id
                    }), container);

                    // create player Note counters
                    var note_counter = new forex.fcounter();
                    note_counter.create(curr+'_note_counter_'+player_id);
                    // initialize to 0
                    note_counter.setValue(0);
                    this.noteCounters[player_id].push(note_counter);

                    // create player Cert counters
                    var cert_counter = new ebg.counter();
                    cert_counter.create(curr+'_cert_counter_'+player_id);
                    // initialize to 0
                    cert_counter.setValue(0);
                    this.certCounters[player_id].push(cert_counter);
                });
            }

            this.currencyPairZones = [];
            this.availableCertificates = [];
            this.availableCertCounters = [];
            this.promiseStacks = [];
            this.payoutStacks = [];
            this.promiseCounters = [];
            this.payoutCounters = [];

            this.addMonies();
            this.createCurrencyPairTokens();
            this.placeCurrencyPairs();
            this.createAvailableCertificates();
            this.placeCertificates();
            this.createContractDisplay();
            this.createContractQueue();

            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();
            // may be null
            if (this.gamedatas[SPOT_TRANSACTION]) {
                this.SPOT_TRANSACTION = this.createSpotTransactionFromDatas();
           } else {
                this.SPOT_TRANSACTION = null;
            }
            this.SPOT_DONE = this.gamedatas[SPOT_DONE];

            console.log( "Ending game setup" );
        },

        /* @Override */
        format_string_recursive : function(log, args) {
            try {
                if (log && args && !args.processed) {
                    args.processed = true;

                    // for Spot Trade offer
                    if (args[X_SPOT_FROM]) {
                        // am I the from player?
                        var from_player = (this.player_id == args[X_SPOT_FROM]) ? this.spanYou() : this.spanPlayerName(args[X_SPOT_FROM]);
                        args.from_player_name = from_player;
                    }
                    if (args[X_SPOT_TO]) {
                        var to_player = (this.player_id == args[X_SPOT_TO]) ? this.spanYou() : this.spanPlayerName(args[X_SPOT_TO]);
                        args.to_player_name = to_player;
                    }
                    if (args.you) {
                        log = log.replace("You", args.you);
                    }
                    if (args.X_SPOT_TRADE) {
                        log = log + this.insertTradeButtons(args.X_SPOT_TRADE) + '<br/>';
                    }
                    if (args.X_CURRENCY) {
                        log = log + this.insertCurrencyButtons(args.X_CURRENCY)+'<br/>';
                    }
                    if (args.X_ACTION_TEXT) {
                        log = log + '<br/><span id="'+args.X_ACTION_TEXT+'"></span><br/>';
                    }
                    if (args[X_MONIES]) {
                        for (const argm in args[X_MONIES]) {
                            var mon_str = args[X_MONIES][argm];
                            var monies = mon_str.split('_');
                            var num = parseFloat(monies[0]);
                            var curr = monies[1];
                            var type = monies[2];
                            var monies_span = this.format_block('jstpl_monies', {
                                "num": num,
                                "type": type,
                                "curr": curr,
                            });
                            args[argm] = monies_span;
                        }
                    }
                }
            } catch (e) {
                console.error(log, args, "Exception thrown", e.stack);
            }
            return this.inherited(arguments);
        },

        /**
         * Tick all the currency counters
         */
        addMonies: function() {
            for (const n in this.gamedatas.notes) {
                var note = this.gamedatas.notes[n];
                this.noteCounters[note['player']][CURRENCY[note['curr']]-1].incValue(note['amt']);
            }
        },

        /**
         * Create the zones to hold currency pairs.
         */
        createCurrencyPairTokens: function() {
            Object.keys(CURRENCY).forEach(curr => {
                var pairs = [];
                for (let i = 1; i <= 10; i++) {
                    var currZone = new ebg.zone();
                    var zid = curr+'_'+i;
                    currZone.create(this, zid, this.curr_tok_dim, this.curr_tok_dim);
                    currZone.setPattern('verticalfit');
                    pairs.push(currZone);
                }
                this.currencyPairZones.push(pairs);
            });
        },

        /**
         * First create the Stock piles holding available Certificates.
         */
        createAvailableCertificates: function() {
            Object.keys(CURRENCY).forEach( curr => {
                var avail = new ebg.stock();
                avail.create( this, $('avail_certs_'+curr), this.cardwidth, this.cardheight );
                avail.image_items_per_row = 1;
                avail.extraClasses='frx_card_shadow';
                avail.setSelectionMode(0);
                avail.setOverlap(10, 0);
                avail.onItemCreate = dojo.hitch(this, this.setupCertificate);
                avail.addItemType( curr, 0, g_gamethemeurl+CERT_SPRITES, CURRENCY[curr]-1 );
                avail.autowidth = true;
                this.availableCertificates.push(avail);
                // and create a matching counter
                var counter = new ebg.counter();
                counter.create('avail_certs_'+curr+'_ctr');
                dojo.addClass('avail_certs_'+curr+'_ctr', 'frx_ctr');
                dojo.style('avail_certs_'+curr+'_ctr', {
                    'color': COLORS[curr],
                    'vertical-align': 'top'
                });
                this.availableCertCounters.push(counter);
            });
        },

        /**
         * Set initial locations.
         */
        placeCurrencyPairs: function() {
            var currency_pairs = this.gamedatas.currency_pairs;
            for (const c in currency_pairs) {
                let curr1 = currency_pairs[c]['stronger'];
                let curr2 = currency_pairs[c]['curr1'] == curr1 ? currency_pairs[c]['curr2'] : currency_pairs[c]['curr1'];
                var curr_pr = this.format_block('jstpl_curr_pair', {
                    "curr1": curr1,
                    "curr2": curr2
                });
                var currdiv = dojo.place(curr_pr, 'currency_board');
                this.currencyPairZones[CURRENCY[curr1]-1][currency_pairs[c]['position']-1].placeInZone(currdiv.id);
            }
        },

        /**
         * 
         * @param {Array} certificates 
         */
        placeCertificates: function() {
            var certificates = this.gamedatas.certificates;
            for (const c in certificates) {
                var cert = certificates[c];
                if (cert.loc == 'available') {
                    this.placeAvailableCertificate(cert);
                } else if (cert.loc != 'discard') {
                    this.certCounters[cert.loc][CURRENCY[cert.curr]-1].incValue(1);
                }
            }
        },


        /**
         * Adds a Certificate to its appropriate available pile, incrementing the counter.
         * @param {Object} certificate
         * @param {string} from html id it's coming from
         */
        placeAvailableCertificate: function(certificate, from) {
            this.availableCertificates[CURRENCY[certificate.curr]-1].addToStockWithId(certificate.curr, certificate.id);
            this.availableCertCounters[CURRENCY[certificate.curr]-1].incValue(1);
        },

        createContractDisplay: function() {
            Object.keys(CONTRACT).forEach(C => {
                var prom_id = 'contract_promise_'+C;
                this.promiseStacks[CONTRACT.C] = new ebg.zone();
                this.promiseStacks[CONTRACT.C].create(this, prom_id, this.cardwidth, this.cardheight);
                this.promiseStacks[CONTRACT.C].setPattern('diagonal');

                var pay_id = 'contract_payout_'+C;
                this.payoutStacks[CONTRACT.C] = new ebg.zone();
                this.payoutStacks[CONTRACT.C].create(this, prom_id, this.cardwidth, this.cardheight);
                this.payoutStacks[CONTRACT.C].setPattern('diagonal');

                this.promiseCounters[CONTRACT.C] = new forex.fcounter();
                this.promiseCounters[CONTRACT.C].create('promise_'+C+'_cntr');

                this.payoutCounters[CONTRACT.C] = new forex.fcounter();
                this.payoutCounters[CONTRACT.C].create('payout_'+C+'_cntr');
            });
        },


        /**
         * Creates the Contract Queue, puts all Contracts in it
         */
        createContractQueue: function() {
            for (const c in this.gamedatas.contracts) {
                var contract = this.gamedatas.contracts[c];
                var q = 8-contract.location;
                var q_div = 'queue_'+q;
                if (contract.contract == 'Dividend') {
                    this.createDividendsStack(q_div, q);
                }
            }
        },

        /**
         * Create the Dividends stack as a Zone.
         * @param {string} div_el 
         * @param {int} q
         */
        createDividendsStack: function(div_el, q) {
            this.divstack = new ebg.zone();
            this.divstack.create(this, div_el, this.dvdwidth, this.dvdheight);
            this.divstack.setPattern('verticalfit');
            // put each remaining dividend in stack, last first
            var dividends = parseInt(this.gamedatas.dividends);
            var divdiv;
            for (var i = 0; i < dividends; i++) {
                var div_num = 4-i;
                var dividend = this.format_block('jstpl_dividend', {
                    "div_num" : div_num
                });
                divdiv = dojo.place(dividend, 'contract_queue_container');
                var off_x = -div_num * this.dvdwidth;
                dojo.style(divdiv, "background-position", off_x+"px 0px");
                this.divstack.placeInZone(divdiv.id);
            }
            // we put the counter on top of the last Dividend
            this.dividendCounter = new ebg.counter();
            dojo.place(this.format_block('jstpl_dividend_counter'), divdiv.id);
            this.dividendCounter.create('dividend_counter');
            this.dividendCounter.incValue(dividends);
        },


        /**
         * Adds tooltip to a Certificate
         * @param {string} card_div 
         * @param {string} card_type 
         * @param {string} cert_item 
         */
        setupCertificate: function(card_div, card_type, cert_item) {
            this.addTooltip( card_div.id, _(card_type+' Certificate'), '');
        },

        ///////////////////////////////////////////////////
        //// Game & client states
        
        // onEnteringState: this method is called each time we are entering into a new game state.
        //                  You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState: function( stateName, args ) {
            console.log( 'Entering state: '+stateName );

            // switch( stateName ) {
            
            // case 'playerAction':
            //     break;
            // case 'dummmy':
            //     break;
            // }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function( stateName )
        {
            console.log( 'Leaving state: '+stateName );
            
            switch( stateName ) {
                case 'playerAction':
                    this.removeActionButtons();
                    break;
                case 'invest':
                    this.SPOT_TRANSACTION = null;
                    this.SPOT_DONE = 0;
                    break;
                case 'divest':
                    this.SPOT_TRANSACTION = null;
                    this.SPOT_DONE = 0;
                    break;
                case 'contract':
                    this.SPOT_TRANSACTION = null;
                    this.SPOT_DONE = 0;
                    break;
                case 'resolve':
                    this.SPOT_TRANSACTION = null;
                    this.SPOT_DONE = 0;
                    break;
                case 'dummmy':
                    break;
            }
        }, 

        // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
        //                        action status bar (ie: the HTML links in the status bar).
        //        
        onUpdateActionButtons: function( stateName, args )
        {
            console.log( 'onUpdateActionButtons: '+stateName );
                      
            if( this.isCurrentPlayerActive() )
            {            
                switch( stateName ) {
 
                 case 'playerAction':
                    this.addPlayerActionButtons();
                    break;
                case 'offerResponse':
                    console.log("this player: "+this.player_id);
                    var spot = this.SPOT_TRANSACTION;
                    if (this.player_id == spot[SPOT.TO]) {
                        this.addSpotTradeButtons();
                    } else if (this.player_id == spot[SPOT.FROM]) {
                        this.addCancelSpotTrade();
                    }
                    break;
                }
            }
        },        

        ///////////////////////////////////////////////////
        //// Utility methods

        /**
         * Change the title banner.
         * @param {string} text 
         */
        setMainTitle : function(text) {
            var main = $('pagemaintitletext');
            main.innerHTML = text;
        },

        /**
         * Create span with Player's name in color.
         * @param {*} player 
         */
        spanPlayerName: function(player_id) {
            var player = this.gamedatas.players[player_id];
            var player_name = player.name;
            var color = player.color;
            var color_bg = "";
            if (player.color_back) {
                color_bg = player.color_back;
            }
            var pname = "<span style=\"font-weight:bold;color:#" + color + ";" + color_bg + "\">" + player_name + "</span>";
            return pname;
        },

        /**
         * From BGA Cookbook. Return "You" in this player's color
         */
        spanYou : function() {
            var color = this.gamedatas.players[this.player_id].color;
            var color_bg = "";
            if (this.gamedatas.players[this.player_id] && this.gamedatas.players[this.player_id].color_back) {
                color_bg = "background-color:#" + this.gamedatas.players[this.player_id].color_back + ";";
            }
            var you = "<span style=\"font-weight:bold;color:#" + color + ";" + color_bg + "\">" + __("lang_mainsite", "You") + "</span>";
            return you;
        },

        /**
         * Create row of Currency buttons
         * @param {string} curr_type 
         */
        insertCurrencyButtons: function(curr_type) {
            var note_buttons = "";
            Object.keys(CURRENCY).forEach(curr => {
                note_buttons += " "+this.createNoteButton(curr_type, curr);
            });
            return note_buttons;
        },

        /**
         * Create a button with a currency (either Note or Certificate)
         * @param {string} curr_type
         * @param {string} curr 
         */
        createNoteButton: function(curr_type, curr) {
            return this.format_block('jstpl_curr_btn', {
                "type": curr_type,
                "curr": curr, 
            });
       },

        /**
         * 
         * @param {*} text 
         * @param {*} moreargs 
         */
        setDescriptionOnMyTurn : function(text, moreargs) {
            this.gamedatas.gamestate.descriptionmyturn = text;
            var tpl = dojo.clone(this.gamedatas.gamestate.args);

            if (!tpl) {
                tpl = {};
            }
            if (typeof moreargs != 'undefined') {
                for ( var key in moreargs) {
                    if (moreargs.hasOwnProperty(key)) {
                        tpl[key]=moreargs[key];
                    }
                }
            }
 
            var title = "";
            if (this.isCurrentPlayerActive() && text !== null) {
                tpl.you = this.spanYou();
            }
            if (text !== null) {
                title = this.format_string_recursive(text, tpl);
            }
            if (title == "") {
                this.setMainTitle("&nbsp;");
            } else {
                this.setMainTitle(title);
            }
        },

        /**
         * Return an array of all the players not this one.
         * Assumes a current player_id
         */
        getOtherPlayers: function() {
            var player_cpy = dojo.clone(this.gamedatas.players);
            delete player_cpy[this.player_id];
            return player_cpy;
        },

        /**
         * Get pair corresponding to curr1 and curr2 from the gamedatas sent by server.
         * @param {*} curr1 
         * @param {*} curr2 
         */
        findCurrencyPair: function(curr1, curr2) {
            var currency_pairs = this.gamedatas.currency_pairs;
            for (const c in currency_pairs) {
                var pair = currency_pairs[c];
                if ((pair['curr1'] == curr1 && pair['curr2'] == curr2) || (pair['curr1'] == curr2 && pair['curr2'] == curr1)) {
                    return pair;
                }
            }
            return null;
        },

        /**
         * For curr1 and curr2, create a Struct with info about a currency pair
         * @param {*} curr1 
         * @param {*} curr2 
         */
        createCurrencyPair: function(curr1, curr2) {
            var pair = {};
            var pr = this.findCurrencyPair(curr1, curr2);
            if (pr != null) {
                pair[PAIR.STRONGER] = pr['stronger'];
                pair[PAIR.WEAKER] = (pr['stronger'] == curr1) ? curr2 : curr1;
                pair[PAIR.EXCHANGE] = EXCHANGE_RATE[pr['position']-1];
            }
            return pair;
        },

        /**
         * This assumes this.gamedatas has a spot_transation
         */
        createSpotTransactionFromDatas() {
            var spot = this.gamedatas[SPOT_TRANSACTION];
            var player_from = spot[SPOT.FROM];
            var player_to = spot[SPOT.TO];
            // these are sent as ints
            var offer = CURRENCIES[spot[SPOT.OFFER]-1];
            var request = CURRENCIES[spot[SPOT.REQUEST]-1];
            var spot_transaction = this.createSpotTransaction(player_from, player_to, offer, request);
            return spot_transaction;
        },

        /**
         * Create a SpotTransaction "obj"
         * @param {string} from 
         * @param {string} to 
         * @param {string} offer 
         * @param {string} req 
         */
        createSpotTransaction: function(from, to, offer, req) {
            var pair = this.createCurrencyPair(offer, req);
            var offer_amt = (pair[PAIR.STRONGER] == offer) ? 1 : pair[PAIR.EXCHANGE];
            var req_amt = (pair[PAIR.STRONGER] == req) ? 1 : pair[PAIR.EXCHANGE];
            var spot = {};
            spot[SPOT.FROM] = from;
            spot[SPOT.TO] = to;
            spot[SPOT.OFFER] = offer;
            spot[SPOT.REQUEST] = req;
            spot[SPOT.OFF_AMT] = offer_amt;
            spot[SPOT.REQ_AMT] = req_amt;
            spot[SPOT.PAIR] = pair;
            return spot;
        },

        /**
         * For moving money between a player's pile and the bank
         */
        moveBankNotes: function(player_id, curr, amt) {
            // first create the html image
            var bank_notes = 'bank_'+curr;
            var player_notes = curr+'_note_counter_icon_'+player_id;
            var from = bank_notes;
            var to = player_notes;
            var parent_id = bank_container;
            if (amt < 0) {
                // it's going from player to bank
                from = player_notes;
                to = bank_notes;
                parent_id = curr+'_note_'+player_id+'_container';
            }
            var note_html = this.format_block('jstpl_bank_note', {
                "curr": curr
            });
            for (var i = 0; i < Math.abs(amt); i++) {
                this.slideTemporaryObject( note_html, parent_id, from, to, 500 ).play();
            }
        },

        /**
         * Animates moving notes between players in spot trades
         * @param {*} off_player who made the offer 
         * @param {*} to_player accepted the offer
         * @param {*} off_curr 
         * @param {*} req_curr 
         * @param {*} off_amt 
         * @param {*} req_amt 
         */
        tradeBankeNotes: function(off_player, req_player, off_curr, req_curr, off_amt, req_amt) {
            var off_player_notes = off_curr+'_note_counter_icon_'+off_player;
            var req_player_notes = req_curr+'_note_counter_icon_'+req_player;
            var off_parent_id = off_curr+'_note_'+off_player+'_container';
            var req_parent_id = req_curr+'_note_'+req_player+'_container';
            // animate offer currency going off_player -> req_player
            var off_note_html = this.format_block('jstpl_bank_note', {
                "curr": off_curr
            });
            for (var i = 0; i < Math.ceil(Math.abs(off_amt)); i++) {
                this.slideTemporaryObject( off_note_html, off_parent_id, off_player_notes, req_player_notes, 500 ).play();
            }
            // animate request currency going req_player -> from_player
            var req_note_html = this.format_block('jstpl_bank_note', {
                "curr": req_curr
            });
            for (var j = 0; j < Math.ceil(Math.abs(req_amt)); j++) {
                this.slideTemporaryObject( req_note_html, req_parent_id, req_player_notes, off_player_notes, 500 ).play();
            }
        },

        /**
         * Create a string for the X_MONIES arg in logs
         * @param {*} num 
         * @param {*} curr 
         * @param {*} type 
         */
        createMoniesXstr: function(num, curr, type) {
            return this.format_block('jstpl_monies', {
                "num": num,
                "curr": curr,
                "type": type
            });
        },

        /**
         * Get the number of Notes or Certs of a Currency that a player has
         * @param {int} player_id 
         * @param {string} curr 
         * @param {enum} type 
         */
        getMonies: function(player_id, curr, type) {
            if (type == CURRENCY_TYPE.NOTE) {
                return this.noteCounters[player_id][CURRENCY[curr]-1].getValue();
            } else {
                return this.certCounters[player_id][CURRENCY[curr]-1].getValue();
            }
        },

        ///////////////////////////////////////////////////
        //// Client "State" Functions
        ///////////////////////////////////////////////////

        /**
         * Add the Action buttons in the menu bar while we are choosing another action.
         */
        addPlayerActionButtons: function() {
            if (this.SPOT_DONE == 0) {
                this.addActionButton( ACTIONS.SPOT+BTN, _('Spot Trade'), ACTIONS.SPOT);
            }
            this.addActionButton( ACTIONS.INVEST+BTN, _('Invest'), ACTIONS.INVEST);
            this.addActionButton( ACTIONS.DIVEST+BTN, _('Divest'), ACTIONS.DIVEST);
            this.addActionButton( ACTIONS.CONTRACT+BTN, _('Make Contract'), ACTIONS.CONTRACT);
            this.addActionButton( ACTIONS.RESOLVE+BTN, _('Resolve Contract'), ACTIONS.RESOLVE);
        },

        removeActionButtons: function() {
            for (const A in ACTIONS) {
                dojo.destroy(ACTIONS[A]+BTN);
            }
        },

        /**
         * Create the Cancel Button.
         */
        addCancelButton: function() {
            this.addActionButton( ACTIONS.CANCEL+BTN, _('Cancel'), 'cancelAction', null, false, 'red');
        },

        /**
         * Create the Confirm button
         */
        addConfirmButton: function(action) {
            this.addActionButton( ACTIONS.CONFIRM+BTN, _('Confirm'), () => {
                this.confirmAction(action);
            });
        },

        /**
         * Add Accept/Reject for Spot Trade Offers
         */
        addSpotTradeButtons: function() {
            this.addActionButton( ACTIONS.ACCEPT+BTN, _('Accept'), () => {
                this.confirmAction(ACTIONS.ACCEPT);
            }, null, false, 'green');
            this.addActionButton( ACTIONS.REJECT+BTN, _('Reject'), () => {
                this.confirmAction(ACTIONS.REJECT);
            }, null, false, 'red');
        },

        /**
         * This is a Spot Trade Cancel button, not the same as the regular Cancel Action button
         */
        addCancelSpotTrade: function() {
            this.addActionButton( 'cancelSpotTrade'+BTN, _('Cancel Offer'), 'cancelSpotTrade', null, false, 'red');
        },

        ///////////////////////// SPOT TRADE /////////////////////////

        /**
         * Create a div with a row of player buttons
         * @param {*} players 
         */
        insertTradeButtons: function(players) {
            var trade_to_btns = "";
            for (const p in players) {
                var player_button = this.createPlayerButton(players[p]);
                trade_to_btns += " "+player_button;
            }
            return trade_to_btns;
        },

        /**
         * Takes a player and returns the player's name formatted in their color.
         * @param {Object} player
         */
        createPlayerButton: function(player) {
            var player_id = player['id'];
            var player_name = player['name'];
            var color = player.color;
            var color_bg = "";
            if (player.color_back) {
                color_bg = player.color_back;
            }
            var button = this.format_block('jstpl_player_btn', {
                'player_id': player_id,
                'player_name': player_name,
                'bgcolor': color_bg,
                'color': color,
            });
            return button;
        },

        /**
         * Action when a player button is chosen in Spot Trade
         * @param {*} evt 
         */
        choosePlayer: function(player, otherPlayers) {
            console.log("clicked button  for " + player['name']);

            // are we clicking or unclicking it?
            var disable = false;
            if (this.SPOT_TRANSACTION[SPOT.TO] == player['id']) {
                // clear all
                this.SPOT_TRANSACTION = {};
            } else {
                this.SPOT_TRANSACTION[SPOT.TO] = player['id'];
                disable = true;
            }

            for (p in otherPlayers) {
                var p2 = otherPlayers[p];
                if (player != p2) {
                    dojo.attr('trade_'+p2['id']+'_btn', 'disabled', disable);
                }
            }
            this.setSpotTradeMessage();
        },

        /**
         * Add actions to Buttons for players to offer trade to.
         * @param {*} otherPlayers 
         */
        addPlayerTradeActions: function(otherPlayers) {
            for (let p in otherPlayers) {
                let player = otherPlayers[p];
                dojo.connect( $('trade_'+player['id']+'_btn'), 'onclick', this, function(){
                    this.choosePlayer(player, otherPlayers);
                });
            }
        },

        /**
         * Add actions to Spot Trading currency buttons
         */
        addSpotTradeActions: function() {
            Object.keys(CURRENCY).forEach(curr => {
                let btn_id = curr+'_note_btn';
                dojo.connect( $(btn_id), 'onclick', this, function(){
                    this.spotTradeAction(curr, btn_id);
                });
            });
        },

        /**
         * Action that happens when clicked on a note
         * @param {string} curr
         * @param {string} btn_id 
         */
        spotTradeAction: function(curr, btn_id) {
            if (this.SPOT_TRANSACTION[SPOT.TO] == null) {
                // need a player chosen first
                return;
            }
            if (this.SPOT_TRANSACTION[SPOT.OFFER] == null) {
                // there should be no currencies clicked, so this is the offer
                this.SPOT_TRANSACTION[SPOT.OFFER] = curr;
                this.SPOT_TRANSACTION[SPOT.REQUEST] = null;
            } else if (this.SPOT_TRANSACTION[SPOT.OFFER] == curr) {
                // clicked on the previously offered currency, so clear both
                this.SPOT_TRANSACTION[SPOT.OFFER] = null;
                this.SPOT_TRANSACTION[SPOT.REQUEST] = null;
            } else if (this.SPOT_TRANSACTION[SPOT.REQUEST] == null) {
                // this is the request
                this.SPOT_TRANSACTION[SPOT.REQUEST] = curr;
            } else if (this.SPOT_TRANSACTION[SPOT.REQUEST] == curr) {
                // clicked on previous request currency, so clear it
                this.SPOT_TRANSACTION[SPOT.REQUEST] = null;
            } else {
                this.SPOT_TRANSACTION[SPOT.REQUEST] = curr;
            }
            this.setSpotTradeMessage();
        },

        /**
         * Change the text on the spot trade message
         * @param {*} text 
         */
        setSpotTradeMessage: function() {
            var text = "";
            if (this.SPOT_TRANSACTION[SPOT.TO]) {
                text = _("Offer ")+this.spanPlayerName(this.SPOT_TRANSACTION[SPOT.TO]);
                if (this.SPOT_TRANSACTION[SPOT.OFFER]) {
                    var offer_txt = " ";
                    if (this.SPOT_TRANSACTION[SPOT.REQUEST]) {
                        // construct a complete message
                        var offer_val = "";
                        var req_val = "";
                        var transaction = this.createSpotTransaction(this.SPOT_TRANSACTION[SPOT.FROM], this.SPOT_TRANSACTION[SPOT.TO], this.SPOT_TRANSACTION[SPOT.OFFER], this.SPOT_TRANSACTION[SPOT.REQUEST]);
                        var offer_val = transaction[SPOT.OFF_AMT];
                        var req_val = transaction[SPOT.REQ_AMT];
                        offer_txt += this.createMoniesXstr(offer_val, this.SPOT_TRANSACTION[SPOT.OFFER], CURRENCY_TYPE.NOTE);
                        offer_txt += _(" for ")+this.createMoniesXstr(req_val, this.SPOT_TRANSACTION[SPOT.REQUEST], CURRENCY_TYPE.NOTE);
                    } else {
                        // only have offer
                        offer_txt += this.createMoniesXstr('', this.SPOT_TRANSACTION[SPOT.OFFER], CURRENCY_TYPE.NOTE);
                    }
                    text += offer_txt;
                }
            }
            dojo.byId('spot_trade_txt').innerHTML = text;
        },

        ///////////////////////// INVEST /////////////////////////

        /**
         * Add actions to Invest currency buttons
         */
        addInvestActions: function() {
            Object.keys(CURRENCY).forEach(curr => {
                let btn_id = curr+'_cert_btn';
                if (this.checkCanInvest(curr)) {
                    dojo.connect( $(btn_id), 'onclick', this, function(){
                        this.investAction(curr, btn_id);
                    });
                } else {
                    dojo.attr(btn_id, 'disabled', true);
                }
            });
        },

        /**
         * Check whether we can buy a certificate of this currency.
         * Returns true if we can
         * @param {string} curr 
         */
        checkCanInvest: function(curr) {
            // do I have the money?
            var notes = this.getMonies(this.player_id, curr, CURRENCY_TYPE.NOTE);
            if (notes < 2) {
                // this.showMessage(this.spanYou() + _(" do not have ")+this.createMoniesXstr(2, curr, CURRENCY_TYPE.NOTE));
                return false;
            }
            // do I already have 4 certs of this currency?
            var certs = this.getMonies(this.player_id, curr, CURRENCY_TYPE.CERTIFICATE);
            if (certs >= 4) {
                // this.showMessage(this.spanYou() + _(" may not hold more than ")+this.createMoniesXstr(4, curr, CURRENCY_TYPE.CERTIFICATE));
                return false;
            }
            // are there any left?
            var avail = this.availableCertCounters[CURRENCY[curr]-1].getValue();
            if (avail == 0) {
                // this.showMessage(_("There are no ${curr} Certificates available for purchase"));
                return false;
            }
            return true;
        },

        /**
         * Action that happens when clicked on a note to invest.
         * @param {string} curr
         * @param {string} btn_id 
         */
        investAction: function(curr, btn_id) {
            // are we deselecting it?
            if ($(btn_id).classList.contains('frx_curr_btn_selected')) {
                dojo.toggleClass(btn_id, 'frx_curr_btn_selected');
            } else {
                // we selected it. How many are already selected?
                var sel = dojo.query('.frx_curr_btn_selected');
                if (sel.length == 2) {
                    this.showMessage(_("You may only buy 1 or 2 Certificates"), "info");
                } else {
                    dojo.toggleClass(btn_id, 'frx_curr_btn_selected');
                }
            }
            // now construct message
            var text = "";
            dojo.query('.frx_curr_btn_selected').forEach(btn => {
                var id = btn.id;
                let selcurr = id.substring(0, 3);
                if (text == "") {
                    text = _("Buy ")+this.createMoniesXstr(1, selcurr, CURRENCY_TYPE.CERTIFICATE)
                } else {
                    text += _(" and ")+this.createMoniesXstr(1, selcurr, CURRENCY_TYPE.CERTIFICATE)
                }
            });

            dojo.byId('invest_txt').innerHTML = text;
        },

        ///////////////////////////////////////////////////
        //// Player's action
        
        /*
            Here, you are defining methods to handle player's action (ex: results of mouse click on 
            game objects).
            
            Most of the time, these methods:
            _ check the action is possible at this game state.
            _ make a call to the game server
        
        */

        /**
         * Sets up the Spot Trade Panel.
         * The SPOT_TRANSACTION is initialized, but cleared when canceled.
         * @param {*} evt 
         */
        spotTrade: function(evt) {
            if (this.checkAction('offerSpotTrade', true)) {
                if (this.SPOT_DONE == 0) {
                    this.removeActionButtons();
    
                    this.SPOT_TRANSACTION = {};
                    // this adds the buttons
                    var otherPlayers = this.getOtherPlayers();
                    this.setDescriptionOnMyTurn(_("Offer a Spot Trade to "), {X_SPOT_TRADE : otherPlayers, X_CURRENCY: CURRENCY_TYPE.NOTE, X_ACTION_TEXT: 'spot_trade_txt'});
                    this.addPlayerTradeActions(otherPlayers);
                    this.addSpotTradeActions();
    
                    this.addConfirmButton(ACTIONS.SPOT);
                    this.addCancelButton();
                } else {
                    this.showMessage(_("You have already performed a Spot Trade this turn"), 'info');
                }
            }
        },

        /**
         * Actual Ajax call to submit offer.
         */
        submitSpotTrade: function() {
            if (this.checkAction('offerSpotTrade', true) && this.SPOT_TRANSACTION) {
                if (this.SPOT_TRANSACTION[SPOT.TO] && this.SPOT_TRANSACTION[SPOT.OFFER] && this.SPOT_TRANSACTION[SPOT.REQUEST]) {
                    var to = parseInt(this.SPOT_TRANSACTION[SPOT.TO]);
                    var offer = this.SPOT_TRANSACTION[SPOT.OFFER];
                    var request = this.SPOT_TRANSACTION[SPOT.REQUEST];
                    var transaction = this.createSpotTransaction(this.player_id, to, offer, request);
                    // do a pre-check - do both players have enough money?
                    if (this.getMonies(this.player_id, offer, CURRENCY_TYPE.NOTE) < transaction[SPOT.OFF_AMT]) {
                        this.showMessage(_(this.spanYou()+" do not have "+this.createMoniesXstr(transaction[SPOT.OFF_AMT], offer, 'note'), 'info'));
                    } else if (this.getMonies(to, request, CURRENCY_TYPE.NOTE) < transaction[SPOT.REQ_AMT]) {
                        this.showMessage(_(this.spanPlayerName(to)+" does not have "+this.createMoniesXstr(transaction[SPOT.REQ_AMT], request, 'note'), 'info'));
                    } else {
                        this.ajaxcall( "/forex/forex/offerSpotTrade.html", { 
                            to_player: to,
                            off_curr: offer,
                            req_curr: request,
                            lock: true 
                        }, this, function( result ) {  }, function( is_error) { } );
                    }
                } else {
                    this.showMessage(_("You must select player to offer trade to, offered currency, and requested currency"), 'info');
                }
            }
        },

        /**
         * Accept or reject an offer
         * @param {boolean} is_accept 
         */
        respondSpotTrade: function(is_accept) {
            if (this.checkAction('respondSpotTrade', true)) {
                this.ajaxcall( "/forex/forex/respondSpotTrade.html", { 
                    accept: is_accept,
                    lock: true 
                }, this, function( result ) {  }, function( is_error) { } );                        
            }
        },

        /**
         * To cancel a Spot Trade offer.
         */
        cancelSpotTrade: function() {
            if (this.checkAction('cancelSpotTrade', true)) {
                this.ajaxcall( "/forex/forex/cancelSpotTrade.html", { 
                    lock: true 
                }, this, function( result ) {  }, function( is_error) { } );                        
                this.SPOT_TRANSACTION = null;
            }
        },

        /**
         * Player clicked Invest
         * @param {*} evt 
         */
        investCurrency: function(evt) {
            if (this.checkAction('investCurrency', true)) {
                this.removeActionButtons();
                this.setDescriptionOnMyTurn(_("You may invest in 1 or 2 Currencies"), {X_CURRENCY: CURRENCY_TYPE.CERTIFICATE, X_ACTION_TEXT: 'invest_txt'});
                this.addInvestActions();
                this.addConfirmButton(ACTIONS.INVEST);
                this.addCancelButton();
            }
        },

        /**
         * Actual AJAX call to buy
         */
        buyCertificates: function() {
            if (this.checkAction('investCurrency', true)) {

                var buys = [];
                dojo.query('.frx_curr_btn_selected').forEach(btn => {
                    var id = btn.id;
                    let curr = id.substring(0, 3);
                    buys.push(curr);
                });
                if (buys.length == 0) {
                    this.showMessage(_("No Currencies selected!"), "info");
                } else {
                    buys.forEach(curr => {
                        console.log("BUY " + curr);
                        this.ajaxcall( "/forex/forex/invest.html", { 
                            curr: curr,
                            lock: true 
                        }, this, function( result ) {  }, function( is_error) { } );                        
                    });

                }
            }
        },

        /**
         * Player clicked Divest.
         * @param {*} evt 
         */
        divestCurrency: function(evt) {
            if (this.checkAction('divestCurrency', true)) {
                this.removeActionButtons();
                this.addConfirmButton(ACTIONS.DIVEST);
                this.addCancelButton();
            }
        },

        /**
         * Player clicked Contract.
         * @param {*} evt 
         */
        makeContract: function(evt) {
            if (this.checkAction('makeContract', true)) {
                this.removeActionButtons();
                this.addConfirmButton(ACTIONS.CONTRACT);
                this.addCancelButton();
            }
        },

        /**
         * Player clicked Resolve.
         * @param {*} evt 
         */
        resolveContract: function(evt) {
            if (this.checkAction('resolveContract', true)) {
                this.removeActionButtons();
                this.addConfirmButton(ACTIONS.RESOLVE);
                this.addCancelButton();
            }
        },

        /**
         * Delete all buttons and add the default ones back
         * @param {*} evt 
         */
        cancelAction: function(evt) {
            // refresh everything else
            this.removeActionButtons();
            this.addPlayerActionButtons();
            this.setDescriptionOnMyTurn(_("You must choose an action"));
        },

        /**
         * After pressing a confirm button, actually submits the action
         * @param {enum} action 
         */
        confirmAction: function(action) {
            console.log('confirmed '+ action);
            switch(action) {
                case ACTIONS.SPOT:
                    this.submitSpotTrade();
                    break;
                case ACTIONS.INVEST:
                    this.buyCertificates();
                    break;
                case ACTIONS.DIVEST:
                    break;
                case ACTIONS.CONTRACT:
                    break;
                case ACTIONS.RESOLVE:
                    break;
                case ACTIONS.ACCEPT:
                    this.respondSpotTrade(true);
                    break;
                case ACTIONS.REJECT:
                    this.respondSpotTrade(false);
                    break;
            }
        },

        /* Example:
        
        onMyMethodToCall1: function( evt )
        {
            console.log( 'onMyMethodToCall1' );
            
            // Preventing default browser reaction
            dojo.stopEvent( evt );

            // Check that this action is possible (see "possibleactions" in states.inc.php)
            if( ! this.checkAction( 'myAction' ) )
            {   return; }

            this.ajaxcall( "/forex/forex/myAction.html", { 
                                                                    lock: true, 
                                                                    myArgument1: arg1, 
                                                                    myArgument2: arg2,
                                                                    ...
                                                                 }, 
                         this, function( result ) {
                            
                            // What to do after the server call if it succeeded
                            // (most of the time: nothing)
                            
                         }, function( is_error) {

                            // What to do after the server call in anyway (success or failure)
                            // (most of the time: nothing)

                         } );        
        },        
        
        */

        
        ///////////////////////////////////////////////////
        //// Reaction to cometD notifications

        /*
            setupNotifications:
            
            In this method, you associate each of your game notifications with your local method to handle it.
            
            Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                  your forex.game.php file.
        
        */
        setupNotifications: function()
        {
            console.log( 'notifications subscriptions setup' );
            
            dojo.subscribe( 'currencyStrengthened', this, "notif_currencyStrengthened" );
            dojo.subscribe( 'currencyWeakened', this, "notif_currencyWeakened" );
            dojo.subscribe( 'moniesChanged', this, "notif_moniesChanged" );
            dojo.subscribe( 'spotTradeOffered', this, "notif_spotTradeOffered" );
            dojo.subscribe( 'spotTradeAccepted', this, "notif_spotTradeAccepted" );
            dojo.subscribe( 'spotTradeRejected', this, "notif_spotTradeRejected" );
            dojo.subscribe( 'spotTradeCanceled', this, "notif_spotTradeCanceled" );
            dojo.subscribe( 'certificatesBought', this, "notif_certificatesBought" );
            dojo.subscribe( 'certificatesSold', this, "notif_certificatesSold" );
        },
        
        // TODO: from this point and below, you can write your game notifications handling methods
        // Note: notif.args contains the arguments specified during you "notifyAllPlayers" / "notifyPlayer" PHP call
        notif_moniesChanged: function( notif ) {
            console.log( 'notif_moniesChanged' );
            var player_id = notif.args.player_id;
            var curr = notif.args.curr;
            var amt = parseFloat(notif.args.amt);
            this.noteCounters[player_id][CURRENCY[curr]-1].incValue(amt);
        },

        notif_currencyStrengthened: function( notif ) {
            console.log( 'notif_currencyStrengthened' );
            console.log( notif );
        },

        notif_currencyWeakened: function( notif ) {
            console.log( 'notif_currencyWeakened' );
            console.log( notif );
        },    

        notif_spotTradeOffered: function( notif ) {
            console.log( 'notif_spotTradeOffered' );
            var spot_trade = this.createSpotTransaction(notif.args[SPOT.FROM], notif.args[SPOT.TO], notif.args[SPOT.OFFER], notif.args[SPOT.REQUEST]);
            console.log( spot_trade );
            this.SPOT_TRANSACTION = spot_trade;
        },    

        notif_spotTradeCanceled: function( notif ) {
            console.log( 'notif_spotTradeCanceled' );
            this.SPOT_TRANSACTION = null;
            console.log( notif );
        },    

        /**
         * If I am the offerer, remove my Spot Trade button
         */
        notif_spotTradeAccepted: function( notif ) {
            var to_player = notif.args[SPOT.TO];
            var from_player = notif.args[SPOT.FROM];
            var offer = notif.args[SPOT.OFFER];
            var request = notif.args[SPOT.REQUEST];
            var off_amt = parseFloat(notif.args.off_amt);
            var req_amt = parseFloat(notif.args.req_amt);
            this.tradeBankeNotes(from_player, to_player, offer, request, off_amt, req_amt);
            // SPOT_TRANSACTION should remain non-null
            if (this.SPOT_TRANSACTION == null) {
                // this shouldn't ever be the case? But just in case
                this.SPOT_TRANSACTION = true;
            }
            this.SPOT_DONE = 1;
        },

        notif_spotTradeRejected: function( notif ) {
            console.log( 'notif_spotTradeRejected' );
            this.SPOT_TRANSACTION = null;
        },    


        notif_certificatesBought: function( notif ) {
            console.log( 'notif_certificatesBought' );
            console.log( notif );
        },    

        notif_certificatesSold: function( notif ) {
            console.log( 'notif_certificatesSold' );
            console.log( notif );
        },    
    });             
});

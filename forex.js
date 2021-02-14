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

const DIVIDENDS = "Dividends";

// 0-indexed array
const EXCHANGE_RATE = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8];

// map actions to function names
const ACTIONS = {
    SPOT: 'spotTrade',
    INVEST: 'investCurrency',
    DIVEST: 'divestCurrency',
    CONTRACT: 'makeContract',
    RESOLVE: 'resolveAction',
    CONFIRM: 'confirmAction',
    CANCEL: 'cancelAction',
    ACCEPT: 'acceptTrade',
    REJECT: 'rejectTrade',
    SELL: 'sellCerts',
    DECLINE: 'dontSellCerts',
}
const BTN = '_btn';

const CERT_SPRITES = 'img/forex_certificates.jpg'
const NOTE_SPRITES = 'img/forex_notes.jpg';

// these to match css
const CURR_BASE_W = 150;
const CURR_BASE_H = 97.66;
const DIVIDEND_BASE_H = 150;
const DIVIDEND_BASE_W = 97.8;

// strings that get inserted into format_string_recursive
const X_SPOT_TRADE = "x_spot_trade"; // flags inserting player-to-trade buttons
const X_CURRENCY = "x_currency_buttons"; // flags adding currency buttons
const X_CURRENCIES = "x_currency_choice_buttons"; // flags adding selective list of currency buttons
const X_ACTION_TEXT = "x_action_text"; // span that contains summary of action
const X_ACTION_BUTTONS = "x_action_buttons"; // div with additional science buttons
// matching args from forex.game.php
const X_SPOT_TO = "spot_trade_to";
const X_SPOT_FROM = "spot_trade_from";
const X_MONIES = "arg_monies_string";
// used as messages inserted in my turn message
const SPOT_TRADE_MSG = "spot_trade_txt";
const CONTRACT_MSG = "contract_txt";
const INVEST_MSG = "invest_txt";
const DIVEST_MSG = "divest_txt";

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
// label for currency to sell
const DIVEST_CURRENCY = "divest_currency";

// used to fill in HTML elements
const CURRENCY_TYPE = {
    NOTE: "note",
    CERTIFICATE: "cert",
    PAY: "pay",
    RECEIVE: "receive"
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
                    var container = dojo.place( this.format_block('jstpl_cert_note_container', {
                        "curr": curr,
                        "id": player_id
                    }), player_board_div);
                    dojo.place( this.format_block('jspl_curr_tag', {
                        "curr": curr,
                        "type": CURRENCY_TYPE.NOTE
                    }), container);
                    dojo.place( this.format_block('jstpl_player_monies', {
                        "curr": curr,
                        "type": CURRENCY_TYPE.NOTE,
                        "id": player_id
                    }), container);
                    dojo.place( this.format_block('jstpl_player_monies', {
                        "curr": curr,
                        "type": CURRENCY_TYPE.CERTIFICATE,
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

            this.addMonies();
            this.createCurrencyZones();
            this.placeCurrencyPairs();
            this.createAvailableCertificates();
            this.placeCertificates();
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
            this.DIVEST_CURRENCY = this.gamedatas[DIVEST_CURRENCY];

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
                    if (args.currency) {
                        // only for curr quantities without a number
                        args.currency = this.createMoniesXstr('', args.currency, CURRENCY_TYPE.NOTE, true);
                    }
                    if (args.contract) {
                        args.contract = this.format_block('jstpl_contract_card', {
                            "contract": args.contract,
                            "scale": 0.25
                        });
                        // hack because we inserted ${conL}
                        log = log.replace('${conL}', '');
                    }
                    if (args.X_SPOT_TRADE) {
                        log = log + this.insertTradeButtons(args.X_SPOT_TRADE) + '<br/>';
                    }
                    if (args.X_CURRENCY) {
                        log = log + this.insertCurrencyButtons(args.X_CURRENCY)+'<br/>';
                    }
                    if (args.X_CURRENCIES) {
                        log = log + this.insertCurrencyButtons(CURRENCY_TYPE.CERTIFICATE, args.X_CURRENCIES)+'<br/>';
                    }
                    // these are divs set by assigning innerHTML
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
                            var monies_span = this.createMoniesXstr(num, curr, type);
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
        createCurrencyZones: function() {
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
                avail.onItemCreate = (card_div, card_type, cert_item) => {
                    this.setupCertificate(card_div, card_type, cert_item);
                };
                avail.addItemType( curr, 0, g_gamethemeurl+CERT_SPRITES, CURRENCY[curr]-1 );
                avail.autowidth = true;
                this.availableCertificates.push(avail);
                // and create a matching counter
                var counter = new ebg.counter();
                counter.create('avail_certs_'+curr+'_ctr');
                $('avail_certs_'+curr+'_ctr').classList.add('frx_ctr');
                Object.assign($('avail_certs_'+curr+'_ctr').style, {
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
                // putting the weaker curr on the stronger curr's board
                let curr1 = currency_pairs[c]['stronger'];
                let curr2 = currency_pairs[c]['curr1'] == curr1 ? currency_pairs[c]['curr2'] : currency_pairs[c]['curr1'];
                var curr_pr = this.format_block('jstpl_flip_counter', {
                    "curr1": curr1,
                    "curr2": curr2
                });
                var currdiv = dojo.place(curr_pr, 'currency_board');
                var posi = currency_pairs[c]['position']-1;
                this.currencyPairZones[CURRENCY[curr1]-1][posi].placeInZone(currdiv.id);
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

        /**
         * Creates the Contract Queue, puts all Contracts in it 
         * AND the matching stacks in the Contract Display
         * AND on the player board
         */
        createContractQueue: function() {
            for (const c in this.gamedatas.contracts) {
                var contract = this.gamedatas.contracts[c];
                var q = contract.location;
                if (contract.contract == DIVIDENDS) {
                    this.createDividendsStack(q);
                } else {
                    this.placeContract(contract);
                }
            }
        },

        /**
         * Create the Dividends stack as a Zone.
         * @param {int} q
         */
        createDividendsStack: function(q) {
            var div_el = 'queue_'+q;
            this.divstack = new ebg.zone();
            this.divstack.create(this, div_el, this.dvdwidth, this.dvdheight);
            this.divstack.setPattern('verticalfit');
            // put each remaining dividend in stack, last first
            var dividends = parseInt(this.gamedatas.dividends);
            for (var i = 0; i < dividends; i++) {
                var div_num = 4-i;
                var dividend = this.format_block('jstpl_dividend', {
                    "div_num" : div_num,
                    "offset": -div_num * this.dvdwidth,
                    "margin": i
                });
                var divcard = dojo.place(dividend, 'contract_queue_container');
                this.divstack.placeInZone(divcard.id);
            }
            // we put the counter on top of the last Dividend
            this.addDividendsCounter();
        },

        /**
         * Put the Dividends stack counter on top of the stack
         */
        addDividendsCounter() {
            this.dividendCounter = new ebg.counter();
            var items = this.divstack.getAllItems();
            var last_id = items[items.length-1];
            dojo.place(this.format_block('jstpl_dividend_counter'), last_id);
            this.dividendCounter.create('dividend_counter');
            this.dividendCounter.setValue(items.length);
        },


        /**
         * Takes the existing Dividends stack and moves all the items to a new position.
         * @param {int} q
         */
        moveDividendsStack: function(q) {
            var q_id = 'queue_'+q;
            // create the new zone
            var new_stack = new ebg.zone();
            new_stack.create(this, q_id, this.dvdwidth, this.dvdheight);
            new_stack.setPattern('verticalfit');

            var dividends = this.divstack.getAllItems();
            var last_d;
            dividends.forEach(d => {
                this.divstack.removeFromZone(d, false, q_id);
                new_stack.placeInZone(d);
                last_d = d;
            });
            this.divstack = new_stack;
            // counter automatically moves
        },

        /**
         * Push all items in a ContractQueue slot to the left.
         */
        pushContractQueue: function() {
            // start with leftmost
            for (let q = 6; q > 0; q--) {
                this.slideContractQueue(q, q+1);
            }
        },

        /**
         * Move contents of one queue slot to another. Show the animation.
         * @param {int} start 
         * @param {int} end 
         */
        slideContractQueue: function(start, end) {
            var q = 'queue_'+start;
            var q2 = 'queue_'+end;
            var div_q = document.getElementById(q);
            var div_q2 = document.getElementById(q2);
            var is_dividends = (div_q.childNodes.length > 0 && div_q.firstChild.classList.contains("frx_dividend"));
            if (is_dividends) {
                this.moveDividendsStack(end);
            } else {
                while (div_q.childNodes.length > 0) {
                    var c = div_q.firstChild;
                    // create a temp copy to slide
                    var temp_c = dojo.clone(c);
                    var child = div_q.removeChild(c);
                    // show movement
                    this.slideTemporaryObject( temp_c, 'contract_queue_container', div_q, div_q2, 500 ).play();
                    div_q2.appendChild(child);
                }
            }
        },

        /**
         * Move notes from bank stack to either side of the Contract Display.
         * @param {string} contract 
         * @param {string} type 
         * @param {string} curr 
         * @param {int} amt 
         */
        slideNotesToStack: function(contract, type, curr, amt) {
            for (let p = 0; p < amt; p++) {
                var note = this.format_block('jstpl_bank_note', {"curr": curr});
                this.slideTemporaryObject( note, 'bank_container', 'bank_'+curr, 'contract_'+type+'_'+contract, 500 ).play();
            }
        },

        /**
         * Put the tooltip on the contract in the Queue,
         * add its stacks of notes in the Display,
         * and the little icon on the player's board
         * @param {Object} contract 
         */
        placeContract: function(contract) {
            // first place in queue
            this.placeContractInQueue(contract);
            this.placeContractCurrencies(contract);
            this.placeContractOnPlayerBoard(contract);
        },

        /**
         * Puts the contract in the queue at the correct spot
         */
        placeContractInQueue: function(contract) {
            // first place in queue
            var q = contract.location;
            var q_div = 'queue_'+q;
            var contract_div = this.format_block('jstpl_contract_card', {"contract" : contract.contract, "scale": 0.5 });
            var contract_card = dojo.place(contract_div, q_div);
            this.addTooltipHtml(contract_card, this.getContractHelpHtml(contract), 0);
            // to fit in zone box
            contract_card.style.margin = "0px";
        },

        /**
         * Puts promise and payout currencies in stacks on Contract display and adds counters.
         * @param {Object} contract
         */
        placeContractCurrencies: function(contract) {
            this.populateContractCurrencyStack(contract, CURRENCY_TYPE.PAY);
            this.populateContractCurrencyStack(contract, CURRENCY_TYPE.RECEIVE);
        },

        /**
         * Add tooltips to all instances of a contract
         * @param {Object} contract 
         */
        getContractHelpHtml: function(contract) {
            var helpstr = "<b>"+("Contract ")+contract.contract+"</b></br>";
            if (contract.player_id) {
                var player = this.gamedatas.players[contract.player_id];
                var name = player.name;
                helpstr += name+" Pays"+this.createMoniesXstr(contract.promise_amt, contract.promise, CURRENCY_TYPE.NOTE);
                helpstr += _("for")+this.createMoniesXstr(contract.payout_amt, contract.payout, CURRENCY_TYPE.NOTE);
            }
            return helpstr;
        },

        /**
         * Put the Notes on either promise or payout side of the Contract.
         */
        populateContractCurrencyStack: function(contract, type) {
            var C = contract.contract;
            var curr = (type == CURRENCY_TYPE.PAY) ? contract.promise : contract.payout;
            var amt = (type == CURRENCY_TYPE.PAY) ? contract.promise_amt : contract.payout_amt;
            var stack = (type == CURRENCY_TYPE.PAY) ? "promise" : "payout";
            this.createCurrencyStack(C, stack, curr, amt);
        },

        /**
         * Creates an actual stack of Notes next to a Contract.
         * @param {string} C contract letter
         * @param {string} stack "promise" or "payout"
         * @param {string} curr 
         * @param {int} amt 
         */
        createCurrencyStack: function(C, stack, curr, amt) {
            var id = 'contract_'+stack+'_'+C;
            // holds Notes
            var last_id;
            for (let i = 0; i < amt; i++) {
                var off = 2*i;
                var offset = "0px";
                if (stack == "promise") {
                    offset = -off+"px";
                } else {
                    offset = -off+"px "+off+"px";
                }
                var note = this.format_block('jstpl_bank_note_stacked', {"id": curr+'_'+C+'_'+i, "curr": curr, "margin": offset});
                last_id = dojo.place(note, id, i);
            }
            // put the counter on top of the last Note
            var counter = new forex.fcounter();
            var ctr_id = dojo.place(this.format_block('jstpl_stack_counter', {
                "id": C,
                "curr": curr,
                "type": "note"
            }), last_id);
            counter.create(ctr_id);
            counter.setValue(amt);
        },

        /**
         * Place a contract on the player board
         * @param {Object} contract 
         */
        placeContractOnPlayerBoard: function(contract) {
            var C = contract.contract;
            var player_id = contract.player_id;
            var player_board_div = $('player_board_'+player_id);
            var contract_div = this.format_block('jstpl_contract_card', {"contract" : C, "scale": 0.25 });
            contract_div.id = "contract_"+player_id+"_"+C;
            dojo.place(contract_div, player_board_div);
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
            switch( stateName ) {
                case 'playerAction':
                    this.DIVEST_CURRENCY = null;
                    break;
            }
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
                      
            if( this.isCurrentPlayerActive() ) {
                switch( stateName ) {
 
                 case 'playerAction':
                    this.addPlayerActionButtons();
                    break;
                case 'offerResponse':
                    var spot = this.SPOT_TRANSACTION;
                    if (this.player_id == spot[SPOT.TO]) {
                        this.addSpotTradeButtons();
                    } else if (this.player_id == spot[SPOT.FROM]) {
                        this.addCancelSpotTrade();
                    }
                    break;
                case 'nextDivest':
                    this.addDivestOption();
                    break;
                case 'strengthenCurrency':
                    this.addCurrenciesStrengthen();
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
         * Create row of Currency buttons (Note or Certificate) to be connected to actions.
         * Each one has id "${curr}_${type}_btn"
         * @param {string} curr_type
         * @param {array} filter (optional) only include currency buttons for these
         */
        insertCurrencyButtons: function(curr_type, filter) {
            var curr_buttons = "<div>";
            Object.keys(CURRENCY).forEach(curr => {
                if (!filter || (filter.includes(curr))) {
                    curr_buttons += " "+this.createCurrencyButton(curr_type, curr);
                }
            });
            curr_buttons += "</div>";
            return curr_buttons;
        },

        /**
         * Create a button with a currency (either Note or Certificate).
         * id = "${curr}_${type}_btn"
         * @param {string} curr_type
         * @param {string} curr 
         */
        createCurrencyButton: function(curr_type, curr) {
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
            var tpl = Object.assign({}, this.gamedatas.gamestate.args);

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
            var player_cpy = Object.assign({}, this.gamedatas.players);
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
            for (let i = 0; i < Math.abs(amt); i++) {
                this.slideTemporaryObject( note_html, parent_id, from, to, 500 ).play();
            }
        },

        /**
         * For moving money off a Contract Display, to bank or player board.
         * @param {string} contract letter
         * @param {string} curr currency type
         * @param {float} amt
         * @param {player_id} optional if null then it's going from promise to bank, otherwise from payout to player
         */
        moveContractNotes: function(contract, curr, amt, player_id) {
            var parent_id = 'contract_'+contract;
            var from = 'contract_promise_'+contract;
            var to = 'bank_'+curr;
            if (player_id) {
                from = 'contract_payout_'+contract;
                to = curr+'_note_counter_icon_'+player_id;
            }
            var note_html = this.format_block('jstpl_bank_note', {
                "curr": curr
            });
            for (let i = 0; i < amt; i++) {
                this.slideTemporaryObject( note_html, parent_id, from, to, 500 ).play();
            }
            // cleanup: remove notes from stack
            var stack = document.getElementById(from);
            while (stack.firstChild) {
                stack.removeChild(stack.firstChild);
            }
        },

        /**
         * For sliding a Contract card back to the Contract Display either from player's board or queue
         * @param {string} contract letter
         * @param {string} parent_id enclosing container, queue or player board
         * @param {string} from queue slot or player's board
         */
        moveContract: function(contract, parent_id, from) {
            var contract_html = this.format_block('jstpl_contract_card', {
                "contract": contract,
                "scale": 0.5
            });
            var to = 'contract_card_'+contract;
            this.slideTemporaryObject( contract_html, parent_id, from, to, 500 ).play();
        },

        /**
         * Show certificates moving from player's pile.
         * @param {*} player_id 
         * @param {*} curr 
         * @param {*} amt 
         */
        moveCertificates: function(player_id, curr, amt) {
            // first create the html image
            var discard_pile = 'page-title';
            var player_certs = curr+'_cert_counter_icon_'+player_id;
            var from = player_certs;
            var to = discard_pile;
            var parent_id = curr+'_cert_'+player_id+'_container';
            var cert_html = this.format_block('jstpl_certificate', {
                "curr": curr
            });
            for (var i = 0; i < amt; i++) {
                this.slideTemporaryObject( cert_html, parent_id, from, to, 500 ).play();
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
         * @param {int} num 
         * @param {string} curr 
         * @param {enum} type defaults to note
         * @param {bool} no_icon (optional) if true, displays only # curr, not icon
         */
        createMoniesXstr: function(num, curr, type = 'note', no_icon) {
            var jstpl = 'jstpl_monies';
            if (no_icon) {
                jstpl = 'jstpl_curr_ct';
            }
            return this.format_block(jstpl, {
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

        ///////////////////////// MOVE CURRENCY PAIRS /////////////////////////

        /**
         * Move a currency when it has been strengthened or weakened
         * @param {*} curr 
         * @param {*} val 
         */
        moveCurrencyPairMarkers: function(curr, val) {
            var currencypairs = this.gamedatas.currency_pairs;
            // collect pairs this currency is weaker or stronger
            var weaker = [];
            var stronger = [];
            for (const cp in currencypairs) {
                pair = currencypairs[cp];
                if (pair['curr1'] == curr || pair['curr2'] == curr) {
                    if (curr == pair['stronger']) {
                        stronger.push(pair);
                    } else {
                        weaker.push(pair);
                    }
                }
            }
            for (let i = 0; i < Math.abs(val); i++) {
                if (val < 0) {
                    this.weakenCurrency(stronger, weaker);
                } else {
                    this.strengthenCurrency(stronger, weaker);
                }
            }
        },

        /**
         * Strengthen the currency.
         * @param {array} stronger 
         * @param {array} weaker 
         */
        strengthenCurrency: function(stronger, weaker) {
            for( s in stronger ) {
                this.moveCounterRight(stronger[s]);
            }
            for( w in weaker ) {
                this.moveCounterLeft(weaker[w]);
            }
        },

        /**
         * Weaken the currency.
         * @param {array} stronger 
         * @param {array} weaker 
         */
        weakenCurrency: function(stronger, weaker) {
            for( s in stronger ) {
                this.moveCounterLeft(stronger[s]);
            }
            for( w in weaker ) {
                this.moveCounterRight(weaker[w]);
            }
        },

        /**
         * Either this currency is being weakened or the stronger currency whose board it's on is being strengthened.
         * @param {*} pair 
         */
        moveCounterRight: function(pair) {
            if (pair['position'] < 10) {
                this.shiftCounter(pair, 1);
            }
        },

        /**
         * Either this currency is being strengthened or the stronger currency whose board it's on is being weakened.
         * @param {*} pair 
         */
        moveCounterLeft: function(pair) {
            if (pair.position == 1) {
                this.flipPair(pair);
            } else {
                this.shiftCounter(pair, -1);
            }
        },

        /**
         * Move the weaker counter left or right along its track.
         * @param {Object} pair 
         * @param {int} dir 
         */
        shiftCounter: function(pair, dir) {
            var zone = this.currencyPairZones[CURRENCY[pair['stronger']]-1][pair['position']-1];
            var destZone = this.currencyPairZones[CURRENCY[pair['stronger']]-1][pair['position']-1+dir];
            this.moveCounter(pair, zone, destZone);
            pair['position'] = parseInt(pair['position'])+dir;
        },

        /**
         * Stronger has been weakened, or weaker has been strengthened
         * either way, this curr gets taken off stronger's board, and the prev stronger now
         * appears on this curr's board.
         * @param {Object} pair 
         */
        flipPair: function(pair) {
            var curr = (pair['stronger'] == pair['curr1']) ? pair['curr2'] : pair['curr1'];
            var startZone = this.currencyPairZones[CURRENCY[pair['stronger']]-1][0];
            var destZone = this.currencyPairZones[CURRENCY[curr]-1][0];
            var pair_id = this.moveCounter(pair, startZone, destZone);
            // do the flipping animation
            $(pair_id).classList.toggle("flip");
            pair['stronger'] = curr;
            pair['position'] = 1;
        },

        /**
         * Remove counter from one zone, add to another, animate its movement.
         * @param {Object} pair
         * @param {Object} startZone
         * @param {Object} endZone
         */
        moveCounter: function(pair, startZone, endZone) {
            // pair ids are assigned initially in starting order,
            // so we may or may not be on the same original track.
            // eg the pair_GBP_USD that started on the GBP track may now be on the USD track
            var pair_id = 'pair_'+pair['curr1']+'_'+pair['curr2'];
            if (document.getElementById(pair_id) == null) {
                pair_id = 'pair_'+pair['curr2']+'_'+pair['curr1'];
            }
            startZone.removeFromZone(pair_id, false, endZone.id);
            endZone.placeInZone(pair_id);
            return pair_id;
        },

        /**
         * Animation for flipping, then removing the flip classes
         * @param {string} old_stronger
         * @param {string} new_stronger
         */
        flipCounter: function(old_stronger, new_stronger) {
            var flipping_ctr = this.format_block('jstpl_flip_counter', {
                curr1: new_stronger,
                curr2: old_stronger
            });
            // alert("flipping "+old_stronger+" to "+new_stronger);
            var flipped = dojo.place(flipping_ctr, new_stronger+'_1');
            flipped.classList.toggle("flip");
            return flipped;
        },

        /**
         * Set a button to not selectable and disabled.
         * @param {string} btn_id 
         */
        setBtnUnselectable: function(btn_id) {
            $(btn_id).classList.add('frx_curr_btn_deactivate');
            $(btn_id).setAttribute("disabled", true);
        },

        /**
         * Sets message text on a text element already inserted into title section.
         * @param {string} text_element
         * @param {string} text 
         */
        setMessageText: function(text_element, text) {
            document.getElementById(text_element).innerHTML = text;
        },

        /**
         * Get currency according to the button type selected.
         * @param {string} type 
         */
        getSelectedCurrency: function(type) {
            var curr = "";
            var selected = document.getElementsByClassName("frx_curr_"+type);
            if (selected.length != 0) {
                var sel_id = selected[0].id;
                curr = sel_id.substring(0,3);
            }
            return curr;
        },

        /**
         * Count the certificates of each currency held by each player,
         * and return an array of the currency(s) held by the most players.
         */
        getMostHeldCertificates: function() {
            var currCount = {};
            for (let ctr in this.certCounters) {
                let playerCerts = this.certCounters[ctr];
                for (let C in CURRENCY) {
                    var ci = CURRENCY[C];
                    var cert_ct = playerCerts[ci-1].getValue();
                    if (C in currCount) {
                        currCount[C] += cert_ct;
                    } else {
                        currCount[C] = cert_ct;
                    }
                }
            }
            var held = [];
            var max = 0;
            for (let curr in currCount) {
                if (currCount[curr] > max) {
                    max = currCount[curr];
                    held = [curr];
                } else if (currCount[curr] == max) {
                    held.push(curr);
                }
            };
            return held;
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

        /**
         * Remove all the action buttons after canceling out.
         */
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
            }, null, false, 'blue');
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

        /**
         * Adds Sell option buttons for following players, allowing them to sell.
         */
        addDivestOption: function() {
            this.insertSellButtons();
            this.addActionButton( ACTIONS.SELL+BTN, _('Sell'), () => {
                this.confirmAction(ACTIONS.SELL);
            }, null, false, 'blue');
            this.addActionButton( ACTIONS.DECLINE+BTN, _('Don\'t sell'), () => {
                this.confirmAction(ACTIONS.DECLINE);
            }, null, false, 'red');
        },

       ///////////////////////// CHOOSE CURRENCIES (when player must choose from the strongest currencies) /////////////////////////

        /**
         * There is more than one currency with most Certificates in hand. We have to manually recalculate this on the client side.
         */
        addCurrenciesStrengthen: function() {
            var currencies = this.getMostHeldCertificates();
            if (currencies.length == 1) {
                // should not happen!
                throw "Only one currency is held by most players; should not be in this state";
            }
            this.setDescriptionOnMyTurn(_("Choose which currency will be strengthened:"), {X_CURRENCIES: currencies});
            this.addChooseCurrencyAction(currencies);
        },

        /**
         * Add an action to the buttons for each currency to choose it to be the one that is stronger/strengthened.
         * @param {array} currencies 
         */
        addChooseCurrencyAction: function(currencies) {
            currencies.forEach(curr => {
                let btn_id = curr+'_cert_btn';
                $(btn_id).addEventListener('click', () => {
                    this.chooseStrengthen(curr);
                });
            });
        },

        ///////////////////////// SPOT TRADE /////////////////////////

        /**
         * Create a div with a row of player buttons
         * @param {Array} players 
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
         * @param {Object} player
         * @param {Array} otherPlayers
         */
        choosePlayer: function(player, otherPlayers) {
            // are we clicking or unclicking it?
            var disable = false;
            if (this.SPOT_TRANSACTION[SPOT.TO] == player['id']) {
                // clear all
                this.clearSpotPlayerSelected();
            } else {
                this.SPOT_TRANSACTION[SPOT.TO] = player['id'];
                disable = true;
            }

            for (p in otherPlayers) {
                var p2 = otherPlayers[p];
                if (player != p2) {
                    dojo.attr('trade_'+p2['id']+BTN, 'disabled', disable);
                }
            }
            // create spotTrade message
            this.setSpotTradeMessage();
        },

        /**
         * Player button was unselected, so clear all Spot Trade arguments.
         */
        clearSpotPlayerSelected: function() {
            this.SPOT_TRANSACTION = {};
            var offer_button = document.getElementsByClassName("frx_curr_pay");
            if (offer_button.length != 0) {
                offer_button[0].classList.toggle("frx_curr_pay");
            }
            var pay_button = document.getElementsByClassName("frx_curr_receive");
            if (pay_button.length != 0) {
                pay_button[0].classList.toggle("frx_curr_receive");
            }
        },


        /**
         * Add actions to Buttons for players to offer trade to.
         * @param {*} otherPlayers 
         */
        addPlayerTradeActions: function(otherPlayers) {
            for (let p in otherPlayers) {
                let player = otherPlayers[p];
                $('trade_'+player['id']+BTN).addEventListener('click', () => {
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
                $(btn_id).addEventListener('click', () => {
                    this.spotTradeAction(curr, btn_id);
                });
            });
        },

        /**
         * Attached to Note button, assigns offer or receive currency.
         * @param {string} curr 
         * @param {string} btn_id 
         */
        spotTradeAction: function(curr, btn_id) {
            if (this.SPOT_TRANSACTION[SPOT.TO] == null) {
                // need a player chosen first
                this.showMessage("You must choose the Player you wish to trade with first", "info");
                return;
            }

            // are we unselecting it?
            if ($(btn_id).classList.contains("frx_curr_pay")) {
                // we are deselecting the offer (and request, clearing message)
                $(btn_id).classList.toggle("frx_curr_pay");
                var payoff = document.getElementsByClassName("frx_curr_receive");
                if (payoff.length != 0) {
                    payoff[0].classList.toggle("frx_curr_receive");
                }
            } else if ($(btn_id).classList.contains("frx_curr_receive")) {
                // we are deselecting the payoff
                $(btn_id).classList.toggle("frx_curr_receive");
            } else {
                var is_payoff = document.getElementsByClassName("frx_curr_receive");
                if (is_payoff.length != 0) {
                    // we are replacing payoff
                    is_payoff[0].classList.toggle("frx_curr_receive");
                    $(btn_id).classList.toggle("frx_curr_receive");
                } else {
                    var is_promise = document.getElementsByClassName("frx_curr_pay");
                    if (is_promise.length != 0) {
                        // this is the payoff
                        $(btn_id).classList.toggle("frx_curr_receive");
                    } else {
                        // this is the promise
                        $(btn_id).classList.toggle("frx_curr_pay");
                    }
                }
            }
            // create spotTrade message
            this.setSpotTradeMessage();
        },

        /**
         * Create the "Offer X for Y" Spot Trade message.
         */
        setSpotTradeMessage: function() {
            var contract_txt = "";
            if (this.SPOT_TRANSACTION[SPOT.TO]) {
                contract_txt = _("Offer ")+this.spanPlayerName(this.SPOT_TRANSACTION[SPOT.TO]);
                var prom_curr = this.getSelectedCurrency(CURRENCY_TYPE.PAY);
                var payoff_curr = this.getSelectedCurrency(CURRENCY_TYPE.RECEIVE);
                if (prom_curr == "") {
                    this.setMessageText(SPOT_TRADE_MSG, contract_txt);
                } else {
                    if (payoff_curr != "") {
                        this.createMoniesXstr("", payoff_curr, CURRENCY_TYPE.NOTE);
                        var exchg_pair = this.createCurrencyPair(prom_curr, payoff_curr);
                        var prom_val = 1;
                        var pay_val = 1;
                        if (exchg_pair[PAIR.STRONGER] == prom_curr) {
                            pay_val = exchg_pair[PAIR.EXCHANGE];
                        } else {
                            prom_val = exchg_pair[PAIR.EXCHANGE];
                        }
                        var promise_txt = this.format_block('jstpl_currency_counter', {
                            "type": "offer",
                            "curr": prom_curr
                        });
                        var payoff_txt = this.format_block('jstpl_currency_counter', {
                            "type": "request",
                            "curr": payoff_curr
                        });
            
                        contract_txt += promise_txt+_("for")+payoff_txt;
                        this.setMessageText(SPOT_TRADE_MSG, contract_txt);
                        this.PAY_COUNTER = new forex.fcounter();
                        this.PAY_COUNTER.create('offer_counter');
                        this.PAY_COUNTER.setValue(prom_val);
                        this.RECEIVE_COUNTER = new forex.fcounter();
                        this.RECEIVE_COUNTER.create('request_counter');
                        this.RECEIVE_COUNTER.setValue(pay_val);
                    } else {
                        contract_txt += this.createMoniesXstr("?", prom_curr, CURRENCY_TYPE.NOTE);
                        this.setMessageText(SPOT_TRADE_MSG, contract_txt);
                    }
                }
            } else {
                this.setMessageText(SPOT_TRADE_MSG, contract_txt);
            }
        },

        ///////////////////////// INVEST /////////////////////////

        /**
         * Add actions to Invest currency buttons
         */
        addInvestActions: function() {
            Object.keys(CURRENCY).forEach(curr => {
                let btn_id = curr+'_cert_btn';
                var warn_msg = this.checkCanInvest(curr);
                if (warn_msg == null) {
                    $(btn_id).addEventListener('click', () => {
                        this.investAction(curr, btn_id);
                    });
                } else {
                    $(btn_id).classList.add('frx_curr_btn_deactivate');
                    this.addTooltip(btn_id, warn_msg, 0);
                }
            });
        },

        /**
         * Check whether we can buy a certificate of this currency.
         * Returns null if we can, else returns a warn message
         * @param {string} curr 
         */
        checkCanInvest: function(curr) {
            // do I have the money?
            var notes = this.getMonies(this.player_id, curr, CURRENCY_TYPE.NOTE);
            if (notes < 2) {
                return this.spanYou() + _(" do not have ")+this.createMoniesXstr(2, curr, CURRENCY_TYPE.NOTE, true);
            }
            // do I already have 4 certs of this currency?
            var certs = this.getMonies(this.player_id, curr, CURRENCY_TYPE.CERTIFICATE);
            if (certs >= 4) {
                return this.spanYou() + _(" may not hold more than ")+this.createMoniesXstr(4, curr, CURRENCY_TYPE.CERTIFICATE, true);
            }
            // are there any left?
            var avail = this.availableCertCounters[CURRENCY[curr]-1].getValue();
            if (avail == 0) {
                return _("There are no ${curr} Certificates available for purchase");
            }
            return null;
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

            document.getElementById(INVEST_MSG).innerHTML = text;
        },

        ///////////////////////// DIVEST /////////////////////////

        /**
         * Add sell actions to currency buttons during a divestCurrency action (by original seller).
         */
        addDivestActions: function() {
            this.DIVEST_CURRENCY = null;
            Object.keys(CURRENCY).forEach(curr => {
                let btn_id = curr+'_cert_btn';
                let certs = this.getMonies(this.player_id, curr, CURRENCY_TYPE.CERTIFICATE);
                if (certs == 0) {
                    this.setBtnUnselectable(btn_id);
                } else {
                    $(btn_id).addEventListener('click', () => {
                        this.divestAction(curr, btn_id, certs);
                    });
                }
            });
        },

        /**
         * Action that happens when clicked on a Certificate to sell.
         * Adds the cert button and +/- to increment them
         * @param {string} curr
         * @param {string} btn_id 
         * @param {int} num_certs
         */
        divestAction: function(curr, btn_id, num_certs) {
            // are we deselecting it?
            var was_selected = $(btn_id).classList.contains('frx_curr_btn_selected');
            if (was_selected) {
                // we are deselecting it
                this.DIVEST_CURRENCY = null;
                document.getElementById('sell_container_'+curr).remove();
            } else {
                // we selected it. Deselect any previous ones
                var selected = document.getElementsByClassName("frx_curr_btn_selected");
                if (selected.length != 0) {
                    // sanity check
                    // should only ever be one!
                    if (selected.length > 1) {
                        throw "Error: clicked " + curr + " but more than 1 selected Currency found";
                    }
                    $(selected[0]).classList.toggle("frx_curr_btn_selected");
                }
                this.DIVEST_CURRENCY = curr;
                this.createSellCounter(curr);
            }
            // now toggle (either to deselect or select it)
            $(btn_id).classList.toggle("frx_curr_btn_selected");
        },

        /**
         * Add the "Sell $curr +/-" message and buttons.
         */
        insertSellButtons: function() {
            var curr = this.DIVEST_CURRENCY;
            this.setDescriptionOnMyTurn(_("You may Divest ")+curr, {X_ACTION_TEXT: DIVEST_MSG});
            this.createSellCounter(curr);
        },

        /**
         * Create the "Sell [CURR] +/-" buttons
         * @param {string*} curr 
         */
        createSellCounter: function(curr) {
            var sell_buttons = this.format_block('jstpl_sell_buttons', {"curr": curr});
            document.getElementById(DIVEST_MSG).innerHTML = sell_buttons;
            this.SELL_COUNTER = new ebg.counter();
            this.SELL_COUNTER.create('sell_counter_'+curr);
            this.SELL_COUNTER.setValue(1);
            document.getElementById('sell_plus_btn_'+curr).addEventListener('click', () => {
                if (this.SELL_COUNTER.getValue() < this.certCounters[this.player_id][CURRENCY[curr]-1].getValue()) {
                    this.SELL_COUNTER.incValue(1);
                }
            });
            document.getElementById('sell_minus_btn_'+curr).addEventListener('click', () => {
                if (this.SELL_COUNTER.getValue() > 1) {
                    this.SELL_COUNTER.incValue(-1);
                }
            });
        },

        ///////////////////////// MAKE CONTRACT /////////////////////////

        /**
         * Returns the first non-taken contract (by letter), or null if none.
         * Must be client-side!
         */
        getAvailableContract: function() {
            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            for (const cl of letters) {
                var cards = document.getElementsByClassName("frx_"+cl);
                console.log(cl+" instances: " + cards.length);
                if (cards.length == 1) {
                    return cl;
                }
            }
            return null;
        },

        /**
         * Add Actions to Notes to allow increasing or decreasing the Contract currencies.
         */
        addContractActions: function() {
            Object.keys(CURRENCY).forEach(curr => {
                let btn_id = curr+'_note_btn';
                $(btn_id).addEventListener('click', () => {
                    this.createContract(btn_id);
                });
            });
        },

        /**
         * Attached to Note button, assigns promise or payoff currency.
         * @param {string} btn_id 
         */
        createContract: function(btn_id) {
            // are we unselecting it?
            if ($(btn_id).classList.contains("frx_curr_pay")) {
                // we are deselecting the promise (and payoff, clearing message)
                $(btn_id).classList.toggle("frx_curr_pay");
                var payoff = document.getElementsByClassName("frx_curr_receive");
                if (payoff.length != 0) {
                    payoff[0].classList.toggle("frx_curr_receive");
                }
            } else if ($(btn_id).classList.contains("frx_curr_receive")) {
                // we are deselecting the payoff
                $(btn_id).classList.toggle("frx_curr_receive");
            } else {
                var is_payoff = document.getElementsByClassName("frx_curr_receive");
                if (is_payoff.length != 0) {
                    // we are replacing payoff
                    is_payoff[0].classList.toggle("frx_curr_receive");
                    $(btn_id).classList.toggle("frx_curr_receive");
                } else {
                    var is_promise = document.getElementsByClassName("frx_curr_pay");
                    if (is_promise.length != 0) {
                        // this is the payoff
                        $(btn_id).classList.toggle("frx_curr_receive");
                    } else {
                        // this is the promise
                        $(btn_id).classList.toggle("frx_curr_pay");
                    }
                }
            }
            // create contract message
            this.createContractMessage();
        },

        /**
         * Create the "Pay X for Y" contract message.
         */
        createContractMessage: function() {
            var pay_curr = this.getSelectedCurrency(CURRENCY_TYPE.PAY);
            var payoff_curr = this.getSelectedCurrency(CURRENCY_TYPE.RECEIVE);
            var contract_txt = "";
            if (pay_curr == "") {
                this.setMessageText(CONTRACT_MSG, "");
            } else {
                if (payoff_curr != "") {
                    this.createMoniesXstr("", payoff_curr, CURRENCY_TYPE.NOTE);
                    var exchg_pair = this.createCurrencyPair(pay_curr, payoff_curr);
                    var prom_val = 1;
                    var pay_val = 1;
                    if (exchg_pair[PAIR.STRONGER] == pay_curr) {
                        pay_val = exchg_pair[PAIR.EXCHANGE];
                    } else {
                        prom_val = exchg_pair[PAIR.EXCHANGE];
                    }
                    var pay_counter = this.format_block('jstpl_currency_counter', {
                        "type": CURRENCY_TYPE.PAY,
                        "curr": pay_curr
                    });
                    var receive_counter = this.format_block('jstpl_currency_counter', {
                        "type": CURRENCY_TYPE.RECEIVE,
                        "curr": payoff_curr
                    });
                    var contract_buttons = this.format_block('jstpl_contract_buttons', {
                        "curr": exchg_pair[PAIR.STRONGER]
                    });
        
                    contract_txt = _("Pay")+pay_counter
                    if (exchg_pair[PAIR.STRONGER] == pay_curr) {
                        contract_txt += contract_buttons;
                    }
                    contract_txt += _("for")+receive_counter;
                    if (exchg_pair[PAIR.STRONGER] == payoff_curr) {
                        contract_txt += contract_buttons;
                    }
                    this.setMessageText(CONTRACT_MSG, contract_txt);
                    this.PAY_COUNTER = new forex.fcounter();
                    this.PAY_COUNTER.create('pay_counter');
                    this.PAY_COUNTER.setValue(prom_val);
                    this.RECEIVE_COUNTER = new forex.fcounter();
                    this.RECEIVE_COUNTER.create('receive_counter');
                    this.RECEIVE_COUNTER.setValue(pay_val);
                    this.addContractButtons(pay_curr, exchg_pair);
                } else {
                    contract_txt = _("Pay ") +this.createMoniesXstr("?", pay_curr, CURRENCY_TYPE.NOTE);
                    this.setMessageText(CONTRACT_MSG, contract_txt);
                }
            }
        },

        /**
         * Promise or Payoff.
         * @param {string} prom_curr 
         * @param {Object} exchg_pair 
         */
        addContractButtons: function(prom_curr, exchg_pair) {
            var strong_counter = null;
            var weak_counter = null;
            if (exchg_pair[PAIR.STRONGER] == prom_curr) {
                strong_counter = this.PAY_COUNTER;
                weak_counter = this.RECEIVE_COUNTER;
            } else {
                strong_counter = this.RECEIVE_COUNTER;
                weak_counter = this.PAY_COUNTER;
            }
            document.getElementById('contract_plus_btn').addEventListener('click', () => {
                if (strong_counter.getValue() < 10) {
                    strong_counter.incValue(1);
                    weak_counter.setValue(strong_counter.getValue() * exchg_pair[PAIR.EXCHANGE]);
                }
            });
            document.getElementById('contract_minus_btn').addEventListener('click', () => {
                if (strong_counter.getValue() > 1) {
                    strong_counter.incValue(-1);
                    weak_counter.setValue(strong_counter.getValue() * exchg_pair[PAIR.EXCHANGE]);
                }
            });
        },

        ///////////////////////// RESOLVE CONTRACT /////////////////////////

        /**
         * Look for the first contract to be Resolved based on queue position
         */
        getContractToResolve: function() {
            for (let q = 7; q > 0; q--) {
                var q_div = document.getElementById('queue_'+q);
                if (q_div.childElementCount > 0) {
                    // first look for Dividend in the name
                    var child = q_div.firstChild;
                    if (child.classList.contains("frx_dividend")) {
                        return DIVIDENDS;
                    }
                    for (const cl of ['A', 'B', 'C', 'D', 'E', 'F']) {
                        if (child.classList.contains("frx_"+cl)) {
                            return cl;
                        }
                    }
                }
            }
            return null;
        },


        ///////////////////////////////////////////////////
        //// Player's action
        ///////////////////////////////////////////////////

        /**
         * Player clicked "Spot Trade" button.
         * Sets up the Spot Trade Panel.
         * The SPOT_TRANSACTION is initialized, but cleared when canceled.
         * @param {Object} evt 
         */
        spotTrade: function(evt) {
            if (this.checkAction('offerSpotTrade', true)) {
                if (this.SPOT_DONE == 0) {
                    this.removeActionButtons();
    
                    this.SPOT_TRANSACTION = {};
                    // this adds the buttons
                    var otherPlayers = this.getOtherPlayers();
                    this.setDescriptionOnMyTurn(_("Offer a Spot Trade to "), {X_SPOT_TRADE : otherPlayers, X_CURRENCY: CURRENCY_TYPE.NOTE, X_ACTION_TEXT: SPOT_TRADE_MSG});
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
         * Player clicked "Invest" button.
         * @param {Object} evt 
         */
        investCurrency: function(evt) {
            if (this.checkAction('investCurrency', true)) {
                this.removeActionButtons();
                this.setDescriptionOnMyTurn(_("You may buy 1 or 2 Certificates"), {X_CURRENCY: CURRENCY_TYPE.CERTIFICATE, X_ACTION_TEXT: INVEST_MSG});
                this.addInvestActions();
                this.addConfirmButton(ACTIONS.INVEST);
                this.addCancelButton();
            }
        },

        /**
         * Player clicked "Divest" button during Player Action phase.
         * @param {Object} evt 
         */
        divestCurrency: function(evt) {
            if (this.checkAction('divestCurrency', true)) {
                this.removeActionButtons();
                this.setDescriptionOnMyTurn(_("You may sell 1 Currency"), {X_CURRENCY: CURRENCY_TYPE.CERTIFICATE, X_ACTION_TEXT: DIVEST_MSG});
                this.addDivestActions();
                this.addConfirmButton(ACTIONS.DIVEST);
                this.addCancelButton();
            }
        },

        /**
         * Player clicked Contract.
         * @param {Object} evt 
         */
        makeContract: function(evt) {
            if (this.checkAction('makeContract', true)) {
                // clear any previous setups
                this.PAY_COUNTER = null;
                this.RECEIVE_COUNTER = null;
                var nextContract = this.getAvailableContract();
                if (nextContract == null) {
                    this.showMessage("No Contracts Available!");
                } else {
                    this.removeActionButtons();
                    var contract_div = this.format_block('jstpl_contract_card', {"contract" : nextContract, "scale": 0.25 });
                    this.setDescriptionOnMyTurn(_("You may take Contract") + contract_div, {X_CURRENCY: CURRENCY_TYPE.NOTE, X_ACTION_TEXT: CONTRACT_MSG});
                    this.addContractActions();
                    this.addConfirmButton(ACTIONS.CONTRACT);
                    this.addCancelButton();
                }
            }
        },

        /**
         * Player clicked Resolve.
         * @param {Object} evt 
         */
        resolveAction: function(evt) {
            if (this.checkAction('resolve', true)) {
                this.removeActionButtons();
                // get the end of the Contract Queue
                var contract = this.getContractToResolve();
                var contract_div;
                if (contract == DIVIDENDS) {
                    var div_num = this.dividendCounter.getValue();
                    contract_div = this.format_block('jstpl_dividend_card', {
                        "div_num" : div_num,
                        "margin": 5,
                        "offset": -(5-div_num) * this.dvdwidth
                    });
                } else {
                    contract_div = "Contract"+this.format_block('jstpl_contract_card', {
                        "contract": contract,
                        "scale": 0.5
                    });
                }
                this.setDescriptionOnMyTurn(_("Resolve") + contract_div+"<br/>");
                this.addConfirmButton(ACTIONS.RESOLVE);
                this.addCancelButton();
            }
        },

        /**
         * Clicked the "Cancel" button during Player Action. Delete all action buttons and add the default ones back.
         * @param {Object} evt 
         */
        cancelAction: function(evt) {
            // refresh everything else
            this.removeActionButtons();
            this.addPlayerActionButtons();
            this.setDescriptionOnMyTurn(_("You must choose an action"));
        },

        /**
         * Pressed "Confirm" button. Actually submits the action
         * @param {enum} evt 
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
                    this.sellCertificates();
                    break;
                case ACTIONS.CONTRACT:
                    this.takeContract();
                    break;
                case ACTIONS.RESOLVE:
                    this.resolveContractQueue();
                    break;
                case ACTIONS.ACCEPT:
                    this.respondSpotTrade(true);
                    break;
                case ACTIONS.REJECT:
                    this.respondSpotTrade(false);
                    break;
                case ACTIONS.SELL:
                    this.nextSeller(true);
                    break;
                case ACTIONS.DECLINE:
                    this.nextSeller(false);
                    break;
            }
        },

        ///////////////////////////////////////////////////
        //// AJAX Actions - the actual calls to the server
        ///////////////////////////////////////////////////

        /**
         * Clicked "Confirm" to submit a Spot Trade offer.
         */
        submitSpotTrade: function() {
            if (this.checkAction('offerSpotTrade', true) && this.SPOT_TRANSACTION) {
                if (this.PAY_COUNTER && this.RECEIVE_COUNTER) {
                    var to = parseInt(this.SPOT_TRANSACTION[SPOT.TO]);
                    var offer_curr = this.getSelectedCurrency(CURRENCY_TYPE.PAY);
                    var offer_amt = this.PAY_COUNTER.getValue();
                    var request_curr = this.getSelectedCurrency(CURRENCY_TYPE.RECEIVE);
                    var request_amt = this.RECEIVE_COUNTER.getValue();
                    if (this.getMonies(this.player_id, offer_curr, CURRENCY_TYPE.NOTE) < offer_amt) {
                        this.showMessage(_(this.spanYou()+" do not have "+this.createMoniesXstr(offer_amt, offer_curr, CURRENCY_TYPE.NOTE), 'info'));
                    } else if (this.getMonies(to, request_curr, CURRENCY_TYPE.NOTE) < request_amt) {
                        this.showMessage(_(this.spanPlayerName(to)+" does not have "+this.createMoniesXstr(request_amt, request_curr, CURRENCY_TYPE.NOTE), 'info'));
                    } else {
                        this.ajaxcall( "/forex/forex/offerSpotTrade.html", { 
                            to_player: to,
                            off_curr: offer_curr,
                            req_curr: request_curr,
                            lock: true 
                        }, this, function( result ) {  }, function( is_error) { } );
                    }
                } else {
                    this.showMessage(_("You must select player to offer trade to, offered currency, and requested currency"), 'info');
                }
            }
        },

        /**
         * Clicked "Accept" or "Reject" on a Spot Trade offer.
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
         * Clicked "Cancel" button - sends cancellation on a Spot Trade offer.
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
         * Clicked "Confirm" on an Invest action to buy certs.
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
                    this.ajaxcall( "/forex/forex/investCurrency.html", { 
                        buys: buys.join(' '),
                        lock: true 
                    }, this, function( result ) {  }, function( is_error) { } );                        
                }
            }
        },

        /**
         * Clicked "Confirm" on a Divest action to sell certs.
         */
        sellCertificates: function() {
            if (this.checkAction('divestCurrency', true)) {
                var curr = this.DIVEST_CURRENCY;
                var certs = 0;
                if (this.SELL_COUNTER) {
                    certs = this.SELL_COUNTER.getValue();
                }
                if (certs == 0 || curr == null) {
                    this.showMessage(_("No Certificates selected"), "info");
                } else {
                    this.ajaxcall( "/forex/forex/divestCurrency.html", { 
                        curr: curr,
                        amt: certs,
                        lock: true
                    }, this, function( result ) {  }, function( is_error) { } );
                }
            }
        },

        /**
         * Clicked "Sell" as a following seller.
         * @param is_sell true if Sell, false if Don't Sell
         */
        nextSeller: function(is_sell) {
            if (this.checkAction('optDivestCurrency', true)) {
                var curr = this.DIVEST_CURRENCY;
                var certs = is_sell ? this.SELL_COUNTER.getValue() : 0;
                this.ajaxcall( "/forex/forex/optDivestCurrency.html", { 
                    curr: curr,
                    amt: certs,
                    lock: true
                }, this, function( result ) {  }, function( is_error) { } );
            }
        },

        /**
         * Clicked "Confirm" on a Make Contract action.
         */
        takeContract: function() {
            if (this.checkAction('makeContract', true)) {
                if (this.PAY_COUNTER && this.RECEIVE_COUNTER) {
                    var prom_curr = this.getSelectedCurrency(CURRENCY_TYPE.PAY);
                    var prom_amt = this.PAY_COUNTER.getValue();
                    var pay_curr = this.getSelectedCurrency(CURRENCY_TYPE.RECEIVE);
                    var pay_amt = this.RECEIVE_COUNTER.getValue();
                    this.ajaxcall( "/forex/forex/makeContract.html", { 
                        promise: prom_curr,
                        payout: pay_curr,
                        promise_amt: prom_amt,
                        payout_amt: pay_amt,
                        lock: true
                    }, this, function( result ) {  }, function( is_error) { } );
                } else {
                    this.showMessage(_("You must choose the Currencies to pay and receive"), 'info');
                }
            }
        },

        /**
         * Clicked "Confirm" on Resolve Contract action.
         */
        resolveContractQueue: function() {
            if (this.checkAction('resolve', true)) {
                this.ajaxcall( "/forex/forex/resolve.html", { 
                    lock: true
                }, this, function( result ) {  }, function( is_error) { } );
            }
        },

        /**
         * Player chose the currency which will be strengthened.
         * @param {string} currStr
         */
        chooseStrengthen: function(currStr) {
            console.log("strengthen " + currStr);
            if (this.checkAction('chooseCurrencyToStrengthen', true)) {
                this.ajaxcall( "/forex/forex/chooseCurrencyToStrengthen.html", {
                    curr: currStr,
                    lock: true
                }, this, function( result ) {  }, function( is_error) { } );
            }
        },

        ///////////////////////////////////////////////////
        //// Reaction to cometD notifications
        ///////////////////////////////////////////////////

        /*
            setupNotifications:
            In this method, you associate each of your game notifications with your local method to handle it.
            
            Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                  your forex.game.php file.
        */
        setupNotifications: function()
        {
            dojo.subscribe( 'currencyStrengthened', this, "notif_currencyStrengthened" );
            this.notifqueue.setSynchronous( 'notif_currencyStrengthened', 500 );
            dojo.subscribe( 'currencyWeakened', this, "notif_currencyWeakened" );
            this.notifqueue.setSynchronous( 'notif_currencyWeakened', 500 );
            dojo.subscribe( 'moniesChanged', this, "notif_moniesChanged" );
            dojo.subscribe( 'spotTradeOffered', this, "notif_spotTradeOffered" );
            dojo.subscribe( 'spotTradeAccepted', this, "notif_spotTradeAccepted" );
            dojo.subscribe( 'spotTradeRejected', this, "notif_spotTradeRejected" );
            dojo.subscribe( 'spotTradeCanceled', this, "notif_spotTradeCanceled" );
            dojo.subscribe( 'certificatesBought', this, "notif_certificatesBought" );
            this.notifqueue.setSynchronous( 'notif_certificatesBought', 500 );
            dojo.subscribe( 'certificatesSold', this, "notif_certificatesSold" );
            this.notifqueue.setSynchronous( 'notif_certificatesSold', 500 );
            dojo.subscribe( 'contractTaken', this, "notif_contractTaken" );
            this.notifqueue.setSynchronous( 'notif_contractTaken', 500 );
            dojo.subscribe( 'dividendsStackPopped', this, "notif_dividendsPopped" );
            dojo.subscribe( 'contractPaid', this, "notif_contractPaid");
        },

        /**
         * Adjusts counters. Does not do animation (that is handled by individual methods)
         */
        notif_moniesChanged: function( notif ) {
            var player_id = notif.args.player_id;
            var curr = notif.args.curr;
            var amt = parseFloat(notif.args.amt);
            this.noteCounters[player_id][CURRENCY[curr]-1].incValue(amt);
        },

        /**
         * Move currency markers up for this pair.
         */
        notif_currencyStrengthened: function( notif ) {
            var curr = notif.args.curr;
            this.moveCurrencyPairMarkers(curr, 1);
        },

        /**
         * Move currency markers 1 or more spaces down for this pair.
         */
        notif_currencyWeakened: function( notif ) {
           var curr = notif.args.curr;
           var amt = parseInt(notif.args.amt);
           for (let i = 0; i < amt; i++) {
                this.moveCurrencyPairMarkers(curr, -1);
           }
        },    

        /**
         * Show trade offer.
         */
        notif_spotTradeOffered: function( notif ) {
            console.log( 'notif_spotTradeOffered' );
            var spot_trade = this.createSpotTransaction(notif.args[SPOT.FROM], notif.args[SPOT.TO], notif.args[SPOT.OFFER], notif.args[SPOT.REQUEST]);
            console.log( spot_trade );
            this.SPOT_TRANSACTION = spot_trade;
        },    

        /**
         * Notify active player cancelled their offer.
         */
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

        /**
         * Player offered a trade rejected it.
         * @param {Object} notif 
         */
        notif_spotTradeRejected: function( notif ) {
            console.log( 'notif_spotTradeRejected' );
            this.SPOT_TRANSACTION = null;
        },    

        /**
         * When a player buys a Certificate. Take it out of available pile, move it to player's pile.
         * @param {Object} notif 
         */
        notif_certificatesBought: function( notif ) {
            var player_id = notif.args.player_id;
            var curr = notif.args.curr;
            var id = parseInt(notif.args.cert_id);

            // show money being spent (note counter was already ticked by adjustmonies)
            this.moveBankNotes(player_id, curr, -2);
            // gain certificate and tick counter
            this.availableCertCounters[CURRENCY[curr]-1].incValue(-1);
            // show it moving to player's pile
            this.availableCertificates[CURRENCY[curr]-1].removeFromStockById( id, curr+'_cert_counter_icon_'+player_id);
            this.certCounters[player_id][CURRENCY[curr]-1].incValue(1);
        },

        /**
         * When a player sells one or more Certificates. Take it out of player's pile, discard, add monies.
         * @param {Object} notif 
         */
        notif_certificatesSold: function( notif ) {
            var certs = notif.args.certs;
            var curr = notif.args.curr;
            this.DIVEST_CURRENCY = curr;
            // can be null when additional players declined to sell
            if (certs != null) {
                var player_id = notif.args.player_id;
                var curr = notif.args.curr;
                var amt = certs.length;
                // show it leaving player's pile
                this.moveCertificates(this.player_id, curr, amt);
                // decrement player's certs counter
                this.certCounters[player_id][CURRENCY[curr]-1].incValue(-amt);
                // show notes being acquired
                this.moveBankNotes(player_id, curr, amt*2);
            }
        },

        /**
         * When a player takes a Contract.
         * @param {Object} notif 
         */
        notif_contractTaken: function( notif ) {
            var player_id = notif.args.player_id;
            var C = notif.args.conL;
            var promise = notif.args.promise_curr;
            var payout = notif.args.payout_curr;
            var promise_amt = parseFloat(notif.args.promise_amt);
            var payout_amt = parseFloat(notif.args.payout_amt);
            var position = parseInt(notif.args.position);
            // put Contract in Queue
            var contract = {
                "contract": C,
                "location": position,
                "promise": promise,
                "promise_amt": promise_amt,
                "payout": payout,
                "payout_amt": payout_amt,
                "player_id": player_id,
            };
            // slide existing Contracts in Queue to left
            this.pushContractQueue();
            var contract_card = this.format_block('jstpl_contract_card', {"contract": C, "scale": 0.5});
            // slide contract to Queue
            this.slideTemporaryObject( contract_card, 'contract_'+C, 'contract_card_'+C, 'queue_'+position, 500 ).play();
            // slide contract to player board
            this.slideTemporaryObject( contract_card, 'contract_'+C, 'contract_card_'+C, 'player_board_'+player_id, 500 ).play();
            // slide notes from bank to contract display
            this.slideNotesToStack(C, 'promise', promise, promise_amt);
            this.slideNotesToStack(C, 'payout', payout, payout_amt);
            // now put the contract in queue, on display, and on player boards
            this.placeContract(contract);
        },

        /**
         * Remove top Dividend and move stack to back of queue.
         * @param {Object} notif 
         */
        notif_dividendsPopped: function(notif) {
            var div_items = this.divstack.getAllItems();
            this.divstack.removeFromZone(div_items[div_items.length-1], true, 'contracts_div');
            this.addDividendsCounter();
            this.pushContractQueue();
            this.moveDividendsStack(1);
        },

        /**
         * Remove contracts from player boards and display queue.
         * @param {*} notif 
         */
        notif_contractPaid: function(notif) {
            var player_id = notif.args.player_id;
            var C = notif.args.conL;
            var prom_curr = notif.args.promise;
            var prom_amt = parseFloat(notif.args.promise_amt);
            var pay_curr = notif.args.payout;
            var pay_amt = parseFloat(notif.args.payout_amt);
            var q = notif.args.location; 
            // move notes from promise stack and player's board to bank
            debugger;
            this.moveBankNotes(player_id, prom_curr, -prom_amt);
            this.moveContractNotes(C, prom_curr, prom_amt);
            // move notes from payout stack to player's board
            this.moveContractNotes(C, pay_curr, pay_amt, player_id);
            // move Contract from player's board to Contract Display
            this.moveContract(C, 'player_board_'+player_id, 'player_board_'+player_id);
            // remove contract from player board
            document.getElementById('contract_'+player_id+'_'+C).remove();
            // move Contract from Contract Queue to Display
            this.moveContract(C, 'contract_queue_display', 'queue_'+q);
            // delete the contract from the queue
            var qslot = document.getElementById('queue_'+q);
            qslot.removeChild(qslot.firstChild);
        },

    });
});

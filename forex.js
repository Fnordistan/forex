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
const X_MONIES = "x_monies_icon"; // indicates an array of MONIES #_CURR_note|cert

// constants used for tempStateArgs
const SPOT_OFFER = 'spot_offer';
const SPOT_REQUEST = 'spot_request';
const SPOT_TRADE_PLAYER = 'spot_trade_player';
const SPOT_TRADE_TEXT = 'spot_trade_text';

const CURRENCY_TYPE = {
    NOTE: "note",
    CERTIFICATE: "cert"
}

define([
    "dojo","dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter",
    "ebg/stock",
    "ebg/zone"
],
function (dojo, declare) {
    return declare("bgagame.forex", ebg.core.gamegui, {
        constructor: function(){
            console.log('forex constructor');
            // matches css
            var scale = 0.5;
            this.cardwidth = CURR_BASE_W*scale;
            this.cardheight = CURR_BASE_H*scale;
            this.dvdwidth = DIVIDEND_BASE_W*scale;
            this.dvdheight = DIVIDEND_BASE_H*scale;
            this.curr_tok_dim = 25;
                      
            // Here, you can init the global variables of your user interface
            // Example:
            // this.myGlobalValue = 0;

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
                    dojo.place( this.format_block('jstpl_mon_counter', {
                        "curr": curr,
                        "type": 'note',
                        "id": player_id
                    }), player_board_div);

                    dojo.place( this.format_block('jstpl_mon_counter', {
                        "curr": curr,
                        "type": 'cert',
                        "id": player_id
                    }), player_board_div);

                    var note_counter = new ebg.counter();
                    note_counter.create(curr+'_note_counter_'+player_id);
                    this.noteCounters[player_id].push(note_counter);

                    var cert_counter = new ebg.counter();
                    cert_counter.create(curr+'_cert_counter_'+player_id);
                    this.certCounters[player_id].push(cert_counter);
                    // this.addTooltip(curr+'_counter_icon_'+player_id, dojo.string.substitute(_("${rr} Shares"), {rr: RAILROADS[rri]}), '');

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
            this.placeCurrencyCounters();
            this.createAvailableCertificates();
            this.placeCertificates();
            this.createContractDisplay();
            this.createContractQueue();

            // these are read by UI buttons while players are choosing actions
            this.tempStateArgs = {};

            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            console.log( "Ending game setup" );
        },

        /* @Override */
        format_string_recursive : function(log, args) {
            try {
                if (log && args && !args.processed) {
                    args.processed = true;

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
                    if (args.X_MONIES) {
                        for (const m in args.X_MONIES) {
                            var mstr = args.X_MONIES[m];
                            var monies = mstr.split('_');
                            var num = parseInt(monies[0]);
                            var curr = monies[1];
                            var type = monies[2];
                            var monies_span = this.format_block('jstpl_monies', {
                                "num": num,
                                "type": type,
                                "curr": curr,
                            });
                            log = log.replace(mstr, monies_span);
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
        placeCurrencyCounters: function() {
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
                }
                // console.log(certificates[c]);
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

                this.promiseCounters[CONTRACT.C] = new ebg.counter();
                this.promiseCounters[CONTRACT.C].create('promise_'+C+'_cntr');

                this.payoutCounters[CONTRACT.C] = new ebg.counter();
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
        onEnteringState: function( stateName, args )
        {
            console.log( 'Entering state: '+stateName );
            
            switch( stateName )
            {
            
            /* Example:
            
            case 'myGameState':
            
                // Show some HTML block at this game state
                dojo.style( 'my_html_block_id', 'display', 'block' );
                
                break;
           */
           
           
            case 'dummmy':
                break;
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function( stateName )
        {
            console.log( 'Leaving state: '+stateName );
            
            switch( stateName )
            {
            
            /* Example:
            
            case 'myGameState':
            
                // Hide the HTML block we are displaying only during this game state
                dojo.style( 'my_html_block_id', 'display', 'none' );
                
                break;
           */
           
           
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
        spanPlayerName: function(player) {
            var player_id = player['id'];
            var player_name = player['name'];
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
         * Get pair corresponding to curr1 and curr2.
         * @param {*} curr1 
         * @param {*} curr2 
         */
        getCurrencyPair: function(curr1, curr2) {
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
         * For curr1 and curr2, returns two-element array: {strongercurrency: value}
         * @param {*} curr1 
         * @param {*} curr2 
         */
        getExchangeRate: function(curr1, curr2) {
            var exch = [];
            var pair = this.getCurrencyPair(curr1, curr2);
            if (pair != null) {
                exch.push(pair['stronger']);
                exch.push(EXCHANGE_RATE[pair['position']-1]);
            }
            return exch;
        },

        ///////////////////////////////////////////////////
        //// Client "State" Functions
        ///////////////////////////////////////////////////

        /**
         * Add the Action buttons in the menu bar while we are choosing another action.
         */
        addPlayerActionButtons: function() {
            this.addActionButton( ACTIONS.SPOT+BTN, _('Spot Trade'), ACTIONS.SPOT);
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
            if (this.tempStateArgs[SPOT_TRADE_PLAYER] == player) {
                // clear all
                this.tempStateArgs = [];
            } else {
                this.tempStateArgs[SPOT_TRADE_PLAYER] = player;
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
         * Add the actions to Spot Trading buttons
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
            if (this.tempStateArgs[SPOT_TRADE_PLAYER] == null) {
                return;
            }
            if (this.tempStateArgs[SPOT_OFFER] == null) {
                // there should be no currencies clicked, so this is the offer
                this.tempStateArgs[SPOT_OFFER] = curr;
                this.tempStateArgs[SPOT_REQUEST] = null;
            } else if (this.tempStateArgs[SPOT_OFFER] == curr) {
                // clicked on the previously offered currency, so clear both
                this.tempStateArgs[SPOT_OFFER] = null;
                this.tempStateArgs[SPOT_REQUEST] = null;
            } else if (this.tempStateArgs[SPOT_REQUEST] == null) {
                // this is the request
                this.tempStateArgs[SPOT_REQUEST] = curr;
            } else if (this.tempStateArgs[SPOT_REQUEST] == curr) {
                // clicked on previous request currency, so clear it
                this.tempStateArgs[SPOT_REQUEST] = null;
            } else {
                this.tempStateArgs[SPOT_REQUEST] = curr;
            }
            this.setSpotTradeMessage();
        },

        /**
         * Change the text on the spot trade message
         * @param {*} text 
         */
        setSpotTradeMessage: function() {
            var text = "";
            if (this.tempStateArgs[SPOT_TRADE_PLAYER]) {
                text = _("Offer ")+this.spanPlayerName(this.tempStateArgs[SPOT_TRADE_PLAYER]);
                if (this.tempStateArgs[SPOT_OFFER]) {
                    var offer_txt = " ";
                    if (this.tempStateArgs[SPOT_REQUEST]) {
                        // construct a complete message
                        var offer_val = "";
                        var req_val = "";
                        var xchg = this.getExchangeRate(this.tempStateArgs[SPOT_OFFER], this.tempStateArgs[SPOT_REQUEST]);
                        if (this.tempStateArgs[SPOT_OFFER] == xchg[0]) {
                            // the offer is the stronger currency, worth n request bucks
                            offer_val = 1;
                            req_val = xchg[1];
                        } else {
                            // the offer is the weaker currency, the request is worth n offer bucks
                            offer_val = xchg[1];
                            req_val = 1;
                        }
                        offer_txt += this.createMoniesXstr(offer_val, this.tempStateArgs[SPOT_OFFER], CURRENCY_TYPE.NOTE);
                        offer_txt += _(" for ")+this.createMoniesXstr(req_val, this.tempStateArgs[SPOT_REQUEST], CURRENCY_TYPE.NOTE);
                    } else {
                        // only have offer
                        offer_txt += this.createMoniesXstr('', this.tempStateArgs[SPOT_OFFER], CURRENCY_TYPE.NOTE);
                    }
                    text += offer_txt;
                }
            }
            dojo.byId('spot_trade_txt').innerHTML = text;
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
         * @param {*} evt 
         */
        spotTrade: function(evt) {
            if (this.checkAction('offerSpot', true)) {
                this.removeActionButtons();
                // initialize the currencies for trading: to-from
                this.tempStateArgs[SPOT_OFFER] = null;
                this.tempStateArgs[SPOT_REQUEST] = null;

                // this adds the buttons
                var otherPlayers = this.getOtherPlayers();
                this.setDescriptionOnMyTurn(_("Offer a Spot Trade to "), {X_SPOT_TRADE : otherPlayers, X_CURRENCY: CURRENCY_TYPE.NOTE, X_ACTION_TEXT: 'spot_trade_txt'});
                this.addPlayerTradeActions(otherPlayers);
                this.addSpotTradeActions();

                this.addConfirmButton(ACTIONS.SPOT);
                this.addCancelButton();
            }
        },

        /**
         * Actual Ajax call to submit offer.
         */
        submitSpotTrade: function() {
            if (this.checkAction('offerSpot', true)) {
                // have all the parameters been filled?
                var player = this.tempStateArgs[SPOT_TRADE_PLAYER];
                var offer = this.tempStateArgs[SPOT_OFFER];
                var request = this.tempStateArgs[SPOT_REQUEST];
                if (player && offer && request) {
                    this.ajaxcall( "/forex/forex/offerSpotTrade.html", { 
                        to_player: player['id'],
                        off_curr: offer,
                        req_curr: request,
                        lock: true 
                    }, this, function( result ) {  }, function( is_error) { } );                        
                } else {
                    this.showMessage(_("You must select player to offer trade to, offered currency, and requested currency"), 'info');
                }
            }
        },

        /**
         * Player clicked Invest
         * @param {*} evt 
         */
        investCurrency: function(evt) {
            if (this.checkAction('investCurrency', true)) {
                this.removeActionButtons();
                this.addConfirmButton(ACTIONS.INVEST);
                this.addCancelButton();
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
            this.tempStateArgs = {};
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
                    break;
                case ACTIONS.DIVEST:
                    break;
                case ACTIONS.CONTRACT:
                    break;
                case ACTIONS.RESOLVE:
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
            
            // TODO: here, associate your game notifications with local methods
            
            // Example 1: standard notification handling
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
            
            // Example 2: standard notification handling + tell the user interface to wait
            //            during 3 seconds after calling the method in order to let the players
            //            see what is happening in the game.
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
            // this.notifqueue.setSynchronous( 'cardPlayed', 3000 );
            // 
        },  
        
        // TODO: from this point and below, you can write your game notifications handling methods
        
        /*
        Example:
        
        notif_cardPlayed: function( notif )
        {
            console.log( 'notif_cardPlayed' );
            console.log( notif );
            
            // Note: notif.args contains the arguments specified during you "notifyAllPlayers" / "notifyPlayer" PHP call
            
            // TODO: play the card in the user interface.
        },    
        
        */
   });             
});

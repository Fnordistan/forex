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

// 0-indexed array of currencies
const CURRENCIES = ["GBP", "EUR", "USD", "CHF", "JPY", "CAD", "CNY"];
// 0-indexed array
const EXCHANGE_RATE = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8];

const DIVIDENDS = "Dividends";
const BTN = "_btn";
const LOAN = "LN";

const CERT_SPRITES = "img/forex_certificates.png";
const NOTE_SPRITES = "img/forex_notes.png";

// these to match css
const CURR_BASE_W = 150;
const CURR_BASE_H = 97.66;
const DIVIDEND_BASE_H = 150;
const DIVIDEND_BASE_W = 97.66;

// strings that get inserted into format_string_recursive
const X_SPOT_TRADE = "x_spot_trade"; // flags inserting player-to-trade buttons
const X_CURRENCY = "x_currency_buttons"; // flags adding currency buttons
const X_CURRENCIES = "x_currency_choice_buttons"; // flags adding selective list of currency buttons
const X_ACTION_TEXT = "x_action_text"; // span that contains summary of action
const X_ACTION_BUTTONS = "x_action_buttons"; // div with additional science buttons
// matching args from forex.game.php
const X_SPOT_TO = "spot_trade_to";
const X_SPOT_FROM = "spot_trade_from";
// used as messages inserted in my turn message
const SPOT_TRADE_MSG = "spot_trade_txt";
const CONTRACT_MSG = "contract_txt";
const INVEST_MSG = "invest_txt";
const DIVEST_MSG = "divest_txt";

// label for an already executed Spot trade
const SPOT_TRANSACTION = "spot_transaction";
const SPOT_DONE = "spot_trade_done";
// label for currency to sell
const DIVEST_CURRENCY = "divest_currency";
// ms used to set synchronous delay between scoring currencies in endgame
const SCORING_DELAY = 3000;

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

// used to fill in HTML elements
const CURRENCY_TYPE = {
    NOTE: "note",
    CERTIFICATE: "cert",
    PAY: "pay",
    RECEIVE: "receive"
}

define([
    "dojo","dojo/_base/declare", "dojo/on",
    "ebg/core/gamegui",
    "ebg/counter",
    "ebg/stock",
    "ebg/zone",
    g_gamethemeurl + "modules/fcounter.js"
],
function (dojo, declare, on) {
    return declare("bgagame.forex", [
        ebg.core.gamegui,
        forex.fcounter
    ], {
        constructor: function() {
            // matches css
            let scale = 0.5;
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
            
            this.certCounters = [];
            this.noteCounters = [];

            // Setting up player boards
            for( const player_id in gamedatas.players ) {
                this.certCounters[player_id] = [];         
                this.noteCounters[player_id] = [];
                // Setting up player board
                const player_board_div = $('player_board_'+player_id);
                Object.keys(CURRENCY).forEach(curr => {
                    const container = dojo.place( this.format_block('jstpl_cert_note_container', {
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
                    const note_counter = new forex.fcounter();
                    note_counter.create(curr+'_note_counter_'+player_id);
                    // initialize to 0
                    note_counter.setValue(0);
                    this.noteCounters[player_id].push(note_counter);

                    // create player Cert counters
                    const cert_counter = new ebg.counter();
                    cert_counter.create(curr+'_cert_counter_'+player_id);
                    // initialize to 0
                    cert_counter.setValue(0);
                    this.certCounters[player_id].push(cert_counter);
                });
            }

            this.currencyPairZones = [];
            this.availableCertificates = [];
            this.availableCertCounters = [];
            this.heldCertCounters = [];

            this.createBankStacks();
            this.addMonies();
            this.createCurrencyZones();
            this.placeCurrencyPairs();
            this.createAvailableCertificates();
            this.placeCertificates();
            this.createContractQueue();
            this.setupContracts();
            this.setupNotifications();
            this.updateNextContractBanner();

            // may be null
            this.SPOT_TRANSACTION = this.gamedatas[SPOT_TRANSACTION] ? this.createSpotTransactionFromDatas() : null;
            this.SPOT_DONE = this.gamedatas[SPOT_DONE];
            this.DIVEST_CURRENCY = this.gamedatas[DIVEST_CURRENCY];

            if (this.gamedatas['bankrupt'] != 0) {
                this.decorateBankrupt(this.gamedatas['bankrupt']);
            }
        },

        /* @Override */
        format_string_recursive : function(log, args) {
            try {
                if (log && args && !args.processed) {
                    args.processed = true;
                    // for Spot Trade offer banner
                    if (args[X_SPOT_FROM]) {
                        // am I the from player?
                        const from_player = (this.player_id == args[X_SPOT_FROM]) ? this.spanYou() : this.spanPlayerName(args[X_SPOT_FROM]);
                        args.from_player_name = from_player;
                    }
                    if (args[X_SPOT_TO]) {
                        const to_player = (this.player_id == args[X_SPOT_TO]) ? this.spanYou() : this.spanPlayerName(args[X_SPOT_TO]);
                        args.to_player_name = to_player;
                    }
                    if (args.from_player) {
                        args.from_player = this.spanPlayerName(args.from_player);
                    }
                    if (args.to_player) {
                        args.to_player = this.spanPlayerName(args.to_player);
                    }
                    if (args.you) {
                        log = log.replace("You", args.you);
                    }
                    if (args.currency) {
                        // only for curr quantities without a number
                        let curr_str = "";
                        for (const s of args.currency.split(",")) {
                            curr_str += this.createMoniesXstr('', s, CURRENCY_TYPE.NOTE, true) + " ";
                        }
                        args.currency = curr_str;
                    }
                    if (args.contract) {
                        const scale = 0.25;
                        if (args.contract == DIVIDENDS) {
                            const div_num = this.dividendCounter.getValue();
                            args.contract = this.format_block('jstpl_dividend_card', {
                                "div_num" : div_num,
                                "offset": -(5-div_num) * DIVIDEND_BASE_W*scale*2,
                                "scale": scale*0.5
                            });
                        } else {
                            args.contract = this.format_block('jstpl_contract_card', {
                                "contract": args.contract,
                                "scale": scale
                            });
                        }
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
                    if (args['x_monies']) {
                        const n = parseInt(args['x_monies']);
                        for (let i = 1; i <= n; i++) {
                            const argm = 'x_monies'+i;
                            const mon_str = args[argm];
                            const monies = mon_str.split('_');
                            const num = parseFloat(monies[0]);
                            const curr = monies[1];
                            const monies_span = (monies.length == 3) ? this.createMoniesXstr(num, curr, monies[2]) : this.createMoniesXstr(num, curr);
                            args[argm] = monies_span;
                        }
                        log = log.replace('${x_monies}', '');
                    }
                    log = log.replace(/_PLUSNL_/g, '<br/>+ ');
                }
            } catch (e) {
                console.error(log, args, "Exception thrown", e.stack);
            }
            return this.inherited(arguments);
        },

        /**
         * Creates bank stacks
         */
        createBankStacks: function() {
            const CURR_SYM = {
                "GBP" : '&pound;',
                "EUR" : '&euro;',
                "USD" : '&dollar;',
                "CHF" : 'CHf',
                "JPY" : '&yen;',
                "CAD" : 'C&#65284;',
                "CNY" : '&#20803;'
            }

            Object.keys(CURRENCY).forEach(curr => {
                const stack_id = "bank_"+curr;

                for (let i = 1; i < 10; i++) {
                    const offset = -(2*i)+"px";
                    const note = this.format_block('jstpl_bank_note_stacked', {"id": 'bank_'+curr+'_'+i, "curr": curr, "margin": offset});
                    dojo.place(note, stack_id, i);
                }
                const curr_symbol = document.createElement("span");
                curr_symbol.classList.add("frx_curr_symbol");
                curr_symbol.style['color'] = COLORS[curr];
                if (curr == 'CHF' || curr == 'CAD') {
                    curr_symbol.style['transform'] = "matrix(0.55, 0, 0, 0.8, 15, 0)";
                } else if (curr == 'CNY') {
                    curr_symbol.style['transform'] = "scale(0.9)";
                }
                curr_symbol.innerHTML = CURR_SYM[curr];
                dojo.place(curr_symbol, document.getElementById(stack_id).lastChild);
            });
        },

        /**
         * Tick all the currency counters
         */
        addMonies: function() {
            for (const n in this.gamedatas.notes) {
                const note = this.gamedatas.notes[n];
                this.noteCounters[note['player']][CURRENCY[note['curr']]-1].incValue(note['amt']);
            }
        },

        /**
         * Create the zones to hold currency pairs.
         */
        createCurrencyZones: function() {
            Object.keys(CURRENCY).forEach(curr => {
                const pairs = [];
                for (let i = 1; i <= 10; i++) {
                    const currZone = new ebg.zone();
                    const zid = curr+'_'+i;
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
            const held_colors = {
                "GBP": '#ED2026',
                "EUR": '#5256A5',
                "USD": '#2BB673',
                "CHF": '#A04777',
                "JPY": '#9C8679',
                "CAD": '#5F3916',
                "CNY": '#AF7E2B'
            };
        
            Object.keys(CURRENCY).forEach( curr => {
                const avail = new ebg.stock();
                avail.create( this, $('avail_certs_'+curr), this.cardwidth, this.cardheight );
                avail.image_items_per_row = 1;
                avail.extraClasses='frx_card_shadow';
                avail.setSelectionMode(0);
                avail.setOverlap(10, 0);
                avail.onItemCreate = (card_div, card_type, cert_item) => {
                    this.setupCertificate(card_div, card_type);
                };
                avail.addItemType( curr, 0, g_gamethemeurl+CERT_SPRITES, CURRENCY[curr]-1 );
                avail.autowidth = true;
                this.availableCertificates.push(avail);
                // create held and available counters
                const ctr_ids = ['held_certs_'+curr+'_ctr', 'avail_certs_'+curr+'_ctr'];
                ctr_ids.forEach( ctr_id => {
                    const counter = new ebg.counter();
                    counter.create(ctr_id);
                    $(ctr_id).classList.add('frx_heldavail_ctr');
                    const clr = ctr_id.startsWith("held") ? held_colors[curr] : COLORS[curr];
                    Object.assign($(ctr_id).style, {
                        'color': clr,
                        'vertical-align': 'top'
                    });
                    if (ctr_id.startsWith("held")) {
                        this.heldCertCounters.push(counter);
                    } else {
                        this.availableCertCounters.push(counter);
                    }
                });
            });
        },

        /**
         * Set initial locations.
         */
        placeCurrencyPairs: function() {
            const currency_pairs = this.gamedatas.currency_pairs;
            for (const c in currency_pairs) {
                // putting the weaker curr on the stronger curr's board
                const curr1 = currency_pairs[c]['stronger'];
                const curr2 = currency_pairs[c]['curr1'] == curr1 ? currency_pairs[c]['curr2'] : currency_pairs[c]['curr1'];
                const curr_pr = this.format_block('jstpl_flip_counter', {
                    "curr1": curr1,
                    "curr2": curr2
                });
                const currdiv = dojo.place(curr_pr, 'currency_board');
                const posi = currency_pairs[c]['position']-1;
                this.currencyPairZones[CURRENCY[curr1]-1][posi].placeInZone(currdiv.id);
                this.decorateCurrencyPair(currdiv.id, curr1, curr2, posi);
            }
        },

        /**
         * Adds "BASESPOT N" tooltip to currency pair.
         * @param {string} id 
         * @param {string} curr1 
         * @param {string} curr2 
         * @param {int} pos 
         */
        decorateCurrencyPair: function(id, curr1, curr2, pos) {
            this.addTooltip(id, curr1+curr2+' '+EXCHANGE_RATE[pos], 0);
        },

        /**
         * When an certificate stack is empty, clear the counter (don't show 0) and place
         * and empty cert symbol.
         * @param {int} ctr 
         */
        placeEmptyCertificateStack: function(ctr) {
            const div_i = "avail_certs_"+CURRENCIES[ctr];
            const id = div_i+"_ctr";
            $(id).style['display'] = "none";
            const empty_cert_div = document.createElement("div");
            empty_cert_div.id = "empty_certs_"+CURRENCIES[ctr];
            empty_cert_div.classList.add("frx_currency_card", "frx_cert", "frx_"+CURRENCIES[ctr]);
            dojo.place(empty_cert_div, "avail_certs_"+CURRENCIES[ctr]);
            Object.assign(empty_cert_div.style, {
                "margin": "0 -5px",
                "opacity": 0.4
            });
        },

        /**
         * Put all the Certificates in appropriate place.
         */
        placeCertificates: function() {
            const certificates = this.gamedatas.certificates;
            for (const c in certificates) {
                const cert = certificates[c];
                if (cert.loc == 'available') {
                    this.placeAvailableCertificate(cert);
                } else if (cert.loc != 'discard') {
                    // it's held by a player
                    const curr_i = CURRENCY[cert.curr]-1;
                    this.certCounters[cert.loc][curr_i].incValue(1);
                    this.heldCertCounters[curr_i].incValue(1);
                }
            }
            // hide any available cert that shows 0 since the pile is empty
            for (const ctr in this.availableCertCounters) {
                if (this.availableCertCounters[ctr].getValue() == 0) {
                    this.placeEmptyCertificateStack(ctr);
                }
            }
        },

        /**
         * Adds a Certificate to its appropriate available pile, incrementing the counter.
         * @param {Object} certificate
         */
        placeAvailableCertificate: function(certificate) {
            this.availableCertificates[CURRENCY[certificate.curr]-1].addToStockWithId(certificate.curr, certificate.id);
            this.availableCertCounters[CURRENCY[certificate.curr]-1].incValue(1);
        },

        /**
         * Setup only.
         * Creates the Contract Queue, puts all Contracts in it 
         * AND the matching stacks in the Contract Display
         * AND on the player board
         */
        createContractQueue: function() {
            for (const c in this.gamedatas.contracts) {
                const contract = this.gamedatas.contracts[c];
                if (contract.contract == DIVIDENDS) {
                    this.createDividendsStack(contract.location);
                } else {
                    this.placeContract(contract);
                }
            }
        },

        /**
         * Called only during setup.
         * Add tooltips to Contracts, decorate loans, add listeners.
         */
        setupContracts: function() {
            const taken = [];
            for (const c in this.gamedatas.contracts) {
                const contract = this.gamedatas.contracts[c];
                if (contract.contract == DIVIDENDS) {
                    this.decorateDividendStack();
                } else {
                    this.decorateContract(contract);
                    taken.push(contract.contract);
                }
            }
            for (const a in CONTRACT) {
                if (!taken.includes(a)) {
                    this.decorateAvailableContract(a);
                }
            }
        },

        /**
         * Add tooltip to Dividends stack.
         */
        decorateDividendStack: function() {
            const divcards = this.divstack.getAllItems();
            const topdiv = divcards[divcards.length-1];
            const div_num = this.dividendCounter.getValue();
            const scale = 1;
            const tooltip = this.format_block('jstpl_dividend_card', {
                "div_num" : div_num,
                "offset": -(5-div_num) * DIVIDEND_BASE_W*scale*2,
                "scale": scale
            });
            if (divcards.length > 1) {
                this.addTooltipHtml( $(topdiv), tooltip, 0 ); 
            }
            this.addDividendsCounter();
        },

        /**
         * Add tooltips to Contracts, and mark loans.
         * @param {Object} contract 
         */
        decorateContract: function(contract) {
            const tooltip = this.getContractHelpHtml(contract);
            for (const c_div of this.getContractDivs(contract)) {
                this.addTooltip( c_div.id, tooltip, '');
                this.connect(c_div, 'mouseenter', () => {
                    this.highlightContracts(contract, true);
                });
                this.connect(c_div, 'mouseleave', () => {
                    this.highlightContracts(contract, false);
                });
            }
            // add tooltips to the stacks
            if (contract.promise == LOAN) {
                this.decorateLoan(contract);
                for (const curr in contract.loans) {
                    const amt = contract.loans[curr];
                    const loan_id = 'contract_promise_'+contract.contract+'_'+curr;
                    this.addTooltip(loan_id, this.createMoniesXstr(amt, curr, CURRENCY_TYPE.NOTE, true), '');
                }
            } else {
                const promise_id = 'contract_promise_'+contract.contract+'_'+contract.promise;
                this.addTooltip(promise_id, this.createMoniesXstr(contract.promise_amt, contract.promise, CURRENCY_TYPE.NOTE, true), '');
                const payout_id = 'contract_payout_'+contract.contract+'_'+contract.payout;
                this.addTooltip(payout_id, this.createMoniesXstr(contract.payout_amt, contract.payout, CURRENCY_TYPE.NOTE, true), '');
            }
            this.highlightContracts(contract, false);
        },

        /**
         * When hovering or unhovering a Contract, highlight all the instances on player and contract display.
         * @param {Object} contract
         * @param {boolean} bOn
         */
        highlightContracts: function(contract, bOn) {
            let highlightstyle = "none";

            if (contract.player_id != 0) {
                const player = this.gamedatas.players[contract.player_id];
                const pcolor = player.color == "" ? '4871b6' : player.color;
                if (bOn) {
                    highlightstyle = "2px 2px 6px 2px #"+pcolor;
                } else {
                    highlightstyle = "inset 0 0 0 1000px #"+pcolor+"33";
                }
            }

            for (const c_div of this.getContractDivs(contract)) {
                Object.assign(c_div.style, { "box-shadow": highlightstyle });
            }
        },

        /**
         * Given a slot, this clears the previous tooltip for that Contract letter and notes it is available.
         * @param {string} C letter
         */
        decorateAvailableContract: function(C) {
            const tooltip = '<h3>Contract '+C+'</h3>\
                            <span style="width: 100%; text-align: center">Available</span>';
            this.addTooltipHtml("contract_card_"+C, tooltip, 0);
            // stub contract for clearing previous loan if any
            const stubC = {"contract": C, "player_id": 0};
            this.decorateLoan(stubC, true);
            this.highlightContracts(stubC, false);
        },

        /**
         * Find all Contract Cards of this letter and decorate them with loan class,
         * @param {Object} contract 
         * @param {isOn} bRemove take it off
         */
        decorateLoan: function(contract, bRemove = false) {
            for (const c_div of this.getContractDivs(contract)) {
                if (bRemove) {
                    c_div.classList.remove("frx_loan");
                    this.removeAllChildren(c_div);
                } else {
                    c_div.classList.add("frx_loan");
                    const loan = document.createElement("span");
                    loan.innerHTML = _("LOAN");
                    loan.classList.add("frx_loan_text");
                    dojo.place(loan, c_div);
                }
            }
        },

        /**
         * Decorate bankrupt player's board.
         * @param {int} player_id 
         */
        decorateBankrupt: function(player_id) {
            const player_board_id = 'player_board_'+player_id;
            const playboard = document.getElementById(player_board_id);
            playboard.style.backgroundColor = "red";
            const bankrupt = document.createElement("span");
            bankrupt.innerHTML = _("BANKRUPT");
            bankrupt.classList.add("frx_bankrupt_text");
            dojo.place(bankrupt, player_board_id);
        },

        /**
         * Create the tooltip HTML for a Contract (regular or loan).
         * @param {Object} contract 
         */
        getContractHelpHtml: function(contract) {
            let contract_txt ="<h3>"+_("Contract ")+contract.contract+" ("+ this.spanPlayerName(contract.player_id)+ ")</h3>";
            if (contract.promise == LOAN) {
                contract_txt += _(" Loan for ");
                const loans = contract.loans;
                for (const [curr, amt] of Object.entries(loans)) {
                    contract_txt += this.createMoniesXstr(amt, curr);
                }
            } else {
                contract_txt += this.createMoniesXstr(contract.promise_amt, contract.promise);
                contract_txt += _(" for ") + this.createMoniesXstr(contract.payout_amt, contract.payout);
            }
            return contract_txt;
        },

        /**
         * Get an array of Contract elements associated with a letter.
         * Checks that the element actually exists.
         * @param {Object} contract
         * @returns array of elements.
         */
        getContractDivs: function(contract) {
            const contract_divs = [];
            const player_contract = document.getElementById('contract_'+contract.player_id+'_'+contract.contract);
            if (player_contract) {
                contract_divs.push(player_contract);
            }
            const contract_displayed = document.getElementById('contract_card_'+contract.contract);
            if (contract_displayed) {
                contract_divs.push(contract_displayed);
            }
            const q_div = document.getElementById('contract_queue_container').getElementsByClassName("frx_"+contract.contract);
            if (q_div.length != 0) {
                contract_divs.push(q_div[0]);
            }
            return contract_divs;
        },

        /**
         * Create the Dividends stack as a Zone.
         * @param {int} q
         */
         createDividendsStack: function(q) {
            const div_el = 'queue_'+q;
            this.divstack = new ebg.zone();
            this.divstack.create(this, div_el, this.dvdwidth, this.dvdheight);
            this.divstack.setPattern('verticalfit');

            // card back
            const cardback = this.format_block('jstpl_dividend', {
                "div_num" : "bottom",
                "offset": -5 * this.dvdwidth,
                "margin": 0
            });
            const divcardback = dojo.place(cardback, 'contract_queue_container');
            this.divstack.placeInZone(divcardback.id);

            // put each remaining dividend in stack, last first
            const dividends = parseInt(this.gamedatas.dividends);
            for (let i = 0; i < dividends; i++) {
                const div_num = 4-i;
                const dividend = this.format_block('jstpl_dividend', {
                    "div_num" : div_num,
                    "offset": -div_num * this.dvdwidth,
                    "margin": i
                });
                const divcard = dojo.place(dividend, 'contract_queue_container');
                this.divstack.placeInZone(divcard.id);
            }
            // we put the counter on top of the last Dividend
            this.addDividendsCounter();
        },

        /**
         * Put the Dividends stack counter on top of the stack
         */
        addDividendsCounter: function() {
            const items = this.divstack.getAllItems();
            const last_id = items[items.length-1];
            dojo.place(this.format_block('jstpl_dividend_counter'), last_id);
            this.dividendCounter = new ebg.counter();
            this.dividendCounter.create('dividend_counter');
            this.dividendCounter.setValue(items.length-1);
        },

        /**
         * Takes the existing Dividends stack and moves all the items to a new position.
         * @param {int} q
         */
        moveDividendStack: function(q) {
            const q_id = 'queue_'+q;
            // create the new zone
            const new_stack = new ebg.zone();
            new_stack.create(this, q_id, this.dvdwidth, this.dvdheight);
            new_stack.setPattern('verticalfit');

            const dividends = this.divstack.getAllItems();
            dividends.forEach(d => {
                this.divstack.removeFromZone(d, false, q_id);
                new_stack.placeInZone(d);
            });
            // counter automatically moves
            this.divstack = new_stack;
            this.decorateDividendStack();
        },

        /**
         * Push all items in a ContractQueue slot to the right.
         */
        pushContractQueue: function() {
            // start with rightmost
            for (let q = 7; q > 0; q--) {
                this.slideContractQueue(q, q+1);
            }
        },

        /**
         * Move contents of one queue slot to another. Show the animation.
         * @param {int} start 
         * @param {int} end 
         */
        slideContractQueue: function(start, end) {
            const q = 'queue_'+start;
            const q2 = 'queue_'+end;
            const div_q = document.getElementById(q);
            const div_q2 = document.getElementById(q2);
            const is_dividends = (div_q.childNodes.length > 0 && div_q.firstChild.classList.contains("frx_dividend"));
            if (is_dividends) {
                if (end < 8) {
                    this.moveDividendStack(end);
                }
            } else {
                let d = 0;
                while (div_q.firstChild) {
                    const c = div_q.firstChild;
                    // create a temp copy to slide
                    const temp_c = dojo.clone(c);
                    const child = div_q.removeChild(c);
                    // show movement
                    this.slideTemporaryObject( temp_c, 'contract_queue_container', div_q, div_q2, 500, d*500 ).play();
                    div_q2.appendChild(child);
                    d++;
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
                const note = this.format_block('jstpl_bank_note', {"curr": curr});
                this.slideTemporaryObject( note, 'bank_container', 'bank_'+curr, 'contract_'+type+'_'+contract, 500, p*250 ).play();
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
            this.placeContractInDisplay(contract);
            this.placeContractOnPlayerBoard(contract);
        },

        /**
         * Puts the contract in the queue at the correct spot
         */
        placeContractInQueue: function(contract) {
            // first place in queue
            const q = contract.location;
            const q_div = 'queue_'+q;
            const contract_div = this.format_block('jstpl_contract_card_wid', {"id": "contract_"+contract.contract+"_"+q, "contract" : contract.contract, "scale": 0.5 });
            const contract_card = dojo.place(contract_div, q_div);
            // to fit in zone box
            contract_card.style.margin = "0px";
        },

        /**
         * Puts promise and payout currencies in stacks on Contract display and adds counters.
         * @param {Object} contract
         */
        placeContractInDisplay: function(contract) {
            if (contract.promise == LOAN) {
                this.populateLoan(contract);
            } else {
                this.populateContractCurrencyStack(contract, CURRENCY_TYPE.PAY);
                this.populateContractCurrencyStack(contract, CURRENCY_TYPE.RECEIVE);
            }
        },

        /**
         * Put the Notes on either promise or payout side of the Contract.
         * @param {Object} contract 
         * @param {enum} type PAY or RECEIVE
         */
        populateContractCurrencyStack: function(contract, type) {
            const curr = (type == CURRENCY_TYPE.PAY) ? contract.promise : contract.payout;
            const amt = (type == CURRENCY_TYPE.PAY) ? contract.promise_amt : contract.payout_amt;
            this.createCurrencyStack(contract.contract, type, curr, amt);
        },

        /**
         * This contract is a Loan, so get all the loans and stack them in the "promise" side.
         * @param {Object} contract 
         */
        populateLoan: function(contract) {
            const loans = contract.loans;
            // this gets passed to the next stack
            const stack_ct = Object.keys(loans).length;
            let stack = 0;
            // iterate in reverse order - biggest stacks first
            for (const [curr, amt] of Object.entries(loans).sort((a,b) => b[1] - a[1])) {
                const stack_div = this.createCurrencyStack(contract.contract, CURRENCY_TYPE.PAY, curr, amt);
                //now we need to arrange this stack if there are multiple loans
                if (stack_ct > 1) {
                    this.shiftLoanStack(stack, stack_ct, stack_div);
                    stack++;
                }
            }
        },

        /**
         * With multiple stacks on one loan space, use transform
         * to rearrange the stacks.
         * @param {int} stack in order, tallest is 0
         * @param {int} stack_ct total number of stacks
         * @param {Object} stack_div element of the stack div
         */
        shiftLoanStack: function(stack, stack_ct, stack_div) {
            // these matrixes are indexed by stack number x stack count
            const xoff = [
                [0, -1, -2, -1, -2, -2],
                [null, 0, -1, -1, -1, -2],
                [null, null, 0, 0, -1, -1],
                [null, null, null, 0, 0, -1],
                [null, null, null, null, 0, 0],
                [null, null, null, null, null, 0]
            ];
            const yoff = [
                [0, 0, 0, -1, 0, -1],
                [null, 0, 0, 0, -1, 0],
                [null, null, 0, -1, 0, -1],
                [null, null, null, 0, -1, 0],
                [null, null, null, null, 0, -1],
                [null, null, null, null, null, 0]
            ];
            // only varies by stack count
            const scale = [1, 1, 0.75, 1, 0.75, 0.75];
            const s = scale[stack_ct-1];
            const w = this.cardwidth * s * xoff[stack][stack_ct-1];
            const h = this.cardheight * s * yoff[stack][stack_ct-1];
            stack_div.style.transform = 'scale('+s+') translate('+w+'px, '+h+'px)';
        },

        /**
         * Creates an actual stack of Notes next to a Contract.
         * @param {string} C contract letter
         * @param {enum} type CURRENCY_TYPE
         * @param {string} curr 
         * @param {int} amt
         * @returns the stack div element
         */
        createCurrencyStack: function(C, type, curr, amt) {
            const stack = (type == CURRENCY_TYPE.PAY) ? "promise" : "payout";
            const stack_container_id = 'contract_'+stack+'_'+C;
            const stack_id = stack_container_id+'_'+curr;
            const stack_div = '<div id=\"'+stack_id+'\"></div>';
            const stack_div_el = document.getElementById(stack_div) ?? dojo.place(stack_div, stack_container_id);
            // holds Notes
            for (let i = 0; i < amt; i++) {
                const off = 2*i;
                let offset = "0px";
                if (type == CURRENCY_TYPE.PAY) {
                    offset = -off+"px";
                } else {
                    offset = -off+"px "+off+"px";
                }
                const note = this.format_block('jstpl_bank_note_stacked', {"id": curr+'_'+C+'_'+i, "curr": curr, "margin": offset});
                dojo.place(note, stack_id, i);
            }
            // put the counter on top of the last Note
            this.putCounterOnStack(C, curr, stack_id, amt);
            return stack_div_el;
        },

        /**
         * When a second loan must be moved to the previous loan.
         * @param {string} from letter of Contract being turned into 2nd loan
         * @param {string} to letter of existing loan Contract
         * @param {string} curr new loan currency
         * @param {float} amt new loan amount
         * @return {Object} the new set of loans
         */
        moveToLoan: function(from, to, curr, amt) {
            const stack_container_from = 'contract_promise_'+from;
            const stack_container_to = 'contract_promise_'+to;
            const stack_from = stack_container_from+'_'+curr;
            const stack_div = document.getElementById(stack_from);
            let d = 0;
            while (stack_div.firstChild) {
                stack_div.removeChild(stack_div.lastChild);
                const note = this.format_block('jstpl_bank_note', {"curr": curr});
                this.slideTemporaryObject( note, stack_container_from, stack_from, stack_container_to, 500, d*250 ).play();
                d++;
            }
            stack_div.remove();
            // now repopulate the stacks
            // first have to reconstruct the contract with all the loans
            const loans = {};
            loans[curr] = amt;
            const destination_stack = document.getElementById(stack_container_to);
            const oldloans = destination_stack.children;
            for (const i in oldloans) {
                if (oldloans[i].tagName == 'DIV') {
                    const id = oldloans[i].id;
                    const loancurr = id.substring(id.length-3);
                    const loanamt = $(id).children.length;
                    if (loancurr == curr) {
                        // previous loan of same currency
                        loans[curr] += loanamt;
                    } else {
                        loans[loancurr] = loanamt;
                    }
                }
            }
            const contract = {
                "contract": to,
                "loans": loans
            }
            // clear the previous children
            this.removeAllChildren(destination_stack);
            this.populateLoan(contract);
            return loans;
        },

        /**
         * For when a new loan has been taken, and we are pushing a single buck onto the current promise stack.
         * @param {string} C contract letter
         * @param {string} curr 
         * @param {float} amt
         */
        pushLoanBuckOntoStack: function(C, curr, amt) {
            const stack_id = 'contract_promise_'+C+'_'+curr;
            const numnotes = document.getElementById(stack_id).childElementCount;
            // put a new note on top of it
            const offset = -(2*numnotes)+"px";
            const note = this.format_block('jstpl_bank_note_stacked', {"id": curr+'_'+C+'_'+numnotes, "curr": curr, "margin": offset});
            dojo.place(note, stack_id, numnotes);
            // delete old counter and recreate
            const counter_id = curr+'_note_stack_ctr_'+C;
            document.getElementById(counter_id).remove();
            this.putCounterOnStack(C, curr, stack_id, amt);
        },

        /**
         * On a currency stack, find the topmost note HTML div and put a counter on it.
         * @param {string} C 
         * @param {string} curr 
         * @param {string} stack_id of stack div
         * @param {float} amt 
         */
        putCounterOnStack: function(C, curr, stack_id, amt) {
            // put the counter on top of the last Note
            const counter = new forex.fcounter();
            const top_note = document.getElementById(stack_id).lastChild;
            const ctr_id = dojo.place(this.format_block('jstpl_stack_counter', {
                "id": C,
                "curr": curr,
                "type": CURRENCY_TYPE.NOTE
            }), top_note);
            counter.create(ctr_id);
            counter.setValue(amt);
        },

        /**
         * Place a contract on the player board
         * @param {Object} contract 
         */
        placeContractOnPlayerBoard: function(contract) {
            const C = contract.contract;
            const player_id = contract.player_id;
            const player_board_div = $('player_board_'+player_id);
            const contract_div = this.format_block('jstpl_contract_card_wid', {"id": 'contract_'+player_id+'_'+C, "contract" : C, "scale": 0.25 });
            contract_div.id = "contract_"+player_id+"_"+C;
            dojo.place(contract_div, player_board_div);
        },

        /**
         * Adds tooltip to a Certificate
         * @param {string} card_div
         * @param {string} curr
         */
        setupCertificate: function(card_div, curr) {
            this.addTooltip( card_div.id, curr+_(' Certificate'), '');
        },

        ///////////////////////////////////////////////////
        //// Game & client states
        
        // onEnteringState: this method is called each time we are entering into a new game state.
        //                  You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState: function( stateName, args ) {
            switch( stateName ) {
                case 'playerAction':
                    this.DIVEST_CURRENCY = null;
                    break;
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function( stateName ) {
            switch( stateName ) {
                case 'playerAction':
                    this.removeActionButtons();
                    this.SPOT_DONE = 0;
                    break;
            }
        },

        // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
        //                        action status bar (ie: the HTML links in the status bar).
        //        
        onUpdateActionButtons: function( stateName, args ) {
            if (this.isCurrentPlayerActive()) {
                switch( stateName ) {
                    case 'playerAction':
                        this.addPlayerActionButtons();
                        break;
                    case 'offerResponse':
                        if (this.player_id == this.SPOT_TRANSACTION[SPOT.TO]) {
                            this.addSpotTradeButtons();
                        }
                        break;
                    case 'nextDivest':
                        this.addDivestOption();
                        break;
                    case 'strengthenCurrency':
                        this.addCurrenciesStrengthen();
                        break;
                    case 'strongestCurrency':
                        this.addCurrenciesChooseScoring(args.currencies);
                        break;
                }
            } else if (stateName == 'offerResponse' && this.player_id == this.SPOT_TRANSACTION[SPOT.FROM]) {
                this.addCancelSpotTrade();
            }
        },

        ///////////////////////////////////////////////////
        //// Utility methods

        /**
         * Remove all children of this node.
         * @param {Object} node 
         */
        removeAllChildren: function(node) {
            while (node.firstChild) {
                node.removeChild(node.lastChild);
            }
        },

        /**
         * Change the title banner.
         * @param {string} text 
         */
        setMainTitle : function(text) {
            const main = $('pagemaintitletext');
            main.innerHTML = text;
        },

        /**
         * Create span with Player's name in color.
         * @param {int} player 
         */
        spanPlayerName: function(player_id) {
            const player = this.gamedatas.players[player_id];
            const color_bg = player.color_back ? player.color_back : "";
            const pname = "<span style=\"font-weight:bold;color:#" + player.color + ";" + color_bg + "\">" + player.name + "</span>";
            return pname;
        },

        /**
         * From BGA Cookbook. Return "You" in this player's color
         */
        spanYou : function() {
            const color = this.gamedatas.players[this.player_id].color;
            let color_bg = "";
            if (this.gamedatas.players[this.player_id] && this.gamedatas.players[this.player_id].color_back) {
                color_bg = "background-color:#" + this.gamedatas.players[this.player_id].color_back + ";";
            }
            const you = "<span style=\"font-weight:bold;color:#" + color + ";" + color_bg + "\">" + __("lang_mainsite", "You") + "</span>";
            return you;
        },

        /**
         * Create row of Currency buttons (Note or Certificate) to be connected to actions.
         * Each one has id "${curr}_${type}_btn"
         * @param {string} curr_type
         * @param {array} filter (optional) only include currency buttons for these
         */
        insertCurrencyButtons: function(curr_type, filter) {
            let curr_buttons = "<div>";
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
         * Puts top banner for active player.
         * @param {string} text
         * @param {Array} moreargs
         */
        setDescriptionOnMyTurn : function(text, moreargs) {
            this.gamedatas.gamestate.descriptionmyturn = text;
            let tpl = Object.assign({}, this.gamedatas.gamestate.args);

            if (!tpl) {
                tpl = {};
            }
            if (typeof moreargs != 'undefined') {
                for ( const key in moreargs) {
                    if (moreargs.hasOwnProperty(key)) {
                        tpl[key]=moreargs[key];
                    }
                }
            }
 
            let title = "";
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
            let player_cpy = Object.assign({}, this.gamedatas.players);
            delete player_cpy[this.player_id];
            return player_cpy;
        },

        /**
         * Get pair corresponding to curr1 and curr2 from the gamedatas sent by server.
         * @param {string} curr1
         * @param {string} curr2
         */
        findCurrencyPair: function(curr1, curr2) {
            const currency_pairs = this.gamedatas.currency_pairs;
            for (const c in currency_pairs) {
                const pair = currency_pairs[c];
                if ((pair['curr1'] == curr1 && pair['curr2'] == curr2) || (pair['curr1'] == curr2 && pair['curr2'] == curr1)) {
                    return pair;
                }
            }
            return null;
        },

        /**
         * For curr1 and curr2, create a Struct with info about a currency pair
         * @param {string} curr1
         * @param {string} curr2
         */
        createCurrencyPair: function(curr1, curr2) {
            const pair = {};
            const pr = this.findCurrencyPair(curr1, curr2);
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
        createSpotTransactionFromDatas: function() {
            const spot = this.gamedatas[SPOT_TRANSACTION];
            const player_from = spot[SPOT.FROM];
            const player_to = spot[SPOT.TO];
            // these are sent as ints
            const offer = CURRENCIES[spot[SPOT.OFFER]-1];
            const request = CURRENCIES[spot[SPOT.REQUEST]-1];
            const spot_transaction = this.createSpotTransaction(player_from, player_to, offer, request);
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
            const pair = this.createCurrencyPair(offer, req);
            const offer_amt = (pair[PAIR.STRONGER] == offer) ? 1 : pair[PAIR.EXCHANGE];
            const req_amt = (pair[PAIR.STRONGER] == req) ? 1 : pair[PAIR.EXCHANGE];
            const spot = {};
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
         * @param {int} player_id 
         * @param {string} curr 
         * @param {float} amt 
         */
        moveBankNotes: function(player_id, curr, amt) {
            // first create the html image
            const bank_notes = 'bank_'+curr;
            const player_notes = curr+'_note_counter_icon_'+player_id;
            let from = bank_notes;
            let to = player_notes;
            let parent_id = bank_container;
            if (amt < 0) {
                // it's going from player to bank
                from = player_notes;
                to = bank_notes;
                parent_id = curr+'_note_'+player_id+'_container';
            }
            const note_html = this.format_block('jstpl_bank_note', {
                "curr": curr
            });
            for (let i = 0; i < Math.abs(amt); i++) {
                this.slideTemporaryObject( note_html, parent_id, from, to, 500, i*250 ).play();
            }
        },

        /**
         * For moving money off a Contract Display, to bank or player board.
         * @param {string} contract letter
         * @param {string} curr currency type
         * @param {player_id} optional if null then it's going from promise to bank, otherwise from payout to player
         */
        moveContractNotes: function(contract, curr, player_id) {
            const parent_id = 'contract_'+contract;
            let from = 'contract_promise_'+contract+'_'+curr;
            let to = 'bank_'+curr;
            if (player_id) {
                from = 'contract_payout_'+contract+'_'+curr;
                to = curr+'_note_counter_icon_'+player_id;
            }
            // cleanup: remove notes from stack
            const stack = document.getElementById(from);
            let d = 0;
            while (stack.firstChild) {
                const note_html = this.format_block('jstpl_bank_note', {"curr": curr});
                this.slideTemporaryObject( note_html, parent_id, from, to, 500, d*250 ).play();
                stack.removeChild(stack.firstChild);
                d++;
            }
        },

        /**
         * For sliding a Contract card back to the Contract Display either from player's board or queue
         * @param {string} contract letter
         * @param {string} parent_id enclosing container, queue or player board
         * @param {string} from queue slot or player's board
         */
        moveContract: function(contract, parent_id, from) {
            const contract_html = this.format_block('jstpl_contract_card', {
                "contract": contract,
                "scale": 0.5
            });
            const to = 'contract_card_'+contract;
            this.slideTemporaryObject( contract_html, parent_id, from, to, 1000 ).play();
        },

        /**
         * Show certificates moving from player's pile.
         * @param {int} player_id 
         * @param {string} curr 
         * @param {float} amt 
         */
        moveCertificates: function(player_id, curr, amt) {
            // first create the html image
            const discard_pile = 'page-title';
            const player_certs = curr+'_cert_counter_icon_'+player_id;
            const from = player_certs;
            const to = discard_pile;
            const parent_id = curr+'_cert_'+player_id+'_container';
            const cert_html = this.format_block('jstpl_certificate', {
                "curr": curr
            });
            for (let i = 0; i < amt; i++) {
                this.slideTemporaryObject( cert_html, parent_id, from, to, 500, i*500 ).play();
            }
        },

        /**
         * Animates moving notes between players in spot trades
         * @param {int} off_player who made the offer 
         * @param {int} to_player accepted the offer
         * @param {string} off_curr 
         * @param {string} req_curr 
         * @param {float} off_amt 
         * @param {float} req_amt 
         */
        tradeBankeNotes: function(off_player, req_player, off_curr, req_curr, off_amt, req_amt) {
            const off_player_notes = off_curr+'_note_counter_icon_'+off_player;
            const req_player_notes = req_curr+'_note_counter_icon_'+req_player;
            const off_parent_id = off_curr+'_note_'+off_player+'_container';
            const req_parent_id = req_curr+'_note_'+req_player+'_container';
            // animate offer currency going off_player -> req_player
            const off_note_html = this.format_block('jstpl_bank_note', {
                "curr": off_curr
            });
            for (let i = 0; i < Math.ceil(Math.abs(off_amt)); i++) {
                this.slideTemporaryObject( off_note_html, off_parent_id, off_player_notes, req_player_notes, 500, i*1000 ).play();
            }
            // animate request currency going req_player -> from_player
            const req_note_html = this.format_block('jstpl_bank_note', {
                "curr": req_curr
            });
            for (let j = 0; j < Math.ceil(Math.abs(req_amt)); j++) {
                this.slideTemporaryObject( req_note_html, req_parent_id, req_player_notes, off_player_notes, 500, j*1000 ).play();
            }
        },

        /**
         * Move notes from player's base stack to the converted stack (final scoring).
         * @param {integer} player_id 
         * @param {string} base_curr currency being converted
         * @param {string} conv_curr currency being scored
         * @param {float} amt
         */
        moveBaseNotes: function(player_id, base_curr, conv_curr, amt) {
            const base_notes = base_curr+'_note_counter_icon_'+player_id;
            const conv_notes = conv_curr+'_note_counter_icon_'+player_id;
            const parent_id = base_curr+'_note_'+player_id+'_container';
            // animate currency going from base to converted
            const base_note_html = this.format_block('jstpl_bank_note', {
                "curr": base_curr
            });
            for (let i = 0; i < Math.ceil(amt); i++) {
                this.slideTemporaryObject( base_note_html, parent_id, base_notes, conv_notes, 500, i*500 ).play();
            }
        },

        /**
         * Create a string for the x_monies arg in logs
         * @param {float} num 
         * @param {string} curr 
         * @param {enum} type defaults to note
         * @param {bool} no_icon (optional) if true, displays only # curr, not icon
         */
        createMoniesXstr: function(num, curr, type = CURRENCY_TYPE.NOTE, no_icon = false) {
            const jstpl = no_icon ? 'jstpl_curr_ct' : 'jstpl_monies';
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
            const counters = (type == CURRENCY_TYPE.NOTE) ? this.noteCounters : this.certCounters;
            return counters[player_id][CURRENCY[curr]-1].getValue();
        },

        ///////////////////////// MOVE CURRENCY PAIRS /////////////////////////

        /**
         * Move a currency when it has been strengthened or weakened
         * @param {string} curr 
         * @param {int} val 
         */
        moveCurrencyPairMarkers: function(curr, val) {
            const currencypairs = this.gamedatas.currency_pairs;
            // collect pairs this currency is weaker or stronger
            const weaker = [];
            const stronger = [];
            for (const cp in currencypairs) {
                const pair = currencypairs[cp];
                if (pair['curr1'] == curr || pair['curr2'] == curr) {
                    let topush = curr == pair['stronger'] ? stronger : weaker;
                    topush.push(pair);
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
            for (const s in stronger) {
                this.moveCounterRight(stronger[s]);
            }
            for (const w in weaker) {
                this.moveCounterLeft(weaker[w]);
            }
        },

        /**
         * Weaken the currency.
         * @param {array} stronger 
         * @param {array} weaker 
         */
        weakenCurrency: function(stronger, weaker) {
            for (const s in stronger) {
                this.moveCounterLeft(stronger[s]);
            }
            for (const w in weaker) {
                this.moveCounterRight(weaker[w]);
            }
        },

        /**
         * Either this currency is being weakened or the stronger currency whose board it's on is being strengthened.
         * @param {Object} pair 
         */
        moveCounterRight: function(pair) {
            if (pair['position'] < 10) {
                this.shiftCounter(pair, 1);
            }
        },

        /**
         * Either this currency is being strengthened or the stronger currency whose board it's on is being weakened.
         * @param {Object} pair 
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
            const zone = this.currencyPairZones[CURRENCY[pair['stronger']]-1][pair['position']-1];
            const destZone = this.currencyPairZones[CURRENCY[pair['stronger']]-1][pair['position']-1+dir];
            const pair_id = this.moveCounter(pair, zone, destZone);
            pair['position'] = parseInt(pair['position'])+dir;
            const weaker = pair['stronger'] == pair['curr1'] ? pair['curr2'] : pair['curr1'];
            this.decorateCurrencyPair(pair_id, pair['stronger'], weaker, pair['position']-1);
        },

        /**
         * Stronger has been weakened, or weaker has been strengthened
         * either way, this curr gets taken off stronger's board, and the prev stronger now
         * appears on this curr's board.
         * @param {Object} pair 
         */
        flipPair: function(pair) {
            const curr = pair['stronger'] == pair['curr1'] ? pair['curr2'] : pair['curr1'];
            const curr2 = pair['curr1'] == curr ? pair['curr2'] : pair['curr1'];
            const startZone = this.currencyPairZones[CURRENCY[pair['stronger']]-1][0];
            const destZone = this.currencyPairZones[CURRENCY[curr]-1][0];
            const pair_id = this.moveCounter(pair, startZone, destZone);
            // do the flipping animation
            $(pair_id).classList.toggle("flip");
            pair['stronger'] = curr;
            pair['position'] = 1;
            this.decorateCurrencyPair(pair_id, curr, curr2, 0);
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
            let pair_id = 'pair_'+pair['curr1']+'_'+pair['curr2'];
            if (document.getElementById(pair_id) == null) {
                pair_id = 'pair_'+pair['curr2']+'_'+pair['curr1'];
            }
            startZone.removeFromZone(pair_id, false, endZone.id);
            endZone.placeInZone(pair_id);
            return pair_id;
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
            let curr = "";
            const selected = document.getElementsByClassName("frx_curr_"+type);
            if (selected.length != 0) {
                const sel_id = selected[0].id;
                curr = sel_id.substring(0,3);
            }
            return curr;
        },

        /**
         * Count the certificates of each currency held by each player,
         * and return an array of the currency(s) held by the most players.
         */
        getMostHeldCertificates: function() {
            const currCount = {};
            for (const ctr in this.certCounters) {
                const playerCerts = this.certCounters[ctr];
                for (const C in CURRENCY) {
                    const ci = CURRENCY[C];
                    const cert_ct = playerCerts[ci-1].getValue();
                    if (C in currCount) {
                        currCount[C] += cert_ct;
                    } else {
                        currCount[C] = cert_ct;
                    }
                }
            }
            let held = [];
            let max = 0;
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

        /**
         * Checks if player can invest, and adds either active or inactive button.
         */
        addInvestActionButton: function() {
            this.addActionButton( ACTIONS.INVEST+BTN, _('Invest'), ACTIONS.INVEST);
            let may_invest = false;
            // just need one currency that player can buy
            Object.keys(CURRENCY).forEach(curr => {
                if (!may_invest) {
                    if (this.checkCanInvest(curr) == null) {
                        may_invest = true;
                    }
                }
            });
            if (!may_invest) {
                $(ACTIONS.INVEST+BTN).classList.add("disabled");
            }
        },

        /**
         * Checks if player has any Certificates to divest, and adds either active or inactive button.
         */
         addDivestActionButton: function() {
            this.addActionButton( ACTIONS.DIVEST+BTN, _('Divest'), ACTIONS.DIVEST);
            let may_divest = false;
            Object.keys(CURRENCY).forEach(curr => {
                if (!may_divest) {
                    const certs = this.getMonies(this.player_id, curr, CURRENCY_TYPE.CERTIFICATE);
                    if (certs > 0) {
                        may_divest = true;
                    }
                }
            });
            if (!may_divest) {
                $(ACTIONS.DIVEST+BTN).classList.add("disabled");
            }
        },

        /**
         * Checks whether there are any available contracts, then adds either active or inactive button.
         */
        addMakeContractButton: function() {
            this.addActionButton( ACTIONS.CONTRACT+BTN, _('Make Contract'), ACTIONS.CONTRACT);
            const nextContract = this.getAvailableContract();
            if (nextContract == null) {
                $(ACTIONS.CONTRACT+BTN).classList.add("disabled");
            }
        },

        /**
         * Fill in the text in the next contract field below Contract Queue.
         * @param {string} conL optional
         */
        updateNextContractBanner: function(conL) {
            if (conL == null) {
                conL = this.getContractToResolve();
            }
            const next = document.getElementById("next_contract");
            next.innerHTML = _("Next Contract: ") + conL;
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
            this.addInvestActionButton();
            this.addDivestActionButton();
            this.addMakeContractButton();
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
            const currencies = this.getMostHeldCertificates();
            // sanity check
            if (currencies.length == 1) {
                // should not happen!
                throw "Only one currency is held by most players; should not be in this state";
            }
            this.setDescriptionOnMyTurn(_("Choose which currency will be strengthened:"), {X_CURRENCIES: currencies});
            this.addChooseStrengthen(currencies);
        },

        /**
         * When player must choose which Currency is the final scoring one.
         * @param {array} currencies 
         */
         addCurrenciesChooseScoring: function(currencies) {
            // sanity check
            if (currencies.length == 1) {
                // should not happen!
                throw "Only one currency to choose from; should not be in this state";
            }
            this.setDescriptionOnMyTurn(_("Choose which currency will be used for final scoring:"), {X_CURRENCIES: currencies});
            this.addChooseStrongest(currencies);
        },

        /**
         * Add an action to the buttons for each currency to choose it to be the one that is stronger/strengthened.
         * @param {array} currencies 
         */
        addChooseStrengthen: function(currencies) {
            currencies.forEach(curr => {
                const btn_id = curr+'_cert_btn';
                $(btn_id).addEventListener('click', () => {
                    this.chooseStrengthen(curr);
                });
            });
        },

        /**
         * Add an action to the buttons for each currency to choose it to be the one that is stronger/strengthened.
         * @param {array} currencies 
         */
         addChooseStrongest: function(currencies) {
            currencies.forEach(curr => {
                const btn_id = curr+'_cert_btn';
                $(btn_id).addEventListener('click', () => {
                    this.chooseStrongest(curr);
                });
            });
        },

        ///////////////////////// SPOT TRADE /////////////////////////

        /**
         * Create a div with a row of player buttons
         * @param {Array} players 
         */
        insertTradeButtons: function(players) {
            let trade_to_btns = "";
            for (const p in players) {
                const player_button = this.createPlayerButton(players[p]);
                trade_to_btns += " "+player_button;
            }
            return trade_to_btns;
        },

        /**
         * Takes a player and returns the player's name formatted in their color.
         * @param {Object} player
         */
        createPlayerButton: function(player) {
            const player_id = player['id'];
            const player_name = player['name'];
            const color = player.color == "" ? '000' : player.color;
            const color_bg = player.color_back ? player.color_back : "";
            const button = this.format_block('jstpl_player_btn', {
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
            let disable = false;
            if (this.SPOT_TRANSACTION[SPOT.TO] == player['id']) {
                // clear all
                this.clearSpotPlayerSelected();
            } else {
                this.SPOT_TRANSACTION[SPOT.TO] = player['id'];
                disable = true;
            }

            for (const p in otherPlayers) {
                const p2 = otherPlayers[p];
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
            const offer_button = document.getElementsByClassName("frx_curr_pay");
            if (offer_button.length != 0) {
                offer_button[0].classList.toggle("frx_curr_pay");
            }
            const pay_button = document.getElementsByClassName("frx_curr_receive");
            if (pay_button.length != 0) {
                pay_button[0].classList.toggle("frx_curr_receive");
            }
        },

        /**
         * Add actions to Buttons for players to offer trade to.
         * @param {Array} otherPlayers 
         */
        addPlayerTradeActions: function(otherPlayers) {
            for (const p in otherPlayers) {
                const player = otherPlayers[p];
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
                const btn_id = curr+'_note_btn';
                $(btn_id).addEventListener('click', () => {
                    this.spotTradeAction(btn_id);
                });
            });
        },

        /**
         * Attached to Note button, assigns offer or receive currency.
         * @param {string} btn_id 
         */
        spotTradeAction: function(btn_id) {
            if (this.SPOT_TRANSACTION[SPOT.TO] == null) {
                // need a player chosen first
                this.showMessage("You must choose the Player you wish to trade with first", "info");
                return;
            }

            // are we unselecting it?
            if ($(btn_id).classList.contains("frx_curr_pay")) {
                // we are deselecting the offer (and request, clearing message)
                $(btn_id).classList.toggle("frx_curr_pay");
                const payoff = document.getElementsByClassName("frx_curr_receive");
                if (payoff.length != 0) {
                    payoff[0].classList.toggle("frx_curr_receive");
                }
            } else if ($(btn_id).classList.contains("frx_curr_receive")) {
                // we are deselecting the payoff
                $(btn_id).classList.toggle("frx_curr_receive");
            } else {
                const is_payoff = document.getElementsByClassName("frx_curr_receive");
                if (is_payoff.length != 0) {
                    // we are replacing payoff
                    is_payoff[0].classList.toggle("frx_curr_receive");
                    $(btn_id).classList.toggle("frx_curr_receive");
                } else {
                    const is_promise = document.getElementsByClassName("frx_curr_pay");
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
            let contract_txt = "";
            if (this.SPOT_TRANSACTION[SPOT.TO]) {
                contract_txt = _("Offer ")+this.spanPlayerName(this.SPOT_TRANSACTION[SPOT.TO]);
                const prom_curr = this.getSelectedCurrency(CURRENCY_TYPE.PAY);
                const payoff_curr = this.getSelectedCurrency(CURRENCY_TYPE.RECEIVE);
                if (prom_curr == "") {
                    this.setMessageText(SPOT_TRADE_MSG, contract_txt);
                } else {
                    if (payoff_curr != "") {
                        this.createMoniesXstr("", payoff_curr);
                        const exchg_pair = this.createCurrencyPair(prom_curr, payoff_curr);
                        let prom_val = 1;
                        let pay_val = 1;
                        if (exchg_pair[PAIR.STRONGER] == prom_curr) {
                            pay_val = exchg_pair[PAIR.EXCHANGE];
                        } else {
                            prom_val = exchg_pair[PAIR.EXCHANGE];
                        }
                        const promise_txt = this.format_block('jstpl_currency_counter', {
                            "type": "offer",
                            "curr": prom_curr
                        });
                        const payoff_txt = this.format_block('jstpl_currency_counter', {
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
                        contract_txt += this.createMoniesXstr("?", prom_curr);
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
                const btn_id = curr+'_cert_btn';
                const warn_msg = this.checkCanInvest(curr);
                if (warn_msg == null) {
                    $(btn_id).addEventListener('click', () => {
                        this.investAction(btn_id);
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
            const notes = this.getMonies(this.player_id, curr, CURRENCY_TYPE.NOTE);
            if (notes < 2) {
                return this.spanYou() + _(" do not have ")+this.createMoniesXstr(2, curr, CURRENCY_TYPE.NOTE, true);
            }
            // do I already have 4 certs of this currency?
            const certs = this.getMonies(this.player_id, curr, CURRENCY_TYPE.CERTIFICATE);
            if (certs >= 4) {
                return this.spanYou() + _(" may not hold more than ")+this.createMoniesXstr(4, curr, CURRENCY_TYPE.CERTIFICATE, true);
            }
            // are there any left?
            const avail = this.availableCertCounters[CURRENCY[curr]-1].getValue();
            if (avail == 0) {
                const cert_str = this.createMoniesXstr('', curr, CURRENCY_TYPE.CERTIFICATE, true);
                return _(`There are no ${cert_str} Certificates available for purchase`);
            }
            return null;
        },

        /**
         * Action that happens when clicked on a note to invest.
         * @param {string} btn_id 
         */
        investAction: function(btn_id) {
            // are we deselecting it?
            if ($(btn_id).classList.contains('frx_curr_btn_selected')) {
                dojo.toggleClass(btn_id, 'frx_curr_btn_selected');
            } else {
                // we selected it. How many are already selected?
                const sel = dojo.query('.frx_curr_btn_selected');
                if (sel.length == 2) {
                    this.showMessage(_("You may only buy 1 or 2 Certificates"), "info");
                } else {
                    dojo.toggleClass(btn_id, 'frx_curr_btn_selected');
                }
            }
            // now construct message
            let text = "";
            dojo.query('.frx_curr_btn_selected').forEach(btn => {
                const id = btn.id;
                const selcurr = id.substring(0, 3);
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
                const btn_id = curr+'_cert_btn';
                const certs = this.getMonies(this.player_id, curr, CURRENCY_TYPE.CERTIFICATE);
                if (certs == 0) {
                    this.setBtnUnselectable(btn_id);
                } else {
                    $(btn_id).addEventListener('click', () => {
                        this.divestAction(curr, btn_id);
                    });
                }
            });
        },

        /**
         * Action that happens when clicked on a Certificate to sell.
         * Adds the cert button and +/- to increment them
         * @param {string} curr
         * @param {string} btn_id 
         */
        divestAction: function(curr, btn_id) {
            // are we deselecting it?
            const was_selected = $(btn_id).classList.contains('frx_curr_btn_selected');
            if (was_selected) {
                // we are deselecting it
                this.DIVEST_CURRENCY = null;
                document.getElementById('sell_container_'+curr).remove();
            } else {
                // we selected it. Deselect any previous ones
                const selected = document.getElementsByClassName("frx_curr_btn_selected");
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
            const curr = this.DIVEST_CURRENCY;
            this.setDescriptionOnMyTurn(_("You may sell ")+this.createMoniesXstr('', curr, CURRENCY_TYPE.NOTE, true), {X_ACTION_TEXT: DIVEST_MSG});
            this.createSellCounter(curr);
        },

        /**
         * Create the "Sell [CURR] +/-" buttons
         * @param {string} curr 
         */
        createSellCounter: function(curr) {
            const sell_buttons = this.format_block('jstpl_sell_buttons', {"curr": curr});
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
                const cards = document.getElementById('contract_queue_container').getElementsByClassName("frx_"+cl);
                if (cards.length == 0) {
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
                const btn_id = curr+'_note_btn';
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
                const payoff = document.getElementsByClassName("frx_curr_receive");
                if (payoff.length != 0) {
                    payoff[0].classList.toggle("frx_curr_receive");
                }
            } else if ($(btn_id).classList.contains("frx_curr_receive")) {
                // we are deselecting the payoff
                $(btn_id).classList.toggle("frx_curr_receive");
            } else {
                const is_payoff = document.getElementsByClassName("frx_curr_receive");
                if (is_payoff.length != 0) {
                    // we are replacing payoff
                    is_payoff[0].classList.toggle("frx_curr_receive");
                    $(btn_id).classList.toggle("frx_curr_receive");
                } else {
                    const is_promise = document.getElementsByClassName("frx_curr_pay");
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
            const pay_curr = this.getSelectedCurrency(CURRENCY_TYPE.PAY);
            const payoff_curr = this.getSelectedCurrency(CURRENCY_TYPE.RECEIVE);
            let contract_txt = "";
            if (pay_curr == "") {
                this.setMessageText(CONTRACT_MSG, "");
            } else {
                if (payoff_curr != "") {
                    this.createMoniesXstr("", payoff_curr);
                    const exchg_pair = this.createCurrencyPair(pay_curr, payoff_curr);
                    let prom_val = 1;
                    let pay_val = 1;
                    if (exchg_pair[PAIR.STRONGER] == pay_curr) {
                        pay_val = exchg_pair[PAIR.EXCHANGE];
                    } else {
                        prom_val = exchg_pair[PAIR.EXCHANGE];
                    }
                    const pay_counter = this.format_block('jstpl_currency_counter', {
                        "type": CURRENCY_TYPE.PAY,
                        "curr": pay_curr
                    });
                    const receive_counter = this.format_block('jstpl_currency_counter', {
                        "type": CURRENCY_TYPE.RECEIVE,
                        "curr": payoff_curr
                    });
                    const contract_buttons = this.format_block('jstpl_contract_buttons', {
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
                    contract_txt = _("Pay ") +this.createMoniesXstr("?", pay_curr);
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
            let strong_counter = null;
            let weak_counter = null;
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
                const q_div = document.getElementById('queue_'+q);
                if (q_div.childElementCount > 0) {
                    // first look for Dividend in the name
                    const child = q_div.firstChild;
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
                    const otherPlayers = this.getOtherPlayers();
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
                let hasCerts = false;
                Object.keys(CURRENCY).forEach(curr => {
                    let certs = this.getMonies(this.player_id, curr, CURRENCY_TYPE.CERTIFICATE);
                    if (certs > 0) {
                        hasCerts = true;
                    }
                });
                if (hasCerts) {
                    this.removeActionButtons();
                    this.setDescriptionOnMyTurn(_("You may sell 1 Currency"), {X_CURRENCY: CURRENCY_TYPE.CERTIFICATE, X_ACTION_TEXT: DIVEST_MSG});
                    this.addDivestActions();
                    this.addConfirmButton(ACTIONS.DIVEST);
                    this.addCancelButton();
                } else {
                    this.showMessage(_("You have no Certificates to sell"), 'info');
                }
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
                const nextContract = this.getAvailableContract();
                if (nextContract == null) {
                    this.showMessage("No Contracts Available!");
                } else {
                    this.removeActionButtons();
                    const contract_div = this.format_block('jstpl_contract_card', {"contract" : nextContract, "scale": 0.25 });
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
                const contract = this.getContractToResolve();
                let contract_div;
                if (contract == DIVIDENDS) {
                    const div_num = this.dividendCounter.getValue();
                    const scale = 0.25;
                    contract_div = this.format_block('jstpl_dividend_card', {
                        "div_num" : div_num,
                        "offset": -(5-div_num) * DIVIDEND_BASE_W*scale*2,
                        "scale": scale
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
         * @param {enum} action 
         */
        confirmAction: function(action) {
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
                let is_valid = false;
                if (this.PAY_COUNTER && this.RECEIVE_COUNTER) {
                    const to = parseInt(this.SPOT_TRANSACTION[SPOT.TO]);
                    const offer_curr = this.getSelectedCurrency(CURRENCY_TYPE.PAY);
                    const request_curr = this.getSelectedCurrency(CURRENCY_TYPE.RECEIVE);
                    if (to != 0 && offer_curr != "" && request_curr != "") {
                        is_valid = true;
                        const offer_amt = this.PAY_COUNTER.getValue();
                        const request_amt = this.RECEIVE_COUNTER.getValue();
                        if (this.getMonies(this.player_id, offer_curr, CURRENCY_TYPE.NOTE) < offer_amt) {
                            this.showMessage(this.spanYou()+_(" do not have ")+this.createMoniesXstr(offer_amt, offer_curr), 'info');
                        } else if (this.getMonies(to, request_curr, CURRENCY_TYPE.NOTE) < request_amt) {
                            this.showMessage(this.spanPlayerName(to)+_(" does not have ")+this.createMoniesXstr(request_amt, request_curr), 'info');
                        } else {
                            this.ajaxcall( "/forex/forex/offerSpotTrade.html", { 
                                to_player: to,
                                off_curr: offer_curr,
                                req_curr: request_curr,
                                lock: true 
                            }, this, function( result ) {  }, function( is_error) { } );
                        }
                    }
                }
                if (!is_valid) {
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
            this.ajaxcall( "/forex/forex/cancelSpotTrade.html", { 
                lock: true 
            }, this, function( result ) {  }, function( is_error) { } );                        
            this.SPOT_TRANSACTION = null;
        },

        /**
         * Clicked "Confirm" on an Invest action to buy certs.
         */
        buyCertificates: function() {
            if (this.checkAction('investCurrency', true)) {
                const buys = [];
                dojo.query('.frx_curr_btn_selected').forEach(btn => {
                    const curr = btn.id.substring(0, 3);
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
                const curr = this.DIVEST_CURRENCY;
                let certs = 0;
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
         *  @param {boolean} is_sell true if Sell, false if Don't Sell
         */
        nextSeller: function(is_sell) {
            if (this.checkAction('optDivestCurrency', true)) {
                const curr = this.DIVEST_CURRENCY;
                const certs = is_sell ? this.SELL_COUNTER.getValue() : 0;
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
                let is_valid = false;
                if (this.PAY_COUNTER && this.RECEIVE_COUNTER) {
                    const prom_curr = this.getSelectedCurrency(CURRENCY_TYPE.PAY);
                    const pay_curr = this.getSelectedCurrency(CURRENCY_TYPE.RECEIVE);
                    if (prom_curr != "" && pay_curr != "") {
                        const prom_amt = this.PAY_COUNTER.getValue();
                        const pay_amt = this.RECEIVE_COUNTER.getValue();
                        this.ajaxcall( "/forex/forex/makeContract.html", { 
                            promise: prom_curr,
                            payout: pay_curr,
                            promise_amt: prom_amt,
                            payout_amt: pay_amt,
                            lock: true
                        }, this, function( result ) {  }, function( is_error) { } );
                        is_valid = true;
                    }
                }
                if (!is_valid) {
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
            if (this.checkAction('chooseCurrencyToStrengthen', true)) {
                this.ajaxcall( "/forex/forex/chooseCurrencyToStrengthen.html", {
                    curr: currStr,
                    lock: true
                }, this, function( result ) {  }, function( is_error) { } );
            }
        },

        /**
         * Player chose the currency which will be strongest for scoring.
         * @param {string} currStr
         */
        chooseStrongest: function(currStr) {
            if (this.checkAction('chooseStrongestCurrency', true)) {
                this.ajaxcall( "/forex/forex/chooseStrongestCurrency.html", {
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
            dojo.subscribe( 'dividendsPaid', this, "notif_dividendsPaid" );
            this.notifqueue.setSynchronous( 'notif_dividendsPaid', 500 );
            dojo.subscribe( 'dividendsStackPopped', this, "notif_dividendsPopped" );
            this.notifqueue.setSynchronous( 'notif_dividendsPopped', 500 );
            dojo.subscribe( 'contractPaid', this, "notif_contractPaid");
            this.notifqueue.setSynchronous( 'notif_contractPaid', 500 );
            dojo.subscribe( 'loanCreated', this, "notif_loanCreated");
            this.notifqueue.setSynchronous( 'notif_loanCreated', 500 );
            dojo.subscribe( 'loanMerged', this, "notif_loanMerged");
            this.notifqueue.setSynchronous( 'notif_loanMerged', 500 );
            dojo.subscribe( 'loanResolved', this, "notif_loanResolved");
            this.notifqueue.setSynchronous( "notif_loanResolved", 500 );
            dojo.subscribe( 'currencyScored', this, "notif_currencyScored");
            this.notifqueue.setSynchronous( "notif_currencyScored", SCORING_DELAY );
            dojo.subscribe( 'bankruptcy', this, "notif_bankruptcy");
            dojo.subscribe( 'queueMoved', this, "notif_queueMoved");

            // // Load production bug report handler
            // dojo.subscribe("loadBug", this, function loadBug(n) {
            //     function fetchNextUrl() {
            //     var url = n.args.urls.shift();
            //     console.log("Fetching URL", url);
            //     dojo.xhrGet({
            //         url: url,
            //         load: function (success) {
            //         console.log("Success for URL", url, success);
            //         if (n.args.urls.length > 0) {
            //             fetchNextUrl();
            //         } else {
            //             console.log("Done, reloading page");
            //             window.location.reload();
            //         }
            //         },
            //     });
            //     }
            //     console.log("Notif: load bug", n.args);
            //     fetchNextUrl();
            // });

        },

        /**
         * Adjusts counters. Does not do animation (that is handled by individual methods)
         */
        notif_moniesChanged: function( notif ) {
            const player_id = notif.args.player_id;
            const curr = notif.args.curr;
            const amt = parseFloat(notif.args.amt);
            this.noteCounters[player_id][CURRENCY[curr]-1].incValue(amt);
        },

        /**
         * Move currency markers up for this pair.
         */
        notif_currencyStrengthened: function( notif ) {
            const curr = notif.args.curr;
            this.moveCurrencyPairMarkers(curr, 1);
        },

        /**
         * Move currency markers 1 or more spaces down for this pair.
         */
        notif_currencyWeakened: function( notif ) {
            const curr = notif.args.curr;
            const amt = parseInt(notif.args.amt);
            for (let i = 0; i < amt; i++) {
                this.moveCurrencyPairMarkers(curr, -1);
            }
        },

        /**
         * Show trade offer.
         */
        notif_spotTradeOffered: function( notif ) {
            const spot_trade = this.createSpotTransaction(notif.args[SPOT.FROM], notif.args[SPOT.TO], notif.args[SPOT.OFFER], notif.args[SPOT.REQUEST]);
            this.SPOT_TRANSACTION = spot_trade;
        },

        /**
         * Notify active player cancelled their offer.
         */
        notif_spotTradeCanceled: function( notif ) {
            this.SPOT_TRANSACTION = null;
        },    

        /**
         * If I am the offerer, remove my Spot Trade button
         */
        notif_spotTradeAccepted: function( notif ) {
            const to_player = notif.args[SPOT.TO];
            const from_player = notif.args[SPOT.FROM];
            const offer = notif.args[SPOT.OFFER];
            const request = notif.args[SPOT.REQUEST];
            const off_amt = parseFloat(notif.args.off_amt);
            const req_amt = parseFloat(notif.args.req_amt);
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
            this.SPOT_TRANSACTION = null;
        },    

        /**
         * When a player buys a Certificate. Take it out of available pile, move it to player's pile.
         * @param {Object} notif 
         */
        notif_certificatesBought: function( notif ) {
            const player_id = notif.args.player_id;
            const curr = notif.args.curr;
            const id = parseInt(notif.args.cert_id);

            // show money being spent (note counter was already ticked by adjustmonies)
            this.moveBankNotes(player_id, curr, -2);
            // gain certificate and tick counters
            const curr_i = CURRENCY[curr]-1;
            this.availableCertCounters[curr_i].incValue(-1);
            if (this.availableCertCounters[curr_i].getValue() == 0) {
                this.placeEmptyCertificateStack(curr_i);
            }
            this.heldCertCounters[curr_i].incValue(1);
            // show it moving to player's pile
            this.availableCertificates[curr_i].removeFromStockById( id, curr+'_cert_counter_icon_'+player_id);
            this.certCounters[player_id][curr_i].incValue(1);
        },

        /**
         * When a player sells one or more Certificates. Take it out of player's pile, discard, add monies.
         * @param {Object} notif 
         */
        notif_certificatesSold: function( notif ) {
            const certs = notif.args.certs;
            const curr = notif.args.curr;
            this.DIVEST_CURRENCY = curr;
            // can be null when additional players declined to sell
            if (certs != null) {
                const player_id = notif.args.player_id;
                const curr = notif.args.curr;
                const amt = certs.length;
                // show it leaving player's pile
                this.moveCertificates(this.player_id, curr, amt);
                // decrement player's certs counter
                this.certCounters[player_id][CURRENCY[curr]-1].incValue(-amt);
                this.heldCertCounters[CURRENCY[curr]-1].incValue(-amt);
                // show notes being acquired
                this.moveBankNotes(player_id, curr, amt*2);
            }
        },

        /**
         * When a player takes a Contract.
         * @param {Object} notif 
         */
        notif_contractTaken: function( notif ) {
            // put Contract in Queue
            const contract = this.createContractFromNotif(notif);
            // slide existing Contracts in Queue to right
            this.pushContractQueue();
            const contract_card = this.format_block('jstpl_contract_card', {"contract": contract.contract, "scale": 0.5});
            // slide contract to Queue
            this.slideTemporaryObject( contract_card, 'contract_'+contract.contract, 'contract_card_'+contract.contract, 'queue_'+contract.location, 1000 ).play();
            // slide contract to player board
            this.slideTemporaryObject( contract_card, 'contract_'+contract.contract, 'contract_card_'+contract.contract, 'player_board_'+contract.player_id, 1000 ).play();
            // slide notes from bank to contract display
            this.slideNotesToStack(contract.contract, 'promise', contract.promise, contract.promise_amt);
            this.slideNotesToStack(contract.contract, 'payout', contract.payout, contract.payout_amt);
            // now put the contract in queue, on display, and on player boards
            this.placeContract(contract);
            this.decorateContract(contract);
        },

        /**
         * Move monies from bank to player board
         * @param {Object*} notif 
         */
        notif_dividendsPaid: function(notif) {
            const player_id = notif.args.player_id;
            const curr = notif.args.curr;
            const amt = parseFloat(notif.args.amt);
            this.moveBankNotes(player_id, curr, amt);
        },

        /**
         * Remove top Dividend and move stack to back of queue.
         * @param {Object} notif 
         */
        notif_dividendsPopped: function(notif) {
            const div_items = this.divstack.getAllItems();
            this.divstack.removeFromZone(div_items[div_items.length-1], true, 'contract_queue_display');
            this.addDividendsCounter();
            this.pushContractQueue();
            this.moveDividendStack(1);
        },

        /**
         * Remove contracts from player boards and display queue.
         * @param {Object} notif 
         */
        notif_contractPaid: function(notif) {
            const player_id = notif.args.player_id;
            const C = notif.args.conL;
            const prom_curr = notif.args.promise;
            const prom_amt = parseFloat(notif.args.promise_amt);
            const pay_curr = notif.args.payout;
            const q = parseInt(notif.args.location); 
            // move notes from promise stack and player's board to bank
            this.moveBankNotes(player_id, prom_curr, -prom_amt);
            this.moveContractNotes(C, prom_curr);
            this.moveContractNotes(C, pay_curr, player_id);
            // clear the rest
            this.clearContract(C, player_id, q);
        },

        /**
         * Player must take a loan. This is the first loan for this player.
         * @param {Object} notif 
         */
        notif_loanCreated: function(notif) {
            const contract = this.createContractFromNotif(notif);
            const loan_curr = notif.args.loan_curr;
            const loan_amt = parseFloat(notif.args.loan_amt);

            contract.promise = LOAN;
            contract.loans = {};
            contract.loans[loan_curr] = loan_amt;

            // this is the location before it is moved
            const q = parseInt(contract.location); 

            // move 1 note from bank to promise stack
            this.slideNotesToStack(contract.contract, 'promise', loan_curr, 1);
            this.pushLoanBuckOntoStack(contract.contract, loan_curr, loan_amt);
            // move notes from payout stack to player's board
            this.moveContractNotes(contract.contract, contract.payout, contract.player_id);
            // for special case when the loan is at the end of the queue
            // need to create a temporary q8 slot
            if (q == 7) {
                const q8 = '<div id="queue_8" class="frx_contract_queue_slot"></div>';
                dojo.place(q8, 'contract_queue_container');
                this.slideContractQueue(7, 8);
            }
            // push Contract to back of queue
            this.pushContractQueue();
            this.slideContractQueue(q+1, 1);
            if (q == 7) {
                $('queue_8').remove();
            }
            this.decorateContract(contract);
        },

        /**
         * Player had a loan already and takes a new one, which merges with old one.
         * @param {Object} notif 
         */
        notif_loanMerged: function(notif) {
            const player_id = notif.args.player_id;
            // this is the consolidated loan Contract
            const C = notif.args.conL;
            const loanC = notif.args.loan;
            const loan_curr = notif.args.loan_curr;
            const loan_amt = parseFloat(notif.args.loan_amt);
            const pay_curr = notif.args.payout;
            // this is the location before it is moved
            const q = parseInt(notif.args.location);

            // move the new loan to stack next to the old one
            const loans = this.moveToLoan(C, loanC, loan_curr, loan_amt);
            // move payoff to player's board
            this.moveContractNotes(C, pay_curr, player_id);
            // do all the other cleanup
            this.clearContract(C, player_id, q);
            // update stack
            const contract = {
                "contract": loanC,
                "promise": LOAN,
                "player_id": player_id,
                "loans": loans
            };
            this.decorateContract(contract);
        },

        /**
         * Player paid off a loan.
         * @param {Object} notif 
         */
        notif_loanResolved: function(notif) {
            const player_id = notif.args.player_id;
            // this is the consilidated loan Contract
            const C = notif.args.conL;
            // this is the location before it is moved
            const q = parseInt(notif.args.location);
            const loans = notif.args.loans;

            // move notes from promise stack and player's board to bank
            for (const curr in loans) {
                const amt = parseFloat(loans[curr]);
                this.moveBankNotes(player_id, curr, -amt);
                this.moveContractNotes(C, curr);
            }

            this.clearContract(C, player_id, q);
            const contract = this.createContractFromNotif(notif);
            this.decorateLoan(contract, true);
        },

        /**
         * Sent for each currency converted for each player during scoring.
         * @param {Object} notif 
         */
        notif_currencyScored: function(notif) {
            const player_id = notif.args.player_id;
            const score_curr = notif.args.score_curr;
            const score_color = COLORS[score_curr];

            const animation_duration = SCORING_DELAY;
            const score_arr = notif.args.score_amt;
            for (const curr in score_arr) {
                const score_amt = parseFloat(score_arr[curr]);
                // animate moving money from the player's base pile to the winning currency pile
                this.moveBaseNotes(player_id, curr, score_curr, score_amt);
                const player_notes = curr+'_note_counter_icon_'+player_id;
                this.displayScoring( player_notes, score_color, score_amt, animation_duration, 100, 0 );
            }
        },

        /**
         * When a player goes bankrupt
         * @param {Object} notif 
         */
        notif_bankruptcy: function(notif) {
            const player_id = notif.args.player_id;
            this.decorateBankrupt(player_id);
        },


        /**
         * When the queue is adjusted and needs to change the banner
         * @param {Object} notif 
         */
        notif_queueMoved: function(notif) {
            this.updateNextContractBanner(notif.args.contract);
        },

        /**
         * Clear a contract by moving all its payment notes to the player, and taking it off the queue and player boards.
         * @param {string} C 
         * @param {integer} player_id 
         * @param {integer} q 
         */
        clearContract: function(C, player_id, q) {
            // move Contract from player's board to Contract Display
            this.moveContract(C, 'player_board_'+player_id, 'player_board_'+player_id);
            // remove contract from player board
            document.getElementById('contract_'+player_id+'_'+C).remove();
            // move Contract from Contract Queue to Display
            this.moveContract(C, 'contract_queue_display', 'queue_'+q);
            // delete the contract from the queue
            const qslot = document.getElementById('queue_'+q);
            qslot.removeChild(qslot.firstChild);
            // remove previous event listeners
            const contract = {
                "contract": C,
                "player_id": player_id
            }
            for (const c_div of this.getContractDivs(contract)) {
                this.disconnect(c_div, 'mouseenter');
                this.disconnect(c_div, 'mouseleave');
            }

            this.decorateAvailableContract(C);
        },

        /**
         * Given a notif arg with enough to reconstruct a Contract, create one.
         * @param {Object} notif 
         */
        createContractFromNotif: function(notif) {
            const player_id = parseInt(notif.args.player_id);
            const C = notif.args.conL;
            const promise = notif.args.promise;
            const payout = notif.args.payout;
            const promise_amt = parseFloat(notif.args.promise_amt);
            const payout_amt = parseFloat(notif.args.payout_amt);
            const location = parseInt(notif.args.location);
            // put Contract in Queue
            const contract = {
                "contract": C,
                "location": location,
                "promise": promise,
                "promise_amt": promise_amt,
                "payout": payout,
                "payout_amt": payout_amt,
                "player_id": player_id,
            };
            return contract;
        },

    });
});

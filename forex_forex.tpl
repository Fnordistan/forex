{OVERALL_GAME_HEADER}

<!-- 
--------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- ForEx implementation : © <David Edelstein> <david.edelstein@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-->

<div id="table_area">
    <div id="board_display">
        <div id="currency_board">
            <!-- BEGIN CURRENCY_PAIRS_BLOCK -->
            <div id="{CURR}_{ZONE}" class="frx_curr_pr_zone" style="top: {T}px; left: {L}px;"></div>
            <!-- END CURRENCY_PAIRS_BLOCK -->
        </div>
    </div>
    <div id="cards_display">
        <div id="available_certs_display" class="whiteblock">
            <h1 class="frx_col_hdr">{CERTS_AVAILABLE}</h1>
            <!-- BEGIN CERTIFICATES_BLOCK -->
            <div id="avail_certs_{CURR}_container" class="frx_certs_container">
                <div id="avail_certs_{CURR}"></div><span id="avail_certs_{CURR}_ctr" class="frx_cert_cntr"></span>
            </div>
            <!-- END CERTIFICATES_BLOCK -->
            <div id="bank_container">
                <h1 class="frx_col_hdr">{BANK}</h1>
                <!-- BEGIN BANK_ROW -->
                    <div id="bank_row{R}" class="frx_bank_row">
                    <!-- BEGIN BANK_BLOCK -->
                        <div id="bank_{CURR}" class="frx_currency_card frx_note_nonum frx_{CURR}" title="{CURR} Bank Notes"></div>
                    <!-- END BANK_BLOCK -->
                </div>
                <!-- END BANK_ROW -->
            </div>
        </div>
        <div id="contracts_div" class="whiteblock">
            <div id="contract_display">
                <h1 class="frx_col_hdr">{CONTRACT_DISPLAY}</h1>
                <!-- BEGIN CONTRACTS_BLOCK -->
                <div id="contract_{CONTRACT}" class="frx_contract_container">
                    <div id="contract_promise_{CONTRACT}" class="frx_contract_curr_box"></div>
                    <div id="contract_card_{CONTRACT}" class="frx_contract_card frx_{CONTRACT}"></div>
                    <div id="contract_payout_{CONTRACT}" class="frx_contract_curr_box"></div>
                </div>
                <!-- END CONTRACTS_BLOCK -->
            </div>
            <div id="contract_queue_display">
                <h1 class="frx_col_hdr">{CONTRACT_QUEUE}</h1>
                <div id="contract_queue_container">
                    <!-- BEGIN QUEUE_BLOCK -->
                    <div id="queue_{Q}" class="frx_contract_queue_slot"></div>
                    <!-- END QUEUE_BLOCK -->
                </div>
            </div>
        </div>
    </div>
</div>

<script type="text/javascript">

/*** Javascript HTML templates ***/

// Dividend card for Dividend stack
var jstpl_dividend = '<span id="dividend_${div_num}" class="frx_dividend" style="margin: ${margin}px; background-position: ${offset}px 0px"></span>';
// for showing individual dividends in title text or tooltip
var jstpl_dividend_card = '<span id="show_dividend_${div_num}" class="frx_dividend_lg" style="display: inline-block; vertical-align: middle; margin: 5px; background-position: ${offset}px 0px; --scale: ${scale}"></span>';

// the number of Dividends left, put on top of stack
var jstpl_dividend_counter = '<span id="dividend_counter" class="frx_dividend_counter"></span>';

// buttons showing players available to offer Spot Trade
var jstpl_player_btn = '<button id="trade_${player_id}_btn" type="button" class="frx_player_btn" style="--color: #${color}; --bg_color: #${bgcolor};">${player_name}</button>';

// a currency icon used as a button, either note or cert
var jstpl_curr_btn = '<button id="${curr}_${type}_btn" type="button" class="frx_curr_btn frx_currency_card frx_${type} frx_${curr}" style="--scale: 0.4;"></button>';

// an individual note
var jstpl_bank_note = '<div class="frx_currency_card frx_note frx_${curr}"></div>';
// for notes that get stacked together
var jstpl_bank_note_stacked = '<div id="${id}" class="frx_currency_card frx_note_nonum frx_${curr}" style="position: absolute; margin: ${margin};"></div>';
// counter put on top of a stack
var jstpl_stack_counter = '<span id="${curr}_${type}_stack_ctr_${id}" class="frx_stack_ctr" style="color: var(--color_cert_${curr})"></span>';

// an individual Certificate
var jstpl_certificate = '<div class="frx_currency_card frx_cert frx_${curr}"></div>';

// "# Currency" string
var jstpl_curr_ct = '<span class="frx_curr_val" style="color: var(--color_${type}_${curr});">${num} ${curr}</span>';

// "# Currency [ICON]" string
var jstpl_monies = '<span class="frx_curr_val" style="color: var(--color_${type}_${curr});">${num} ${curr}</span> <span class="frx_curr_icon frx_currency_card frx_${type} frx_${curr}" title="${curr} ${type}"></span>';

// "# Currency [ICON]" + Counter
var jstpl_currency_counter = '<div id="contract_creation_container" class="frx_ctr_container">\
                                <span id="${type}_counter" class="frx_ctr" style="color: var(--color_note_${curr}); font-size: 24px; vertical-align: baseline; width: 50px;"></span>\
                                <span id="${type}_${curr}" class="frx_curr_val" style="color: var(--color_note_${curr});">${curr}</span>\
                                <span id="${type}_icon" class="frx_currency_card frx_note frx_${curr}" style="--scale: 0.25; margin: 0px 5px;" title="${curr}"></span>\
                            </div>';

// Just the name of a currency, in appropriate color (note or cert)
var jspl_curr_tag = '<span class="frx_curr_lbl" style="color: var(--color_${type}_${curr}); --scale: 0.25;">${curr}</span>';

// holds each player's Notes and Certificates of one Currency (two jstpl_mon_counters)
var jstpl_cert_note_container = '<div id="${curr}_${id}_monies" class="frx_mon_container" style="background-color: var(--color_cert_${curr});"></div>';

// holds a Note or Certificate + Counter on player board
var jstpl_player_monies = '<div id="${curr}_${type}_${id}_container" class="frx_ctr_container">\
                            <span id="${curr}_${type}_counter_icon_${id}" class="frx_currency_card frx_${type} frx_${curr}" style="--scale: 0.25;" title="${curr} ${type}s"></span>\
                            <span id="${curr}_${type}_counter_${id}" class="frx_ctr" style="color: var(--color_${type}_${curr});"></span>\
                        </div>';

// An individual contract card
var jstpl_contract_card = '<span class="frx_contract_card frx_${contract}" style="display: inline-block; vertical-align: bottom; --scale: ${scale};"></span>';
// for when we need ids
var jstpl_contract_card_wid = '<span id="${id}" class="frx_contract_card frx_${contract}" style="display: inline-block; vertical-align: bottom; --scale: ${scale};"></span>';

// "Sell $n $curr [ICON] + -"
var jstpl_sell_buttons = '<div id="sell_container_${curr}" class="frx_ctr_container">\
                            <span>Sell</span>\
                            <span id="sell_counter_${curr}" class="frx_ctr" style="color: var(--color_cert_${curr}); font-size: 24px; vertical-align: baseline;"></span>\
                            <span id="sell_${curr}" class="frx_curr_val" style="color: var(--color_cert_${curr});">${curr}</span>\
                            <span id="sell_cert_icon_${curr}" class="frx_currency_card frx_cert frx_${curr}" style="--scale: 0.25; margin: 0px 5px;" title="${curr}"></span>\
                            <button id="sell_plus_btn_${curr}" class="frx_inc_btn" style="color: var(--color_cert_${curr});">+</button>\
                            <button id="sell_minus_btn_${curr}" class="frx_inc_btn" style="color: var(--color_cert_${curr});">-</button>\
                        </div>';

var jstpl_contract_buttons = '<button id="contract_plus_btn" class="frx_inc_btn" style="color: var(--color_note_${curr});">+</button>\
                              <button id="contract_minus_btn" class="frx_inc_btn" style="color: var(--color_note_${curr});">-</button>';

// curr1 is the board started on, curr2 (front) is the curr initially shown. Note that it is given the same id as a regular jstpl_curr_pair
var jstpl_flip_counter = '<div id="pair_${curr1}_${curr2}" class="frx_flip_container">\
                            <div id="flipper_${curr1}_${curr2}" class="frx_flipper">\
                                <div id="flip_front_${curr2}" class="frx_ctr_front frx_curr_pr frx_pr_${curr2}"></div>\
                                <div id="flip_back_${curr1}" class="frx_ctr_back frx_curr_pr frx_pr_${curr1}"></div>\
                            </div>\
                        </div>';

</script>  

{OVERALL_GAME_FOOTER}

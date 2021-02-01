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
        <div id="bank_container">
            <!-- BEGIN BANK_BLOCK -->
            <div id="bank_{CURR}" class="frx_currency_card frx_note frx_{CURR}"></div>
            <!-- END BANK_BLOCK -->
        </div>
    </div>
    <div id="paper_display">
        <div id="available_certs_display" class="whiteblock">
            <h1 class="frx_col_hdr">{CERTS_AVAILABLE}</h1>
            <!-- BEGIN CERTIFICATES_BLOCK -->
            <div id="avail_certs_{CURR}_container" class="frx_certs_container">
                <div id="avail_certs_{CURR}"></div><span id="avail_certs_{CURR}_ctr" class="frx_cert_cntr"></span>
            </div>
            <!-- END CERTIFICATES_BLOCK -->
        </div>
        <div id="contract_display" class="whiteblock">
            <h1 class="frx_col_hdr">{CONTRACT_DISPLAY}</h1>
            <!-- BEGIN CONTRACTS_BLOCK -->
            <div id="contract_{CONTRACT}" class="frx_contract_container">
                <div id="contract_promise_{CONTRACT}" class="frx_currency_zone"><span id="promise_{CONTRACT}_cntr" class="frx_cert_cntr"></span></div>
                <div id="contract_card_{CONTRACT}" class="frx_contract_card frx_{CONTRACT}"></div>
                <div id="contract_payout_{CONTRACT}" class="frx_currency_zone"><span id="payout_{CONTRACT}_cntr" class="frx_cert_cntr"></span></div>
            </div>
            <!-- END CONTRACTS_BLOCK -->
        </div>
        <div id="contract_queue_display" class="whiteblock">
            <h1 class="frx_col_hdr">{CONTRACT_QUEUE}</h1>
            <div id="contract_queue_container">
                <!-- BEGIN QUEUE_BLOCK -->
                <div id="queue_{Q}" class="frx_contract_queue_slot"></div>
                <!-- END QUEUE_BLOCK -->
            </div>
        </div>
    </div>
</div>

<script type="text/javascript">

// Javascript HTML templates

var jstpl_dividend = '<span id="dividend_${div_num}" class="frx_dividend"></span>';

var jstpl_dividend_counter = '<span id="dividend_counter" class="frx_dividend_counter"></span>';

var jstpl_certs_counter = 'avail_certs_${curr}_ctr';

var jstpl_player_btn = '<button id="trade_${player_id}_btn" type="button" class="frx_player_btn" style="--color: #${color}; --bg_color: #${bgcolor};">${player_name}</button>';

var jstpl_curr_btn = '<button id="${curr}_${type}_btn" type="button" class="frx_curr_btn frx_currency_card frx_${type} frx_${curr}" style="--scale: 0.4;"></button>';

// a currency icons used as a button
var jstpl_plus_minus_btns = '<div style="display: inline-block;">\
                                <div id="${curr}_plus_btn" class="frx_inc_btn" style="color: var(--color_${type}_${curr});">\
                                    <input type="radio" name="frx" id="plsbutton" checked>\
                                    <label for="plsbutton" unselectable>+</label>\
                                </div>\
                                <div id="${curr}_minus_btn" class="frx_inc_btn" style="color: var(--color_${type}_${curr});">\
                                    <input type="radio" name="frx" id="minbutton">\
                                    <label for="minbutton" unselectable>-</label>\
                                </div>\
                                </div>';

// an individual note
var jstpl_bank_note = '<div class="frx_currency_card frx_note frx_${curr}"></div>';

// an individual cert
var jstpl_certificate = '<div class="frx_currency_card frx_cert frx_${curr}"></div>';

// displays just the "number+currency" string
var jstpl_curr_ct = '<span class="frx_curr_val" style="color: var(--color_${type}_${curr});">${num} ${curr}</span>';

// displays "<n> <curr> <icon>"
var jstpl_monies = '<span class="frx_curr_val" style="color: var(--color_${type}_${curr});">${num} ${curr}</span> <span class="frx_curr_icon frx_currency_card frx_${type} frx_${curr}" title="${curr} ${type}"></span>';

var jspl_curr_tag = '<span class="frx_curr_lbl" style="color: var(--color_note_${curr}); --scale: 0.25;">${curr}</span>';

// holds each player's Note and Certificates (two jstpl_mon_counters)
var jstpl_mon_container = '<div id="${curr}_${id}_monies" class="frx_mon_container" style="background-color: var(--color_cert_${curr});"></div>';

// holds a Note/Certificate and Counter pair
var jstpl_mon_counter = '<div id="${curr}_${type}_${id}_container" class="frx_ctr_container">\
                            <span id="${curr}_${type}_counter_icon_${id}" class="frx_currency_card frx_${type} frx_${curr}" style="--scale: 0.25;" title="${curr} ${type}s"></span>\
                            <span id="${curr}_${type}_counter_${id}" class="frx_ctr" style="color: var(--color_${type}_${curr});"></span>\
                        </div>';

// curr1 is the board started on, curr2 (front) is the curr initially shown. Note that it is given the same id as a regular jstpl_curr_pair
var jstpl_flip_counter = '<div id="pair_${curr1}_${curr2}" class="frx_flip_container">\
                            <div id="flipper_${curr1}_${curr2}" class="frx_flipper">\
                                <div id="flip_front_${curr2}" class="frx_ctr_front frx_curr_pr frx_pr_${curr2}"></div>\
                                <div id="flip_back_${curr1}" class="frx_ctr_back frx_curr_pr frx_pr_${curr1}"></div>\
                            </div>\
                        </div>';


</script>  

{OVERALL_GAME_FOOTER}

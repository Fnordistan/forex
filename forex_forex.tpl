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
        <div id="cash_container">
            <!-- BEGIN CASH_BLOCK -->
            <div id="cash_{CURR}" class="frx_currency_card frx_note frx_{CURR}"></div>
            <!-- END CASH_BLOCK -->
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

// the actual counter shown is always curr2 (the weaker currency)
var jstpl_curr_pair = '<span id="pair_${curr1}_${curr2}" class="frx_curr_pr frx_pr_${curr2}"></span>';

var jstpl_dividend = '<span id="dividend_${div_num}" class="frx_dividend"></span>';

var jstpl_dividend_counter = '<span id="dividend_counter" class="frx_dividend_counter"></span>';

var jstpl_certs_counter = 'avail_certs_${curr}_ctr';

var jstpl_player_btn = '<button id="trade_${player_id}_btn" type="button" class="frx_player_btn" style="--color: #${color}; --bg_color: #${bgcolor};">${player_name}</button>';

var jstpl_curr_btn = '<button id="${curr}_${type}_btn" type="button" class="frx_curr_btn frx_currency_card frx_${type} frx_${curr}" style="--scale: 0.4;"></button>';

var jstpl_monies = '<span class="frx_cur_val" style="color: var(--color_${type}_${curr});">${num} ${curr}</span> <span class="frx_curr_icon frx_currency_card frx_${type} frx_${curr}"></span>';

var jstpl_mon_counter = '<div class="frx_ctr_container">\
                                <span id="${curr}_${type}_counter_icon_${id}" class="frx_currency_card frx_${type} frx_${curr}" style="--scale: 0.25;"></span>\
                                <span id="${curr}_${type}_counter_${id}" class="frx_ctr" style="color: var(--color_${type}_${curr});"></span>\
                                </div>';

</script>  

{OVERALL_GAME_FOOTER}

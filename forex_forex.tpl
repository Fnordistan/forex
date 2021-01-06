{OVERALL_GAME_HEADER}

<!-- 
--------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- ForEx implementation : © <David Edelstein> <david.edelstein@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-->

<div id="board_display">
    <div id="currency_board">
        <!-- BEGIN CURRENCY_PAIRS_BLOCK -->
        <div id="{CURR}_{ZONE}" class="frx_curr_pr_zone" style="top: {T}px; left: {L}px;"></div>
        <!-- END CURRENCY_PAIRS_BLOCK -->
    </div>
    <div id="available_certs_display" class="whiteblock"><h1 class="frx_col_hdr">{CERTS_AVAILABLE}</h1>
    </div>
    <div id="contract_display" class="whiteblock"><h1 class="frx_col_hdr">{CONTRACT_DISPLAY}</h1>
        <!-- BEGIN CONTRACTS_BLOCK -->
        <div id="contract_{CONTRACT}" class="frx_contract_container">
            <div id="contract_promise_{CONTRACT}" class="frx_contract_promise frx_currency_card frx_note frx_CHF"></div>
            <div id="contract_card_{CONTRACT}" class="frx_contract_card frx_{CONTRACT}"></div>
            <div id="contract_payout_{CONTRACT}" class="frx_contract_payout frx_currency_card frx_note frx_USD"></div>
        </div>
        <!-- END CONTRACTS_BLOCK -->
    </div>
    <!-- <div id="contract_queu" class="whiteblock"><h1 class="frx_col_hdr">{CONTRACT_QUEUE}</h1></div> -->
</div>

<script type="text/javascript">

// Javascript HTML templates

// the actual counter shown is always curr2 (the weaker currency)
var jstpl_curr_pair = '<span id="pair_${curr1}_${curr2}" class="frx_curr_pr frx_pr_${curr2}"></span>';

</script>  

{OVERALL_GAME_FOOTER}

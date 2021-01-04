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
    <div id="currency_board"></div>
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

/*
// Example:
var jstpl_some_game_item='<div class="my_game_item" id="my_game_item_${MY_ITEM_ID}"></div>';

*/

</script>  

{OVERALL_GAME_FOOTER}

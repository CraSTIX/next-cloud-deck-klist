<?php

style('decklist24', 'decklist24-main');
script('decklist24', 'decklist24-card');
script('decklist24', 'decklist24-main');

?>
<div id="decklist24-root"
	class="decklist24-app"
	data-deck-enabled="<?php p($_['deckEnabled'] ? 'true' : 'false'); ?>">
	<div class="decklist24-loading">
		<div class="icon-loading-small"></div>
		<span>Загрузка DeckList24</span>
	</div>
</div>

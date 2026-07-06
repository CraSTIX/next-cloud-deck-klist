import Vue from 'vue'
import DeckCardModal from './components/card/DeckCardModal.vue'

const CARD_BUNDLE_VERSION = '2026-07-06-attachments-v2'

Vue.config.productionTip = false

let activeVm = null

console.info('DeckList24 card bundle version:', CARD_BUNDLE_VERSION)

function destroyActive() {
	if (!activeVm) {
		return
	}

	const element = activeVm.$el
	activeVm.$destroy()
	if (element && element.parentNode) {
		element.parentNode.removeChild(element)
	}
	activeVm = null
}

function openDeckList24Card(options) {
	if (!options || !options.card || !options.card.id) {
		return false
	}

	console.info('DeckList24 card bundle version:', CARD_BUNDLE_VERSION, {
		action: 'openCardModal',
		cardId: options.card.id,
		boardId: options.card.boardId || (options.board && options.board.id) || null,
		stackId: options.card.stackId || (options.card.stack && options.card.stack.id) || null,
	})

	destroyActive()

	const mountEl = document.createElement('div')
	document.body.appendChild(mountEl)

	activeVm = new Vue({
		render: (h) => h(DeckCardModal, {
			props: {
				initialCard: options.card,
				board: options.board || null,
				stacks: options.stacks || [],
				canEdit: options.canEdit !== false,
				api: options.api || {},
				bundleVersion: CARD_BUNDLE_VERSION,
			},
			on: {
				close: destroyActive,
				'card-updated': (card) => {
					if (typeof options.onCardUpdated === 'function') {
						options.onCardUpdated(card)
					}
				},
			},
		}),
	}).$mount(mountEl)

	return true
}

window.DeckList24Card = {
	version: CARD_BUNDLE_VERSION,
	open: openDeckList24Card,
	close: destroyActive,
}

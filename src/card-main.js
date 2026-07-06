import Vue from 'vue'
import DeckCardModal from './components/card/DeckCardModal.vue'

Vue.config.productionTip = false

let activeVm = null

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
	open: openDeckList24Card,
	close: destroyActive,
}

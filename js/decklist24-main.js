(function() {
	'use strict'

	const state = {
		boards: [],
		currentBoard: null,
		stacks: [],
		cards: [],
		selectedBoardId: null,
		search: '',
		statusFilter: '',
		assigneeFilter: '',
		selectedCards: new Set(),
		selectedCard: null,
		cardModalOpen: false,
		cardModalLoading: false,
		cardModalError: '',
		cardModalSaving: false,
		cardModalSaveState: '',
		cardModalSaveMessage: '',
		cardModalSaveTimer: null,
		titleEditing: false,
		titleDraft: '',
		descriptionEditing: false,
		descriptionDraft: '',
		descriptionEditorError: '',
		textEditorDiagnosticsLogged: false,
		loading: false,
	}

	let elements = {}

	function generateUrl(path) {
		if (window.OC && typeof window.OC.generateUrl === 'function') {
			return window.OC.generateUrl(path)
		}
		return path
	}

	async function deckRequest(path, options) {
		const requestOptions = options || {}
		const headers = {
			Accept: 'application/json',
			'X-Requested-With': 'XMLHttpRequest',
			...(requestOptions.headers || {}),
		}

		if (window.OC && window.OC.requestToken) {
			headers.requesttoken = window.OC.requestToken
		}

		if (requestOptions.body && !headers['Content-Type']) {
			headers['Content-Type'] = 'application/json'
		}

		const response = await fetch(generateUrl(path), {
			credentials: 'same-origin',
			...requestOptions,
			headers,
		})

		if (!response.ok) {
			let message = response.statusText
			try {
				const data = await response.json()
				message = data.message || data.error || message
			} catch (e) {
				message = await response.text()
			}
			const error = new Error(message || ('HTTP ' + response.status))
			error.status = response.status
			throw error
		}

		if (response.status === 204) {
			return null
		}

		return response.json()
	}

	function init() {
		const root = document.getElementById('decklist24-root')
		if (!root) {
			return
		}

		if (root.dataset.deckEnabled !== 'true') {
			renderMissingDeck(root)
			return
		}

		logNextcloudTextEditorDiagnostics()

		root.innerHTML = [
			'<div class="decklist24-layout">',
			'	<aside class="decklist24-sidebar">',
			'		<div class="decklist24-sidebar__head">',
			'			<h2>Доски Deck</h2>',
			'			<button type="button" class="decklist24-icon-button" data-action="refresh-boards" title="Обновить доски">↻</button>',
			'		</div>',
			'		<div class="decklist24-board-list" data-role="board-list"></div>',
			'	</aside>',
			'	<main class="decklist24-main">',
			'		<div class="decklist24-header">',
			'			<div>',
			'				<h1 data-role="board-title">DeckList24</h1>',
			'				<p data-role="board-meta">Альтернативный список задач Nextcloud Deck</p>',
			'			</div>',
			'			<div class="decklist24-header__actions">',
			'				<button type="button" data-action="open-deck">Открыть Deck</button>',
			'				<button type="button" data-action="refresh-cards">Обновить</button>',
			'			</div>',
			'		</div>',
			'		<div class="decklist24-filters">',
			'			<label><span>Поиск</span><input type="search" data-role="search" placeholder="название, исполнитель, метка"></label>',
			'			<label><span>Статус</span><select data-role="status-filter"><option value="">Все колонки</option></select></label>',
			'			<label><span>Исполнитель</span><select data-role="assignee-filter"><option value="">Все</option><option value="__unassigned">Без исполнителя</option></select></label>',
			'		</div>',
			'		<div class="decklist24-alert" data-role="alert" hidden></div>',
			'		<div class="decklist24-table-wrap">',
			'			<table class="decklist24-table">',
			'				<thead><tr>',
			'					<th class="decklist24-col-check"><input type="checkbox" data-role="select-all"></th>',
			'					<th>Название задачи</th>',
			'					<th>Исполнитель</th>',
			'					<th>Статус / колонка</th>',
			'					<th>Срок</th>',
			'					<th>Дата создания</th>',
			'					<th>Метки</th>',
			'					<th>Комментарии / вложения</th>',
			'					<th class="decklist24-col-actions"></th>',
			'				</tr></thead>',
			'				<tbody data-role="cards-body"></tbody>',
			'			</table>',
			'		</div>',
			'	</main>',
			'</div>',
			'<div class="decklist24-modal-backdrop" data-role="card-modal" hidden>',
			'	<div class="decklist24-card-modal" role="dialog" aria-modal="true" aria-labelledby="decklist24-card-modal-title">',
			'		<div class="decklist24-card-modal__content" data-role="card-modal-content"></div>',
			'	</div>',
			'</div>',
		].join('')

		elements = {
			root,
			boardList: root.querySelector('[data-role="board-list"]'),
			boardTitle: root.querySelector('[data-role="board-title"]'),
			boardMeta: root.querySelector('[data-role="board-meta"]'),
			search: root.querySelector('[data-role="search"]'),
			statusFilter: root.querySelector('[data-role="status-filter"]'),
			assigneeFilter: root.querySelector('[data-role="assignee-filter"]'),
			selectAll: root.querySelector('[data-role="select-all"]'),
			cardsBody: root.querySelector('[data-role="cards-body"]'),
			alert: root.querySelector('[data-role="alert"]'),
			cardModal: root.querySelector('[data-role="card-modal"]'),
			cardModalContent: root.querySelector('[data-role="card-modal-content"]'),
		}

		elements.search.addEventListener('input', (event) => {
			state.search = event.target.value
			renderCards()
		})
		elements.statusFilter.addEventListener('change', (event) => {
			state.statusFilter = event.target.value
			renderCards()
		})
		elements.assigneeFilter.addEventListener('change', (event) => {
			state.assigneeFilter = event.target.value
			renderCards()
		})
		elements.selectAll.addEventListener('change', toggleVisibleSelection)
		root.querySelector('[data-action="refresh-boards"]').addEventListener('click', loadBoards)
		root.querySelector('[data-action="refresh-cards"]').addEventListener('click', () => {
			if (state.selectedBoardId) {
				loadBoard(state.selectedBoardId)
			}
		})
		root.querySelector('[data-action="open-deck"]').addEventListener('click', () => {
			openDeckHome()
		})
		elements.cardModal.addEventListener('click', (event) => {
			const target = event.target && typeof event.target.closest === 'function' ? event.target : null
			if (event.target === elements.cardModal) {
				closeCardModal()
				return
			}

			if (target && target.closest('[data-action="close-card-modal"]')) {
				closeCardModal()
				return
			}

			if (target && target.closest('[data-action="edit-card-title"]')) {
				startTitleEditing()
				return
			}

			if (target && target.closest('[data-action="save-card-title"]')) {
				saveTitleEdit()
				return
			}

			if (target && target.closest('[data-action="cancel-card-title"]')) {
				cancelTitleEditing()
				return
			}

			if (target && target.closest('[data-action="edit-card-description"]')) {
				startDescriptionEditing()
				return
			}

			if (target && target.closest('[data-action="save-card-description"]')) {
				saveDescriptionEdit()
				return
			}

			if (target && target.closest('[data-action="cancel-card-description"]')) {
				cancelDescriptionEditing()
				return
			}

			const formatButton = target && target.closest('[data-action="format-description"]')
			if (formatButton) {
				applyDescriptionFormat(formatButton.dataset.format)
			}
		})
		elements.cardModal.addEventListener('input', (event) => {
			const target = event.target && typeof event.target.closest === 'function' ? event.target : null
			if (!target) {
				return
			}

			if (target.matches('[data-role="card-title-input"]')) {
				state.titleDraft = target.value
				return
			}

			if (target.matches('[data-role="card-description-input"]')) {
				state.descriptionDraft = target.value
				updateDescriptionEditorPreview()
			}
		})
		elements.cardModal.addEventListener('change', (event) => {
			const target = event.target && typeof event.target.matches === 'function' ? event.target : null
			if (!target || !target.matches('[data-action="toggle-description-task"], [data-action="toggle-description-draft-task"]')) {
				return
			}

			if (target.dataset.action === 'toggle-description-draft-task') {
				toggleDescriptionDraftTask(Number(target.dataset.taskIndex), target.checked)
				return
			}

			toggleDescriptionTask(Number(target.dataset.taskIndex), target.checked)
		})
		elements.cardModal.addEventListener('keydown', (event) => {
			const target = event.target && typeof event.target.matches === 'function' ? event.target : null
			if (!target || !target.matches('[data-role="card-title-input"]')) {
				return
			}

			if (event.key === 'Enter') {
				event.preventDefault()
				saveTitleEdit()
			}
		})
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && state.cardModalOpen) {
				if (state.titleEditing) {
					event.preventDefault()
					cancelTitleEditing()
					return
				}
				if (state.descriptionEditing) {
					event.preventDefault()
					cancelDescriptionEditing()
					return
				}
				closeCardModal()
			}
		})

		loadBoards()
	}

	function renderMissingDeck(root) {
		root.innerHTML = [
			'<div class="decklist24-missing">',
			'	<h2>Для работы DeckList24 нужно установить и включить приложение Deck</h2>',
			'	<p>DeckList24 не хранит свои задачи и использует данные установленного Nextcloud Deck.</p>',
			'</div>',
		].join('')
	}

	async function loadBoards() {
		setLoading(true)
		hideAlert()
		try {
			const boards = await deckRequest('/apps/deck/boards')
			state.boards = Array.isArray(boards) ? boards.filter((board) => !board.deletedAt) : []
			renderBoards()
			if (!state.selectedBoardId && state.boards.length > 0) {
				await selectBoard(state.boards[0].id)
			} else if (state.selectedBoardId) {
				await loadBoard(state.selectedBoardId)
			} else {
				renderEmpty('В Deck пока нет доступных досок')
			}
		} catch (error) {
			showAlert('Не удалось загрузить доски Deck. Проверьте, что приложение Deck установлено и включено.')
			renderEmpty(error.message)
		} finally {
			setLoading(false)
		}
	}

	async function selectBoard(boardId) {
		state.selectedBoardId = Number(boardId)
		state.selectedCards.clear()
		renderBoards()
		await loadBoard(state.selectedBoardId)
	}

	async function loadBoard(boardId) {
		setLoading(true)
		hideAlert()
		try {
			const board = await deckRequest('/apps/deck/boards/' + encodeURIComponent(boardId))
			const stacks = await deckRequest('/apps/deck/stacks/' + encodeURIComponent(boardId))
			state.currentBoard = board
			state.stacks = Array.isArray(stacks) ? stacks : []
			state.cards = flattenCards(state.currentBoard, state.stacks)
			renderHeader()
			renderFilters()
			renderCards()
		} catch (error) {
			showAlert('Не удалось загрузить карточки выбранной доски: ' + error.message)
			renderEmpty(error.message)
		} finally {
			setLoading(false)
		}
	}

	function flattenCards(board, stacks) {
		return stacks.reduce((cards, stack, stackIndex) => {
			const stackCards = Array.isArray(stack.cards) ? stack.cards : []
			stackCards.forEach((card) => {
				cards.push({
					...card,
					boardId: card.boardId || board.id,
					stackId: card.stackId || stack.id,
					stackTitle: stack.title,
					stackOrder: stackIndex,
				})
			})
			return cards
		}, []).sort((a, b) => {
			if (a.stackOrder !== b.stackOrder) {
				return a.stackOrder - b.stackOrder
			}
			return (a.order || 0) - (b.order || 0)
		})
	}

	function renderBoards() {
		elements.boardList.textContent = ''
		state.boards.forEach((board) => {
			const button = document.createElement('button')
			button.type = 'button'
			button.className = 'decklist24-board'
			if (Number(board.id) === Number(state.selectedBoardId)) {
				button.classList.add('decklist24-board--active')
			}
			button.addEventListener('click', () => selectBoard(board.id))

			const color = document.createElement('span')
			color.className = 'decklist24-board__color'
			color.style.backgroundColor = '#' + (board.color || '0082c9')

			const title = document.createElement('span')
			title.className = 'decklist24-board__title'
			title.textContent = board.title

			button.append(color, title)
			elements.boardList.append(button)
		})
	}

	function renderHeader() {
		if (!state.currentBoard) {
			elements.boardTitle.textContent = 'DeckList24'
			elements.boardMeta.textContent = 'Выберите доску слева'
			return
		}
		elements.boardTitle.textContent = state.currentBoard.title
		elements.boardMeta.textContent = state.cards.length + ' задач, ' + state.stacks.length + ' колонок'
	}

	function renderFilters() {
		setSelectOptions(elements.statusFilter, [
			{ value: '', label: 'Все колонки' },
			...state.stacks.map((stack) => ({ value: String(stack.id), label: stack.title })),
		], state.statusFilter)

		const users = collectAssignees()
		setSelectOptions(elements.assigneeFilter, [
			{ value: '', label: 'Все' },
			{ value: '__unassigned', label: 'Без исполнителя' },
			...users,
		], state.assigneeFilter)
	}

	function setSelectOptions(select, options, selectedValue) {
		select.textContent = ''
		options.forEach((optionData) => {
			const option = document.createElement('option')
			option.value = optionData.value
			option.textContent = optionData.label
			select.append(option)
		})
		select.value = selectedValue
	}

	function collectAssignees() {
		const users = new Map()
		if (state.currentBoard && Array.isArray(state.currentBoard.users)) {
			state.currentBoard.users.forEach((user) => {
				if (user.uid) {
					users.set(user.uid, user.displayname || user.uid)
				}
			})
		}
		state.cards.forEach((card) => {
			(card.assignedUsers || []).forEach((assignment) => {
				const participant = assignment.participant || {}
				const id = participant.uid || participant.primaryKey
				if (id) {
					users.set(id, participant.displayname || id)
				}
			})
		})
		return Array.from(users.entries())
			.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)
			.map(([value, label]) => ({ value, label }))
	}

	function getVisibleCards() {
		const search = state.search.trim().toLowerCase()
		return state.cards.filter((card) => {
			if (state.statusFilter && String(card.stackId) !== state.statusFilter) {
				return false
			}
			if (state.assigneeFilter && !matchesAssignee(card, state.assigneeFilter)) {
				return false
			}
			if (!search) {
				return true
			}
			return getSearchText(card).toLowerCase().indexOf(search) !== -1
		})
	}

	function matchesAssignee(card, assigneeId) {
		const assignedUsers = card.assignedUsers || []
		if (assigneeId === '__unassigned') {
			return assignedUsers.length === 0
		}
		return assignedUsers.some((assignment) => {
			const participant = assignment.participant || {}
			return participant.uid === assigneeId || participant.primaryKey === assigneeId
		})
	}

	function getSearchText(card) {
		return [
			card.title,
			card.description,
			card.stackTitle,
			getAssigneeNames(card),
			...(card.labels || []).map((label) => label.title),
		].filter(Boolean).join(' ')
	}

	function renderCards() {
		const cards = getVisibleCards()
		elements.cardsBody.textContent = ''
		elements.selectAll.checked = cards.length > 0 && cards.every((card) => state.selectedCards.has(card.id))
		elements.selectAll.disabled = cards.length === 0

		if (cards.length === 0) {
			renderEmpty('Нет задач для выбранных условий')
			return
		}

		cards.forEach((card) => {
			elements.cardsBody.append(createCardRow(card))
		})
	}

	function createCardRow(card) {
		const row = document.createElement('tr')
		if (card.archived) {
			row.classList.add('decklist24-row--archived')
		}

		const checkboxCell = document.createElement('td')
		const checkbox = document.createElement('input')
		checkbox.type = 'checkbox'
		checkbox.checked = state.selectedCards.has(card.id)
		checkbox.addEventListener('change', () => {
			if (checkbox.checked) {
				state.selectedCards.add(card.id)
			} else {
				state.selectedCards.delete(card.id)
			}
			renderCards()
		})
		checkboxCell.append(checkbox)

		const titleCell = document.createElement('td')
		const titleButton = document.createElement('button')
		titleButton.type = 'button'
		titleButton.className = 'decklist24-title-button'
		titleButton.textContent = card.title || '(без названия)'
		titleButton.addEventListener('click', (event) => {
			event.preventDefault()
			openCardModal(card)
		})
		titleCell.append(titleButton)

		const assigneeCell = textCell(getAssigneeNames(card) || '-')
		const statusCell = document.createElement('td')
		statusCell.append(createStatusSelect(card))
		const dueCell = textCell(formatDate(card.duedate))
		if (card.overdue === 3) {
			dueCell.classList.add('decklist24-overdue')
		}
		const createdCell = textCell(formatDate(card.createdAt, true))
		const labelsCell = document.createElement('td')
		labelsCell.append(createLabels(card.labels || []))
		const metaCell = textCell((card.commentsCount || 0) + ' / ' + (card.attachmentCount || 0))
		metaCell.classList.add('decklist24-muted')
		const actionsCell = document.createElement('td')
		const actionsButton = document.createElement('button')
		actionsButton.type = 'button'
		actionsButton.className = 'decklist24-row-action'
		actionsButton.title = 'Открыть в Deck'
		actionsButton.textContent = '⋯'
		actionsButton.addEventListener('click', () => openDeckCard(card))
		actionsCell.append(actionsButton)

		row.append(
			checkboxCell,
			titleCell,
			assigneeCell,
			statusCell,
			dueCell,
			createdCell,
			labelsCell,
			metaCell,
			actionsCell
		)
		return row
	}

	function createStatusSelect(card) {
		const select = document.createElement('select')
		select.className = 'decklist24-status-select'
		select.disabled = !canEditCurrentBoard() || card.archived
		state.stacks.forEach((stack) => {
			const option = document.createElement('option')
			option.value = String(stack.id)
			option.textContent = stack.title
			select.append(option)
		})
		select.value = String(card.stackId)
		select.addEventListener('change', () => moveCard(card, Number(select.value)))
		return select
	}

	async function moveCard(card, targetStackId) {
		if (!targetStackId || targetStackId === Number(card.stackId)) {
			return
		}
		const targetCards = state.cards.filter((item) => Number(item.stackId) === targetStackId)
		const payload = {
			...card,
			stackId: targetStackId,
			order: targetCards.length,
		}

		setLoading(true)
		hideAlert()
		try {
			await deckRequest('/apps/deck/cards/' + encodeURIComponent(card.id) + '/reorder', {
				method: 'PUT',
				body: JSON.stringify(payload),
			})
			await loadBoard(state.selectedBoardId)
		} catch (error) {
			showAlert('Не удалось изменить статус карточки: ' + error.message)
			renderCards()
		} finally {
			setLoading(false)
		}
	}

	function openDeckCard(card) {
		const boardId = card.boardId || state.selectedBoardId
		openDeckUrl(generateUrl('/apps/deck/') + '#/board/' + encodeURIComponent(boardId) + '/card/' + encodeURIComponent(card.id))
	}

	function openDeckHome() {
		openDeckUrl(generateUrl('/apps/deck/'))
	}

	function openDeckUrl(url) {
		window.open(url, '_self')
	}

	function openVueCardModal(card) {
		const bridge = window.DeckList24Card
		if (!bridge || typeof bridge.open !== 'function') {
			console.info('[DeckList24] Vue card bundle is not available, using fallback card modal')
			return false
		}

		try {
			return bridge.open({
				card: normalizeModalCard(card),
				board: state.currentBoard,
				stacks: state.stacks,
				canEdit: canEditCurrentBoard(),
				api: {
					request: deckRequest,
					ocsRequest: deckOcsRequest,
					generateUrl,
				},
				onCardUpdated: (updatedCard) => {
					applyCardUpdate(updatedCard)
					renderHeader()
					renderFilters()
					renderCards()
				},
			}) === true
		} catch (error) {
			console.error('[DeckList24] Failed to open Vue card modal, using fallback card modal', error)
			return false
		}
	}

	async function openCardModal(card) {
		if (openVueCardModal(card)) {
			return
		}

		const cardId = card.id
		let detail = normalizeModalCard(card)

		state.selectedCard = detail
		state.cardModalOpen = true
		state.cardModalLoading = true
		state.cardModalError = ''
		resetCardEditState()
		clearCardModalSaveStatus()
		renderCardModal()

		try {
			const fullCard = await deckRequest('/apps/deck/cards/' + encodeURIComponent(cardId))
			detail = normalizeModalCard({
				...detail,
				...fullCard,
				boardId: detail.boardId,
				stackId: fullCard.stackId || detail.stackId,
				stackTitle: detail.stackTitle || getStackTitle(fullCard.stackId),
			})
		} catch (error) {
			state.cardModalError = 'Не удалось загрузить полные данные карточки. Показаны данные из списка.'
		}

		if (!Array.isArray(detail.attachments) && (detail.attachmentCount || 0) > 0) {
			try {
				detail.attachments = await deckRequest('/apps/deck/cards/' + encodeURIComponent(cardId) + '/attachments')
			} catch (error) {
				detail.attachmentsError = true
			}
		}

		if (!Array.isArray(detail.comments) && (detail.commentsCount || 0) > 0) {
			try {
				detail.comments = await deckOcsRequest('apps/deck/api/v1.0/cards/' + encodeURIComponent(cardId) + '/comments', {
					params: { limit: 20, offset: 0 },
				})
			} catch (error) {
				detail.commentsError = true
			}
		}

		if (!state.cardModalOpen || !state.selectedCard || Number(state.selectedCard.id) !== Number(cardId)) {
			return
		}

		state.selectedCard = detail
		state.cardModalLoading = false
		renderCardModal()
	}

	function closeCardModal() {
		state.selectedCard = null
		state.cardModalOpen = false
		state.cardModalLoading = false
		state.cardModalError = ''
		state.cardModalSaving = false
		resetCardEditState()
		clearCardModalSaveStatus()
		if (elements.cardModal) {
			elements.cardModal.hidden = true
		}
		if (elements.cardModalContent) {
			elements.cardModalContent.textContent = ''
		}
	}

	function renderCardModal() {
		if (!elements.cardModal || !elements.cardModalContent) {
			return
		}

		if (!state.cardModalOpen) {
			elements.cardModal.hidden = true
			return
		}

		const card = state.selectedCard || {}
		elements.cardModal.hidden = false
		elements.cardModalContent.textContent = ''

		const header = document.createElement('div')
		header.className = 'decklist24-card-modal__header'

		const titleWrap = document.createElement('div')
		titleWrap.className = 'decklist24-card-modal__title-wrap'

		titleWrap.append(createCardTitleBlock(card))

		const subtitle = document.createElement('p')
		subtitle.textContent = [getBoardTitle(card), card.stackTitle || getStackTitle(card.stackId)]
			.filter(Boolean)
			.join(' · ')

		titleWrap.append(subtitle)

		const closeButton = document.createElement('button')
		closeButton.type = 'button'
		closeButton.className = 'decklist24-card-modal__close'
		closeButton.dataset.action = 'close-card-modal'
		closeButton.title = 'Закрыть'
		closeButton.textContent = '×'

		header.append(titleWrap, closeButton)
		elements.cardModalContent.append(header)

		if (state.cardModalError) {
			const notice = document.createElement('div')
			notice.className = 'decklist24-card-modal__notice'
			notice.textContent = state.cardModalError
			elements.cardModalContent.append(notice)
		}

		if (state.cardModalLoading) {
			const loading = document.createElement('div')
			loading.className = 'decklist24-card-modal__loading'
			loading.append(createSpinner(), document.createTextNode('Загрузка карточки Deck'))
			elements.cardModalContent.append(loading)
		}

		if (state.cardModalSaveState) {
			const saveStatus = document.createElement('div')
			saveStatus.className = 'decklist24-card-modal__save-status decklist24-card-modal__save-status--' + state.cardModalSaveState
			if (state.cardModalSaveState === 'saving') {
				saveStatus.append(createSpinner())
			}
			saveStatus.append(document.createTextNode(state.cardModalSaveMessage))
			elements.cardModalContent.append(saveStatus)
		}

		const meta = document.createElement('div')
		meta.className = 'decklist24-card-modal__meta'
		appendCardMeta(meta, 'Исполнитель', getAssigneeNames(card) || '-')
		appendCardMeta(meta, 'Статус / колонка', card.stackTitle || getStackTitle(card.stackId) || '-')
		appendCardMeta(meta, 'Срок', formatDate(card.duedate))
		appendCardMeta(meta, 'Создана', formatDate(card.createdAt, true))
		appendCardMeta(meta, 'Комментарии', String(card.commentsCount || 0))
		appendCardMeta(meta, 'Вложения', String(getAttachmentCount(card)))
		elements.cardModalContent.append(meta)

		const body = document.createElement('div')
		body.className = 'decklist24-card-modal__body'

		const description = state.descriptionEditing
			? createDescriptionEditor()
			: renderMarkdownDescription(card.description, 'Описание не заполнено', {
				taskAction: 'toggle-description-task',
				disabled: state.cardModalSaving || state.cardModalLoading,
			})
		appendCardSection(body, 'Описание', description, createDescriptionActions())

		appendCardSection(body, 'Метки', createLabels(card.labels || []))
		appendCardSection(body, 'Комментарии', createComments(card))
		appendCardSection(body, 'Вложения', createAttachments(card))
		elements.cardModalContent.append(body)
	}

	function createCardTitleBlock(card) {
		if (state.titleEditing) {
			const editor = document.createElement('div')
			editor.className = 'decklist24-card-modal__title-editor'

			const label = document.createElement('label')
			label.id = 'decklist24-card-modal-title'
			label.textContent = 'Название'

			const input = document.createElement('input')
			input.type = 'text'
			input.value = state.titleDraft
			input.dataset.role = 'card-title-input'
			input.disabled = state.cardModalSaving || state.cardModalLoading

			const actions = document.createElement('div')
			actions.className = 'decklist24-card-modal__edit-actions'

			const saveButton = document.createElement('button')
			saveButton.type = 'button'
			saveButton.dataset.action = 'save-card-title'
			saveButton.textContent = state.cardModalSaving ? 'Сохранение...' : 'Сохранить'
			saveButton.disabled = state.cardModalSaving || state.cardModalLoading

			const cancelButton = document.createElement('button')
			cancelButton.type = 'button'
			cancelButton.dataset.action = 'cancel-card-title'
			cancelButton.textContent = 'Отмена'
			cancelButton.disabled = state.cardModalSaving

			actions.append(saveButton, cancelButton)
			editor.append(label, input, actions)
			return editor
		}

		const titleRow = document.createElement('div')
		titleRow.className = 'decklist24-card-modal__title-row'

		const title = document.createElement('h2')
		title.id = 'decklist24-card-modal-title'
		title.textContent = card.title || '(без названия)'

		const editButton = document.createElement('button')
		editButton.type = 'button'
		editButton.className = 'decklist24-card-modal__edit-button'
		editButton.dataset.action = 'edit-card-title'
		editButton.textContent = 'Редактировать'
		editButton.disabled = state.cardModalSaving || state.cardModalLoading

		titleRow.append(title, editButton)
		return titleRow
	}

	function createDescriptionActions() {
		if (state.descriptionEditing) {
			return null
		}

		const editButton = document.createElement('button')
		editButton.type = 'button'
		editButton.className = 'decklist24-card-modal__edit-button'
		editButton.dataset.action = 'edit-card-description'
		editButton.textContent = 'Редактировать описание'
		editButton.disabled = state.cardModalSaving || state.cardModalLoading
		return editButton
	}

	function createDescriptionEditor() {
		const editor = document.createElement('div')
		editor.className = 'decklist24-card-modal__description-editor'

		const shell = document.createElement('div')
		shell.className = 'decklist24-card-modal__markdown-editor'

		const toolbar = createMarkdownEditorToolbar()

		const workspace = document.createElement('div')
		workspace.className = 'decklist24-card-modal__markdown-workspace'

		const textareaWrap = document.createElement('div')
		textareaWrap.className = 'decklist24-card-modal__markdown-pane'

		const textarea = document.createElement('textarea')
		textarea.dataset.role = 'card-description-input'
		textarea.value = state.descriptionDraft
		textarea.rows = 14
		textarea.disabled = state.cardModalSaving || state.cardModalLoading
		textarea.spellcheck = true
		textareaWrap.append(textarea)

		const previewWrap = document.createElement('div')
		previewWrap.className = 'decklist24-card-modal__markdown-pane decklist24-card-modal__markdown-pane--preview'
		previewWrap.dataset.role = 'card-description-preview'
		previewWrap.append(renderMarkdownDescription(state.descriptionDraft, 'Предпросмотр пустой', {
			taskAction: 'toggle-description-draft-task',
			disabled: state.cardModalSaving || state.cardModalLoading,
		}))

		workspace.append(textareaWrap, previewWrap)
		shell.append(toolbar, workspace)
		editor.append(shell)

		const actions = document.createElement('div')
		actions.className = 'decklist24-card-modal__edit-actions'

		const saveButton = document.createElement('button')
		saveButton.type = 'button'
		saveButton.dataset.action = 'save-card-description'
		saveButton.textContent = state.cardModalSaving ? 'Сохранение...' : 'Сохранить'
		saveButton.disabled = state.cardModalSaving || state.cardModalLoading

		const cancelButton = document.createElement('button')
		cancelButton.type = 'button'
		cancelButton.dataset.action = 'cancel-card-description'
		cancelButton.textContent = 'Отмена'
		cancelButton.disabled = state.cardModalSaving

		actions.append(saveButton, cancelButton)
		editor.append(actions)
		return editor
	}

	function createMarkdownEditorToolbar() {
		const toolbar = document.createElement('div')
		toolbar.className = 'decklist24-card-modal__editor-toolbar'
		toolbar.setAttribute('role', 'toolbar')
		toolbar.setAttribute('aria-label', 'Панель форматирования описания')

		const tools = [
			{ format: 'undo', label: '↶', title: 'Отменить' },
			{ format: 'redo', label: '↷', title: 'Повторить' },
			{ format: 'heading', label: 'H', title: 'Заголовок' },
			{ format: 'bold', label: 'B', title: 'Жирный' },
			{ format: 'italic', label: 'I', title: 'Курсив' },
			{ format: 'underline', label: 'U', title: 'Подчёркивание' },
			{ format: 'bullet', label: '•', title: 'Маркированный список' },
			{ format: 'ordered', label: '1.', title: 'Нумерованный список' },
			{ format: 'task', label: '☑', title: 'Checkbox' },
			{ format: 'table', label: '▦', title: 'Таблица' },
			{ format: 'link', label: '🔗', title: 'Ссылка' },
		]

		tools.forEach((item) => {
			const button = document.createElement('button')
			button.type = 'button'
			button.className = 'decklist24-card-modal__editor-tool'
			button.dataset.action = 'format-description'
			button.dataset.format = item.format
			button.title = item.title
			button.textContent = item.label
			toolbar.append(button)
		})

		return toolbar
	}

	function normalizeModalCard(card) {
		const stackId = card.stackId || card.stack?.id
		return {
			...card,
			boardId: card.boardId || state.selectedBoardId,
			stackId,
			stackTitle: card.stackTitle || card.stack?.title || getStackTitle(stackId),
		}
	}

	function startTitleEditing() {
		if (!state.selectedCard || state.cardModalSaving || state.cardModalLoading) {
			return
		}
		state.titleEditing = true
		state.titleDraft = state.selectedCard.title || ''
		clearCardModalSaveStatus()
		renderCardModal()
		focusModalField('[data-role="card-title-input"]')
	}

	function cancelTitleEditing() {
		state.titleEditing = false
		state.titleDraft = ''
		renderCardModal()
	}

	async function saveTitleEdit() {
		if (!state.selectedCard || state.cardModalSaving) {
			return
		}

		const title = state.titleDraft.trim()
		if (!title) {
			setCardModalSaveStatus('error', 'Ошибка сохранения названия')
			setCardModalError('Название не может быть пустым.')
			return
		}

		if (title === (state.selectedCard.title || '')) {
			cancelTitleEditing()
			return
		}

		await saveSelectedCardPatch(
			{ title },
			{
				saving: 'Сохранение названия...',
				saved: 'Название сохранено',
				error: 'Ошибка сохранения названия',
			},
			{
				onSuccess: () => {
					state.titleEditing = false
					state.titleDraft = ''
				},
			}
		)
	}

	function startDescriptionEditing() {
		if (!state.selectedCard || state.cardModalSaving || state.cardModalLoading) {
			return
		}
		state.descriptionEditing = true
		state.descriptionDraft = state.selectedCard.description || ''
		state.descriptionEditorError = ''
		logNextcloudTextEditorDiagnostics()
		clearCardModalSaveStatus()
		renderCardModal()
		focusModalField('[data-role="card-description-input"]')
	}

	function cancelDescriptionEditing() {
		state.descriptionEditing = false
		state.descriptionDraft = ''
		state.descriptionEditorError = ''
		renderCardModal()
	}

	async function saveDescriptionEdit() {
		if (!state.selectedCard || state.cardModalSaving) {
			return
		}

		syncDescriptionDraftFromEditor()
		const description = state.descriptionDraft
		if (description === (state.selectedCard.description || '')) {
			cancelDescriptionEditing()
			return
		}

		await saveSelectedCardPatch(
			{ description },
			{
				saving: 'Сохранение описания...',
				saved: 'Описание сохранено',
				error: 'Ошибка сохранения описания',
			},
			{
				onSuccess: () => {
					state.descriptionEditing = false
					state.descriptionDraft = ''
					state.descriptionEditorError = ''
				},
			}
		)
	}

	async function toggleDescriptionTask(taskIndex, checked) {
		if (!state.selectedCard || state.cardModalSaving || state.descriptionEditing || Number.isNaN(taskIndex)) {
			renderCardModal()
			return
		}

		const description = state.selectedCard.description || ''
		const updatedDescription = setMarkdownTaskChecked(description, taskIndex, checked)
		if (updatedDescription === description) {
			renderCardModal()
			return
		}

		await saveSelectedCardPatch(
			{ description: updatedDescription },
			{
				saving: 'Сохранение чеклиста...',
				saved: 'Чеклист сохранён',
				error: 'Ошибка сохранения чеклиста',
			},
			{
				optimisticPatch: { description: updatedDescription },
			}
		)
	}

	async function saveSelectedCardPatch(patch, messages, options) {
		const card = state.selectedCard
		if (!card) {
			return
		}

		const previousCard = { ...card }
		const saveOptions = options || {}

		state.cardModalSaving = true
		state.cardModalError = ''
		setCardModalSaveStatus('saving', messages.saving || 'Сохранение...')

		if (saveOptions.optimisticPatch) {
			applyCardUpdate({ ...card, ...saveOptions.optimisticPatch })
		}

		renderCardModal()

		try {
			const updatedCard = await updateDeckCard(card, patch)
			applyCardUpdate(updatedCard)
			if (typeof saveOptions.onSuccess === 'function') {
				saveOptions.onSuccess(updatedCard)
			}
			state.cardModalSaving = false
			setCardModalSaveStatus('saved', messages.saved || 'Сохранено')
			renderCards()
			renderCardModal()
		} catch (error) {
			applyCardUpdate(previousCard)
			state.cardModalSaving = false
			setCardModalSaveStatus('error', messages.error || 'Ошибка сохранения')
			setCardModalError((messages.error || 'Ошибка сохранения') + ': ' + getErrorMessage(error))
			renderCards()
			renderCardModal()
		}
	}

	async function updateDeckCard(card, patch) {
		const payload = buildDeckCardPayload(card, patch)
		let updatedCard
		try {
			updatedCard = await deckOcsRequest('apps/deck/api/v1.0/cards/' + encodeURIComponent(card.id), {
				method: 'PUT',
				body: JSON.stringify(payload),
			})
		} catch (error) {
			if (![404, 405].includes(error.status)) {
				throw error
			}
			updatedCard = await deckRequest('/apps/deck/cards/' + encodeURIComponent(card.id), {
				method: 'PUT',
				body: JSON.stringify(payload),
			})
		}
		return normalizeModalCard({
			...card,
			...updatedCard,
			boardId: card.boardId || state.selectedBoardId,
			stackId: updatedCard.stackId || card.stackId,
			stackTitle: card.stackTitle || getStackTitle(updatedCard.stackId || card.stackId),
		})
	}

	function buildDeckCardPayload(card, patch) {
		const payload = {
			...card,
			...patch,
		}

		return {
			...payload,
			id: payload.id,
			title: payload.title || '',
			stackId: payload.stackId,
			type: payload.type || 'plain',
			order: typeof payload.order === 'number' ? payload.order : Number(payload.order || 0),
			description: payload.description || '',
			duedate: payload.duedate || null,
			deletedAt: payload.deletedAt || 0,
			boardId: payload.boardId || state.selectedBoardId || null,
		}
	}

	function applyCardUpdate(updatedCard) {
		const normalized = normalizeModalCard({
			...(state.selectedCard && Number(state.selectedCard.id) === Number(updatedCard.id) ? state.selectedCard : {}),
			...updatedCard,
		})

		if (state.selectedCard && Number(state.selectedCard.id) === Number(normalized.id)) {
			state.selectedCard = normalized
		}

		state.cards = state.cards.map((card) => {
			if (Number(card.id) !== Number(normalized.id)) {
				return card
			}

			return normalizeModalCard({
				...card,
				...normalized,
				boardId: card.boardId || normalized.boardId,
				stackTitle: normalized.stackTitle || card.stackTitle,
			})
		})

		state.stacks = state.stacks.map((stack) => ({
			...stack,
			cards: Array.isArray(stack.cards)
				? stack.cards.map((card) => Number(card.id) === Number(normalized.id) ? { ...card, ...normalized } : card)
				: stack.cards,
		}))
	}

	function setMarkdownTaskChecked(description, targetIndex, checked) {
		let taskIndex = -1
		return String(description || '').replace(
			/^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX_-])(\]\s+)/gm,
			(match, prefix, mark, suffix) => {
				taskIndex += 1
				if (taskIndex !== targetIndex) {
					return match
				}
				return prefix + (checked ? 'x' : ' ') + suffix
			}
		)
	}

	function resetCardEditState() {
		state.titleEditing = false
		state.titleDraft = ''
		state.descriptionEditing = false
		state.descriptionDraft = ''
		state.descriptionEditorError = ''
	}

	function logNextcloudTextEditorDiagnostics() {
		if (state.textEditorDiagnosticsLogged) {
			return
		}

		state.textEditorDiagnosticsLogged = true
		const diagnostics = {
			OCA: typeof window.OCA,
			OCA_Text: typeof window.OCA?.Text,
			OCA_Text_createEditor: typeof window.OCA?.Text?.createEditor,
		}

		console.info('[DeckList24] Nextcloud Text editor diagnostics', diagnostics)
		if (diagnostics.OCA_Text_createEditor !== 'function') {
			console.info('Nextcloud Text editor is not available on this page, using internal markdown editor')
		}
	}

	function updateDescriptionEditorPreview() {
		const preview = elements.cardModalContent?.querySelector('[data-role="card-description-preview"]')
		if (!preview) {
			return
		}

		preview.textContent = ''
		preview.append(renderMarkdownDescription(state.descriptionDraft, 'Предпросмотр пустой', {
			taskAction: 'toggle-description-draft-task',
			disabled: state.cardModalSaving || state.cardModalLoading,
		}))
	}

	function toggleDescriptionDraftTask(taskIndex, checked) {
		if (!state.descriptionEditing || Number.isNaN(taskIndex)) {
			return
		}

		const updatedDescription = setMarkdownTaskChecked(state.descriptionDraft, taskIndex, checked)
		if (updatedDescription === state.descriptionDraft) {
			updateDescriptionEditorPreview()
			return
		}

		state.descriptionDraft = updatedDescription
		const textarea = elements.cardModalContent?.querySelector('[data-role="card-description-input"]')
		if (textarea) {
			textarea.value = updatedDescription
		}
		updateDescriptionEditorPreview()
	}

	function syncDescriptionDraftFromEditor() {
		const textarea = elements.cardModalContent?.querySelector('[data-role="card-description-input"]')
		if (textarea) {
			state.descriptionDraft = textarea.value
		}
	}

	function applyDescriptionFormat(format) {
		const textarea = elements.cardModalContent?.querySelector('[data-role="card-description-input"]')
		if (!textarea || textarea.disabled) {
			return
		}

		switch (format) {
		case 'undo':
			textarea.focus()
			document.execCommand?.('undo')
			break
		case 'redo':
			textarea.focus()
			document.execCommand?.('redo')
			break
		case 'heading':
			wrapDescriptionSelection(textarea, '## ', '')
			break
		case 'bold':
			wrapDescriptionSelection(textarea, '**', '**', 'жирный текст')
			break
		case 'italic':
			wrapDescriptionSelection(textarea, '*', '*', 'курсив')
			break
		case 'underline':
			wrapDescriptionSelection(textarea, '<u>', '</u>', 'подчёркнутый текст')
			break
		case 'bullet':
			prefixDescriptionLines(textarea, '- ')
			break
		case 'ordered':
			prefixDescriptionLines(textarea, '1. ')
			break
		case 'task':
			prefixDescriptionLines(textarea, '- [ ] ')
			break
		case 'table':
			insertDescriptionText(textarea, '\n| Колонка 1 | Колонка 2 |\n| --- | --- |\n| Текст | Текст |\n')
			break
		case 'link':
			wrapDescriptionSelection(textarea, '[', '](https://)', 'текст ссылки')
			break
		default:
			return
		}

		state.descriptionDraft = textarea.value
		updateDescriptionEditorPreview()
		textarea.focus()
	}

	function wrapDescriptionSelection(textarea, before, after, placeholder) {
		const start = textarea.selectionStart
		const end = textarea.selectionEnd
		const selected = textarea.value.slice(start, end) || placeholder || ''
		const replacement = before + selected + after
		textarea.setRangeText(replacement, start, end, 'select')
	}

	function prefixDescriptionLines(textarea, prefix) {
		const start = textarea.selectionStart
		const end = textarea.selectionEnd
		const selected = textarea.value.slice(start, end) || 'пункт'
		const replacement = selected
			.split('\n')
			.map((line) => prefix + line.replace(/^\s*/, ''))
			.join('\n')
		textarea.setRangeText(replacement, start, end, 'select')
	}

	function insertDescriptionText(textarea, text) {
		textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end')
	}

	function setCardModalSaveStatus(type, message) {
		if (state.cardModalSaveTimer) {
			window.clearTimeout(state.cardModalSaveTimer)
			state.cardModalSaveTimer = null
		}

		state.cardModalSaveState = type
		state.cardModalSaveMessage = message

		if (type === 'saved') {
			state.cardModalSaveTimer = window.setTimeout(() => {
				if (state.cardModalSaveState === 'saved') {
					clearCardModalSaveStatus()
					renderCardModal()
				}
			}, 2200)
		}
	}

	function clearCardModalSaveStatus() {
		if (state.cardModalSaveTimer) {
			window.clearTimeout(state.cardModalSaveTimer)
			state.cardModalSaveTimer = null
		}
		state.cardModalSaveState = ''
		state.cardModalSaveMessage = ''
	}

	function setCardModalError(message) {
		state.cardModalError = message
		renderCardModal()
	}

	function getErrorMessage(error) {
		return error && error.message ? error.message : String(error || 'Неизвестная ошибка')
	}

	function focusModalField(selector) {
		window.setTimeout(() => {
			const field = elements.cardModalContent?.querySelector(selector)
			if (field) {
				field.focus()
				if (typeof field.select === 'function') {
					field.select()
				}
			}
		}, 0)
	}

	function getBoardTitle(card) {
		const boardId = card.boardId || state.selectedBoardId
		const board = state.boards.find((item) => Number(item.id) === Number(boardId))
		return board?.title || state.currentBoard?.title || ''
	}

	function getStackTitle(stackId) {
		const stack = state.stacks.find((item) => Number(item.id) === Number(stackId))
		return stack?.title || ''
	}

	function appendCardMeta(container, label, value) {
		const item = document.createElement('div')
		item.className = 'decklist24-card-modal__meta-item'

		const labelElement = document.createElement('span')
		labelElement.textContent = label

		const valueElement = document.createElement('strong')
		valueElement.textContent = value || '-'

		item.append(labelElement, valueElement)
		container.append(item)
	}

	function appendCardSection(container, title, content, actions) {
		const section = document.createElement('section')
		section.className = 'decklist24-card-modal__section'

		const headingRow = document.createElement('div')
		headingRow.className = 'decklist24-card-modal__section-head'

		const heading = document.createElement('h3')
		heading.textContent = title

		headingRow.append(heading)
		if (actions) {
			headingRow.append(actions)
		}

		section.append(headingRow, content)
		container.append(section)
	}

	function renderMarkdownDescription(markdown, emptyText, options) {
		const wrapper = document.createElement('div')
		wrapper.className = 'decklist24-card-modal__description decklist24-markdown'
		const renderOptions = options || {}
		const context = {
			taskIndex: 0,
			taskAction: renderOptions.taskAction || '',
			disabled: !!renderOptions.disabled,
		}

		const source = String(markdown || '').replace(/\r\n?/g, '\n').trim()
		if (!source) {
			const empty = document.createElement('p')
			empty.className = 'decklist24-muted'
			empty.textContent = emptyText
			wrapper.append(empty)
			return wrapper
		}

		appendMarkdownBlocks(wrapper, source, context)
		return wrapper
	}

	function appendMarkdownBlocks(container, markdown, context) {
		const lines = String(markdown || '').split('\n')
		let index = 0

		while (index < lines.length) {
			const line = lines[index]

			if (!line.trim()) {
				index += 1
				continue
			}

			if (isMarkdownFence(line)) {
				const result = createMarkdownCodeBlock(lines, index)
				container.append(result.element)
				index = result.nextIndex
				continue
			}

			if (isMarkdownTableAt(lines, index)) {
				const result = createMarkdownTable(lines, index)
				container.append(result.element)
				index = result.nextIndex
				continue
			}

			if (isMarkdownHeading(line)) {
				container.append(createMarkdownHeading(line))
				index += 1
				continue
			}

			if (isMarkdownHorizontalRule(line)) {
				container.append(document.createElement('hr'))
				index += 1
				continue
			}

			if (isMarkdownBlockquote(line)) {
				const result = createMarkdownBlockquote(lines, index, context)
				container.append(result.element)
				index = result.nextIndex
				continue
			}

			if (isMarkdownListItem(line)) {
				const result = createMarkdownList(lines, index, context)
				container.append(result.element)
				index = result.nextIndex
				continue
			}

			const result = createMarkdownParagraph(lines, index)
			container.append(result.element)
			index = result.nextIndex
		}
	}

	function isMarkdownFence(line) {
		return /^\s*```/.test(line)
	}

	function createMarkdownCodeBlock(lines, startIndex) {
		const firstLine = lines[startIndex]
		const fence = firstLine.match(/^\s*(```+)/)?.[1] || '```'
		const codeLines = []
		let index = startIndex + 1

		while (index < lines.length && !lines[index].trim().startsWith(fence)) {
			codeLines.push(lines[index])
			index += 1
		}

		if (index < lines.length) {
			index += 1
		}

		const pre = document.createElement('pre')
		const code = document.createElement('code')
		code.textContent = codeLines.join('\n')
		pre.append(code)

		return {
			element: pre,
			nextIndex: index,
		}
	}

	function isMarkdownTableAt(lines, index) {
		if (index + 1 >= lines.length) {
			return false
		}

		const header = splitMarkdownTableRow(lines[index])
		const separator = splitMarkdownTableRow(lines[index + 1])

		return header.length > 1
			&& separator.length >= header.length
			&& separator.slice(0, header.length).every(isMarkdownTableSeparatorCell)
	}

	function createMarkdownTable(lines, startIndex) {
		const headerCells = splitMarkdownTableRow(lines[startIndex])
		const separatorCells = splitMarkdownTableRow(lines[startIndex + 1])
		const aligns = separatorCells.map(getMarkdownTableAlign)
		const table = document.createElement('table')
		const thead = document.createElement('thead')
		const headerRow = document.createElement('tr')

		headerCells.forEach((cell, columnIndex) => {
			const th = document.createElement('th')
			setMarkdownTableAlign(th, aligns[columnIndex])
			appendInlineMarkdown(th, cell)
			headerRow.append(th)
		})

		thead.append(headerRow)
		table.append(thead)

		const tbody = document.createElement('tbody')
		let index = startIndex + 2

		while (index < lines.length && lines[index].trim()) {
			const rowCells = splitMarkdownTableRow(lines[index])
			if (rowCells.length < 2) {
				break
			}

			const row = document.createElement('tr')
			headerCells.forEach((cell, columnIndex) => {
				const td = document.createElement('td')
				setMarkdownTableAlign(td, aligns[columnIndex])
				appendInlineMarkdown(td, rowCells[columnIndex] || '')
				row.append(td)
			})
			tbody.append(row)
			index += 1
		}

		table.append(tbody)

		return {
			element: table,
			nextIndex: index,
		}
	}

	function splitMarkdownTableRow(line) {
		const text = String(line || '').trim()
		if (text.indexOf('|') === -1) {
			return []
		}

		let normalized = text
		if (normalized.startsWith('|')) {
			normalized = normalized.slice(1)
		}
		if (normalized.endsWith('|') && !normalized.endsWith('\\|')) {
			normalized = normalized.slice(0, -1)
		}

		const cells = []
		let current = ''
		let escaped = false

		for (let index = 0; index < normalized.length; index += 1) {
			const char = normalized[index]

			if (escaped) {
				current += char
				escaped = false
				continue
			}

			if (char === '\\') {
				escaped = true
				continue
			}

			if (char === '|') {
				cells.push(current.trim())
				current = ''
				continue
			}

			current += char
		}

		if (escaped) {
			current += '\\'
		}

		cells.push(current.trim())
		return cells
	}

	function isMarkdownTableSeparatorCell(cell) {
		return /^:?-{1,}:?$/.test(String(cell || '').replace(/\s/g, ''))
	}

	function getMarkdownTableAlign(cell) {
		const clean = String(cell || '').replace(/\s/g, '')
		if (/^:-+:$/.test(clean)) {
			return 'center'
		}
		if (/^-+:$/.test(clean)) {
			return 'right'
		}
		if (/^:-+$/.test(clean)) {
			return 'left'
		}
		return ''
	}

	function setMarkdownTableAlign(cell, align) {
		if (align) {
			cell.style.textAlign = align
		}
	}

	function isMarkdownHeading(line) {
		return /^\s{0,3}#{1,6}\s+\S/.test(line)
	}

	function createMarkdownHeading(line) {
		const match = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/)
		const level = Math.min((match?.[1] || '#').length + 3, 6)
		const heading = document.createElement('h' + level)
		appendInlineMarkdown(heading, match?.[2] || line)
		return heading
	}

	function isMarkdownHorizontalRule(line) {
		return /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)
	}

	function isMarkdownBlockquote(line) {
		return /^\s{0,3}>\s?/.test(line)
	}

	function createMarkdownBlockquote(lines, startIndex, context) {
		const quoteLines = []
		let index = startIndex

		while (index < lines.length && isMarkdownBlockquote(lines[index])) {
			quoteLines.push(lines[index].replace(/^\s{0,3}>\s?/, ''))
			index += 1
		}

		const blockquote = document.createElement('blockquote')
		appendMarkdownBlocks(blockquote, quoteLines.join('\n'), context)

		return {
			element: blockquote,
			nextIndex: index,
		}
	}

	function isMarkdownListItem(line) {
		return /^\s{0,6}(?:[-*+]|\d+[.)])\s+\S/.test(line)
	}

	function createMarkdownList(lines, startIndex, context) {
		const firstMatch = lines[startIndex].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/)
		const ordered = /^\d/.test(firstMatch?.[2] || '')
		const list = document.createElement(ordered ? 'ol' : 'ul')
		let index = startIndex

		while (index < lines.length) {
			const match = lines[index].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/)
			if (!match || /^\d/.test(match[2]) !== ordered) {
				break
			}

			const contentLines = [match[3]]
			index += 1

			while (index < lines.length && lines[index].trim() && !isMarkdownListItem(lines[index])) {
				contentLines.push(lines[index].replace(/^\s{2,}/, ''))
				index += 1
			}

			const item = createMarkdownListItem(contentLines, context)
			if (item.classList.contains('decklist24-markdown__task')) {
				list.classList.add('decklist24-markdown__task-list')
			}
			list.append(item)
		}

		return {
			element: list,
			nextIndex: index,
		}
	}

	function createMarkdownListItem(contentLines, context) {
		const item = document.createElement('li')
		const firstLine = contentLines[0] || ''
		const taskMatch = firstLine.match(/^\[([ xX_-])\]\s+(.*)$/)

		if (taskMatch) {
			item.className = 'decklist24-markdown__task'

			const checkbox = document.createElement('input')
			checkbox.type = 'checkbox'
			checkbox.checked = taskMatch[1].toLowerCase() === 'x'
			checkbox.disabled = !context?.taskAction || context.disabled
			if (context?.taskAction) {
				checkbox.dataset.action = context.taskAction
				checkbox.dataset.taskIndex = String(context.taskIndex)
			}
			if (context) {
				context.taskIndex += 1
			}

			const content = document.createElement('span')
			appendInlineMarkdownLines(content, [taskMatch[2], ...contentLines.slice(1)])

			item.append(checkbox, content)
			return item
		}

		appendInlineMarkdownLines(item, contentLines)
		return item
	}

	function createMarkdownParagraph(lines, startIndex) {
		const paragraphLines = []
		let index = startIndex

		while (index < lines.length && lines[index].trim()) {
			if (
				index !== startIndex
				&& (
					isMarkdownFence(lines[index])
					|| isMarkdownTableAt(lines, index)
					|| isMarkdownHeading(lines[index])
					|| isMarkdownHorizontalRule(lines[index])
					|| isMarkdownBlockquote(lines[index])
					|| isMarkdownListItem(lines[index])
				)
			) {
				break
			}

			paragraphLines.push(lines[index])
			index += 1
		}

		const paragraph = document.createElement('p')
		appendInlineMarkdownLines(paragraph, paragraphLines)

		return {
			element: paragraph,
			nextIndex: index,
		}
	}

	function appendInlineMarkdownLines(container, lines) {
		lines.forEach((line, index) => {
			if (index > 0) {
				container.append(document.createElement('br'))
			}
			appendInlineMarkdown(container, line)
		})
	}

	function appendInlineMarkdown(container, value, depth) {
		const text = String(value || '')
		const currentDepth = depth || 0

		if (currentDepth > 6) {
			container.append(document.createTextNode(text))
			return
		}

		let index = 0

		while (index < text.length) {
			const link = parseMarkdownLink(text, index, currentDepth)
			if (link) {
				container.append(link.element)
				index = link.nextIndex
				continue
			}

			const underline = parseMarkdownUnderline(text, index, currentDepth)
			if (underline) {
				container.append(underline.element)
				index = underline.nextIndex
				continue
			}

			const autolink = parseMarkdownAutoLink(text, index)
			if (autolink) {
				container.append(autolink.element)
				index = autolink.nextIndex
				continue
			}

			const inlineCode = parseMarkdownInlineCode(text, index)
			if (inlineCode) {
				container.append(inlineCode.element)
				index = inlineCode.nextIndex
				continue
			}

			const strong = parseMarkdownPairedInline(text, index, '**', 'strong', currentDepth)
				|| parseMarkdownPairedInline(text, index, '__', 'strong', currentDepth)
			if (strong) {
				container.append(strong.element)
				index = strong.nextIndex
				continue
			}

			const strike = parseMarkdownPairedInline(text, index, '~~', 'del', currentDepth)
			if (strike) {
				container.append(strike.element)
				index = strike.nextIndex
				continue
			}

			const emphasis = parseMarkdownPairedInline(text, index, '*', 'em', currentDepth)
				|| parseMarkdownPairedInline(text, index, '_', 'em', currentDepth)
			if (emphasis) {
				container.append(emphasis.element)
				index = emphasis.nextIndex
				continue
			}

			const nextIndex = findNextMarkdownInlineToken(text, index + 1)
			container.append(document.createTextNode(text.slice(index, nextIndex)))
			index = nextIndex
		}
	}

	function parseMarkdownLink(text, index, depth) {
		if (text[index] !== '[' || text[index - 1] === '!') {
			return null
		}

		const labelEnd = findMarkdownClosing(text, index, '[', ']')
		if (labelEnd === -1 || text[labelEnd + 1] !== '(') {
			return null
		}

		const destinationEnd = findMarkdownClosing(text, labelEnd + 1, '(', ')')
		if (destinationEnd === -1) {
			return null
		}

		const label = text.slice(index + 1, labelEnd)
		const destination = getMarkdownLinkDestination(text.slice(labelEnd + 2, destinationEnd))
		const safeUrl = sanitizeMarkdownUrl(destination)

		if (!safeUrl) {
			return null
		}

		const link = document.createElement('a')
		link.href = safeUrl
		link.rel = 'noopener noreferrer'
		if (isExternalMarkdownUrl(safeUrl)) {
			link.target = '_blank'
		}
		appendInlineMarkdown(link, label, depth + 1)

		return {
			element: link,
			nextIndex: destinationEnd + 1,
		}
	}

	function parseMarkdownAutoLink(text, index) {
		if (text[index] === '<') {
			const match = text.slice(index).match(/^<((?:https?:\/\/|mailto:)[^<>\s]+)>/)
			if (match) {
				return createMarkdownLink(match[1], match[1], index + match[0].length)
			}
		}

		const match = text.slice(index).match(/^(https?:\/\/[^\s<]+)/)
		if (!match) {
			return null
		}

		let url = match[1]
		let trimmed = ''
		while (/[.,;:!?)]$/.test(url)) {
			trimmed = url.slice(-1) + trimmed
			url = url.slice(0, -1)
		}

		const link = createMarkdownLink(url, url, index + url.length)
		if (link && trimmed) {
			const wrapper = document.createDocumentFragment()
			wrapper.append(link.element, document.createTextNode(trimmed))
			return {
				element: wrapper,
				nextIndex: index + match[1].length,
			}
		}

		return link
	}

	function createMarkdownLink(label, url, nextIndex) {
		const safeUrl = sanitizeMarkdownUrl(url)
		if (!safeUrl) {
			return null
		}

		const link = document.createElement('a')
		link.href = safeUrl
		link.textContent = label
		link.rel = 'noopener noreferrer'
		if (isExternalMarkdownUrl(safeUrl)) {
			link.target = '_blank'
		}

		return {
			element: link,
			nextIndex,
		}
	}

	function parseMarkdownInlineCode(text, index) {
		if (text[index] !== '`') {
			return null
		}

		const end = text.indexOf('`', index + 1)
		if (end <= index + 1) {
			return null
		}

		const code = document.createElement('code')
		code.textContent = text.slice(index + 1, end)

		return {
			element: code,
			nextIndex: end + 1,
		}
	}

	function parseMarkdownUnderline(text, index, depth) {
		if (text.slice(index, index + 3).toLowerCase() !== '<u>') {
			return null
		}

		const end = text.toLowerCase().indexOf('</u>', index + 3)
		if (end <= index + 3) {
			return null
		}

		const element = document.createElement('u')
		appendInlineMarkdown(element, text.slice(index + 3, end), depth + 1)

		return {
			element,
			nextIndex: end + 4,
		}
	}

	function parseMarkdownPairedInline(text, index, marker, tagName, depth) {
		if (!text.startsWith(marker, index)) {
			return null
		}

		const end = text.indexOf(marker, index + marker.length)
		if (end <= index + marker.length) {
			return null
		}

		const element = document.createElement(tagName)
		appendInlineMarkdown(element, text.slice(index + marker.length, end), depth + 1)

		return {
			element,
			nextIndex: end + marker.length,
		}
	}

	function findNextMarkdownInlineToken(text, startIndex) {
		const tokens = ['[', '<', '`', '*', '_', '~', 'http://', 'https://']
		let next = text.length

		tokens.forEach((token) => {
			const index = text.indexOf(token, startIndex)
			if (index !== -1 && index < next) {
				next = index
			}
		})

		return next
	}

	function findMarkdownClosing(text, openIndex, openToken, closeToken) {
		let depth = 0

		for (let index = openIndex; index < text.length; index += 1) {
			const char = text[index]
			if (char === '\\') {
				index += 1
				continue
			}
			if (char === openToken) {
				depth += 1
			}
			if (char === closeToken) {
				depth -= 1
				if (depth === 0) {
					return index
				}
			}
		}

		return -1
	}

	function getMarkdownLinkDestination(value) {
		const text = String(value || '').trim()
		const angleMatch = text.match(/^<([^>]+)>/)
		if (angleMatch) {
			return angleMatch[1]
		}
		const plainMatch = text.match(/^[^\s"')]+/)
		return plainMatch ? plainMatch[0] : ''
	}

	function sanitizeMarkdownUrl(value) {
		const url = String(value || '').trim()
		if (!url || /[\u0000-\u001F\u007F]/.test(url)) {
			return ''
		}

		if (url.startsWith('#')) {
			return url
		}

		if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
			return url
		}

		if (url.startsWith('\\')) {
			return ''
		}

		try {
			const parsed = new URL(url, window.location.origin)
			if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
				return url
			}
		} catch (error) {
			return ''
		}

		return ''
	}

	function isExternalMarkdownUrl(url) {
		try {
			const parsed = new URL(url, window.location.origin)
			return parsed.origin !== window.location.origin && ['http:', 'https:'].includes(parsed.protocol)
		} catch (error) {
			return false
		}
	}

	function createComments(card) {
		const comments = Array.isArray(card.comments) ? card.comments : []
		const wrap = document.createElement('div')
		wrap.className = 'decklist24-card-modal__comments'

		if (comments.length === 0) {
			const empty = document.createElement('p')
			empty.className = 'decklist24-muted'
			empty.textContent = (card.commentsCount || 0) > 0
				? 'Комментариев: ' + card.commentsCount
				: 'Нет комментариев'
			wrap.append(empty)
		} else {
			comments.forEach((comment) => {
				const item = document.createElement('article')
				item.className = 'decklist24-card-modal__comment'

				const meta = document.createElement('div')
				meta.className = 'decklist24-card-modal__comment-meta'
				meta.textContent = [
					comment.actorDisplayName || comment.actorId || 'Пользователь',
					formatDate(comment.creationDateTime, true),
				].filter(Boolean).join(' · ')

				const message = document.createElement('p')
				message.textContent = comment.message || ''

				item.append(meta, message)
				wrap.append(item)
			})
		}

		if (card.commentsError) {
			const warning = document.createElement('p')
			warning.className = 'decklist24-card-modal__subtle-error'
			warning.textContent = 'Комментарии не удалось загрузить через API Deck.'
			wrap.append(warning)
		}

		return wrap
	}

	function createAttachments(card) {
		const attachments = Array.isArray(card.attachments) ? card.attachments : []
		const wrap = document.createElement('div')
		wrap.className = 'decklist24-card-modal__attachments'

		if (attachments.length === 0) {
			const empty = document.createElement('p')
			empty.className = 'decklist24-muted'
			empty.textContent = (card.attachmentCount || 0) > 0
				? 'Вложений: ' + card.attachmentCount
				: 'Нет вложений'
			wrap.append(empty)
		} else {
			const list = document.createElement('ul')
			attachments.forEach((attachment) => {
				const item = document.createElement('li')
				const link = document.createElement('a')
				link.href = getAttachmentUrl(card, attachment)
				link.target = '_blank'
				link.rel = 'noopener noreferrer'
				link.textContent = getAttachmentName(attachment)
				item.append(link)
				list.append(item)
			})
			wrap.append(list)
		}

		if (card.attachmentsError) {
			const warning = document.createElement('p')
			warning.className = 'decklist24-card-modal__subtle-error'
			warning.textContent = 'Вложения не удалось загрузить через API Deck.'
			wrap.append(warning)
		}

		return wrap
	}

	function getAttachmentCount(card) {
		if (Array.isArray(card.attachments)) {
			return card.attachments.length
		}
		return card.attachmentCount || 0
	}

	function getAttachmentName(attachment) {
		const data = parseAttachmentData(attachment.data)
		return attachment.extendedData?.fileName
			|| attachment.extendedData?.name
			|| data.fileName
			|| data.name
			|| attachment.name
			|| attachment.title
			|| ('Вложение #' + attachment.id)
	}

	function parseAttachmentData(data) {
		if (!data) {
			return {}
		}
		if (typeof data === 'object') {
			return data
		}
		try {
			return JSON.parse(data)
		} catch (error) {
			return {}
		}
	}

	function getAttachmentUrl(card, attachment) {
		const type = encodeURIComponent(attachment.type || 'deck_file')
		const id = encodeURIComponent(attachment.id)
		return generateUrl('/apps/deck/cards/' + encodeURIComponent(attachment.cardId || card.id) + '/attachment/' + type + ':' + id)
	}

	function createSpinner() {
		const spinner = document.createElement('span')
		spinner.className = 'icon-loading-small'
		return spinner
	}

	async function deckOcsRequest(path, options) {
		const requestOptions = options || {}
		const { params, ...fetchOptions } = requestOptions
		const headers = {
			Accept: 'application/json',
			'OCS-APIRequest': 'true',
			'X-Requested-With': 'XMLHttpRequest',
			...(requestOptions.headers || {}),
		}

		if (window.OC && window.OC.requestToken) {
			headers.requesttoken = window.OC.requestToken
		}

		if (requestOptions.body && !headers['Content-Type']) {
			headers['Content-Type'] = 'application/json'
		}

		let url = generateOcsUrl(path)
		if (params) {
			const query = new URLSearchParams(params).toString()
			if (query) {
				url += (url.indexOf('?') === -1 ? '?' : '&') + query
			}
		}

		const response = await fetch(url, {
			credentials: 'same-origin',
			...fetchOptions,
			headers,
		})

		if (!response.ok) {
			let message = response.statusText
			try {
				const data = await response.json()
				message = data?.ocs?.meta?.message || data.message || data.error || message
			} catch (error) {
				message = await response.text()
			}
			const error = new Error(message || ('HTTP ' + response.status))
			error.status = response.status
			throw error
		}

		const data = await response.json()
		return data?.ocs?.data || data
	}

	function generateOcsUrl(path) {
		const normalized = String(path).replace(/^\/+/, '')
		if (window.OC && typeof window.OC.linkToOCS === 'function') {
			return window.OC.linkToOCS(normalized, 2)
		}
		if (window.OC && typeof window.OC.generateUrl === 'function') {
			return window.OC.generateUrl('/ocs/v2.php/' + normalized)
		}
		return '/ocs/v2.php/' + normalized
	}

	function createLabels(labels) {
		const list = document.createElement('ul')
		list.className = 'decklist24-labels'
		if (!labels.length) {
			const empty = document.createElement('span')
			empty.className = 'decklist24-muted'
			empty.textContent = '-'
			return empty
		}
		labels.forEach((label) => {
			const item = document.createElement('li')
			item.textContent = label.title
			item.style.backgroundColor = '#' + (label.color || '777777')
			item.style.color = getReadableTextColor(label.color || '777777')
			list.append(item)
		})
		return list
	}

	function getReadableTextColor(hex) {
		const clean = String(hex).replace('#', '')
		if (clean.length !== 6) {
			return '#ffffff'
		}
		const r = parseInt(clean.slice(0, 2), 16)
		const g = parseInt(clean.slice(2, 4), 16)
		const b = parseInt(clean.slice(4, 6), 16)
		return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#111111' : '#ffffff'
	}

	function getAssigneeNames(card) {
		return (card.assignedUsers || [])
			.map((assignment) => {
				const participant = assignment.participant || {}
				return participant.displayname || participant.uid || participant.primaryKey
			})
			.filter(Boolean)
			.join(', ')
	}

	function textCell(text) {
		const cell = document.createElement('td')
		cell.textContent = text
		return cell
	}

	function formatDate(value, withTime) {
		if (!value) {
			return '-'
		}
		const normalized = typeof value === 'number' && value < 100000000000 ? value * 1000 : value
		const date = new Date(normalized)
		if (Number.isNaN(date.getTime())) {
			return '-'
		}
		const locale = window.OC && typeof window.OC.getLocale === 'function' ? window.OC.getLocale() : undefined
		return new Intl.DateTimeFormat(locale, {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
		}).format(date)
	}

	function renderEmpty(message) {
		elements.cardsBody.textContent = ''
		const row = document.createElement('tr')
		const cell = document.createElement('td')
		cell.colSpan = 9
		cell.className = 'decklist24-empty'
		cell.textContent = message
		row.append(cell)
		elements.cardsBody.append(row)
	}

	function toggleVisibleSelection(event) {
		const cards = getVisibleCards()
		if (event.target.checked) {
			cards.forEach((card) => state.selectedCards.add(card.id))
		} else {
			cards.forEach((card) => state.selectedCards.delete(card.id))
		}
		renderCards()
	}

	function canEditCurrentBoard() {
		return !!state.currentBoard?.permissions?.PERMISSION_EDIT
	}

	function setLoading(loading) {
		state.loading = loading
		if (elements.root) {
			elements.root.classList.toggle('decklist24-app--loading', loading)
		}
	}

	function showAlert(message) {
		elements.alert.textContent = message
		elements.alert.hidden = false
	}

	function hideAlert() {
		elements.alert.textContent = ''
		elements.alert.hidden = true
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init)
	} else {
		init()
	}
})()

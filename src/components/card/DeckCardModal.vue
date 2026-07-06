<template>
	<div class="decklist24-vue-card-backdrop" @click.self="close">
		<section
			class="decklist24-vue-card"
			role="dialog"
			aria-modal="true"
			aria-labelledby="decklist24-vue-card-title">
			<header class="decklist24-vue-card__header">
				<div class="decklist24-vue-card__title">
					<div v-if="titleEditing" class="decklist24-vue-card__title-editor">
						<label for="decklist24-vue-card-title-input">{{ t('Название') }}</label>
						<input
							id="decklist24-vue-card-title-input"
							ref="titleInput"
							v-model="titleDraft"
							type="text"
							:disabled="saving || loading"
							@keydown.enter.prevent="saveTitle"
							@keydown.esc.prevent="cancelTitleEdit">
						<div class="decklist24-vue-card__actions">
							<button type="button" :disabled="saving || loading" @click="saveTitle">
								{{ saving ? t('Сохранение...') : t('Сохранить') }}
							</button>
							<button type="button" :disabled="saving" @click="cancelTitleEdit">
								{{ t('Отмена') }}
							</button>
						</div>
					</div>
					<div v-else class="decklist24-vue-card__title-view">
						<button
							id="decklist24-vue-card-title"
							type="button"
							class="decklist24-vue-card__title-button"
							:disabled="!canEdit || saving || loading"
							@click="startTitleEdit">
							{{ card.title || t('(без названия)') }}
						</button>
						<button
							v-if="canEdit"
							type="button"
							class="decklist24-vue-card__small-button"
							:disabled="saving || loading"
							@click="startTitleEdit">
							{{ t('Редактировать') }}
						</button>
					</div>
					<p class="decklist24-vue-card__subtitle">{{ subtitle }}</p>
				</div>
				<button type="button" class="decklist24-vue-card__close" :aria-label="t('Закрыть')" @click="close">
					&times;
				</button>
			</header>

			<nav class="decklist24-vue-card__tabs" role="tablist">
				<button
					v-for="tab in tabs"
					:key="tab.id"
					type="button"
					role="tab"
					:aria-selected="activeTab === tab.id ? 'true' : 'false'"
					:class="{ 'decklist24-vue-card__tab--active': activeTab === tab.id }"
					@click="activeTab = tab.id">
					<span class="decklist24-vue-card__tab-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" focusable="false">
							<path :d="tab.iconPath" />
						</svg>
					</span>
					{{ tab.label }}
				</button>
			</nav>

			<div v-if="error" class="decklist24-vue-card__notice decklist24-vue-card__notice--error">
				{{ error }}
			</div>
			<div v-if="loading" class="decklist24-vue-card__notice">
				<span class="icon-loading-small" />
				{{ t('Загрузка карточки Deck') }}
			</div>
			<div v-if="saveState" :class="['decklist24-vue-card__notice', 'decklist24-vue-card__notice--' + saveState]">
				<span v-if="saveState === 'saving'" class="icon-loading-small" />
				{{ saveMessage }}
			</div>

			<main class="decklist24-vue-card__body">
				<section v-if="activeTab === 'properties'" class="decklist24-vue-card__panel">
					<div class="decklist24-vue-card__properties">
						<div class="decklist24-vue-card__property">
							<span>{{ t('Статус / колонка') }}</span>
							<strong>{{ stackTitle || '-' }}</strong>
						</div>
						<div class="decklist24-vue-card__property">
							<span>{{ t('Исполнитель') }}</span>
							<strong>{{ assigneeNames || '-' }}</strong>
						</div>
						<div class="decklist24-vue-card__property">
							<span>{{ t('Срок') }}</span>
							<strong>{{ formatDate(card.duedate) }}</strong>
						</div>
						<div class="decklist24-vue-card__property">
							<span>{{ t('Создана') }}</span>
							<strong>{{ formatDate(card.createdAt, true) }}</strong>
						</div>
						<div class="decklist24-vue-card__property">
							<span>{{ t('Метки') }}</span>
							<strong>{{ labelNames || '-' }}</strong>
						</div>
						<div class="decklist24-vue-card__property">
							<span>{{ t('ID') }}</span>
							<strong>{{ card.id }}</strong>
						</div>
					</div>

					<section class="decklist24-vue-card__description">
						<div class="decklist24-vue-card__section-head">
							<h3>{{ t('Описание') }}</h3>
							<button
								v-if="canEdit && !descriptionEditing"
								type="button"
								class="decklist24-vue-card__small-button"
								:disabled="saving || loading"
								@click="startDescriptionEdit">
								{{ t('Редактировать описание') }}
							</button>
						</div>

						<div v-if="descriptionEditing" class="decklist24-vue-card__description-editor">
							<div v-if="textAppAvailable" class="decklist24-vue-card__text-editor">
								<div ref="textEditor" />
								<p v-if="textEditorError" class="decklist24-vue-card__hint decklist24-vue-card__hint--error">
									{{ textEditorError }}
								</p>
							</div>
							<div v-else class="decklist24-vue-card__markdown-editor">
								<div class="decklist24-vue-card__toolbar" role="toolbar" :aria-label="t('Панель форматирования описания')">
									<button
										v-for="tool in markdownTools"
										:key="tool.name"
										type="button"
										:title="tool.title"
										:aria-label="tool.title"
										:disabled="saving || loading"
										@mousedown.prevent
										@click="applyMarkdownFormat(tool.name)">
										{{ tool.label }}
									</button>
								</div>
								<div class="decklist24-vue-card__markdown-workspace">
									<textarea
										ref="fallbackTextarea"
										v-model="descriptionDraft"
										:disabled="saving || loading"
										rows="14"
										spellcheck="true" />
									<div
										class="decklist24-vue-card__preview"
										v-html="renderMarkdown(descriptionDraft || '')" />
								</div>
							</div>

							<div class="decklist24-vue-card__actions">
								<button type="button" :disabled="saving || loading" @click="saveDescription">
									{{ saving ? t('Сохранение...') : t('Сохранить') }}
								</button>
								<button type="button" :disabled="saving" @click="cancelDescriptionEdit">
									{{ t('Отмена') }}
								</button>
							</div>
						</div>

						<div
							v-else-if="hasDescription"
							class="decklist24-vue-card__preview decklist24-vue-card__description-preview"
							@click="handlePreviewClick"
							v-html="renderedDescription" />
						<p v-else class="decklist24-vue-card__empty" @click="startDescriptionEdit">
							{{ t('Описание не заполнено') }}
						</p>
					</section>
				</section>

				<section v-else class="decklist24-vue-card__placeholder">
					<h3>{{ activeTabLabel }}</h3>
					<p>{{ t('Будет добавлено на следующем этапе.') }}</p>
				</section>
			</main>
		</section>
	</div>
</template>

<script>
import MarkdownIt from 'markdown-it'
import MarkdownItTaskCheckbox from 'markdown-it-task-checkbox'
import MarkdownItLinkAttributes from 'markdown-it-link-attributes'
import DOMPurify from 'dompurify'

const markdownIt = new MarkdownIt({
	html: false,
	linkify: true,
	breaks: true,
})

markdownIt.use(MarkdownItTaskCheckbox, {
	disabled: false,
	idPrefix: 'decklist24-vue-task-',
	ulClass: 'contains-task-list',
})

markdownIt.use(MarkdownItLinkAttributes, {
	attrs: {
		target: '_blank',
		rel: 'noreferrer noopener',
	},
})

export default {
	name: 'DeckCardModal',
	props: {
		initialCard: {
			type: Object,
			required: true,
		},
		board: {
			type: Object,
			default: null,
		},
		stacks: {
			type: Array,
			default: () => [],
		},
		canEdit: {
			type: Boolean,
			default: true,
		},
		api: {
			type: Object,
			default: () => ({}),
		},
	},
	data() {
		return {
			card: this.normalizeCard(this.initialCard),
			activeTab: 'properties',
			loading: false,
			error: '',
			saving: false,
			saveState: '',
			saveMessage: '',
			saveTimer: null,
			titleEditing: false,
			titleDraft: '',
			descriptionEditing: false,
			descriptionDraft: '',
			descriptionDraftInitialized: false,
			textAppAvailable: false,
			textEditor: null,
			textEditorError: '',
			tabs: [
				{ id: 'properties', label: 'Свойства', iconPath: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
				{ id: 'attachments', label: 'Вложения', iconPath: 'M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.8-2.8l8.5-8.5' },
				{ id: 'comments', label: 'Комментарии', iconPath: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z' },
				{ id: 'activity', label: 'Активность', iconPath: 'M13 2L4 14h7l-1 8 10-13h-7z' },
			],
			markdownTools: [
				{ name: 'undo', label: '↶', title: 'Отменить' },
				{ name: 'redo', label: '↷', title: 'Повторить' },
				{ name: 'heading', label: 'Tt', title: 'Заголовок' },
				{ name: 'bold', label: 'B', title: 'Жирный' },
				{ name: 'italic', label: 'I', title: 'Курсив' },
				{ name: 'underline', label: 'U', title: 'Подчеркнутый' },
				{ name: 'bullet', label: '•', title: 'Маркированный список' },
				{ name: 'ordered', label: '1.', title: 'Нумерованный список' },
				{ name: 'task', label: '[ ]', title: 'Чеклист' },
				{ name: 'table', label: '▦', title: 'Таблица' },
				{ name: 'link', label: '↗', title: 'Ссылка' },
			],
		}
	},
	computed: {
		subtitle() {
			return [this.boardTitle, this.stackTitle].filter(Boolean).join(' · ')
		},
		boardTitle() {
			return this.board && this.board.title ? this.board.title : ''
		},
		stackTitle() {
			const stackId = Number(this.card.stackId || (this.card.stack && this.card.stack.id))
			const stack = this.stacks.find((item) => Number(item.id) === stackId)
			return this.card.stackTitle || (stack && stack.title) || ''
		},
		activeTabLabel() {
			const tab = this.tabs.find((item) => item.id === this.activeTab)
			return tab ? tab.label : ''
		},
		hasDescription() {
			return String(this.card.description || '').trim() !== ''
		},
		renderedDescription() {
			return this.renderMarkdown(this.card.description || '')
		},
		assigneeNames() {
			return (this.card.assignedUsers || []).map((assignment) => {
				const participant = assignment.participant || {}
				return participant.displayname || participant.displayName || participant.uid || participant.primaryKey || ''
			}).filter(Boolean).join(', ')
		},
		labelNames() {
			return (this.card.labels || []).map((label) => label.title).filter(Boolean).join(', ')
		},
	},
	mounted() {
		this.logTextEditorDiagnostics()
		this.loadCardDetails()
		document.addEventListener('keydown', this.handleDocumentKeydown)
	},
	beforeDestroy() {
		document.removeEventListener('keydown', this.handleDocumentKeydown)
		clearTimeout(this.saveTimer)
		this.destroyTextEditor()
	},
	watch: {
		activeTab(newTab, oldTab) {
			this.handleActiveTabChange(newTab, oldTab)
		},
	},
	methods: {
		t(text) {
			if (typeof window.t === 'function') {
				return window.t('decklist24', text)
			}
			return text
		},
		close() {
			if (this.saving) {
				return
			}
			this.$emit('close')
		},
		handleDocumentKeydown(event) {
			if (event.key === 'Escape') {
				if (this.titleEditing) {
					this.cancelTitleEdit()
					return
				}
				if (this.descriptionEditing) {
					this.cancelDescriptionEdit()
					return
				}
				this.close()
			}
		},
		async handleActiveTabChange(newTab, oldTab) {
			try {
				if (oldTab === 'properties' && newTab !== 'properties') {
					await this.leavePropertiesTab()
				}
				if (newTab === 'properties') {
					this.$nextTick(() => {
						this.enterPropertiesTab()
					})
				}
			} catch (error) {
				console.error('[DeckList24] Failed to switch card tab cleanly', error)
				this.textEditorError = this.t('Не удалось корректно переключить редактор описания.')
			}
		},
		async leavePropertiesTab() {
			if (!this.descriptionEditing) {
				return
			}
			const editor = this.textEditor
			await this.syncDescriptionFromTextEditor(editor)
			if (this.textEditor === editor) {
				await this.destroyTextEditor()
			}
		},
		enterPropertiesTab() {
			if (!this.descriptionEditing || this.activeTab !== 'properties') {
				return
			}
			if (!this.descriptionDraftInitialized) {
				this.descriptionDraft = this.card.description || ''
				this.descriptionDraftInitialized = true
			}
			this.logTextEditorDiagnostics()
			this.$nextTick(() => {
				if (!this.descriptionEditing || this.activeTab !== 'properties') {
					return
				}
				if (this.textAppAvailable) {
					this.setupTextEditor()
				} else if (this.$refs.fallbackTextarea) {
					this.$refs.fallbackTextarea.value = this.descriptionDraft
				}
			})
		},
		normalizeCard(card) {
			const stack = card.stack || {}
			return {
				...card,
				boardId: card.boardId || (this.board && this.board.id) || null,
				stackId: card.stackId || stack.id,
				stackTitle: card.stackTitle || stack.title || '',
				description: card.description || '',
			}
		},
		async loadCardDetails() {
			this.loading = true
			this.error = ''
			try {
				const fullCard = await this.request('/apps/deck/cards/' + encodeURIComponent(this.card.id))
				this.card = this.normalizeCard({
					...this.card,
					...fullCard,
					boardId: this.card.boardId,
					stackTitle: this.card.stackTitle,
				})
			} catch (error) {
				this.error = this.t('Не удалось загрузить полные данные карточки. Показаны данные из списка.') + ' ' + this.getErrorMessage(error)
			} finally {
				this.loading = false
			}
		},
		startTitleEdit() {
			if (!this.canEdit || this.saving || this.loading) {
				return
			}
			this.titleDraft = this.card.title || ''
			this.titleEditing = true
			this.clearSaveStatus()
			this.$nextTick(() => {
				if (this.$refs.titleInput) {
					this.$refs.titleInput.focus()
					this.$refs.titleInput.select()
				}
			})
		},
		cancelTitleEdit() {
			this.titleEditing = false
			this.titleDraft = ''
		},
		async saveTitle() {
			const title = this.titleDraft.trim()
			if (!title) {
				this.setSaveStatus('error', this.t('Название не может быть пустым.'))
				return
			}
			if (title === (this.card.title || '')) {
				this.cancelTitleEdit()
				return
			}
			await this.savePatch(
				{ title },
				this.t('Сохранение названия...'),
				this.t('Название сохранено'),
				this.t('Ошибка сохранения названия'),
				() => {
					this.titleEditing = false
					this.titleDraft = ''
				}
			)
		},
		startDescriptionEdit() {
			if (!this.canEdit || this.saving || this.loading) {
				return
			}
			this.logTextEditorDiagnostics()
			this.descriptionDraft = this.card.description || ''
			this.descriptionDraftInitialized = true
			this.descriptionEditing = true
			this.textEditorError = ''
			this.clearSaveStatus()
			this.$nextTick(() => {
				if (this.textAppAvailable) {
					this.setupTextEditor()
				} else if (this.$refs.fallbackTextarea) {
					this.$refs.fallbackTextarea.focus()
				}
			})
		},
		async cancelDescriptionEdit() {
			await this.destroyTextEditor()
			this.descriptionEditing = false
			this.descriptionDraft = ''
			this.descriptionDraftInitialized = false
			this.textEditorError = ''
		},
		async saveDescription() {
			await this.syncDescriptionFromTextEditor()
			const description = this.descriptionDraft
			if (description === (this.card.description || '')) {
				await this.cancelDescriptionEdit()
				return
			}
			await this.savePatch(
				{ description },
				this.t('Сохранение описания...'),
				this.t('Описание сохранено'),
				this.t('Ошибка сохранения описания'),
				async () => {
					await this.destroyTextEditor()
					this.descriptionEditing = false
					this.descriptionDraft = ''
					this.descriptionDraftInitialized = false
					this.textEditorError = ''
				}
			)
		},
		async savePatch(patch, savingMessage, savedMessage, errorMessage, onSuccess) {
			if (this.saving) {
				return
			}

			const previousCard = { ...this.card }
			this.saving = true
			this.error = ''
			this.setSaveStatus('saving', savingMessage)

			try {
				const updatedCard = await this.updateCard(patch)
				this.card = this.normalizeCard({
					...this.card,
					...updatedCard,
				})
				if (typeof onSuccess === 'function') {
					await onSuccess(this.card)
				}
				this.saving = false
				this.setSaveStatus('saved', savedMessage)
				this.$emit('card-updated', this.card)
				if (this.api && typeof this.api.onCardUpdated === 'function') {
					this.api.onCardUpdated(this.card)
				}
			} catch (error) {
				this.card = previousCard
				this.saving = false
				this.error = errorMessage + ': ' + this.getErrorMessage(error)
				this.setSaveStatus('error', errorMessage)
			}
		},
		async updateCard(patch) {
			const payload = this.buildCardPayload(patch)
			const response = await this.ocsRequest('apps/deck/api/v1.0/cards/' + encodeURIComponent(this.card.id), {
				method: 'PUT',
				body: JSON.stringify(payload),
			})
			return this.normalizeCard({
				...payload,
				...response,
				boardId: payload.boardId,
			})
		},
		buildCardPayload(patch) {
			const payload = {
				...this.card,
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
				boardId: payload.boardId || (this.board && this.board.id) || null,
			}
		},
		logTextEditorDiagnostics() {
			const diagnostics = {
				OCA: typeof window.OCA,
				OCA_Text: typeof (window.OCA && window.OCA.Text),
				OCA_Text_createEditor: typeof (window.OCA && window.OCA.Text && window.OCA.Text.createEditor),
			}
			console.info('[DeckList24] Nextcloud Text editor diagnostics', diagnostics)
			if (diagnostics.OCA_Text_createEditor !== 'function') {
				console.info('Nextcloud Text editor is not available on this page, using internal markdown editor')
				this.textAppAvailable = false
				return
			}
			this.textAppAvailable = true
		},
		async setupTextEditor() {
			if (!this.textAppAvailable || !this.$refs.textEditor) {
				return
			}
			if (this.textEditor) {
				return
			}
			try {
				this.textEditor = await window.OCA.Text.createEditor({
					el: this.$refs.textEditor,
					content: this.descriptionDraft,
					readOnly: !this.canEdit,
					onUpdate: ({ markdown }) => {
						if (markdown !== this.descriptionDraft) {
							this.descriptionDraft = markdown
						}
					},
					onFileInsert: () => {
						console.info('[DeckList24] Attachment insertion from the Text editor will be added in the next stage')
					},
				})
			} catch (error) {
				console.error('[DeckList24] Failed to initialize Nextcloud Text editor, using internal markdown editor', error)
				this.textEditorError = this.t('Редактор Nextcloud Text недоступен, используется внутренний markdown-редактор.')
				this.textAppAvailable = false
				this.$nextTick(() => {
					if (this.$refs.fallbackTextarea) {
						this.$refs.fallbackTextarea.focus()
					}
				})
			}
		},
		async syncDescriptionFromTextEditor(editorInstance) {
			const editor = editorInstance || this.textEditor
			if (!editor) {
				return
			}
			if (typeof editor.getContent === 'function') {
				const content = await editor.getContent()
				if (typeof content === 'string') {
					this.descriptionDraft = content
				} else if (content && typeof content.markdown === 'string') {
					this.descriptionDraft = content.markdown
				}
			}
		},
		async destroyTextEditor() {
			if (!this.textEditor) {
				return
			}
			const editor = this.textEditor
			this.textEditor = null
			if (typeof editor.destroy === 'function') {
				await editor.destroy()
			}
		},
		renderMarkdown(value) {
			return DOMPurify.sanitize(markdownIt.render(value || ''), {
				ADD_TAGS: ['input'],
				ADD_ATTR: ['checked', 'class', 'disabled', 'id', 'rel', 'target', 'type'],
			})
		},
		handlePreviewClick(event) {
			const target = event.target
			if (!this.canEdit || this.saving || this.loading || !target || target.getAttribute('type') !== 'checkbox') {
				return
			}

			const inputs = Array.prototype.slice.call(this.$el.querySelectorAll('.decklist24-vue-card__description-preview input[type="checkbox"]'))
			const index = inputs.indexOf(target)
			if (index === -1) {
				return
			}
			const description = this.setMarkdownTaskChecked(this.card.description || '', index, target.checked)
			this.savePatch(
				{ description },
				this.t('Сохранение чеклиста...'),
				this.t('Чеклист сохранен'),
				this.t('Ошибка сохранения чеклиста')
			)
		},
		setMarkdownTaskChecked(description, targetIndex, checked) {
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
		},
		applyMarkdownFormat(format) {
			const textarea = this.$refs.fallbackTextarea
			if (!textarea) {
				return
			}

			if (format === 'undo' || format === 'redo') {
				textarea.focus()
				document.execCommand(format)
				this.descriptionDraft = textarea.value
				return
			}

			const start = textarea.selectionStart
			const end = textarea.selectionEnd
			const value = this.descriptionDraft || ''
			const selected = value.slice(start, end)
			let replacement = selected
			let cursorOffset = 0

			if (format === 'heading') {
				replacement = this.prefixLines(selected || this.t('Заголовок'), '### ')
			} else if (format === 'bold') {
				replacement = '**' + (selected || this.t('жирный текст')) + '**'
				cursorOffset = 2
			} else if (format === 'italic') {
				replacement = '*' + (selected || this.t('курсив')) + '*'
				cursorOffset = 1
			} else if (format === 'underline') {
				replacement = '<u>' + (selected || this.t('подчеркнутый текст')) + '</u>'
				cursorOffset = 3
			} else if (format === 'bullet') {
				replacement = this.prefixLines(selected || this.t('пункт списка'), '- ')
			} else if (format === 'ordered') {
				replacement = this.prefixOrderedLines(selected || this.t('пункт списка'))
			} else if (format === 'task') {
				replacement = this.prefixLines(selected || this.t('пункт чеклиста'), '- [ ] ')
			} else if (format === 'table') {
				replacement = selected || '| ' + this.t('Колонка 1') + ' | ' + this.t('Колонка 2') + ' |\n| --- | --- |\n| ' + this.t('Значение') + ' | ' + this.t('Значение') + ' |'
			} else if (format === 'link') {
				replacement = '[' + (selected || this.t('ссылка')) + '](https://example.com)'
				cursorOffset = 1
			}

			this.descriptionDraft = value.slice(0, start) + replacement + value.slice(end)
			this.$nextTick(() => {
				textarea.focus()
				if (!selected && cursorOffset > 0) {
					textarea.setSelectionRange(start + cursorOffset, start + replacement.length - cursorOffset)
				} else {
					textarea.setSelectionRange(start + replacement.length, start + replacement.length)
				}
			})
		},
		prefixLines(value, prefix) {
			return String(value || '').split('\n').map((line) => prefix + line).join('\n')
		},
		prefixOrderedLines(value) {
			return String(value || '').split('\n').map((line, index) => (index + 1) + '. ' + line).join('\n')
		},
		formatDate(value, withTime) {
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
		},
		setSaveStatus(state, message) {
			clearTimeout(this.saveTimer)
			this.saveState = state
			this.saveMessage = message
			if (state === 'saved') {
				this.saveTimer = setTimeout(() => {
					this.clearSaveStatus()
				}, 2500)
			}
		},
		clearSaveStatus() {
			clearTimeout(this.saveTimer)
			this.saveState = ''
			this.saveMessage = ''
		},
		getErrorMessage(error) {
			if (!error) {
				return this.t('Неизвестная ошибка')
			}
			return error.message || String(error)
		},
		async request(path, options) {
			if (this.api && typeof this.api.request === 'function') {
				return this.api.request(path, options)
			}
			return this.defaultRequest(this.generateUrl(path), options)
		},
		async ocsRequest(path, options) {
			if (this.api && typeof this.api.ocsRequest === 'function') {
				return this.api.ocsRequest(path, options)
			}
			return this.defaultRequest(this.generateOcsUrl(path), options, true)
		},
		async defaultRequest(url, options, ocs) {
			const requestOptions = options || {}
			const headers = {
				Accept: 'application/json',
				'X-Requested-With': 'XMLHttpRequest',
				...(ocs ? { 'OCS-APIRequest': 'true' } : {}),
				...(requestOptions.headers || {}),
			}

			if (window.OC && window.OC.requestToken) {
				headers.requesttoken = window.OC.requestToken
			}
			if (requestOptions.body && !headers['Content-Type']) {
				headers['Content-Type'] = 'application/json'
			}

			const response = await fetch(url, {
				credentials: 'same-origin',
				...requestOptions,
				headers,
			})
			if (!response.ok) {
				let message = response.statusText
				try {
					const data = await response.json()
					message = (data.ocs && data.ocs.meta && data.ocs.meta.message) || data.message || data.error || message
				} catch (error) {
					message = await response.text()
				}
				const requestError = new Error(message || 'HTTP ' + response.status)
				requestError.status = response.status
				throw requestError
			}
			if (response.status === 204) {
				return null
			}
			const data = await response.json()
			return ocs ? (data.ocs && data.ocs.data ? data.ocs.data : data) : data
		},
		generateUrl(path) {
			if (this.api && typeof this.api.generateUrl === 'function') {
				return this.api.generateUrl(path)
			}
			if (window.OC && typeof window.OC.generateUrl === 'function') {
				return window.OC.generateUrl(path)
			}
			return path
		},
		generateOcsUrl(path) {
			const normalized = String(path).replace(/^\/+/, '')
			if (window.OC && typeof window.OC.linkToOCS === 'function') {
				return window.OC.linkToOCS(normalized, 2)
			}
			return this.generateUrl('/ocs/v2.php/' + normalized)
		},
	},
}
</script>

<style scoped>
.decklist24-vue-card-backdrop {
	position: fixed;
	inset: var(--header-height, 50px) 0 0;
	z-index: 2500;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	padding: 28px 16px;
	background: rgba(0, 0, 0, .42);
	overflow-y: auto;
}

.decklist24-vue-card {
	width: min(900px, 100%);
	min-height: 520px;
	max-height: calc(100vh - var(--header-height, 50px) - 56px);
	display: flex;
	flex-direction: column;
	border: 1px solid var(--color-border);
	border-radius: 8px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	box-shadow: 0 16px 40px rgba(0, 0, 0, .28);
	overflow: hidden;
}

.decklist24-vue-card__header {
	display: flex;
	align-items: flex-start;
	gap: 16px;
	padding: 18px 22px 10px;
	background: var(--color-main-background);
}

.decklist24-vue-card__title {
	flex: 1 1 auto;
	min-width: 0;
}

.decklist24-vue-card__title-view {
	display: flex;
	align-items: flex-start;
	gap: 10px;
}

.decklist24-vue-card__title-button {
	flex: 1 1 auto;
	min-width: 0;
	margin: 0;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--color-main-text);
	font-size: 22px;
	font-weight: 700;
	line-height: 1.25;
	text-align: left;
	overflow-wrap: anywhere;
	cursor: pointer;
}

.decklist24-vue-card__title-button:disabled {
	cursor: default;
	opacity: 1;
}

.decklist24-vue-card__subtitle {
	margin: 5px 0 0;
	color: var(--color-text-maxcontrast);
}

.decklist24-vue-card__title-editor {
	display: grid;
	gap: 8px;
}

.decklist24-vue-card__title-editor label {
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-weight: 700;
}

.decklist24-vue-card__title-editor input {
	width: min(620px, 100%);
	min-height: 42px;
	margin: 0;
	font-size: 18px;
	font-weight: 700;
}

.decklist24-vue-card__close {
	flex: 0 0 auto;
	width: 36px;
	height: 36px;
	min-width: 36px;
	margin: 0;
	padding: 0;
	border-radius: 50%;
	font-size: 24px;
	line-height: 1;
}

.decklist24-vue-card__tabs {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	border-bottom: 1px solid var(--color-border);
	background: var(--color-main-background);
}

.decklist24-vue-card__tabs button {
	min-height: 56px;
	margin: 0;
	border: 0;
	border-radius: 0;
	background: transparent;
	color: var(--color-main-text);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	gap: 3px;
	font-weight: 600;
	line-height: 1.2;
}

.decklist24-vue-card__tab--active {
	box-shadow: inset 0 -3px 0 var(--color-primary-element);
}

.decklist24-vue-card__tab-icon {
	width: 22px;
	height: 22px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: currentColor;
	line-height: 1;
}

.decklist24-vue-card__tab-icon svg {
	width: 20px;
	height: 20px;
	display: block;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.decklist24-vue-card__notice {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 12px 22px 0;
	padding: 10px 12px;
	border-radius: 6px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
}

.decklist24-vue-card__notice--saved {
	background: rgba(46, 160, 67, .12);
	color: var(--color-success, #2ea043);
}

.decklist24-vue-card__notice--error {
	background: rgba(219, 72, 72, .12);
	color: var(--color-error);
}

.decklist24-vue-card__body {
	flex: 1 1 auto;
	min-height: 0;
	padding: 18px 22px 24px;
	overflow-y: auto;
}

.decklist24-vue-card__panel {
	display: grid;
	gap: 20px;
}

.decklist24-vue-card__properties {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;
}

.decklist24-vue-card__property {
	min-width: 0;
	padding: 10px 12px;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-background-hover);
}

.decklist24-vue-card__property span {
	display: block;
	margin-bottom: 4px;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
}

.decklist24-vue-card__property strong {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.decklist24-vue-card__section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 8px;
	border-bottom: 1px solid var(--color-border);
}

.decklist24-vue-card__section-head h3 {
	margin: 0;
	font-size: 16px;
}

.decklist24-vue-card__small-button {
	flex: 0 0 auto;
	min-height: 30px;
	padding: 4px 10px;
	font-size: 13px;
}

.decklist24-vue-card__actions {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.decklist24-vue-card__description-editor {
	display: grid;
	gap: 10px;
}

.decklist24-vue-card__text-editor {
	min-height: 260px;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-main-background);
}

.decklist24-vue-card__text-editor :deep(.ProseMirror) {
	min-height: 220px;
	padding: 12px;
}

.decklist24-vue-card__markdown-editor {
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-main-background);
	overflow: hidden;
}

.decklist24-vue-card__toolbar {
	display: flex;
	gap: 4px;
	flex-wrap: wrap;
	padding: 6px;
	border-bottom: 1px solid var(--color-border);
}

.decklist24-vue-card__toolbar button {
	width: 34px;
	min-width: 34px;
	height: 32px;
	min-height: 32px;
	margin: 0;
	padding: 0;
	border-radius: 4px;
	font-weight: 700;
}

.decklist24-vue-card__markdown-workspace {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(260px, .9fr);
	min-height: 260px;
}

.decklist24-vue-card__markdown-workspace textarea {
	width: 100%;
	height: 100%;
	min-height: 260px;
	margin: 0;
	padding: 10px 12px;
	border: 0;
	border-right: 1px solid var(--color-border);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font: inherit;
	line-height: 1.45;
	resize: vertical;
}

.decklist24-vue-card__preview {
	min-height: 58px;
	padding: 12px;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-background-hover);
	line-height: 1.5;
	overflow-wrap: anywhere;
}

.decklist24-vue-card__markdown-workspace .decklist24-vue-card__preview {
	border: 0;
	border-radius: 0;
}

.decklist24-vue-card__preview :deep(> :first-child) {
	margin-top: 0;
}

.decklist24-vue-card__preview :deep(> :last-child) {
	margin-bottom: 0;
}

.decklist24-vue-card__preview :deep(a) {
	color: var(--color-primary-element);
	text-decoration: underline;
}

.decklist24-vue-card__preview :deep(table) {
	width: 100%;
	margin: 10px 0;
	border-collapse: collapse;
	background: var(--color-main-background);
}

.decklist24-vue-card__preview :deep(th),
.decklist24-vue-card__preview :deep(td) {
	padding: 8px 10px;
	border: 1px solid var(--color-border);
	text-align: left;
	vertical-align: top;
}

.decklist24-vue-card__preview :deep(th) {
	background: var(--color-background-dark, var(--color-background-hover));
	font-weight: 700;
}

.decklist24-vue-card__preview :deep(.contains-task-list) {
	padding-left: 0;
	list-style: none;
}

.decklist24-vue-card__preview :deep(input[type='checkbox']) {
	margin-right: 8px;
}

.decklist24-vue-card__empty {
	margin: 0;
	padding: 12px;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
}

.decklist24-vue-card__hint {
	margin: 8px 12px;
	color: var(--color-text-maxcontrast);
}

.decklist24-vue-card__hint--error {
	color: var(--color-error);
}

.decklist24-vue-card__placeholder {
	display: grid;
	place-items: center;
	min-height: 260px;
	text-align: center;
	color: var(--color-text-maxcontrast);
}

.decklist24-vue-card__placeholder h3 {
	margin: 0;
	color: var(--color-main-text);
}

@media (max-width: 760px) {
	.decklist24-vue-card-backdrop {
		padding: 12px;
	}

	.decklist24-vue-card {
		max-height: calc(100vh - var(--header-height, 50px) - 24px);
	}

	.decklist24-vue-card__tabs,
	.decklist24-vue-card__properties,
	.decklist24-vue-card__markdown-workspace {
		grid-template-columns: 1fr;
	}

	.decklist24-vue-card__markdown-workspace textarea {
		border-right: 0;
		border-bottom: 1px solid var(--color-border);
	}
}
</style>

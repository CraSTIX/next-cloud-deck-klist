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

				<section v-else-if="activeTab === 'attachments'" class="decklist24-vue-card__panel">
					<div class="decklist24-vue-card__section-head">
						<h3>{{ t('Вложения') }}</h3>
						<div class="decklist24-vue-card__actions">
							<input
								ref="attachmentInput"
								type="file"
								multiple
								class="decklist24-vue-card__file-input"
								@change="handleAttachmentInput">
							<button
								v-if="canEdit"
								type="button"
								class="decklist24-vue-card__small-button"
								:disabled="attachmentsUploading || attachmentsLoading"
								@click="openAttachmentPicker">
								{{ attachmentsUploading ? t('Загрузка...') : t('Добавить файл') }}
							</button>
						</div>
					</div>
					<div
						:class="['decklist24-vue-card__dropzone', { 'decklist24-vue-card__dropzone--active': attachmentDropActive }]"
						@dragenter.prevent="attachmentDropActive = true"
						@dragover.prevent="attachmentDropActive = true"
						@dragleave.prevent="attachmentDropActive = false"
						@drop.prevent="handleAttachmentDrop">
						<div v-if="attachmentsError" class="decklist24-vue-card__notice decklist24-vue-card__notice--error">
							<strong>{{ attachmentsError }}</strong>
							<details v-if="attachmentsErrorDetails" class="decklist24-vue-card__error-details">
								<summary>{{ t('Подробности') }}</summary>
								<pre>{{ attachmentsErrorDetails }}</pre>
							</details>
						</div>
						<div v-if="attachmentsLoading" class="decklist24-vue-card__inline-state">
							<span class="icon-loading-small" />
							{{ t('Загрузка вложений...') }}
						</div>
						<div v-else-if="visibleAttachments.length === 0" class="decklist24-vue-card__empty">
							{{ t('Нет вложений') }}
						</div>
						<ul v-else class="decklist24-vue-card__attachments">
							<li v-for="attachment in visibleAttachments" :key="attachmentKey(attachment)">
								<div class="decklist24-vue-card__file-icon" aria-hidden="true">
									<svg viewBox="0 0 24 24" focusable="false">
										<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
										<path d="M14 2v6h6" />
									</svg>
								</div>
								<div class="decklist24-vue-card__file-main">
									<a :href="attachmentOpenUrl(attachment)" target="_blank" rel="noopener noreferrer">
										{{ attachmentName(attachment) }}
									</a>
									<div class="decklist24-vue-card__file-meta">
										<span>{{ formatFileSize(attachmentSize(attachment)) }}</span>
										<span>{{ formatDate(attachment.createdAt, true) }}</span>
										<span v-if="attachmentAuthor(attachment)">{{ attachmentAuthor(attachment) }}</span>
									</div>
								</div>
								<div class="decklist24-vue-card__file-actions">
									<a
										class="decklist24-vue-card__small-button"
										:href="attachmentOpenUrl(attachment)"
										target="_blank"
										rel="noopener noreferrer">
										{{ t('Открыть') }}
									</a>
									<a
										class="decklist24-vue-card__small-button"
										:href="attachmentDownloadUrl(attachment)"
										download>
										{{ t('Скачать') }}
									</a>
									<button
										v-if="canDeleteAttachment(attachment)"
										type="button"
										class="decklist24-vue-card__small-button"
										:disabled="attachmentsDeleting[attachmentKey(attachment)]"
										@click="deleteAttachment(attachment)">
										{{ attachmentsDeleting[attachmentKey(attachment)] ? t('Удаление...') : t('Удалить') }}
									</button>
								</div>
							</li>
						</ul>
						<div v-if="attachmentsUploading" class="decklist24-vue-card__inline-state">
							<span class="icon-loading-small" />
							{{ t('Загрузка файла...') }}
						</div>
					</div>
				</section>

				<section v-else-if="activeTab === 'comments'" class="decklist24-vue-card__panel">
					<div class="decklist24-vue-card__section-head">
						<h3>{{ t('Комментарии') }}</h3>
					</div>
					<div v-if="commentsError" class="decklist24-vue-card__notice decklist24-vue-card__notice--error">
						<strong>{{ commentsError }}</strong>
						<details v-if="commentsErrorDetails" class="decklist24-vue-card__error-details">
							<summary>{{ t('Подробности') }}</summary>
							<pre>{{ commentsErrorDetails }}</pre>
						</details>
					</div>
					<form class="decklist24-vue-card__comment-form" @submit.prevent="createComment">
						<div v-if="replyToComment" class="decklist24-vue-card__reply-preview">
							<div>
								<strong>{{ t('Ответ на комментарий') }}</strong>
								<span>{{ replyToComment.actorDisplayName || replyToComment.actorId || t('Пользователь') }}</span>
							</div>
							<p>{{ commentPlainText(replyToComment) }}</p>
							<button type="button" class="decklist24-vue-card__icon-button" :title="t('Отменить ответ')" @click="cancelReply">
								×
							</button>
						</div>
						<textarea
							ref="commentInput"
							v-model="newComment"
							:disabled="commentsSubmitting || commentsLoading"
							:placeholder="t('Написать комментарий...')"
							rows="3"
							maxlength="1000" />
						<div class="decklist24-vue-card__actions">
							<button
								type="submit"
								:disabled="commentsSubmitting || commentsLoading || newComment.trim().length === 0">
								{{ commentsSubmitting ? t('Отправка...') : (replyToComment ? t('Ответить') : t('Отправить')) }}
							</button>
							<button
								v-if="replyToComment"
								type="button"
								:disabled="commentsSubmitting"
								@click="cancelReply">
								{{ t('Отмена') }}
							</button>
						</div>
					</form>
					<div v-if="commentsLoading" class="decklist24-vue-card__inline-state">
						<span class="icon-loading-small" />
						{{ t('Загрузка комментариев...') }}
					</div>
					<div v-else-if="comments.length === 0" class="decklist24-vue-card__empty">
						{{ t('Нет комментариев') }}
					</div>
					<ul v-else class="decklist24-vue-card__comments">
						<li v-for="comment in comments" :key="comment.id">
							<img
								v-if="comment.actorId"
								class="decklist24-vue-card__avatar"
								:src="avatarUrl(comment.actorId)"
								:alt="comment.actorDisplayName || comment.actorId">
							<div v-else class="decklist24-vue-card__avatar decklist24-vue-card__avatar--fallback" aria-hidden="true">
								{{ commentInitials(comment) }}
							</div>
							<article class="decklist24-vue-card__comment">
								<header>
									<div class="decklist24-vue-card__comment-title">
										<strong>{{ comment.actorDisplayName || comment.actorId || t('Пользователь') }}</strong>
										<span>{{ formatDate(comment.creationDateTime, true) }}</span>
									</div>
									<div class="decklist24-vue-card__comment-menu">
										<button
											type="button"
											class="decklist24-vue-card__icon-button"
											:aria-label="t('Действия комментария')"
											:aria-expanded="commentMenuOpen === comment.id ? 'true' : 'false'"
											@click.stop="toggleCommentMenu(comment)">
											…
										</button>
										<div
											v-if="commentMenuOpen === comment.id"
											class="decklist24-vue-card__comment-menu-list"
											@click.stop>
											<button type="button" @click="startReply(comment)">
												{{ t('Ответить') }}
											</button>
											<button
												v-if="canEditComment(comment)"
												type="button"
												@click="startCommentEdit(comment)">
												{{ t('Обновить') }}
											</button>
											<button
												v-if="canEditComment(comment)"
												type="button"
												:disabled="commentDeleting[comment.id]"
												@click="deleteComment(comment)">
												{{ commentDeleting[comment.id] ? t('Удаление...') : t('Удалить') }}
											</button>
										</div>
									</div>
								</header>
								<div v-if="comment.replyTo" class="decklist24-vue-card__reply">
									<strong>{{ t('В ответ') }} {{ comment.replyTo.actorDisplayName || comment.replyTo.actorId || t('Пользователь') }}</strong>
									<p>{{ commentPlainText(comment.replyTo) }}</p>
								</div>
								<div v-if="commentEditing[comment.id]" class="decklist24-vue-card__comment-edit">
									<textarea
										:value="commentDrafts[comment.id]"
										:disabled="commentUpdating[comment.id]"
										rows="3"
										maxlength="1000"
										@input="setCommentDraft(comment, $event.target.value)" />
									<div class="decklist24-vue-card__actions">
										<button
											type="button"
											:disabled="commentUpdating[comment.id] || !String(commentDrafts[comment.id] || '').trim()"
											@click="saveCommentEdit(comment)">
											{{ commentUpdating[comment.id] ? t('Сохранение...') : t('Сохранить') }}
										</button>
										<button
											type="button"
											:disabled="commentUpdating[comment.id]"
											@click="cancelCommentEdit(comment)">
											{{ t('Отмена') }}
										</button>
									</div>
								</div>
								<div v-else class="decklist24-vue-card__comment-text" v-html="renderMarkdown(commentPlainText(comment))" />
							</article>
						</li>
					</ul>
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
		bundleVersion: {
			type: String,
			default: 'unknown',
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
			comments: [],
			commentsLoaded: false,
			commentsLoading: false,
			commentsSubmitting: false,
			commentsError: '',
			commentsErrorDetails: '',
			newComment: '',
			replyToComment: null,
			commentMenuOpen: null,
			commentDrafts: {},
			commentEditing: {},
			commentUpdating: {},
			commentDeleting: {},
			attachments: [],
			attachmentsLoaded: false,
			attachmentsLoading: false,
			attachmentsUploading: false,
			attachmentsDeleting: {},
			attachmentsError: '',
			attachmentsErrorDetails: '',
			attachmentDropActive: false,
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
		visibleAttachments() {
			return [...this.attachments]
				.filter((attachment) => Number(attachment.deletedAt || 0) === 0)
				.sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
		},
	},
	mounted() {
		console.info('DeckList24 card bundle version:', this.bundleVersion, {
			action: 'mounted',
			cardId: this.card.id,
			boardId: this.currentBoardId(),
			stackId: this.currentStackId(),
		})
		this.logTextEditorDiagnostics()
		this.loadCardDetails()
		document.addEventListener('keydown', this.handleDocumentKeydown)
		document.addEventListener('click', this.handleDocumentClick)
	},
	beforeDestroy() {
		document.removeEventListener('keydown', this.handleDocumentKeydown)
		document.removeEventListener('click', this.handleDocumentClick)
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
				if (this.commentMenuOpen) {
					this.commentMenuOpen = null
					return
				}
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
		handleDocumentClick() {
			this.commentMenuOpen = null
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
				if (newTab === 'comments') {
					this.loadComments()
				}
				if (newTab === 'attachments') {
					this.loadAttachments()
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
		currentBoardId() {
			return this.card.boardId || (this.board && this.board.id) || null
		},
		currentStackId() {
			return this.card.stackId || (this.card.stack && this.card.stack.id) || null
		},
		attachmentControllerPath(suffix) {
			return '/apps/deck/cards/' + encodeURIComponent(this.card.id) + suffix
		},
		attachmentApiPath(apiVersion, suffix) {
			const boardId = this.currentBoardId()
			const stackId = this.currentStackId()
			if (!boardId || !stackId) {
				return ''
			}
			return '/apps/deck/api/v' + encodeURIComponent(apiVersion)
				+ '/boards/' + encodeURIComponent(boardId)
				+ '/stacks/' + encodeURIComponent(stackId)
				+ '/cards/' + encodeURIComponent(this.card.id)
				+ '/attachments' + (suffix || '')
		},
		setPanelError(panel, message, error) {
			if (panel === 'comments') {
				this.commentsError = message
				this.commentsErrorDetails = this.getErrorMessage(error)
				console.error('[DeckList24] ' + message, error)
			} else {
				this.attachmentsError = message
				this.attachmentsErrorDetails = this.getErrorMessage(error)
				console.error('[DeckList24] ' + message, error)
			}
		},
		async loadComments(force) {
			if ((this.commentsLoaded && !force) || this.commentsLoading) {
				return
			}
			this.commentsLoading = true
			this.commentsError = ''
			this.commentsErrorDetails = ''
			try {
				const comments = await this.ocsRequest('apps/deck/api/v1.0/cards/' + encodeURIComponent(this.card.id) + '/comments', {
					action: 'loadComments',
					cardId: this.card.id,
					boardId: this.currentBoardId(),
					params: {
						limit: 50,
						offset: 0,
					},
				})
				this.comments = Array.isArray(comments)
					? comments.sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
					: []
				this.commentsLoaded = true
			} catch (error) {
				this.setPanelError('comments', this.t('Не удалось загрузить комментарии.'), error)
			} finally {
				this.commentsLoading = false
			}
		},
		async createComment() {
			const message = this.newComment.trim()
			if (!message || this.commentsSubmitting) {
				return
			}
			if (message.length > 1000) {
				this.commentsError = this.t('Комментарий не может быть длиннее 1000 символов.')
				return
			}
			this.commentsSubmitting = true
			this.commentsError = ''
			this.commentsErrorDetails = ''
			try {
				const created = await this.ocsRequest('apps/deck/api/v1.0/cards/' + encodeURIComponent(this.card.id) + '/comments', {
					action: 'addComment',
					method: 'POST',
					cardId: this.card.id,
					boardId: this.currentBoardId(),
					payloadKeys: ['message', 'parentId'],
					body: JSON.stringify({
						message,
						parentId: this.replyToComment ? Number(this.replyToComment.id) : null,
					}),
				})
				this.newComment = ''
				this.replyToComment = null
				if (created && created.id) {
					this.comments = [created, ...this.comments.filter((comment) => Number(comment.id) !== Number(created.id))]
				}
				await this.loadComments(true)
				this.updateLocalCardCounts({ commentsCount: Math.max(Number(this.card.commentsCount || 0) + 1, this.comments.length) })
			} catch (error) {
				this.setPanelError('comments', this.t('Не удалось отправить комментарий.'), error)
			} finally {
				this.commentsSubmitting = false
			}
		},
		toggleCommentMenu(comment) {
			this.commentMenuOpen = this.commentMenuOpen === comment.id ? null : comment.id
		},
		startReply(comment) {
			this.commentMenuOpen = null
			this.replyToComment = comment
			this.$nextTick(() => {
				if (this.$refs.commentInput) {
					this.$refs.commentInput.focus()
				}
			})
		},
		cancelReply() {
			this.replyToComment = null
		},
		currentUserId() {
			if (window.OC && typeof window.OC.getCurrentUser === 'function') {
				const user = window.OC.getCurrentUser()
				if (user && typeof user === 'object') {
					return user.uid || user.id || ''
				}
				return user || ''
			}
			if (window.OC && window.OC.currentUser) {
				return window.OC.currentUser
			}
			if (window.oc_current_user) {
				return window.oc_current_user
			}
			return ''
		},
		canEditComment(comment) {
			const currentUser = this.currentUserId()
			return this.canEdit && currentUser && String(comment.actorId || '') === String(currentUser)
		},
		startCommentEdit(comment) {
			this.commentMenuOpen = null
			this.$set(this.commentDrafts, comment.id, this.commentPlainText(comment))
			this.$set(this.commentEditing, comment.id, true)
		},
		setCommentDraft(comment, value) {
			this.$set(this.commentDrafts, comment.id, value)
		},
		cancelCommentEdit(comment) {
			this.$delete(this.commentDrafts, comment.id)
			this.$delete(this.commentEditing, comment.id)
		},
		async saveCommentEdit(comment) {
			const message = String(this.commentDrafts[comment.id] || '').trim()
			if (!message || this.commentUpdating[comment.id]) {
				return
			}
			this.$set(this.commentUpdating, comment.id, true)
			this.commentsError = ''
			this.commentsErrorDetails = ''
			try {
				const updated = await this.ocsRequest('apps/deck/api/v1.0/cards/' + encodeURIComponent(this.card.id) + '/comments/' + encodeURIComponent(comment.id), {
					action: 'updateComment',
					method: 'PUT',
					cardId: this.card.id,
					boardId: this.currentBoardId(),
					payloadKeys: ['message'],
					body: JSON.stringify({ message }),
				})
				if (updated && updated.id) {
					this.comments = this.comments.map((item) => Number(item.id) === Number(updated.id) ? updated : item)
				}
				this.cancelCommentEdit(comment)
				await this.loadComments(true)
			} catch (error) {
				this.setPanelError('comments', this.t('Не удалось обновить комментарий.'), error)
			} finally {
				this.$delete(this.commentUpdating, comment.id)
			}
		},
		async deleteComment(comment) {
			if (this.commentDeleting[comment.id]) {
				return
			}
			const confirmed = window.confirm
				? window.confirm(this.t('Удалить комментарий?'))
				: true
			if (!confirmed) {
				this.commentMenuOpen = null
				return
			}
			this.$set(this.commentDeleting, comment.id, true)
			this.commentsError = ''
			this.commentsErrorDetails = ''
			try {
				await this.ocsRequest('apps/deck/api/v1.0/cards/' + encodeURIComponent(this.card.id) + '/comments/' + encodeURIComponent(comment.id), {
					action: 'deleteComment',
					method: 'DELETE',
					cardId: this.card.id,
					boardId: this.currentBoardId(),
				})
				this.commentMenuOpen = null
				this.comments = this.comments.filter((item) => Number(item.id) !== Number(comment.id))
				this.updateLocalCardCounts({ commentsCount: Math.max(Number(this.card.commentsCount || 0) - 1, this.comments.length) })
				await this.loadComments(true)
			} catch (error) {
				this.setPanelError('comments', this.t('Не удалось удалить комментарий.'), error)
			} finally {
				this.$delete(this.commentDeleting, comment.id)
			}
		},
		async loadAttachments(force) {
			if ((this.attachmentsLoaded && !force) || this.attachmentsLoading) {
				return
			}
			this.attachmentsLoading = true
			this.attachmentsError = ''
			this.attachmentsErrorDetails = ''
			try {
				const attachments = await this.loadAttachmentsFromDeck()
				this.attachments = Array.isArray(attachments) ? attachments : []
				this.attachmentsLoaded = true
				this.updateLocalCardCounts({ attachmentCount: this.visibleAttachments.length })
			} catch (error) {
				this.setPanelError('attachments', this.t('Не удалось загрузить вложения.'), error)
			} finally {
				this.attachmentsLoading = false
			}
		},
		openAttachmentPicker() {
			if (this.$refs.attachmentInput) {
				this.$refs.attachmentInput.click()
			}
		},
		async handleAttachmentInput(event) {
			const files = Array.from(event.target.files || [])
			event.target.value = ''
			await this.uploadAttachments(files)
		},
		async handleAttachmentDrop(event) {
			this.attachmentDropActive = false
			if (!this.canEdit) {
				return
			}
			const files = Array.from(event.dataTransfer?.files || [])
			await this.uploadAttachments(files)
		},
		async loadAttachmentsFromDeck() {
			const apiPath = this.attachmentApiPath('1.1')
			if (apiPath) {
				try {
					return await this.request(apiPath, {
						action: 'loadAttachments:deckRestV11',
						cardId: this.card.id,
						boardId: this.currentBoardId(),
						headers: {
							'OCS-APIRequest': 'true',
						},
					})
				} catch (error) {
					console.warn('[DeckList24] Failed to load attachments through Deck REST API, using controller fallback', error)
				}
			}
			return this.request(this.attachmentControllerPath('/attachments'), {
				action: 'loadAttachments:controller',
				cardId: this.card.id,
				boardId: this.currentBoardId(),
			})
		},
		async uploadAttachments(files) {
			if (!files.length || this.attachmentsUploading) {
				return
			}
			this.attachmentsUploading = true
			this.attachmentsError = ''
			this.attachmentsErrorDetails = ''
			try {
				for (const file of files) {
					const attachment = await this.uploadSingleAttachment(file)
					if (attachment) {
						this.attachments = [
							...this.attachments.filter((item) => this.attachmentKey(item) !== this.attachmentKey(attachment)),
							attachment,
						]
					}
				}
				this.attachmentsLoaded = true
				await this.loadAttachments(true)
				this.updateLocalCardCounts({ attachmentCount: this.visibleAttachments.length })
			} catch (error) {
				this.setPanelError('attachments', this.t('Не удалось загрузить файл.'), error)
			} finally {
				this.attachmentsUploading = false
			}
		},
		attachmentUploadAttempts() {
			const attempts = []
			const apiV11Path = this.attachmentApiPath('1.1')
			if (apiV11Path) {
				attempts.push({
					strategy: 'deckRestV11',
					path: apiV11Path,
					type: 'file',
					includeCardId: false,
					headers: {
						'OCS-APIRequest': 'true',
					},
				})
			}
			const apiV10Path = this.attachmentApiPath('1.0')
			if (apiV10Path) {
				attempts.push({
					strategy: 'deckRestV10',
					path: apiV10Path,
					type: 'deck_file',
					includeCardId: false,
					headers: {
						'OCS-APIRequest': 'true',
					},
				})
			}
			attempts.push({
				strategy: 'controllerFile',
				path: this.attachmentControllerPath('/attachment'),
				type: 'file',
				includeCardId: true,
				headers: {},
			})
			attempts.push({
				strategy: 'controllerDeckFile',
				path: this.attachmentControllerPath('/attachment'),
				type: 'deck_file',
				includeCardId: true,
				headers: {},
			})
			return attempts
		},
		async uploadSingleAttachment(file) {
			const attempts = this.attachmentUploadAttempts()
			console.log('[DeckList24] Attachment upload attempts prepared', attempts.map((attempt) => ({
				strategy: attempt.strategy,
				url: this.generateUrl(attempt.path),
				cardId: this.card.id,
				boardId: this.currentBoardId(),
				stackId: this.currentStackId(),
				type: attempt.type,
				includeCardId: attempt.includeCardId,
			})))
			const failures = []
			for (const attempt of attempts) {
				try {
					return await this.uploadAttachmentWithAttempt(file, attempt)
				} catch (error) {
					failures.push({ attempt, error })
					console.warn('[DeckList24] Attachment upload attempt failed', {
						strategy: attempt.strategy,
						url: this.generateUrl(attempt.path),
						cardId: this.card.id,
						boardId: this.currentBoardId(),
						stackId: this.currentStackId(),
						fileName: file.name,
						status: error && error.status,
						error,
					})
					if (error && (error.status === 401 || error.status === 403)) {
						break
					}
				}
			}
			throw this.createUploadAttemptsError(failures)
		},
		async uploadAttachmentWithAttempt(file, attempt) {
			const formData = new FormData()
			if (attempt.includeCardId) {
				formData.append('cardId', this.card.id)
			}
			formData.append('type', attempt.type)
			formData.append('data', '')
			formData.append('file', file)
			console.log({
				action: 'uploadAttachment',
				strategy: attempt.strategy,
				url: this.generateUrl(attempt.path),
				cardId: this.card.id,
				boardId: this.currentBoardId(),
				stackId: this.currentStackId(),
				fileName: file.name,
				fileSize: file.size,
				attachmentType: attempt.type,
				formDataKeys: Array.from(formData.keys()),
			})
			return this.request(attempt.path, {
				action: 'uploadAttachment:' + attempt.strategy,
				method: 'POST',
				cardId: this.card.id,
				boardId: this.currentBoardId(),
				payloadKeys: Array.from(formData.keys()),
				headers: attempt.headers,
				body: formData,
			})
		},
		createUploadAttemptsError(failures) {
			const lastFailure = failures[failures.length - 1]
			const lastError = lastFailure && lastFailure.error ? lastFailure.error : new Error(this.t('Не удалось загрузить файл.'))
			const attemptsText = failures.map(({ attempt, error }) => {
				return [
					'- ' + attempt.strategy,
					this.generateUrl(attempt.path),
					error && error.status ? 'HTTP ' + error.status : '',
					error && error.requestId ? 'requestId ' + error.requestId : '',
					error && error.ocsMessage ? error.ocsMessage : '',
				].filter(Boolean).join(' | ')
			}).join('\n')
			const error = new Error(this.getErrorMessage(lastError) + (attemptsText ? '\n\nUpload attempts:\n' + attemptsText : ''))
			error.status = lastError.status
			error.url = lastError.url
			error.method = lastError.method
			error.ocsMessage = lastError.ocsMessage
			error.requestId = lastError.requestId
			error.responseBody = lastError.responseBody
			error.responseText = lastError.responseText
			error.uploadFailures = failures
			return error
		},
		async deleteAttachment(attachment) {
			const key = this.attachmentKey(attachment)
			if (!this.canDeleteAttachment(attachment) || this.attachmentsDeleting[key]) {
				return
			}
			this.$set(this.attachmentsDeleting, key, true)
			this.attachmentsError = ''
			this.attachmentsErrorDetails = ''
			try {
				const type = encodeURIComponent(attachment.type || 'deck_file')
				const id = encodeURIComponent(attachment.id)
				await this.request('/apps/deck/cards/' + encodeURIComponent(attachment.cardId || this.card.id) + '/attachment/' + type + ':' + id, {
					action: 'deleteAttachment',
					method: 'DELETE',
					cardId: attachment.cardId || this.card.id,
					boardId: this.currentBoardId(),
				})
				this.attachments = this.attachments.filter((item) => this.attachmentKey(item) !== key)
				this.updateLocalCardCounts({ attachmentCount: this.visibleAttachments.length })
			} catch (error) {
				this.setPanelError('attachments', this.t('Не удалось удалить вложение.'), error)
			} finally {
				this.$delete(this.attachmentsDeleting, key)
			}
		},
		updateLocalCardCounts(patch) {
			this.card = this.normalizeCard({
				...this.card,
				...patch,
			})
			this.$emit('card-updated', this.card)
			if (this.api && typeof this.api.onCardUpdated === 'function') {
				this.api.onCardUpdated(this.card)
			}
		},
		async updateCard(patch) {
			const payload = this.buildCardPayload(patch)
			const response = await this.ocsRequest('apps/deck/api/v1.0/cards/' + encodeURIComponent(this.card.id), {
				action: 'updateCard',
				method: 'PUT',
				cardId: this.card.id,
				boardId: payload.boardId,
				payloadKeys: Object.keys(payload),
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
		attachmentKey(attachment) {
			return String(attachment.type || 'deck_file') + ':' + String(attachment.id)
		},
		attachmentName(attachment) {
			const extendedData = attachment.extendedData || {}
			const info = extendedData.info || {}
			if (info.filename && info.extension) {
				return info.filename + '.' + info.extension
			}
			return extendedData.fileName
				|| extendedData.name
				|| attachment.name
				|| attachment.title
				|| attachment.data
				|| this.t('Вложение') + ' #' + attachment.id
		},
		attachmentSize(attachment) {
			return Number(attachment.extendedData?.filesize || attachment.size || 0)
		},
		attachmentAuthor(attachment) {
			return attachment.extendedData?.attachmentCreator?.displayName
				|| attachment.extendedData?.attachmentCreator?.uid
				|| ''
		},
		attachmentOpenUrl(attachment) {
			if (attachment.extendedData?.fileid) {
				return this.generateUrl('/f/' + encodeURIComponent(attachment.extendedData.fileid))
			}
			const attachmentId = encodeURIComponent(attachment.type || 'deck_file') + ':' + encodeURIComponent(attachment.id)
			return this.generateUrl('/apps/deck/cards/' + encodeURIComponent(attachment.cardId || this.card.id) + '/attachment/' + attachmentId)
		},
		attachmentDownloadUrl(attachment) {
			return this.attachmentOpenUrl(attachment)
		},
		canDeleteAttachment(attachment) {
			return this.canEdit && Number(attachment.deletedAt || 0) === 0
		},
		formatFileSize(size) {
			const bytes = Number(size || 0)
			if (!bytes) {
				return '-'
			}
			if (window.OC && typeof window.OC.Util?.humanFileSize === 'function') {
				return window.OC.Util.humanFileSize(bytes)
			}
			const units = ['B', 'KB', 'MB', 'GB', 'TB']
			let value = bytes
			let unitIndex = 0
			while (value >= 1024 && unitIndex < units.length - 1) {
				value /= 1024
				unitIndex += 1
			}
			return (unitIndex === 0 ? value : value.toFixed(value >= 10 ? 0 : 1)) + ' ' + units[unitIndex]
		},
		avatarUrl(userId) {
			return this.generateUrl('/avatar/' + encodeURIComponent(userId) + '/32')
		},
		commentInitials(comment) {
			const name = comment.actorDisplayName || comment.actorId || '?'
			return String(name).trim().slice(0, 2).toUpperCase()
		},
		commentPlainText(comment) {
			return this.decodeHtml(comment.message || '')
		},
		decodeHtml(value) {
			const element = document.createElement('div')
			element.innerHTML = String(value || '')
			return element.textContent || element.innerText || ''
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
			if (error.message) {
				return error.message
			}
			const parts = [
				error.status ? 'HTTP status: ' + error.status : '',
				error.method || error.url ? 'Request: ' + [error.method, error.url].filter(Boolean).join(' ') : '',
				error.requestId ? 'Request ID: ' + error.requestId : '',
				error.ocsMessage ? 'OCS message: ' + error.ocsMessage : '',
				error.responseBody ? 'Response body: ' + this.formatResponseBody(error.responseBody, error.responseText) : '',
			].filter(Boolean)
			return parts.join('\n') || String(error)
		},
		getPayloadKeys(body) {
			if (!body) {
				return []
			}
			if (typeof FormData !== 'undefined' && body instanceof FormData && typeof body.keys === 'function') {
				return Array.from(new Set(Array.from(body.keys())))
			}
			if (typeof body === 'string') {
				try {
					const parsed = JSON.parse(body)
					if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
						return Object.keys(parsed)
					}
				} catch (error) {
					// Plain text body.
				}
				return ['raw']
			}
			if (typeof body === 'object') {
				return Object.keys(body)
			}
			return [typeof body]
		},
		parseResponseBody(text) {
			if (!text) {
				return null
			}
			try {
				return JSON.parse(text)
			} catch (error) {
				return null
			}
		},
		extractOcsData(data) {
			if (data && data.ocs && Object.prototype.hasOwnProperty.call(data.ocs, 'data')) {
				return data.ocs.data
			}
			return data
		},
		extractOcsMessage(data, fallback) {
			return (data && data.ocs && data.ocs.meta && data.ocs.meta.message)
				|| (data && data.message)
				|| (data && data.error)
				|| fallback
				|| ''
		},
		formatResponseBody(data, text) {
			if (data) {
				try {
					return typeof data === 'string' ? data : JSON.stringify(data)
				} catch (error) {
					return String(data)
				}
			}
			return text || ''
		},
		createApiError(response, method, url, data, text) {
			const ocsMessage = this.extractOcsMessage(data, response.statusText)
			const responseBody = this.formatResponseBody(data, text)
			const requestId = (data && data.requestId) || (data && data.ocs && data.ocs.meta && data.ocs.meta.requestId) || ''
			const parts = [
				'HTTP status: ' + response.status,
				'Request: ' + method + ' ' + url,
				requestId ? 'Request ID: ' + requestId : '',
				ocsMessage ? 'OCS message: ' + ocsMessage : '',
				responseBody ? 'Response body: ' + responseBody : '',
			].filter(Boolean)
			const requestError = new Error(parts.join('\n') || ('HTTP ' + response.status))
			requestError.status = response.status
			requestError.url = url
			requestError.method = method
			requestError.ocsMessage = ocsMessage
			requestError.requestId = requestId
			requestError.responseBody = data || text || ''
			requestError.responseText = text || ''
			return requestError
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
			const {
				params,
				action,
				cardId,
				boardId,
				payloadKeys,
				...fetchOptions
			} = requestOptions
			const headers = {
				Accept: 'application/json',
				'X-Requested-With': 'XMLHttpRequest',
				...(ocs ? { 'OCS-APIRequest': 'true' } : {}),
				...(requestOptions.headers || {}),
			}
			const isFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData

			if (window.OC && window.OC.requestToken) {
				headers.requesttoken = window.OC.requestToken
			}
			if (requestOptions.body && !isFormData && !headers['Content-Type']) {
				headers['Content-Type'] = 'application/json'
			}

			let requestUrl = url
			if (params) {
				const query = new URLSearchParams()
				Object.keys(params).forEach((key) => {
					if (params[key] !== null && typeof params[key] !== 'undefined') {
						query.append(key, params[key])
					}
				})
				const queryString = query.toString()
				if (queryString) {
					requestUrl += (requestUrl.indexOf('?') === -1 ? '?' : '&') + queryString
				}
			}

			const method = String(fetchOptions.method || 'GET').toUpperCase()
			const requestInfo = {
				action: action || (ocs ? 'ocsRequest' : 'request'),
				method,
				url: requestUrl,
				cardId: cardId || null,
				boardId: boardId || params?.boardId || null,
				payloadKeys: payloadKeys || this.getPayloadKeys(requestOptions.body),
			}
			console.log('[DeckList24 API request]', requestInfo)

			const response = await fetch(requestUrl, {
				credentials: 'same-origin',
				...fetchOptions,
				headers,
			})
			if (response.status === 204) {
				console.log('[DeckList24 API response]', {
					...requestInfo,
					status: response.status,
					parsedResponse: null,
				})
				return null
			}
			const responseText = await response.text()
			const parsedResponse = this.parseResponseBody(responseText)
			if (!response.ok) {
				const requestError = this.createApiError(response, method, requestUrl, parsedResponse, responseText)
				console.error('[DeckList24 API error]', {
					...requestInfo,
					status: response.status,
					parsedResponse,
					errorBody: parsedResponse || responseText,
					error: requestError,
				})
				throw requestError
			}
			console.log('[DeckList24 API response]', {
				...requestInfo,
				status: response.status,
				parsedResponse: parsedResponse || responseText,
			})
			return ocs && parsedResponse ? this.extractOcsData(parsedResponse) : (parsedResponse || responseText)
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
			const webRoot = window.OC && typeof window.OC.webroot === 'string'
				? window.OC.webroot.replace(/\/+$/, '')
				: ''
			return webRoot + '/ocs/v2.php/' + normalized
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
	align-items: flex-start;
	flex-direction: column;
	background: rgba(219, 72, 72, .12);
	color: var(--color-error);
	white-space: pre-wrap;
	word-break: break-word;
}

.decklist24-vue-card__error-details {
	width: 100%;
	color: var(--color-main-text);
}

.decklist24-vue-card__error-details summary {
	cursor: pointer;
	font-weight: 700;
}

.decklist24-vue-card__error-details pre {
	max-height: 160px;
	margin: 8px 0 0;
	padding: 8px;
	overflow: auto;
	border-radius: 4px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	white-space: pre-wrap;
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

.decklist24-vue-card__inline-state {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px;
	color: var(--color-text-maxcontrast);
}

.decklist24-vue-card__file-input {
	display: none;
}

.decklist24-vue-card__dropzone {
	min-height: 220px;
	border: 1px dashed var(--color-border);
	border-radius: 6px;
	background: var(--color-background-hover);
	transition: border-color .15s ease, background-color .15s ease;
}

.decklist24-vue-card__dropzone--active {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light, var(--color-background-hover));
}

.decklist24-vue-card__attachments,
.decklist24-vue-card__comments {
	display: grid;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.decklist24-vue-card__attachments {
	padding: 10px;
}

.decklist24-vue-card__attachments li {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-main-background);
}

.decklist24-vue-card__file-icon {
	flex: 0 0 auto;
	width: 38px;
	height: 38px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
}

.decklist24-vue-card__file-icon svg {
	width: 22px;
	height: 22px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.decklist24-vue-card__file-main {
	flex: 1 1 auto;
	min-width: 0;
}

.decklist24-vue-card__file-main a {
	display: inline-block;
	max-width: 100%;
	color: var(--color-main-text);
	font-weight: 700;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.decklist24-vue-card__file-meta {
	display: flex;
	gap: 10px;
	flex-wrap: wrap;
	margin-top: 3px;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
}

.decklist24-vue-card__file-actions {
	flex: 0 0 auto;
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
	justify-content: flex-end;
}

.decklist24-vue-card__file-actions a.decklist24-vue-card__small-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--color-border);
	background: var(--color-background-hover);
	color: var(--color-main-text);
	text-decoration: none;
}

.decklist24-vue-card__comment-form {
	display: grid;
	gap: 8px;
	padding: 12px;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-background-hover);
}

.decklist24-vue-card__comment-form textarea {
	width: 100%;
	min-height: 88px;
	margin: 0;
	resize: vertical;
}

.decklist24-vue-card__reply-preview,
.decklist24-vue-card__reply {
	position: relative;
	padding: 8px 36px 8px 10px;
	border-inline-start: 4px solid var(--color-border-dark, var(--color-border));
	border-radius: 4px;
	background: var(--color-main-background);
	color: var(--color-text-maxcontrast);
}

.decklist24-vue-card__reply-preview div {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	color: var(--color-main-text);
}

.decklist24-vue-card__reply-preview p,
.decklist24-vue-card__reply p {
	margin: 4px 0 0;
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.decklist24-vue-card__comments li {
	display: flex;
	align-items: flex-start;
	gap: 10px;
}

.decklist24-vue-card__avatar {
	flex: 0 0 auto;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: var(--color-background-hover);
	object-fit: cover;
}

.decklist24-vue-card__avatar--fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-weight: 700;
}

.decklist24-vue-card__comment {
	flex: 1 1 auto;
	min-width: 0;
	padding: 10px 12px;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-background-hover);
}

.decklist24-vue-card__comment header {
	display: flex;
	justify-content: space-between;
	gap: 10px;
	margin-bottom: 6px;
}

.decklist24-vue-card__comment-title {
	display: flex;
	gap: 10px;
	flex-wrap: wrap;
	min-width: 0;
}

.decklist24-vue-card__comment-title span {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
}

.decklist24-vue-card__comment-menu {
	position: relative;
	flex: 0 0 auto;
}

.decklist24-vue-card__icon-button {
	width: 30px;
	min-width: 30px;
	height: 30px;
	min-height: 30px;
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: var(--color-main-text);
	font-size: 20px;
	line-height: 1;
}

.decklist24-vue-card__icon-button:hover,
.decklist24-vue-card__icon-button:focus {
	background: var(--color-background-hover);
}

.decklist24-vue-card__reply-preview .decklist24-vue-card__icon-button {
	position: absolute;
	top: 6px;
	right: 6px;
}

.decklist24-vue-card__comment-menu-list {
	position: absolute;
	top: 32px;
	right: 0;
	z-index: 5;
	min-width: 150px;
	padding: 4px;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-main-background);
	box-shadow: 0 8px 22px rgba(0, 0, 0, .18);
}

.decklist24-vue-card__comment-menu-list button {
	width: 100%;
	min-height: 34px;
	margin: 0;
	padding: 6px 10px;
	border: 0;
	border-radius: 4px;
	background: transparent;
	text-align: left;
}

.decklist24-vue-card__comment-menu-list button:hover,
.decklist24-vue-card__comment-menu-list button:focus {
	background: var(--color-background-hover);
}

.decklist24-vue-card__comment-edit {
	display: grid;
	gap: 8px;
}

.decklist24-vue-card__comment-edit textarea {
	width: 100%;
	min-height: 88px;
	margin: 0;
	resize: vertical;
}

.decklist24-vue-card__comment-text {
	overflow-wrap: anywhere;
}

.decklist24-vue-card__comment-text :deep(> :first-child) {
	margin-top: 0;
}

.decklist24-vue-card__comment-text :deep(> :last-child) {
	margin-bottom: 0;
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

	.decklist24-vue-card__attachments li {
		align-items: flex-start;
		flex-wrap: wrap;
	}

	.decklist24-vue-card__file-actions {
		width: 100%;
		justify-content: flex-start;
	}

	.decklist24-vue-card__comment header {
		flex-direction: column;
		gap: 2px;
	}
}
</style>

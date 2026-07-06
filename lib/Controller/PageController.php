<?php

declare(strict_types=1);

namespace OCA\DeckList24\Controller;

use OCA\DeckList24\AppInfo\Application;
use OCA\Text\Event\LoadEditor;
use OCA\Viewer\Event\LoadViewer;
use OCP\App\IAppManager;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\EventDispatcher\IEventDispatcher;
use OCP\IRequest;

class PageController extends Controller {
	private IAppManager $appManager;
	private IEventDispatcher $eventDispatcher;

	public function __construct(
		string $AppName,
		IRequest $request,
		IAppManager $appManager,
		IEventDispatcher $eventDispatcher
	) {
		parent::__construct($AppName, $request);
		$this->appManager = $appManager;
		$this->eventDispatcher = $eventDispatcher;
	}

	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	public function index(): TemplateResponse {
		if (class_exists(LoadEditor::class)) {
			$this->eventDispatcher->dispatchTyped(new LoadEditor());
		}
		if (class_exists(LoadViewer::class)) {
			$this->eventDispatcher->dispatchTyped(new LoadViewer());
		}

		return new TemplateResponse(Application::APP_ID, 'main', [
			'deckEnabled' => $this->appManager->isEnabledForUser('deck'),
		]);
	}
}

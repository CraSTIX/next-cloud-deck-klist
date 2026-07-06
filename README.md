# DeckList24

![Список задач DeckList24](Screenshots/img1.png)
![Карточка DeckList24](Screenshots/img2.png)

DeckList24 — отдельное native-приложение для Nextcloud, сделанное как дополнительный интерфейс к приложению **Nextcloud Deck**.

> Проект сделан и доработан с помощью **OpenAI Codex**.  
> Основная идея: оставить обычный Deck без изменений, но добавить отдельный список задач в стиле Bitrix24.

## Что делает DeckList24

DeckList24 открывается отдельно:

```text
/apps/decklist24/
```

Обычный Deck остаётся на своём месте:

```text
/apps/deck/
```

DeckList24 **не заменяет Nextcloud Deck** и не трогает приложение с app id `deck`.

DeckList24 использует установленный Deck как источник данных:

- доски;
- колонки / статусы;
- карточки;
- исполнители;
- метки;
- описания карточек.

Своя отдельная база задач не создаётся.  
Задачи не дублируются.  
Изменения должны сохраняться в обычный Deck через Deck API.

## Что уже реализовано

- отдельное приложение Nextcloud с app id `decklist24`;
- открытие по адресу `/apps/decklist24/`;
- список досок слева;
- таблица задач выбранной доски справа;
- поиск по задачам;
- фильтр по статусу / колонке;
- фильтр по исполнителю;
- открытие карточки внутри DeckList24;
- вкладки карточки:
  - Свойства;
  - Вложения;
  - Комментарии;
  - Активность;
- редактирование названия карточки;
- редактирование описания карточки;
- отображение Markdown:
  - таблицы;
  - ссылки;
  - списки;
  - чеклисты;
- попытка использовать редактор Nextcloud Text, если он доступен;
- fallback markdown-редактор, если редактор Nextcloud Text недоступен;
- обычный Deck остаётся установленным и рабочим отдельно.

## Важно

Это приложение предназначено для установки рядом с Deck.

Нельзя удалять или отключать обычный Deck, потому что DeckList24 использует его данные и API.

Проверка:

```bash
sudo nextcloud.occ app:list | grep -E "deck|decklist24"
```

Оба приложения должны быть включены.

## Установка в Nextcloud Snap

Эти команды рассчитаны на установку Nextcloud через **Snap**.

Папка приложения на сервере должна быть здесь:

```text
/var/snap/nextcloud/current/nextcloud/extra-apps/decklist24
```

Пример установки:

```bash
sudo mkdir -p /var/snap/nextcloud/current/nextcloud/extra-apps

sudo cp -a /home/boss/BACKUP-NEXTCLOUD/decklist24 \
/var/snap/nextcloud/current/nextcloud/extra-apps/decklist24

sudo chown -R root:root \
/var/snap/nextcloud/current/nextcloud/extra-apps/decklist24

sudo nextcloud.occ app:enable decklist24

sudo nextcloud.occ maintenance:mode --off

sudo snap restart nextcloud
```

После установки открыть:

```text
http://SERVER/index.php/apps/decklist24/
```

Например:

```text
http://127.0.0.1/index.php/apps/decklist24/
```

## Обновление приложения в Nextcloud Snap

Если нужно заменить установленную версию новой папкой `decklist24`:

```bash
sudo nextcloud.occ app:disable decklist24 || true

sudo rm -rf /var/snap/nextcloud/current/nextcloud/extra-apps/decklist24

sudo cp -a /home/boss/BACKUP-NEXTCLOUD/decklist24 \
/var/snap/nextcloud/current/nextcloud/extra-apps/decklist24

sudo chown -R root:root \
/var/snap/nextcloud/current/nextcloud/extra-apps/decklist24

sudo nextcloud.occ app:enable decklist24

sudo nextcloud.occ maintenance:mode --off

sudo snap restart nextcloud
```

После обновления в браузере нажать:

```text
Ctrl + F5
```

## Удаление DeckList24

Удаляется только DeckList24. Обычный Deck не трогать.

```bash
sudo nextcloud.occ app:disable decklist24 || true

sudo rm -rf /var/snap/nextcloud/current/nextcloud/extra-apps/decklist24

sudo snap restart nextcloud
```

## Проверка после установки

```bash
sudo nextcloud.occ app:list | grep -E "deck|decklist24"
```

Открыть:

```text
/apps/deck/
```

для обычного Deck.

Открыть:

```text
/apps/decklist24/
```

для DeckList24.

## Разработка

Исходный проект:

```text
D:\CODEX\decklist24
```

Основные файлы:

```text
appinfo/info.xml
appinfo/routes.php
lib/AppInfo/Application.php
lib/Controller/PageController.php
templates/main.php
js/decklist24-main.js
js/decklist24-card.js
css/decklist24-main.css
src/card-main.js
src/components/card/DeckCardModal.vue
```

## Примечание

DeckList24 находится в разработке.  
Часть функций карточки ещё может отличаться от оригинального Deck, особенно комментарии, вложения, активность и полный редактор Nextcloud Text.

# VendChain — Development Roadmap

> Живой документ. Обновляй статус задач по мере выполнения.
> Последнее обновление: 2026-03-31

---

## Ключевой архитектурный принцип

> **"Убери Solana — проект сломается или станет нерентабельным."**
>
> Это не просто требование — это критерий качества каждого технического решения.
> Каждый компонент системы должен использовать Solana-специфичные возможности,
> которые невозможно или невыгодно реализовать на другом блокчейне.

### Почему только Solana — и никакой другой

| Критерий | Solana | Ethereum | BSC |
|----------|--------|----------|-----|
| Комиссия за транзакцию | **$0.00025** | $5–50 | $0.05–0.5 |
| Время финализации | **400ms** | 12–60 сек | 3–5 сек |
| Оплата у вендинга ($2 товар) | **Выгодно** | Убыток | Пограничное |
| Solana Pay (QR оплата) | **Нативный** | Нет | Нет |
| Token-2022 Transfer Hooks | **Есть** | Нет | Нет |
| Pyth oracle (нативный) | **Есть** | Нет | Нет |
| Децентрализация | Да | Да | **Нет (централизован)** |

### Solana-специфичные технологии которые ОБЯЗАТЕЛЬНО интегрировать

Каждый из этих пунктов делает Solana незаменимой:

#### 1. Solana Pay — оплата прямо у машины
```
Покупатель подходит к вендингу
        ↓
Машина генерирует QR (Solana Pay протокол)
        ↓
Покупатель сканирует телефоном (любой Solana кошелёк)
        ↓
400ms → транзакция в блокчейне → товар выдан
```
- Стандарт: `solana:`-ссылки с параметрами amount + reference
- SDK: `@solana/pay`
- **Это невозможно воспроизвести на ETH** — $10 комиссия за $2 шоколадку убивает бизнес

#### 2. Token-2022 с Transfer Hook (автоматический burn)
- Каждый перевод VEND токена **автоматически** сжигает 10% через hook программу
- Это встроено в сам токен на уровне протокола — не смарт-контракт поверх, а часть стандарта
- На EVM такого нет — там нужны custodial обёртки с рисками безопасности
- Реализуется через `spl-token-2022` с `TransferHookInterface`

#### 3. Compressed NFTs — сертификаты машин (Metaplex Bubblegum)
- Каждая вендинговая машина = cNFT (подтверждение владения)
- 1000 машин = 1000 NFT за ~$0.01 суммарно (на ETH это тысячи долларов)
- Владелец NFT = владелец машины в системе — непреложно и on-chain
- Права на revenue напрямую привязаны к cNFT

#### 4. Pyth Network — цены в реальном времени
- Нативный оракул Solana, обновление каждые 400ms
- SOL/USD прямо в программе через Cross-Program Invocation (CPI)
- Используется для: конвертация стоимости товара → VEND, расчёт APY в USD

#### 5. PDAs — детерминированная адресация
- Каждая машина, каждый стейк-аккаунт — это PDA (Program Derived Address)
- Адрес = `(программа + seeds)` → предсказуем, без приватного ключа
- Это Anchor/Solana концепция — на EVM аналога нет (там mappings в storage)

### Красная линия: что нельзя делать

- ❌ Не делать "абстрактный blockchain service" который можно подключить к любой сети
- ❌ Не использовать generic ERC-20 паттерны вместо SPL Token-2022
- ❌ Не делать оплату через обычный transfer — только через Solana Pay
- ❌ Не хранить баланс/ownership в базе данных — только on-chain (PDAs)

---

## Текущий статус

| Что | Статус |
|-----|--------|
| Next.js UI (все страницы) | ✅ Готово |
| Wallet connect (Devnet) | ✅ Готово |
| Git / GitHub | ✅ Чистый репо, запушен |
| Все данные | ❌ Моковые (статика) |
| Vercel деплой | ❌ Не сделан |
| Смарт-контракты | ❌ Не начаты |
| On-chain интеграция | ❌ Не начата |
| Бэкенд/API | ❌ Не начат |

---

## Нужен ли бэкенд?

**Короткий ответ: частично да, частично нет.**

Solana смарт-контракты (Anchor программы) — это и есть бэкенд для всей финансовой логики.
Но для некоторых данных нужен лёгкий off-chain слой.

### Что покрывают смарт-контракты (on-chain, без бэкенда):
- Выпуск / перевод VEND токенов
- Стейкинг (депозит / вывод / начисление наград)
- Реестр машин (owner, revenue счётчик)
- Распределение выручки (70% / 20% burn 10%)
- Все финансовые транзакции

### Что нужно off-chain (лёгкий бэкенд или сторонние сервисы):
| Данные | Решение | Сложность |
|--------|---------|-----------|
| Цена SOL/USD | Pyth Network (бесплатно, без бэкенда) | 🟢 Просто |
| История транзакций | Helius API (бесплатно до 100k запросов/мес) | 🟢 Просто |
| Метаданные машин (название, локация, фото) | Supabase (PostgreSQL, бесплатный tier) | 🟡 Средне |
| Real-time телеметрия машин (продажи, статус) | Supabase Realtime или Helius webhooks | 🟡 Средне |
| NFT метаданные | IPFS / Arweave (pinata.cloud) | 🟡 Средне |

**Вывод:** Полноценный сервер (Node.js/Express) нам не нужен.
Используем: **Supabase** (база + realtime) + **Helius** (RPC + webhooks) + **Pyth** (цены).

---

## Архитектура системы

```
[Пользователь]
      │
      ▼
[Next.js Frontend — Vercel]
      │
      ├── Solana RPC (Helius) ──► [Anchor Programs на Devnet/Mainnet]
      │                                    │
      │                              ┌─────┴──────┐
      │                         vend_token   vend_staking
      │                         vend_machine vend_treasury
      │
      ├── Pyth Network ──► SOL/USD цена
      │
      └── Supabase ──► machine metadata, realtime stats
```

---

## Фазы разработки

---

### ФАЗА 0 — Деплой фронтенда [~1 день]
> Делаем сейчас, до смарт-контрактов. Нужен живой URL для демо/презентации.

**Цель:** Получить публичный URL на Vercel с текущим моковым UI.

#### Шаги:

- [ ] **0.1** Установить Vercel CLI: `npm i -g vercel`
- [ ] **0.2** Запустить из корня репо: `vercel`
  - Framework: Next.js
  - Root directory: `.` (корень)
- [ ] **0.3** Прокинуть env переменные на Vercel (если появятся)
- [ ] **0.4** Проверить что все страницы открываются на `*.vercel.app`
- [ ] **0.5** Сохранить URL в этот документ: `LIVE_URL = `

**Что получим:** Работающий демо-сайт для показа инвесторам/партнёрам.

---

### ФАЗА 1 — Смарт-контракты (Anchor) [~2-3 недели]
> Ядро системы. Всё финансовое идёт сюда.

#### Подготовка окружения (делаем один раз):

- [x] **1.0.1** Rust 1.94.1 (stable)
- [x] **1.0.2** Solana CLI 3.1.12 (Agave stable) — установлен, PATH настроен
- [x] **1.0.3** Anchor 0.32.0 — установлен через AVM
- [x] **1.0.4** Devnet wallet: `2Xxc4uMPpfGJJtxEXV2SfP34tQ8n56mYZEw26n79LPaw` (C:\solana\id.json)
- [x] **1.0.5** Devnet SOL получен через faucet.solana.com
- [x] **1.0.6** Anchor проект создан: `vendchain-contracts/`

#### Программа 1 — `vend_token` (Token-2022 + Transfer Hook):
> Используем Token-2022, не старый SPL Token — это даёт нативный burn hook
- [ ] **1.1.1** Создать mint через `spl-token-2022` (не `spl-token`)
- [ ] **1.1.2** Инициализировать mint с `TransferHookInterface` extension
- [ ] **1.1.3** Написать `vend_transfer_hook` программу:
  - При каждом transfer автоматически: 10% → burn address
  - Остальные 90% идут получателю — прозрачно, без доверия
- [ ] **1.1.4** Инструкция `initialize_mint` — VEND токен (decimals: 9, supply: 1_000_000_000)
- [ ] **1.1.5** Инструкция `mint_to` — только через authority PDA
- [ ] **1.1.6** Написать тесты (проверить что hook срабатывает на каждый transfer)
- [ ] **1.1.7** Задеплоить на Devnet

#### Программа 2 — `vend_staking`: ✅ ЗАДЕПЛОЕНО
- [x] **1.2.1** PDA: `StakingPool`, `UserStake`, `UnstakeRequest`
- [x] **1.2.2** Инструкция `initialize_staking_pool(reward_rate_bps)`
- [x] **1.2.3** Инструкция `stake(amount)` — перевод VEND в stake_vault PDA
- [x] **1.2.4** Инструкция `request_unstake(amount)` — 7-дневный lockup
- [x] **1.2.5** Инструкция `withdraw` — после окончания lockup
- [x] **1.2.6** Инструкция `claim_rewards` — забрать накопленные VEND
- [x] **1.2.7** Инструкция `fund_rewards(amount)` — вызывается из treasury
- [x] **1.2.8** Задеплоено на Devnet: `9T4YTDnoA1KQyVmcyEqJug5jWkXEjyi6WLw2uKr9kowK`
- [ ] **1.2.9** Написать тесты (stake → wait → claim → unstake) — СЛЕДУЮЩИЙ ШАГ

#### Программа 3 — `vend_machine` + Solana Pay + cNFT:
> Машины оплачиваются через Solana Pay, владение = cNFT
- [ ] **1.3.1** PDA: `MachineAccount { owner, cnft_id, machine_id, location_hash, total_revenue, is_active }`
- [ ] **1.3.2** Инструкция `register_machine(machine_id, location)`:
  - Создаёт PDA аккаунт
  - Минтит cNFT (Metaplex Bubblegum) → отправляет владельцу
  - cNFT = proof of ownership, хранится в кошельке
- [ ] **1.3.3** Инструкция `process_sale(machine_id, reference)` — фиксация продажи через Solana Pay:
  - Принимает `reference` pubkey (уникальный для каждой продажи)
  - Проверяет что транзакция Solana Pay с этим reference прошла
  - Вызывает treasury split
- [ ] **1.3.4** Инструкция `verify_ownership` — проверить что caller владеет cNFT машины
- [ ] **1.3.5** Инструкция `deactivate_machine` — только cNFT holder
- [ ] **1.3.6** Написать тесты (включая Solana Pay flow)
- [ ] **1.3.7** Задеплоить на Devnet

#### Программа 3.5 — Solana Pay интеграция (frontend ↔ машина):
- [ ] **1.3.8** Установить `@solana/pay`
- [ ] **1.3.9** Функция `generatePaymentQR(machineId, amount, reference)`:
  ```typescript
  import { createQR, encodeURL, TransactionRequestURLFields } from '@solana/pay'
  // QR содержит: recipient=machine_wallet, amount, reference, label
  ```
- [ ] **1.3.10** Функция `watchPayment(reference)` — polling Solana RPC пока не найдёт tx с reference
- [ ] **1.3.11** После подтверждения → вызов `process_sale` on-chain

#### Программа 4 — `vend_treasury`:
- [ ] **1.4.1** PDA: `TreasuryVault { total_collected, total_distributed }`
- [ ] **1.4.2** Инструкция `split_revenue(amount)`:
  - 70% → machine owner
  - 20% → staking pool (вызывает `distribute_rewards`)
  - 10% → burn (отправляем на null address)
- [ ] **1.4.3** Написать тесты (проверить точность сплита)
- [ ] **1.4.4** Задеплоить на Devnet

---

### ФАЗА 2 — Интеграция фронтенда с on-chain [~1-2 недели]
> Заменяем моковые данные на реальные on-chain данные.

#### Подготовка:
- [ ] **2.1** Скопировать IDL файлы из Anchor build в `app/idl/`
- [ ] **2.2** Установить пакеты: `npm install @coral-xyz/anchor @solana/spl-token`
- [ ] **2.3** Создать `lib/programs.ts` — хук `useProgram()` с provider + IDL

#### Страница STAKING (`/staking`):
- [ ] **2.4** Читать `StakingPool` PDA → показывать реальный TVL, APY
- [ ] **2.5** Читать `UserStake` PDA → показывать баланс пользователя
- [ ] **2.6** Кнопка Stake → реальная транзакция `stake(amount)`
- [ ] **2.7** Кнопка Unstake → реальная транзакция `unstake(amount)` + таймер lockup
- [ ] **2.8** Кнопка Claim → реальная транзакция `claim_rewards`

#### Страница MACHINES (`/machines`):
- [ ] **2.9** Загружать список машин через `getProgramAccounts` (фильтр по discriminator)
- [ ] **2.10** Показывать реальный `total_revenue`, `is_active` из on-chain
- [ ] **2.11** Кнопка Register Machine → транзакция `register_machine`

#### Страница PROFILE (`/profile`):
- [ ] **2.12** Реальный баланс VEND через `getTokenAccountBalance`
- [ ] **2.13** Реальный баланс SOL через `getBalance`
- [ ] **2.14** Реальный стейк из `UserStake` PDA

#### Страница TRADE (`/trade`):
- [ ] **2.15** Подключить Pyth Network через CPI для SOL/USD цены:
  ```typescript
  import { PythHttpClient, getPythClusterApiUrl } from '@pythnetwork/client'
  // SOL/USD feed: 0xef0d8b6fda... (Devnet)
  // Обновление каждые 400ms — быстрее любого EVM оракула
  ```
- [ ] **2.16** VEND/SOL цена — из on-chain liquidity pool (Orca/Raydium Devnet)
- [ ] **2.17** Реальная история транзакций через Helius Enhanced API
  ```typescript
  // Helius парсит Solana tx в human-readable формат
  GET https://api.helius.xyz/v0/addresses/{address}/transactions
  ```

---

### ФАЗА 3 — Off-chain сервисы [~1 неделя]
> Supabase для метаданных и Helius для webhooks.

#### Supabase setup:
- [ ] **3.1** Создать проект на supabase.com (бесплатно)
- [ ] **3.2** Таблица `machines`: `{ machine_id, name, location, lat, lng, image_url, on_chain_pubkey }`
- [ ] **3.3** Таблица `sales_events`: `{ machine_id, amount_sol, timestamp, tx_signature }`
- [ ] **3.4** Создать `lib/supabase.ts` клиент в Next.js

#### Helius webhooks:
- [ ] **3.5** Зарегистрировать webhook на Helius для адреса `vend_machine` программы
- [ ] **3.6** Создать Next.js API route: `app/api/webhook/helius/route.ts`
  - При событии `record_sale` → записывать в Supabase `sales_events`
- [ ] **3.7** Страница MACHINES: показывать реальные продажи из Supabase в реальном времени (Supabase Realtime)

#### Переменные окружения:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
HELIUS_API_KEY=
NEXT_PUBLIC_SOLANA_RPC=https://devnet.helius-rpc.com/?api-key=...
```

---

### ФАЗА 4 — Полировка и Mainnet [~1-2 недели]
> Только после того как всё работает на Devnet.

- [ ] **4.1** Security review смарт-контрактов (ручной аудит + Anchor security checks)
- [ ] **4.2** Stress test на Devnet (100+ транзакций)
- [ ] **4.3** Настроить мобильную адаптацию фронтенда (breakpoints)
- [ ] **4.4** Подготовить токеномику (сколько VEND, distribution schedule)
- [ ] **4.5** Создать Mainnet wallet (hardware wallet рекомендуется)
- [ ] **4.6** Задеплоить программы на Mainnet-beta
- [ ] **4.7** Обновить RPC URL на Mainnet в Vercel env
- [ ] **4.8** Мониторинг: настроить Helius alerts

---

## Порядок выполнения (строгий)

```
ФАЗА 0          ФАЗА 1                    ФАЗА 2            ФАЗА 3      ФАЗА 4
Vercel ──►  Смарт-контракты  ──►  On-chain интеграция ──► Supabase ──► Mainnet
деплой      (localnet → devnet)   (replace mock data)     webhooks     launch
[сейчас]    [следующий шаг]       [после контрактов]      [параллель]  [конец]
```

**Почему именно такой порядок:**
1. Vercel сначала — чтобы иметь живой URL для демо в любой момент
2. Смарт-контракты до интеграции — нельзя интегрировать то, чего нет
3. Интеграция до Supabase — on-chain данные важнее off-chain метаданных
4. Mainnet последний — нельзя деплоить непроверенные программы с реальными деньгами

---

## Команды быстрого старта (шпаргалка)

```bash
# Проверить версии (после установки)
rustc --version          # должно быть 1.81.0
solana --version         # должно быть 2.1.x
anchor --version         # должно быть 0.32.x

# Запустить локальный валидатор
solana-test-validator

# Сборка контрактов
cd vendchain-contracts
anchor build

# Тесты
anchor test

# Деплой на Devnet
anchor deploy --provider.cluster devnet

# Фронтенд локально
npm run dev

# Деплой фронтенда
vercel --prod
```

---

## Что НЕ делать

- ❌ Не деплоить на Mainnet до полного тестирования на Devnet
- ❌ Не хранить приватные ключи в коде или `.env` файлах в репо
- ❌ Не делать `git add .` без проверки `git status` (был прецедент с `.next/`)
- ❌ Не менять IDL после деплоя без миграции (breaking change)
- ❌ Не начинать интеграцию фронтенда до стабильного IDL контрактов

---

*Документ обновляется по мере прогресса. При начале новой фазы — отметить предыдущую как завершённую.*

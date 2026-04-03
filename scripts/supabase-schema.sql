-- Таблица с метаданными машин (дополняет on-chain данные)
create table if not exists machines (
  machine_id   text primary key,          -- "VC-9928" — совпадает с on-chain ID
  image_url    text,                       -- URL фото машины
  daily_avg    numeric default 0,         -- средний дневной доход ($)
  today        numeric default 0,         -- доход сегодня ($)
  uptime       numeric default 99.9,      -- uptime в %
  week_revenue numeric[] default '{0,0,0,0,0,0,0}',  -- выручка за 7 дней
  top_products jsonb default '[]',        -- [{"name":"...", "revenue": 0}]
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Включаем Row Level Security (читать может кто угодно)
alter table machines enable row level security;

create policy "Public read" on machines
  for select using (true);

create policy "Service write" on machines
  for all using (auth.role() = 'service_role');

-- Заполняем данными
insert into machines (machine_id, daily_avg, today, uptime, week_revenue, top_products) values
(
  'VC-9928', 1420, 412.50, 99.98,
  '{145,162,178,155,190,210,195}',
  '[{"name":"Bio-Fuel Cell (L)","revenue":145.00},{"name":"Nano-Filter Pack","revenue":88.20},{"name":"Synthetic Protein","revenue":62.50}]'
),
(
  'VC-1042', 890, 0, 87.20,
  '{98,112,134,120,0,0,0}',
  '[{"name":"Energy Drink XL","revenue":0},{"name":"Protein Bar","revenue":0},{"name":"Vitamin Water","revenue":0}]'
),
(
  'VC-8831', 2100, 644.10, 99.71,
  '{198,210,185,220,235,208,195}',
  '[{"name":"Premium Coffee","revenue":210.00},{"name":"Protein Shake","revenue":178.50},{"name":"Energy Bar","revenue":124.00}]'
),
(
  'VC-2210', 1200, 212.00, 99.95,
  '{110,125,140,135,150,142,138}',
  '[{"name":"Coconut Water","revenue":88.00},{"name":"Green Tea","revenue":72.00},{"name":"Vitamin Pack","revenue":52.00}]'
),
(
  'VC-5501', 680, 198.40, 98.44,
  '{88,92,78,105,115,98,102}',
  '[{"name":"Shaibara Juice","revenue":72.00},{"name":"Snickers","revenue":55.80},{"name":"Lipton Ice Tea","revenue":48.20}]'
),
(
  'VC-3317', 1850, 524.20, 99.90,
  '{185,210,195,220,240,215,200}',
  '[{"name":"Gold Espresso","revenue":195.00},{"name":"Premium Water","revenue":145.00},{"name":"Date Bar","revenue":98.00}]'
)
on conflict (machine_id) do nothing;

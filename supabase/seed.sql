-- =============================================================
-- Datos de ejemplo: establecimientos repartidos por España
-- Ejecutar tras las migraciones. created_by queda en null
-- (los ejemplos no pertenecen a ningún usuario concreto).
-- =============================================================

insert into public.restaurants
  (id, name, type, address, postal_code, municipio, provincia_id, latitude, longitude,
   phone, website, schedule, avg_price, rating, personal_comment, observations,
   visit_date, would_return, is_favorite)
values
  ('a1000000-0000-4000-8000-000000000001', 'Casa Botín', 'restaurante',
   'Calle Cuchilleros, 17', '28005', 'Madrid', 28, 40.4141, -3.7086,
   '+34 913 66 42 17', 'https://botin.es', 'L-D 13:00-16:00 y 20:00-23:30',
   45.00, 5, 'El restaurante más antiguo del mundo según el Guinness. El cochinillo es espectacular.',
   'Reservar con antelación, siempre está lleno.', '2025-11-15', true, true),

  ('a1000000-0000-4000-8000-000000000002', 'El Rinconcillo', 'taberna',
   'Calle Gerona, 40', '41003', 'Sevilla', 41, 37.3944, -5.9903,
   '+34 954 22 31 83', 'https://elrinconcillo.es', 'L-D 13:00-01:30',
   20.00, 4, 'La taberna más antigua de Sevilla (1670). Espinacas con garbanzos de otro nivel.',
   'Las cuentas se apuntan con tiza en la barra.', '2025-09-20', true, true),

  ('a1000000-0000-4000-8000-000000000003', 'La Cuchara de San Telmo', 'bar',
   'Calle 31 de Agosto, 28', '20003', 'Donostia-San Sebastián', 20, 43.3243, -1.9843,
   '+34 943 44 16 55', null, 'M-D 12:30-15:30 y 19:30-23:00',
   25.00, 5, 'Pintxos de autor increíbles. El carrillera de ternera al vino tinto es obligatorio.',
   'No admite reservas, llegar pronto.', '2025-08-10', true, true),

  ('a1000000-0000-4000-8000-000000000004', 'Casa Gerardo', 'restaurante',
   'Carretera AS-19, km 9', '33438', 'Prendes', 33, 43.5644, -5.7433,
   '+34 985 88 77 97', 'https://restaurantecasagerardo.es', 'X-D 13:30-15:30',
   90.00, 5, 'Una estrella Michelin. La mejor fabada de Asturias, sin discusión.',
   'Merece la pena el desvío. Menú degustación recomendado.', '2025-07-05', true, false),

  ('a1000000-0000-4000-8000-000000000005', 'Bodega La Palma', 'bar',
   'Carrer dels Templers, 6', '08002', 'Barcelona', 8, 41.3819, 2.1789,
   null, null, 'L-S 12:00-16:00 y 19:00-23:00',
   18.00, 4, 'Bodega centenaria en el Barrio Gótico. Vermut casero y conservas de calidad.',
   null, '2025-06-12', true, false),

  ('a1000000-0000-4000-8000-000000000006', 'Chiringuito Ayo', 'chiringuito',
   'Playa de Burriana', '29780', 'Nerja', 29, 36.7423, -3.8672,
   '+34 952 52 22 89', 'https://ayonerja.com', 'L-D 12:00-17:00',
   15.00, 4, 'Paella gigante hecha a leña en la playa. Repetir plato es gratis.',
   'Icónico de la serie Verano Azul.', '2025-08-25', true, false),

  ('a1000000-0000-4000-8000-000000000007', 'O Fragón', 'restaurante',
   'Rúa San Roque, 74', '15155', 'Fisterra', 15, 42.9092, -9.2648,
   '+34 981 74 04 29', null, 'M-D 13:00-16:00 y 20:00-23:00',
   35.00, 4, 'Pescado del día en el fin del mundo. Vistas espectaculares a la ría.',
   'El percebe en temporada es imprescindible.', '2025-05-18', true, false),

  ('a1000000-0000-4000-8000-000000000008', 'Café Iruña', 'cafeteria',
   'Plaza del Castillo, 44', '31001', 'Pamplona', 31, 42.8172, -1.6432,
   '+34 948 22 20 64', 'https://cafeiruna.com', 'L-D 08:00-23:00',
   12.00, 4, 'El café favorito de Hemingway. Interior modernista precioso de 1888.',
   'Perfecto para desayunar antes de recorrer el casco viejo.', '2025-07-07', true, false),

  ('a1000000-0000-4000-8000-000000000009', 'Casa Montaña', 'taberna',
   'Carrer de Josep Benlliure, 69', '46011', 'Valencia', 46, 39.4652, -0.3312,
   '+34 963 67 23 14', 'https://emilianobodega.com', 'L-D 13:00-16:00 y 20:00-23:30',
   30.00, 5, 'Bodega de 1836 en el Cabanyal. Los michirones y el esgarraet, brutales.',
   'Carta de vinos enorme.', '2025-10-02', true, true),

  ('a1000000-0000-4000-8000-000000000010', 'El Fogón Sefardí', 'restaurante',
   'Calle Judería Vieja, 17', '40001', 'Segovia', 40, 40.9481, -4.1258,
   '+34 921 46 62 50', 'https://lacasamudejar.com', 'L-D 13:00-16:00 y 20:00-23:00',
   35.00, 4, 'Cocina sefardí y el cochinillo segoviano clásico en la judería.',
   null, '2025-04-22', true, false)
on conflict (id) do nothing;

insert into public.favorite_dishes (restaurant_id, name, position) values
  ('a1000000-0000-4000-8000-000000000001', 'Cochinillo asado', 0),
  ('a1000000-0000-4000-8000-000000000001', 'Cordero lechal', 1),
  ('a1000000-0000-4000-8000-000000000001', 'Sopa castellana', 2),
  ('a1000000-0000-4000-8000-000000000002', 'Espinacas con garbanzos', 0),
  ('a1000000-0000-4000-8000-000000000002', 'Carrillada ibérica', 1),
  ('a1000000-0000-4000-8000-000000000002', 'Bacalao con tomate', 2),
  ('a1000000-0000-4000-8000-000000000003', 'Carrillera al vino tinto', 0),
  ('a1000000-0000-4000-8000-000000000003', 'Foie a la plancha', 1),
  ('a1000000-0000-4000-8000-000000000003', 'Pulpo a la brasa', 2),
  ('a1000000-0000-4000-8000-000000000004', 'Fabada asturiana', 0),
  ('a1000000-0000-4000-8000-000000000004', 'Arroz con leche requemado', 1),
  ('a1000000-0000-4000-8000-000000000005', 'Vermut casero', 0),
  ('a1000000-0000-4000-8000-000000000005', 'Boquerones en vinagre', 1),
  ('a1000000-0000-4000-8000-000000000006', 'Paella a la leña', 0),
  ('a1000000-0000-4000-8000-000000000006', 'Espetos de sardinas', 1),
  ('a1000000-0000-4000-8000-000000000007', 'Percebes', 0),
  ('a1000000-0000-4000-8000-000000000007', 'Lubina salvaje', 1),
  ('a1000000-0000-4000-8000-000000000008', 'Café con leche', 0),
  ('a1000000-0000-4000-8000-000000000008', 'Tortilla de patatas', 1),
  ('a1000000-0000-4000-8000-000000000009', 'Michirones', 0),
  ('a1000000-0000-4000-8000-000000000009', 'Esgarraet', 1),
  ('a1000000-0000-4000-8000-000000000009', 'Anchoas 00', 2),
  ('a1000000-0000-4000-8000-000000000010', 'Cochinillo asado', 0),
  ('a1000000-0000-4000-8000-000000000010', 'Cordero al horno de leña', 1);

-- Los vídeos de YouTube se añaden desde la propia aplicación
-- (los enlaces de ejemplo caducan; mejor no sembrar URLs).

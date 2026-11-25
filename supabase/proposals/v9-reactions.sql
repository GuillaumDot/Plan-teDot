-- PlanèteDot V9 · validation côté serveur des réactions toutes prêtes
-- PROPOSITION, NON APPLIQUÉE. À appliquer seulement avec l'accord du fondateur, d'abord sur une branche Supabase de test.
-- Rien ici ne change la lecture des données : la V9 marche sans ce fichier (l'appli filtre déjà tout à la lecture).
-- Ce que ça ajoute : le serveur refuse une réaction hors de la liste fermée, un texte libre accroché à une réaction,
-- et un champ public « rx » mal formé dans un instantané de galaxie.

create or replace function public.pd_v9_presets() returns text[] language sql immutable as $$
  select array['b1','b2','b3','b4','b5','b6','b7','b8','b9','b10','b11','b12',
               'e1','e2','e3','e4','e5','e6','e7','e8','e9','e10','e11','e12']
$$;
create or replace function public.pd_v9_shares() returns text[] language sql immutable as $$
  select array['s1','s2','s3','s4']
$$;

-- 1) transmissions : une ligne V9 (payload.v = 9) ne porte jamais de texte libre
create or replace function public.pd_v9_check_transmission() returns trigger language plpgsql as $$
declare p jsonb := coalesce(new.payload, '{}'::jsonb);
begin
  if pg_column_size(p) > 4000 then raise exception 'Transmission trop longue'; end if;
  if coalesce(p->>'v', '') <> '9' then return new; end if;
  if coalesce(p->>'msg', '') <> '' then raise exception 'Pas de texte libre sur une réaction'; end if;
  if p ? 'react' and not ((p->>'react') = any(public.pd_v9_presets())) then raise exception 'Réaction inconnue'; end if;
  if p ? 'share' and not ((p->>'share') = any(public.pd_v9_shares())) then raise exception 'Message inconnu'; end if;
  if p ? 'like' and (length(coalesce(p->>'like', '')) = 0 or length(p->>'like') > 64 or length(coalesce(p->>'lx', '')) > 80) then raise exception 'J''aime invalide'; end if;
  if not (p ? 'react' or p ? 'share' or p ? 'like') then raise exception 'Transmission V9 incomplète'; end if;
  return new;
end $$;
drop trigger if exists pd_v9_check_transmission on public.galaxy_transmissions;
create trigger pd_v9_check_transmission before insert on public.galaxy_transmissions
  for each row execute function public.pd_v9_check_transmission();

-- 2) instantané public : le champ rx (réactions envoyées) reste court et dans la liste fermée
create or replace function public.pd_v9_check_galaxy() returns trigger language plpgsql as $$
declare rx jsonb := new.system->'rx'; e jsonb;
begin
  if rx is null or jsonb_typeof(rx) = 'null' then return new; end if;
  if jsonb_typeof(rx) <> 'array' or jsonb_array_length(rx) > 40 then raise exception 'Réactions publiques invalides'; end if;
  for e in select * from jsonb_array_elements(rx) loop
    if jsonb_typeof(e) <> 'object' or not ((e->>'r') = any(public.pd_v9_presets())) or length(coalesce(e->>'z', '')) > 141 then
      raise exception 'Réaction publique invalide'; end if;
  end loop;
  return new;
end $$;
drop trigger if exists pd_v9_check_galaxy on public.public_galaxies;
create trigger pd_v9_check_galaxy before insert or update on public.public_galaxies
  for each row execute function public.pd_v9_check_galaxy();

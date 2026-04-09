-- 015: PostGIS geo-search function for coaches
-- Used by searchCoaches() when lat/lng filters are provided.

create or replace function public.search_coaches_geo(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_sport text default null,
  p_level text default null,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_min_rating numeric default null,
  p_sort_by text default 'relevance',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  "userId" uuid,
  bio text,
  specialties text[],
  certifications jsonb,
  "hourlyRate" numeric,
  lat double precision,
  lng double precision,
  radius integer,
  "acceptsAnonymousReviews" boolean,
  "isVerified" boolean,
  "avgRating" numeric,
  "totalSessions" integer,
  "firstName" text,
  "lastName" text,
  "avatarUrl" text,
  city text,
  "distanceKm" double precision
)
language plpgsql stable
as $$
begin
  return query
  select
    cp.id,
    cp.user_id as "userId",
    cp.bio,
    cp.specialties,
    cp.certifications,
    cp.hourly_rate as "hourlyRate",
    cp.lat,
    cp.lng,
    cp.radius,
    cp.accepts_anonymous_reviews as "acceptsAnonymousReviews",
    cp.is_verified as "isVerified",
    cp.avg_rating as "avgRating",
    cp.total_sessions as "totalSessions",
    coalesce(p.first_name, '') as "firstName",
    coalesce(p.last_name, '') as "lastName",
    p.avatar_url as "avatarUrl",
    p.city,
    round(
      (ST_Distance(
        ST_SetSRID(ST_MakePoint(cp.lng, cp.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) / 1000)::numeric, 1
    )::double precision as "distanceKm"
  from public.coach_profiles cp
  inner join public.profiles p on p.id = cp.user_id
  where
    cp.lat is not null
    and cp.lng is not null
    and ST_DWithin(
      ST_SetSRID(ST_MakePoint(cp.lng, cp.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
    and (p_sport is null or p_sport = any(cp.specialties))
    and (p_price_min is null or cp.hourly_rate >= p_price_min)
    and (p_price_max is null or cp.hourly_rate <= p_price_max)
    and (p_min_rating is null or cp.avg_rating >= p_min_rating)
  order by
    case when p_sort_by = 'distance' then
      ST_Distance(
        ST_SetSRID(ST_MakePoint(cp.lng, cp.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      )
    end asc nulls last,
    case when p_sort_by = 'price_asc' then cp.hourly_rate end asc nulls last,
    case when p_sort_by = 'price_desc' then cp.hourly_rate end desc nulls last,
    case when p_sort_by = 'rating' then cp.avg_rating end desc nulls last,
    case when p_sort_by = 'relevance' or p_sort_by is null then cp.total_sessions end desc nulls last
  limit p_limit
  offset p_offset;
end;
$$;

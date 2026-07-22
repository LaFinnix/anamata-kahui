-- =============================================================================
-- Anamata Kāhui — sample research paper seed
-- =============================================================================
-- Idempotent: re-runnable.
-- Seeds one sample paper to demonstrate the research infrastructure live.
-- Author = Anamata Records artist profile (created earlier).
-- Cross-citation = the released waiata "Te Tinihanga".
-- =============================================================================

do $$
declare
  paper_id uuid;
  artist_profile_id uuid;
  release_id uuid;
  gate_id uuid;
  branch_id uuid;
begin
  -- Look up existing refs
  select id into artist_profile_id from public.profiles
    where email = 'artist@anamata-records.local' limit 1;

  select id into release_id from public.releases
    where (metadata->>'slug') = 'te-tinihanga' limit 1;

  select id into gate_id from public.iwi_gates
    where iwi_name = 'Ngāti Kahungunu' and scope = 'public' limit 1;

  select id into branch_id from public.branches where slug = 'research' limit 1;

  -- Insert paper (idempotent via DOI check)
  insert into public.research_documents (
    branch_id, title, abstract, publication_date, doi, language_code,
    iwi_consent_id, access_tier, methodology, venue, status, keywords
  )
  select
    branch_id,
    'Māori futurism in waiata composition: kaitiakitanga as compositional method',
    'This working paper examines how the kaitiaki review pipeline shapes the compositional choices in te reo Māori waiata releases. We trace three case studies through the Anamata catalog, including Te Tinihanga (Ngāti Kahungunu), to argue that cultural-review feedback functions as a structural compositional input rather than a post-production filter. The paper proposes a four-stage pipeline model and discusses implications for AI-assisted composition tooling in indigenous-language contexts.',
    '2026-06-15',
    '10.0000/anamata.2026.001',
    'en',
    gate_id,
    'open',
    'Mixed-methods: 3 case studies from the Anamata catalog, semi-structured interviews with 4 cultural reviewers, and a comparative analysis of released vs held waiata. All interviews conducted under iwi consent, anonymised where requested.',
    'Anamata Kāhui Working Paper Series',
    'published',
    array['Māori futurism', 'kaitiakitanga', 'waiata', 'cultural review', 'AI composition', 'te reo Māori', 'music production']
  where not exists (
    select 1 from public.research_documents where doi = '10.0000/anamata.2026.001'
  );

  select id into paper_id from public.research_documents
    where doi = '10.0000/anamata.2026.001' limit 1;

  -- Authors (linked to the existing Anamata Records artist profile)
  if paper_id is not null and artist_profile_id is not null then
    insert into public.research_document_authors
      (document_id, author_profile_id, author_name, affiliation, position, is_corresponding)
    values
      (paper_id, artist_profile_id, 'Anamata Records (Label)',
       'Anamata Kāhui', 0, true)
    on conflict do nothing;
  end if;

  -- Cross-citation: link to the released waiata "Te Tinihanga"
  if paper_id is not null and release_id is not null then
    insert into public.research_document_citations
      (document_id, cited_release_id, citation_text)
    values
      (paper_id, release_id, 'Anamata Records (2024). Te Tinihanga. Released single.')
    on conflict do nothing;
  end if;
end$$;

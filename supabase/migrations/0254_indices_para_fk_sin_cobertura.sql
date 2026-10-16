-- ============================================================================
-- 0254 — N-3 (auditoría 16 oct): 50 claves foráneas sin índice de cobertura.
-- A escala, los joins por esas FK y las verificaciones de borrado en cascada
-- hacen scans secuenciales. Se añade un índice por cada FK descubierta. Todos
-- idempotentes (create index if not exists). Generados del catálogo, no a mano.
-- ============================================================================
create index if not exists idx_admin_messages_recipient_id on admin_messages (recipient_id);
create index if not exists idx_admin_messages_sender_id on admin_messages (sender_id);
create index if not exists idx_alliance_credits_source_user_id on alliance_credits (source_user_id);
create index if not exists idx_analytics_events_user_id on analytics_events (user_id);
create index if not exists idx_appointment_reminders_appointment_id on appointment_reminders (appointment_id);
create index if not exists idx_appointment_requests_calendar_entry_id on appointment_requests (calendar_entry_id);
create index if not exists idx_calendar_entries_source_event_id on calendar_entries (source_event_id);
create index if not exists idx_catalog_suggestions_user_id on catalog_suggestions (user_id);
create index if not exists idx_clinical_entries_author_id on clinical_entries (author_id);
create index if not exists idx_clinical_messages_sender_id on clinical_messages (sender_id);
create index if not exists idx_clinical_messages_provider_id on clinical_messages (provider_id);
create index if not exists idx_content_comments_user_id on content_comments (user_id);
create index if not exists idx_content_ratings_user_id on content_ratings (user_id);
create index if not exists idx_content_views_user_id on content_views (user_id);
create index if not exists idx_directorio_publicacion_forzada_por on directorio (publicacion_forzada_por);
create index if not exists idx_discount_transactions_scanned_by on discount_transactions (scanned_by);
create index if not exists idx_events_revisada_por on events (revisada_por);
create index if not exists idx_expert_questions_user_id on expert_questions (user_id);
create index if not exists idx_expert_questions_resuelta_por on expert_questions (resuelta_por);
create index if not exists idx_founder_requests_resuelta_por on founder_requests (resuelta_por);
create index if not exists idx_home_tasks_provider_id on home_tasks (provider_id);
create index if not exists idx_improvement_suggestions_user_id on improvement_suggestions (user_id);
create index if not exists idx_lesson_completions_lesson_id on lesson_completions (lesson_id);
create index if not exists idx_orders_product_id on orders (product_id);
create index if not exists idx_parent_list_items_provider_id on parent_list_items (provider_id);
create index if not exists idx_prescription_items_product_id on prescription_items (product_id);
create index if not exists idx_product_reviews_reviewer_id on product_reviews (reviewer_id);
create index if not exists idx_profile_events_viewer_id on profile_events (viewer_id);
create index if not exists idx_profiles_fundador_autorizado_por on profiles (fundador_autorizado_por);
create index if not exists idx_promo_redemptions_code on promo_redemptions (code);
create index if not exists idx_provider_categories_category_id on provider_categories (category_id);
create index if not exists idx_raffle_tickets_ref_id on raffle_tickets (ref_id);
create index if not exists idx_raffle_winners_user_id on raffle_winners (user_id);
create index if not exists idx_search_alerts_category_id on search_alerts (category_id);
create index if not exists idx_secure_file_keys_recipient_id on secure_file_keys (recipient_id);
create index if not exists idx_secure_files_owner_id on secure_files (owner_id);
create index if not exists idx_tribe_event_rsvps_user_id on tribe_event_rsvps (user_id);
create index if not exists idx_tribe_event_sensory_reviewer_id on tribe_event_sensory (reviewer_id);
create index if not exists idx_tribe_events_creator_id on tribe_events (creator_id);
create index if not exists idx_tribe_forum_invites_invitee_id on tribe_forum_invites (invitee_id);
create index if not exists idx_tribe_forum_invites_inviter_id on tribe_forum_invites (inviter_id);
create index if not exists idx_tribe_forum_members_user_id on tribe_forum_members (user_id);
create index if not exists idx_tribe_forum_moderators_user_id on tribe_forum_moderators (user_id);
create index if not exists idx_tribe_forums_creator_id on tribe_forums (creator_id);
create index if not exists idx_tribe_gratitude_forum_id on tribe_gratitude (forum_id);
create index if not exists idx_tribe_mentor_messages_author_id on tribe_mentor_messages (author_id);
create index if not exists idx_tribe_mentorships_mentee_id on tribe_mentorships (mentee_id);
create index if not exists idx_tribe_messages_author_id on tribe_messages (author_id);
create index if not exists idx_tribe_mod_ratings_rater_id on tribe_mod_ratings (rater_id);
create index if not exists idx_waitlist_patient_id on waitlist (patient_id);

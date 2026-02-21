// src/stores/BrandKitStore.js

import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { BRAND_KIT_STATUS, ASSET_STATUS } from '../constants/statusEnums';

const useBrandKitStore = create((set, get) => ({
  // ── State
  brandKit:        null,   // raw brand_kit row from DB
  assets:          [],     // brand_assets rows
  isLoading:       false,
  loadingUserId:   null,
  loadedUserId:    null,
  isSaving:        false,
  error:           null,

  // ── Derived
  status: BRAND_KIT_STATUS.MISSING,  // recalculated after load

  // ── Actions

  /**
   * Load the brand kit for the current user.
   * Creates a blank row if none exists (upsert pattern).
   */
  loadBrandKit: async (userId) => {
    const { isLoading, loadingUserId, loadedUserId, brandKit } = get();
    if (!userId) return;
    if (isLoading && loadingUserId === userId) return;
    if (loadedUserId === userId && brandKit?.user_id === userId) return;

    set({ isLoading: true, error: null, loadingUserId: userId });
    try {
      const { data: kit, error: kitErr } = await supabase
        .from('brand_kit')
        .upsert({ user_id: userId }, { onConflict: 'user_id' })
        .select('*')
        .single();

      if (kitErr) throw kitErr;

      const { data: assets, error: assetsErr } = await supabase
        .from('brand_assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (assetsErr) throw assetsErr;

      const status = deriveStatus(kit);

      set({
        brandKit: kit ?? null,
        assets: assets ?? [],
        status,
        isLoading: false,
        loadingUserId: null,
        loadedUserId: userId,
      });
    } catch (err) {
      const message = err?.message ?? 'Failed to load Brand Kit';
      const missingSchema =
        err?.code === 'PGRST205' ||
        err?.code === '42P01' ||
        err?.status === 404;

      set({
        error: missingSchema
          ? 'Brand Kit tables are missing in Supabase. Run the brand kit migration script.'
          : message,
        isLoading: false,
        loadingUserId: null,
        loadedUserId: missingSchema ? userId : get().loadedUserId,
        status: missingSchema ? BRAND_KIT_STATUS.MISSING : get().status,
      });
    }
  },

  /**
   * Upsert brand kit fields. Merges with existing data.
   */
  saveBrandKit: async (userId, fields) => {
    set({ isSaving: true, error: null });
    try {
      const { data, error } = await supabase
        .from('brand_kit')
        .upsert(
          { ...fields, user_id: userId, last_updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;

      const status = deriveStatus(data);
      set({ brandKit: data, status, isSaving: false, loadedUserId: userId });
      return data;
    } catch (err) {
      set({ error: err.message, isSaving: false });
      throw err;
    }
  },

  /**
   * Mark brand kit setup as completed.
   */
  markSetupComplete: async (userId) => {
    return get().saveBrandKit(userId, { setup_completed: true, setup_skipped: false });
  },

  /**
   * Skip setup (dismiss onboarding modal).
   */
  skipSetup: async (userId) => {
    return get().saveBrandKit(userId, { setup_skipped: true });
  },

  /**
   * Upload a brand asset file to Supabase Storage and insert DB record.
   */
  uploadAsset: async (userId, brandKitId, file, metadata = {}) => {
    const timestamp  = Date.now();
    const assetType  = metadata.asset_type ?? 'other';
    const storagePath = `${userId}/${assetType}/${timestamp}_${file.name}`;

    // Insert pending record
    const { data: assetRow, error: insertErr } = await supabase
      .from('brand_assets')
      .insert({
        user_id:         userId,
        brand_kit_id:    brandKitId,
        name:            metadata.name ?? file.name,
        asset_type:      assetType,
        file_name:       file.name,
        mime_type:       file.type,
        file_size_bytes: file.size,
        storage_path:    storagePath,
        status:          ASSET_STATUS.UPLOADING,
        description:     metadata.description ?? '',
        usage_hints:     metadata.usage_hints  ?? '',
        alt_text:        metadata.alt_text      ?? '',
        tags:            metadata.tags          ?? [],
        font_family:     metadata.font_family   ?? null,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Upload file
    const { error: uploadErr } = await supabase.storage
      .from('brand_assets')
      .upload(storagePath, file, { cacheControl: '3600', upsert: false });

    if (uploadErr) {
      await supabase.from('brand_assets').update({ status: ASSET_STATUS.FAILED }).eq('id', assetRow.id);
      throw uploadErr;
    }

    // Update status to ready
    const { data: updated } = await supabase
      .from('brand_assets')
      .update({ status: ASSET_STATUS.READY })
      .eq('id', assetRow.id)
      .select()
      .single();

    set(state => ({ assets: [updated, ...state.assets.filter(a => a.id !== updated.id)] }));
    return updated;
  },

  /**
   * Update asset metadata (name, description, usage_hints, alt_text, tags).
   */
  updateAsset: async (assetId, fields) => {
    const { data, error } = await supabase
      .from('brand_assets')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', assetId)
      .select()
      .single();

    if (error) throw error;
    set(state => ({ assets: state.assets.map(a => a.id === assetId ? data : a) }));
    return data;
  },

  /**
   * Delete an asset (DB row + storage file).
   */
  deleteAsset: async (assetId) => {
    const asset = get().assets.find(a => a.id === assetId);
    if (!asset) return;

    if (asset.storage_path) {
      await supabase.storage.from('brand_assets').remove([asset.storage_path]);
    }

    const { error } = await supabase.from('brand_assets').delete().eq('id', assetId);
    if (error) throw error;

    set(state => ({ assets: state.assets.filter(a => a.id !== assetId) }));
  },
}));

function deriveStatus(kit) {
  if (!kit) return BRAND_KIT_STATUS.MISSING;
  if (kit.setup_completed) return BRAND_KIT_STATUS.CONFIGURED;
  if (kit.brand_name)      return BRAND_KIT_STATUS.PARTIAL;
  return BRAND_KIT_STATUS.MISSING;
}

export default useBrandKitStore;

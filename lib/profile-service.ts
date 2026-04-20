import type { User } from '@supabase/supabase-js';

import { supabase } from './supabase';

const avatarBucket = process.env.EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET ?? 'avatars';

export type UserProfile = {
  avatarUrl: string | null;
  email: string;
  firstName: string;
  lastName: string;
};

type SaveUserProfileInput = {
  avatarUri: string | null;
  email: string;
  firstName: string;
  lastName: string;
  user: User;
};

function getFileExtension(uri: string) {
  const extension = uri.split('.').pop()?.toLowerCase();

  if (!extension || extension.includes('/')) {
    return 'jpg';
  }

  return extension;
}

function getContentTypeFromExtension(extension: string) {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'heic':
      return 'image/heic';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

async function uploadAvatar(userId: string, avatarUri: string) {
  if (!avatarUri.startsWith('file://')) {
    return avatarUri;
  }

  const extension = getFileExtension(avatarUri);
  const filePath = `${userId}/avatar.${extension}`;
  const contentType = getContentTypeFromExtension(extension);
  const arrayBuffer = await fetch(avatarUri).then((response) => response.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(avatarBucket)
    .upload(filePath, arrayBuffer, {
      cacheControl: '3600',
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(avatarBucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function getUserProfile(user: User) {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle<{
      avatar_url: string | null;
      email: string;
      first_name: string;
      last_name: string;
    }>();

  if (error) {
    throw error;
  }

  return {
    avatarUrl: data?.avatar_url ?? null,
    email: data?.email ?? user.email ?? '',
    firstName: data?.first_name ?? '',
    lastName: data?.last_name ?? '',
  } satisfies UserProfile;
}

export async function saveUserProfile({
  avatarUri,
  email,
  firstName,
  lastName,
  user,
}: SaveUserProfileInput) {
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const avatarUrl = avatarUri ? await uploadAvatar(user.id, avatarUri) : null;

  if (normalizedEmail && normalizedEmail !== (user.email ?? '').toLowerCase()) {
    const { error: authError } = await supabase.auth.updateUser({
      email: normalizedEmail,
    });

    if (authError) {
      throw authError;
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        avatar_url: avatarUrl,
        email: normalizedEmail,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        user_id: user.id,
      },
      { onConflict: 'user_id' }
    )
    .select('first_name, last_name, email, avatar_url')
    .single<{
      avatar_url: string | null;
      email: string;
      first_name: string;
      last_name: string;
    }>();

  if (error) {
    throw error;
  }

  return {
    avatarUrl: data.avatar_url,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
  } satisfies UserProfile;
}

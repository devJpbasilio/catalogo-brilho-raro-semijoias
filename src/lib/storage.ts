/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';
import { getStorageMode } from './db';

const BUCKET = 'images';

/** Converte uma data URL base64 em Blob para upload. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || 'image/jpeg';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Recebe uma imagem já comprimida (data URL base64) e, em modo NUVEM, faz o
 * upload para o Supabase Storage, retornando a URL pública. Nos demais casos
 * — modo local, entrada que já é URL externa/preset, ou falha de upload —
 * retorna a própria entrada. Assim, imagens base64 e URLs antigas continuam
 * funcionando (retrocompatível).
 */
export async function uploadImage(input: string, folder: 'products' | 'brand' = 'products'): Promise<string> {
  if (!input || !input.startsWith('data:image/')) return input; // URL externa/preset
  if (getStorageMode() !== 'cloud' || !supabase) return input;   // modo local -> mantém base64

  try {
    const blob = dataUrlToBlob(input);
    const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('Falha ao subir imagem para o Storage — mantendo base64:', e);
    return input; // fallback robusto: não perde a imagem
  }
}

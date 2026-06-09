import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

// Log only if missing to help debug production
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are missing in this build. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your hosting provider (Vercel/Netlify).");
}

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const uploadImage = async (base64: string, path: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check your environment variables.');
  }
  let blob: Blob;
  try {
    const res = await fetch(base64);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    blob = await res.blob();
  } catch (err: any) {
    console.error("Erro ao baixar imagem original:", err);
    throw new Error(`Falha ao baixar a imagem original (pode ser bloqueio de CORS ou limite de cota). Detalhe: ${err.message}`);
  }
  
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
  const fullPath = `${path}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('images')
    .upload(fullPath, blob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (error) {
    if (error.message.includes('bucket_not_found') || error.message.includes('Bucket not found')) {
      throw new Error('O bucket "images" não foi encontrado no seu Supabase. Por favor, crie um bucket chamado "images" com acesso público no painel do Supabase (Storage).');
    }
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(fullPath);

  return publicUrl;
};

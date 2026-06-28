const bunnyLibraryId = import.meta.env.VITE_BUNNY_STREAM_LIBRARY_ID?.trim() ?? '';
const bunnyCdnHostname = import.meta.env.VITE_BUNNY_STREAM_CDN_HOSTNAME?.trim() ?? '';

export const bunnyStreamConfig = {
  libraryId: bunnyLibraryId,
  cdnHostname: bunnyCdnHostname,
  enabled: Boolean(bunnyLibraryId),
};

export const getBunnyEmbedUrl = (videoId: string): string | null => {
  if (!bunnyStreamConfig.libraryId || !videoId) {
    return null;
  }

  return `https://iframe.mediadelivery.net/embed/${bunnyStreamConfig.libraryId}/${videoId}`;
};

export const getBunnyVideoPageUrl = (videoId: string): string | null => {
  if (!bunnyStreamConfig.cdnHostname || !videoId) {
    return null;
  }

  return `https://${bunnyStreamConfig.cdnHostname}/${videoId}`;
};
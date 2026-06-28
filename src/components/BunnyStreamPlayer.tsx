import { getBunnyEmbedUrl } from '../lib/bunny';

interface BunnyStreamPlayerProps {
  videoId: string;
  title: string;
}

const BunnyStreamPlayer = ({ videoId, title }: BunnyStreamPlayerProps): JSX.Element | null => {
  const embedUrl = getBunnyEmbedUrl(videoId);

  if (!embedUrl) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-beige bg-charcoal shadow-sm">
      <div className="aspect-video w-full">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default BunnyStreamPlayer;
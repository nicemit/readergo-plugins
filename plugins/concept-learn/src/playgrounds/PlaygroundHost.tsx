import type { PlaygroundSpec } from '../types';
import { CheckPlaygroundView } from './CheckPlayground';
import { MatrixPlaygroundView } from './MatrixPlayground';
import { SamplerPlaygroundView } from './SamplerPlayground';
import { ScenarioPlaygroundView } from './ScenarioPlayground';
import { TimelinePlaygroundView } from './TimelinePlayground';

export function PlaygroundHost({
  playground,
  onChange,
  onComplete,
}: {
  playground: PlaygroundSpec;
  onChange: (next: PlaygroundSpec) => void;
  onComplete: () => void;
}) {
  switch (playground.kind) {
    case 'scenario':
      return (
        <ScenarioPlaygroundView
          value={playground}
          onChange={onChange}
          onComplete={onComplete}
        />
      );
    case 'matrix':
      return (
        <MatrixPlaygroundView
          value={playground}
          onChange={onChange}
          onComplete={onComplete}
        />
      );
    case 'timeline':
      return (
        <TimelinePlaygroundView
          value={playground}
          onChange={onChange}
          onComplete={onComplete}
        />
      );
    case 'sampler':
      return (
        <SamplerPlaygroundView
          value={playground}
          onChange={onChange}
          onComplete={onComplete}
        />
      );
    case 'check':
      return (
        <CheckPlaygroundView
          value={playground}
          onChange={onChange}
          onComplete={onComplete}
        />
      );
    default:
      return (
        <p className="text-sm text-muted-foreground">Unknown playground kind.</p>
      );
  }
}

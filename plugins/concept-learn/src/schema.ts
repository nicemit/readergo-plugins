import type {
  CheckPlayground,
  ConceptData,
  ConceptNode,
  ConceptSeed,
  MatrixPlayground,
  PlaygroundSpec,
  SamplerPlayground,
  ScenarioPlayground,
  TimelinePlayground,
} from './types';

export function emptyConceptData(): ConceptData {
  return {
    version: 1,
    seed: null,
    map: { nodes: [] },
    activeNodeId: null,
    progress: { completedNodeIds: [] },
  };
}

export function createConceptDocument(): {
  type: 'concept';
  content: string;
  data: ConceptData;
} {
  const data = emptyConceptData();
  return {
    type: 'concept',
    content: conceptSummary(data),
    data,
  };
}

export function conceptSummary(data: ConceptData): string {
  const topic = data.seed?.topic?.trim() || 'Untitled concept';
  const lines = [`# ${topic}`, ''];
  if (data.seed?.raw?.trim()) {
    lines.push('Seed:', data.seed.raw.trim(), '');
  }
  for (const node of data.map.nodes) {
    lines.push(`## ${node.title}`);
    if (node.explainMd.trim()) lines.push(node.explainMd.trim());
    lines.push('');
  }
  return lines.join('\n').trim() || topic;
}

export function normalizeConceptData(raw: unknown): ConceptData {
  if (!raw || typeof raw !== 'object') return emptyConceptData();
  const obj = raw as Partial<ConceptData>;
  const seed = normalizeSeed(obj.seed);
  const nodes = Array.isArray(obj.map?.nodes)
    ? obj.map!.nodes.map(normalizeNode).filter(Boolean) as ConceptNode[]
    : [];
  const completed = Array.isArray(obj.progress?.completedNodeIds)
    ? obj.progress!.completedNodeIds.filter((id): id is string => typeof id === 'string')
    : [];
  let activeNodeId =
    typeof obj.activeNodeId === 'string' ? obj.activeNodeId : null;
  if (activeNodeId && !nodes.some((n) => n.id === activeNodeId)) {
    activeNodeId = nodes[0]?.id ?? null;
  }
  if (!activeNodeId && nodes.length > 0) activeNodeId = nodes[0].id;

  return {
    version: 1,
    seed,
    map: { nodes },
    activeNodeId,
    tutorThreadId:
      typeof obj.tutorThreadId === 'string' ? obj.tutorThreadId : undefined,
    progress: { completedNodeIds: completed },
    buildError: typeof obj.buildError === 'string' ? obj.buildError : undefined,
    building: Boolean(obj.building),
  };
}

function normalizeSeed(raw: unknown): ConceptSeed | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<ConceptSeed>;
  const topic = typeof s.topic === 'string' ? s.topic.trim() : '';
  if (!topic) return null;
  return {
    mode: s.mode === 'spark' ? 'spark' : 'topic',
    topic,
    raw: typeof s.raw === 'string' ? s.raw : undefined,
    sourceUrl: typeof s.sourceUrl === 'string' ? s.sourceUrl : undefined,
  };
}

function normalizeNode(raw: unknown): ConceptNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const n = raw as Partial<ConceptNode>;
  const id = typeof n.id === 'string' && n.id.trim() ? n.id.trim() : '';
  const title = typeof n.title === 'string' && n.title.trim() ? n.title.trim() : '';
  if (!id || !title) return null;
  const status =
    n.status === 'done' || n.status === 'locked' || n.status === 'ready'
      ? n.status
      : 'ready';
  return {
    id,
    title,
    status,
    explainMd: typeof n.explainMd === 'string' ? n.explainMd : '',
    playground: normalizePlayground(n.playground),
  };
}

function normalizePlayground(raw: unknown): PlaygroundSpec {
  if (!raw || typeof raw !== 'object') return defaultCheck('Warm-up');
  const kind = (raw as { kind?: string }).kind;
  switch (kind) {
    case 'scenario':
      return normalizeScenario(raw);
    case 'matrix':
      return normalizeMatrix(raw);
    case 'timeline':
      return normalizeTimeline(raw);
    case 'sampler':
      return normalizeSampler(raw);
    case 'check':
      return normalizeCheck(raw);
    default:
      return defaultCheck('Check your understanding');
  }
}

function normalizeScenario(raw: unknown): ScenarioPlayground {
  const s = raw as Partial<ScenarioPlayground>;
  const choices = Array.isArray(s.choices)
    ? s.choices
        .map((c, i) => {
          if (!c || typeof c !== 'object') return null;
          const id =
            typeof c.id === 'string' && c.id.trim() ? c.id.trim() : `c${i}`;
          const label = typeof c.label === 'string' ? c.label : `Choice ${i + 1}`;
          const outcome = typeof c.outcome === 'string' ? c.outcome : '';
          return {
            id,
            label,
            outcome,
            reveals: typeof c.reveals === 'string' ? c.reveals : undefined,
          };
        })
        .filter(Boolean) as ScenarioPlayground['choices']
    : [];
  return {
    kind: 'scenario',
    prompt: typeof s.prompt === 'string' ? s.prompt : 'What would you do?',
    choices:
      choices.length > 0
        ? choices
        : [
            {
              id: 'a',
              label: 'Option A',
              outcome: 'Try again after reading the explain panel.',
            },
          ],
    state: s.state && typeof s.state === 'object' ? { ...s.state } : {},
  };
}

function normalizeMatrix(raw: unknown): MatrixPlayground {
  const s = raw as Partial<MatrixPlayground>;
  const payoffs =
    Array.isArray(s.payoffs) && s.payoffs.length === 2
      ? (s.payoffs as MatrixPlayground['payoffs'])
      : [
          ['3,3', '0,5'],
          ['5,0', '1,1'],
        ];
  return {
    kind: 'matrix',
    rowLabels: Array.isArray(s.rowLabels)
      ? ([s.rowLabels[0] || 'Row A', s.rowLabels[1] || 'Row B'] as [string, string])
      : ['Player 1 Coop', 'Player 1 Defect'],
    colLabels: Array.isArray(s.colLabels)
      ? ([s.colLabels[0] || 'Col A', s.colLabels[1] || 'Col B'] as [string, string])
      : ['Player 2 Coop', 'Player 2 Defect'],
    payoffs,
    hint: typeof s.hint === 'string' ? s.hint : undefined,
    state: s.state && typeof s.state === 'object' ? { ...s.state } : {},
  };
}

function normalizeTimeline(raw: unknown): TimelinePlayground {
  const s = raw as Partial<TimelinePlayground>;
  const events = Array.isArray(s.events)
    ? s.events
        .map((e, i) => {
          if (!e || typeof e !== 'object') return null;
          return {
            id:
              typeof e.id === 'string' && e.id.trim()
                ? e.id.trim()
                : `e${i}`,
            year: typeof e.year === 'string' ? e.year : String(i + 1),
            title: typeof e.title === 'string' ? e.title : `Event ${i + 1}`,
            blurb: typeof e.blurb === 'string' ? e.blurb : '',
          };
        })
        .filter(Boolean) as TimelinePlayground['events']
    : [];
  return {
    kind: 'timeline',
    events:
      events.length > 0
        ? events
        : [
            {
              id: 'e0',
              year: '…',
              title: 'Placeholder',
              blurb: 'Timeline will fill after generation.',
            },
          ],
    state: s.state && typeof s.state === 'object' ? { ...s.state } : {},
  };
}

function normalizeSampler(raw: unknown): SamplerPlayground {
  const s = raw as Partial<SamplerPlayground>;
  const p =
    typeof s.probability === 'number' && s.probability >= 0 && s.probability <= 1
      ? s.probability
      : 0.5;
  return {
    kind: 'sampler',
    label: typeof s.label === 'string' ? s.label : 'Success chance',
    probability: p,
    trialsSuggested:
      typeof s.trialsSuggested === 'number' && s.trialsSuggested > 0
        ? Math.floor(s.trialsSuggested)
        : 20,
    state:
      s.state && typeof s.state === 'object'
        ? {
            trials: Number(s.state.trials) || 0,
            successes: Number(s.state.successes) || 0,
          }
        : { trials: 0, successes: 0 },
  };
}

function normalizeCheck(raw: unknown): CheckPlayground {
  const s = raw as Partial<CheckPlayground>;
  const questions = Array.isArray(s.questions)
    ? s.questions
        .map((q, i) => {
          if (!q || typeof q !== 'object') return null;
          const options = Array.isArray(q.options)
            ? q.options.map((o) => String(o))
            : ['Yes', 'No'];
          return {
            id:
              typeof q.id === 'string' && q.id.trim()
                ? q.id.trim()
                : `q${i}`,
            prompt: typeof q.prompt === 'string' ? q.prompt : `Question ${i + 1}`,
            options: options.length >= 2 ? options : ['Yes', 'No'],
            correctIndex:
              typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation:
              typeof q.explanation === 'string' ? q.explanation : '',
          };
        })
        .filter(Boolean) as CheckPlayground['questions']
    : [];
  return {
    kind: 'check',
    questions:
      questions.length > 0
        ? questions
        : [
            {
              id: 'q0',
              prompt: 'Ready to continue?',
              options: ['Yes', 'Not yet'],
              correctIndex: 0,
              explanation: 'Mark the node done when it clicks.',
            },
          ],
    state:
      s.state && typeof s.state === 'object'
        ? { answers: { ...(s.state.answers || {}) } }
        : { answers: {} },
  };
}

function defaultCheck(prompt: string): CheckPlayground {
  return {
    kind: 'check',
    questions: [
      {
        id: 'q0',
        prompt,
        options: ['Got it', 'Need another pass'],
        correctIndex: 0,
        explanation: 'Use the tutor if anything is still fuzzy.',
      },
    ],
    state: { answers: {} },
  };
}

/** Offline / fallback curriculum when AI is unavailable. */
export function localFallbackPlan(seed: ConceptSeed): ConceptData {
  const topic = seed.topic;
  const nodes: ConceptNode[] = [
    {
      id: 'n1',
      title: `What is ${topic}?`,
      status: 'ready',
      explainMd: `A short orientation for **${topic}**. Use the playground, then ask the tutor one clarifying question.`,
      playground: {
        kind: 'check',
        questions: [
          {
            id: 'q1',
            prompt: `Which best matches a first-pass goal for learning ${topic}?`,
            options: [
              'Name the core idea in your own words',
              'Memorize every term before reading',
              'Skip examples entirely',
            ],
            correctIndex: 0,
            explanation: 'Being able to restate the idea is the first checkpoint.',
          },
        ],
        state: { answers: {} },
      },
    },
    {
      id: 'n2',
      title: 'A concrete example',
      status: 'ready',
      explainMd:
        seed.raw?.trim()
          ? `Your spark:\n\n> ${seed.raw.trim().slice(0, 400)}\n\nTurn that into a worked example for ${topic}.`
          : `Pick one everyday situation where ${topic} shows up. The scenario playground forces a choice.`,
      playground: {
        kind: 'scenario',
        prompt: `You notice ${topic} in daily life. What do you do first?`,
        choices: [
          {
            id: 'observe',
            label: 'Name the pattern out loud',
            outcome: 'Good. Naming the pattern is how concepts stick.',
            reveals: 'Labeling',
          },
          {
            id: 'ignore',
            label: 'Scroll past and hope it sticks later',
            outcome: 'Weak encoding. Concepts need an active move.',
          },
        ],
        state: {},
      },
    },
    {
      id: 'n3',
      title: 'Check yourself',
      status: 'ready',
      explainMd: `Close the loop: can you teach one piece of ${topic} to someone else in two sentences?`,
      playground: defaultCheck(`Can you explain one piece of ${topic} simply?`),
    },
  ];
  return {
    version: 1,
    seed,
    map: { nodes },
    activeNodeId: nodes[0].id,
    progress: { completedNodeIds: [] },
  };
}

export function markNodeDone(data: ConceptData, nodeId: string): ConceptData {
  const completed = new Set(data.progress.completedNodeIds);
  completed.add(nodeId);
  const nodes = data.map.nodes.map((n) =>
    n.id === nodeId ? { ...n, status: 'done' as const } : n,
  );
  return {
    ...data,
    map: { nodes },
    progress: { completedNodeIds: [...completed] },
  };
}

export function updateNodePlayground(
  data: ConceptData,
  nodeId: string,
  playground: PlaygroundSpec,
): ConceptData {
  return {
    ...data,
    map: {
      nodes: data.map.nodes.map((n) =>
        n.id === nodeId ? { ...n, playground } : n,
      ),
    },
  };
}

// G.L.U.E. Constants — version, namespaces, well-known capabilities

export const GLUE_VERSION = '0.1.0';
export const GLUE_NAMESPACE = 'glue';
export const GLUE_API_VERSION = 'glue/v1';

export const GLUE_AGENT_PREFIX = 'glue:agent:';

// Lifecycle progression (order matters for trust advancement)
export const LIFECYCLE_PROGRESSION = [
  'DISCOVERED',
  'IDENTIFIED',
  'INTERFACE_VERIFIED',
  'CAPABILITIES_DESCRIBED',
  'SANDBOXED',
  'OBSERVED',
  'TRUSTED',
  'COMMUNITY_MEMBER',
] as const;

// Well-known capability identifiers (initial taxonomy)
export const KNOWN_CAPABILITIES = {
  // Research
  'research.web': 'Web research and fact retrieval',
  'research.academic': 'Academic research and paper analysis',
  'research.summarize': 'Summarize documents and content',
  
  // Verification
  'verification.citation': 'Verify citations and sources',
  'verification.factcheck': 'Fact-check claims',
  
  // Coding
  'coding.implement': 'Write and implement code',
  'coding.review': 'Review code for quality/security',
  'coding.debug': 'Debug and troubleshoot code',
  
  // Analysis
  'analysis.data': 'Data analysis and visualization',
  'analysis.reasoning': 'Logical reasoning and inference',
  
  // Communication
  'comm.message': 'Send messages to agents/humans',
  'comm.synthesize': 'Synthesize responses from multiple agents',
  
  // System
  'system.orchestrate': 'Orchestrate multi-agent workflows',
  'system.memory': 'Provide memory/context storage',
  'system.model_route': 'Route requests to appropriate models',
  
  // Media
  'media.image_generate': 'Generate images',
  'media.transcribe': 'Transcribe audio/video',
  'media.translate': 'Translate between languages',
} as const;

export const DEFAULT_TIMEOUT_MS = 30000;
export const DEFAULT_RETRY_LIMIT = 3;

export const state = {
  currentTemplate: "classic",
  currentProfile: "personal",
  profiles: [],
  schema: null,
  formData: {},
  pdfCacheBust: Date.now(),
  saving: false,
  autoSaveDelayMs: 30000,
  lastEditAt: null,
  autoSaveDeadline: null,
  unsaved: false,
  initialLoadComplete: false,
};

export const TEMPLATE_LABELS = {
  classic: "Classic",
};

export const TEMPLATE_ATTRIBUTIONS = {
  classic: {
    name: "Classic",
    inspiration: "Jake's Resume",
    inspirationUrl: "https://github.com/jakegut/resume",
    author: "Jake Gutierrez",
    authorUrl: "https://github.com/jakegut/resume",
    license: "MIT",
    basedOn: {
      name: "sb2nov/resume",
      url: "https://github.com/sb2nov/resume",
    },
  },
};

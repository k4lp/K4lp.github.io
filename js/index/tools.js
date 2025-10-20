export const toolCatalog = [
  {
    id: 'bom-harmoniser',
    category: 'Procurement Automation',
    title: 'BOM Harmoniser',
    summary:
      'Normalise reference designators, de-duplicate suppliers, and stream pricing deltas across DigiKey and Mouser in one pass.',
    status: 'Pilot-ready',
    cadence: 'Live DigiKey + Mouser refresh every 15 minutes',
    stack: 'Browser XLSX intake · Supplier REST bridge',
    tags: ['BOM', 'Pricing', 'Crosses', 'Validation'],
    link: 'contact.html',
    cta: 'Book an integration session',
  },
  {
    id: 'sourcing-pulse',
    category: 'Lifecycle Intelligence',
    title: 'Sourcing Pulse',
    summary:
      'Track NRND flags, allocation alerts, and compliance shifts with time-series snapshots ready for executive roll-up.',
    status: 'Designing dashboards',
    cadence: 'Lifecycle telemetry synced nightly',
    stack: 'Event ledger · Supplier change feeds',
    tags: ['Lifecycle', 'Analytics', 'Compliance'],
    link: '#',
    cta: 'Preview roadmap',
  },
  {
    id: 'reel-scanner-studio',
    category: 'Receiving Ops',
    title: 'Reel Scanner Studio',
    summary:
      'Calibrate barcode capture, enforce feeder lane presets, and push verified reels straight into SMT handoff queues.',
    status: 'Hardware lab build',
    cadence: 'Vision heuristics tuned per cell',
    stack: 'WebRTC capture · HTML5 QR core',
    tags: ['Scanner', 'Barcode', 'Calibration'],
    link: '#',
    cta: 'Review calibration spec',
  },
  {
    id: 'excel-intake-pilot',
    category: 'Spreadsheet Intake',
    title: 'Excel Intake Pilot',
    summary:
      'Guided column mapping with checkpointed memory so operators can resume verification without repeating manual steps.',
    status: 'Alpha trials',
    cadence: 'Operator checkpoints persisted locally',
    stack: 'In-browser sandbox · Streaming validation',
    tags: ['Excel', 'Mapping', 'Checkpoints'],
    link: '#',
    cta: 'Join the pilot',
  },
];
